// server/src/controllers/absence.controller.js
import { prisma } from "../prisma.js";

/* IDs “de référence” pour tes niveaux/sections */
const CYCLE_IDS = { seconde: 1, premiere: 2, terminale: 3 };
// A=1, B=2, C=3, L=4, S=5, OSE=6 (adapte si besoin)
const SECTION_IDS = { A: 1, B: 2, C: 3, L: 4, S: 5, OSE: 6 };

/* Helpers */
function mapEleve(e) {
  if (!e) return null;
  let photo = null;
  if (e.photo) {
    try {
      photo = `data:image/jpeg;base64,${Buffer.from(e.photo).toString("base64")}`;
    } catch {}
  }
  return {
    id: e.id,
    nom: e.nom ?? "",
    prenom: e.prenom ?? "",
    sexe: e.sexe ?? null,
    dateNais: e.dateNais ?? e.date_nais ?? null,
    lieuNais: e.lieuNais ?? e.lieu_nais ?? null,
    telephone: e.telephone ?? null,
    domicile: e.domicile ?? null,
    photo,
    niveau: e.niveau ? { id: e.niveau.id, nom: e.niveau.nom } : null,
    section: e.section ? { id: e.section.id, nom: e.section.nom } : null,
  };
}

function getClassIds(q) {
  const rawNiv = String(q.niveau || "").toLowerCase();
  const rawSec = String(q.section || "").toUpperCase();
  const niveauId = CYCLE_IDS[rawNiv] || null;
  const sectionId = SECTION_IDS[rawSec] || null;
  return { niveauId, sectionId };
}

/* ---------------- METADATA ---------------- */
export async function absenceMeta(_req, res) {
  res.json({
    buttons: {
      seconde: ["A", "B", "C"],
      premiere: ["L", "S", "OSE"],
      terminale: ["L", "S", "OSE"],
    },
  });
}

/* ---------- LISTE ÉLÈVES (par classe) ---------- */
export async function listElevesByClass(req, res) {
  try {
    const { niveauId, sectionId } = getClassIds(req.query);
    if (!niveauId || !sectionId) {
      return res.status(400).json({ message: "Paramètres 'niveau' et 'section' invalides." });
    }
    const rows = await prisma.eleve.findMany({
      where: { niveauId, sectionId },
      include: { niveau: true, section: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });
    res.json({ eleves: rows.map(mapEleve) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur chargement élèves." });
  }
}

/* ---------- CRÉER ABSENCE ---------- */
export async function createAbsence(req, res) {
  try {
    const eleveId = Number(req.body?.eleveId);
    const date = String(req.body?.date); // "YYYY-MM-DD"
    const plage = String(req.body?.plage || ""); // "MATIN" | "APRES_MIDI"
    const motif = req.body?.motif ?? null;

    if (!eleveId || !date || !plage) {
      return res.status(400).json({ message: "Champs requis manquants." });
    }

    // récupérer la classe de l’élève pour historiser niveau/section dans l’absence
    const el = await prisma.eleve.findUnique({
      where: { id: eleveId },
      select: { id: true, niveauId: true, sectionId: true },
    });
    if (!el) return res.status(404).json({ message: "Élève introuvable." });

    try {
      const created = await prisma.absence.create({
        data: {
          eleveId,
          date: new Date(date),
          plage, // enum AbsPlage
          motif: motif || null,
          niveauId: el.niveauId ?? null,
          sectionId: el.sectionId ?? null,
        },
      });
      res.json({ ok: true, absence: created });
    } catch (e) {
      // contrainte unique (eleveId, date, plage)
      if (e?.code === "P2002") {
        return res
          .status(409)
          .json({ message: "Une absence existe déjà pour cet élève à cette date et période." });
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur lors de l'enregistrement." });
  }
}

/* ---------- ABSENCES d’un élève ---------- */
export async function listAbsencesByStudent(req, res) {
  try {
    const eleveId = Number(req.params.id);
    if (!eleveId) return res.status(400).json({ message: "ID élève invalide." });

    const rows = await prisma.absence.findMany({
      where: { eleveId },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      select: { id: true, date: true, plage: true, motif: true },
    });

    res.json({
      absences: rows.map((a) => ({
        id: a.id,
        date: a.date.toISOString().slice(0, 10),
        plage: a.plage, // "MATIN"/"APRES_MIDI"
        motif: a.motif || "",
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur chargement absences." });
  }
}

/* ---------- STATS par classe (bar chart) ---------- */
export async function statsAbsencesForClass(req, res) {
  try {
    const { niveauId, sectionId } = getClassIds(req.query);
    if (!niveauId || !sectionId) {
      return res.status(400).json({ message: "Paramètres 'niveau' et 'section' invalides." });
    }

    // 1) élèves de la classe (même si 0 absence)
    const eleves = await prisma.eleve.findMany({
      where: { niveauId, sectionId },
      select: { id: true, nom: true, prenom: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    // 2) groupBy des absences sur cette classe
    const grouped = await prisma.absence.groupBy({
      by: ["eleveId"],
      where: { niveauId, sectionId },
      _count: { _all: true },
    });

    const mapCount = new Map(grouped.map((g) => [g.eleveId, g._count._all]));
    const stats = eleves.map((e) => ({
      eleveId: e.id,
      nom: e.nom || "",
      prenom: e.prenom || "",
      total: mapCount.get(e.id) || 0,
    }));

    res.json({ stats });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur stats." });
  }
}

/* ---------- MAJ MOTIF d’une absence ---------- */
export async function updateAbsenceMotif(req, res) {
  try {
    const id = Number(req.params.id);
    const motif = String(req.body?.motif ?? "").trim();
    if (!id) return res.status(400).json({ message: "ID absence invalide." });

    const up = await prisma.absence.update({
      where: { id },
      data: { motif: motif || null },
      select: { id: true, motif: true },
    });
    res.json({ ok: true, absence: up });
  } catch (e) {
    console.error(e);
    if (e?.code === "P2025") return res.status(404).json({ message: "Absence introuvable." });
    res.status(500).json({ message: "Erreur MAJ motif." });
  }
}
