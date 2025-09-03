// server/src/controllers/note.controller.js
import { Buffer } from "node:buffer";
import { prisma } from "../prisma.js";

/* ------------------------- Utils ------------------------- */
const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Normalise une photo:
 * - Buffer / binaire  -> data URL base64
 * - Chaîne (chemin)   -> /uploads/xxx
 * - Autre / null      -> null
 */
function encodePhoto(photo) {
  if (!photo) return null;
  if (typeof photo !== "string") {
    try {
      return `data:image/jpeg;base64,${Buffer.from(photo).toString("base64")}`;
    } catch {
      return null;
    }
  }
  let file = photo.replace(/\\/g, "/").trim();
  file = file.replace(/^\/?uploads\//i, "").replace(/^\/?Uploads\//, "");
  return `/uploads/${file}`;
}

function mapTrimestre(txt) {
  const t = norm(txt);
  if (t.startsWith("1")) return "TRIM1";
  if (t.startsWith("2")) return "TRIM2";
  if (t.startsWith("3")) return "TRIM3";
  throw new Error("Trimestre invalide");
}

function mapStatut(label) {
  const t = norm(label);
  if (t.includes("journali")) return "NOTE_JOURNALIERE";
  if (t.includes("examen")) return "NOTE_EXAMEN";
  throw new Error("Type de note invalide");
}

/** Résout les ids via tables, tolérant accents/casse/alias. */
async function resolveIds(cycle, sub) {
  const c = norm(cycle);
  const sUpper = String(sub).toUpperCase().trim();

  const niveaux = await prisma.niveau.findMany({ select: { id: true, nom: true } });
  const sections = await prisma.section.findMany({ select: { id: true, nom: true } });

  const isPremiere = c === "premiere" || c === "premiere " || c === "premieree";
  const niv =
    niveaux.find((n) => {
      const nn = norm(n.nom);
      return (
        nn === c ||
        nn.startsWith(c) ||
        (isPremiere && nn.includes("premier")) ||
        (c.startsWith("termin") && nn.startsWith("terminal"))
      );
    }) || null;

  if (!niv) throw new Error("Niveau inconnu");

  const sec =
    sections.find((x) => String(x.nom).toUpperCase().trim() === sUpper) ||
    sections.find((x) => norm(x.nom) === norm(sub)) ||
    null;

  if (!sec) throw new Error("Section inconnue");

  return { niveauId: niv.id, sectionId: sec.id };
}

/* ------------------------ Controllers ------------------------ */

/** GET /api/notes/eleves?cycle=seconde&sub=A */
export async function listEleves(req, res) {
  try {
    const cycle = req.params.cycle ?? req.query.cycle;
    const sub = req.params.sub ?? req.query.sub ?? req.query.section;
    if (!cycle || !sub) return res.status(400).json({ message: "cycle et sub requis." });

    const { niveauId, sectionId } = await resolveIds(cycle, sub);

    let rows = await prisma.eleve.findMany({
      where: { niveauId, sectionId },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: {
        id: true,
        nom: true,
        prenom: true,
        sexe: true,
        dateNais: true,
        lieuNais: true,
        telephone: true,
        domicile: true,
        photo: true,
        niveau: { select: { nom: true } },
        section: { select: { nom: true } },
      },
    });

    if (!rows.length) {
      rows = await prisma.eleve.findMany({
        where: {
          AND: [
            { niveau: { nom: { contains: String(cycle).slice(0, 5), mode: "insensitive" } } },
            { section: { nom: { equals: sub, mode: "insensitive" } } },
          ],
        },
        orderBy: [{ nom: "asc" }, { prenom: "asc" }],
        select: {
          id: true,
          nom: true,
          prenom: true,
          sexe: true,
          dateNais: true,
          lieuNais: true,
          telephone: true,
          domicile: true,
          photo: true,
          niveau: { select: { nom: true } },
          section: { select: { nom: true } },
        },
      });
    }

    const eleves = rows.map((e) => {
      const encoded = encodePhoto(e.photo);
      return {
        id: e.id,
        nom: e.nom ?? "",
        prenom: e.prenom ?? "",
        sexe: e.sexe ?? "",
        dateNais: e.dateNais ?? null,
        lieuNais: e.lieuNais ?? "",
        telephone: e.telephone ?? "",
        domicile: e.domicile ?? "",
        niveau: e.niveau ? { nom: e.niveau.nom } : null,
        section: e.section ? { nom: e.section.nom } : null,
        photo: encoded,
        photoUrl: encoded,
      };
    });

    return res.json({ eleves });
  } catch (e) {
    console.error("listEleves error:", e);
    return res.status(500).json({ message: "Erreur: lecture élèves." });
  }
}

/** GET /api/notes/matieres?cycle=...&sub=... */
export async function listMatieresForClass(req, res) {
  try {
    const cycle = req.params.cycle ?? req.query.cycle;
    const sub = req.params.sub ?? req.query.sub ?? req.query.section;
    if (!cycle || !sub) return res.status(400).json({ message: "cycle et sub requis." });

    const { niveauId, sectionId } = await resolveIds(cycle, sub);

    let rows = await prisma.coefficient.findMany({
      where: { niveauId, sectionId },
      select: {
        coefficient: true,
        matiere: { select: { id: true, nom: true, code: true } },
      },
      orderBy: [{ matiere: { nom: "asc" } }],
    });

    // fallback par noms si aucun coef n'est saisi pour ce couple
    if (!rows.length) {
      rows = await prisma.coefficient.findMany({
        where: {
          AND: [
            { niveau: { nom: { contains: String(cycle).slice(0, 5), mode: "insensitive" } } },
            { section: { nom: { equals: sub, mode: "insensitive" } } },
          ],
        },
        select: {
          coefficient: true,
          matiere: { select: { id: true, nom: true, code: true } },
        },
        orderBy: [{ matiere: { nom: "asc" } }],
      });
    }

    const matieres = rows.map((r) => ({
      id: r.matiere.id,
      nom: r.matiere.nom,
      code: r.matiere.code,
      coefficient: r.coefficient,
    }));

    return res.json({ matieres, niveauId, sectionId });
  } catch (e) {
    console.error("listMatieresForClass error:", e);
    return res.status(500).json({ message: "Erreur: lecture matières/coefs." });
  }
}

/** POST /api/notes */
export async function createNote(req, res) {
  try {
    const eleveId = Number(req.body?.eleveId);
    const matiereId = Number(req.body?.matiereId);
    const note = Number(req.body?.note);
    const trimestreLabel = String(req.body?.trimestre || "");
    const typeLabel = String(req.body?.type || "");

    if (!eleveId || !matiereId || Number.isNaN(note))
      return res.status(400).json({ message: "Champs requis: eleveId, matiereId, note." });

    if (note < 0 || note > 20)
      return res.status(400).json({ message: "La note doit être comprise entre 0 et 20." });

    const trimestre = mapTrimestre(trimestreLabel);
    const statut = mapStatut(typeLabel); // NOTE_JOURNALIERE | NOTE_EXAMEN

    // Élève + sa classe
    const eleve = await prisma.eleve.findUnique({
      where: { id: eleveId },
      select: { id: true, niveauId: true, sectionId: true, nom: true, prenom: true, photo: true },
    });
    if (!eleve) return res.status(404).json({ message: "Élève non trouvé." });
    if (!eleve.niveauId || !eleve.sectionId)
      return res.status(400).json({ message: "Élève sans niveau/section." });

    // Coeff
    const coefRow = await prisma.coefficient.findFirst({
      where: { matiereId, niveauId: eleve.niveauId, sectionId: eleve.sectionId },
      select: { coefficient: true },
    });
    const coefficient = Number(coefRow?.coefficient || 1);

    // Doublon exact (même élève, matière, trimestre, statut)
    const doublon = await prisma.note.findFirst({
      where: { eleveId, matiereId, trimestre, statut },
      select: { id: true },
    });
    if (doublon) {
      return res.status(409).json({
        message:
          "Une note du même type existe déjà pour cet élève dans cette matière et ce trimestre.",
      });
    }

    // Payload: on ne renseigne QUE la colonne calculée correspondant au statut
    const data = {
      eleveId,
      matiereId,
      trimestre,
      statut, // ⚠ désormais NOT NULL dans le schéma
      note,
      noteTotalJournalier: null,
      noteTotalExamen: null,
      noteMoyenne: null,
      noteTotal: null,
    };

    if (statut === "NOTE_JOURNALIERE") data.noteTotalJournalier = note * coefficient;
    if (statut === "NOTE_EXAMEN")      data.noteTotalExamen    = note * coefficient;

    const created = await prisma.note.create({ data });

    return res.json({
      ok: true,
      id: created.id,
      coefficient,
      eleve: {
        id: eleve.id,
        nom: eleve.nom,
        prenom: eleve.prenom,
        photoUrl: encodePhoto(eleve.photo),
      },
    });
  } catch (e) {
    // Gestion douce des erreurs Prisma: unicité etc.
    if (e && e.code === "P2002") {
      return res.status(409).json({
        message:
          "Une note du même type existe déjà pour cet élève dans cette matière et ce trimestre.",
      });
    }
    console.error("createNote error:", e);
    return res.status(500).json({ message: "Erreur: création de note." });
  }
}
