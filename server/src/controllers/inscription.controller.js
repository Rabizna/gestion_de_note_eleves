// server/src/controllers/inscription.controller.js
import { prisma } from "../prisma.js";

/* ------------------------------------------------------------------ */
/*               CONFIGURE ICI TES IDs DE SECTIONS                     */
/*  Si tes IDs ne sont pas 1/2/3/4/5/6, mets les bons numéros !        */
/* ------------------------------------------------------------------ */
const SECTION_IDS = {
  A: 1,   // Seconde A
  B: 2,   // Seconde B
  C: 3,   // Seconde C
  L: 4,   // Première/Terminale L
  S: 5,   // Première/Terminale S
  OSE: 6, // Première/Terminale OSE
};

/* Helpers */
function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
function classNiveauName(nom) {
  const n = norm(nom);
  if (n.includes("2nde") || n.includes("2de") || /\b2e?\b/.test(n) || n.includes("2eme") || n.includes("secon")) {
    return "seconde";
  }
  if (n.includes("prem") || n.includes("1re") || n.includes("1ere") || /\b1e?\b/.test(n)) {
    return "premiere";
  }
  if (n.includes("term") || n.includes("tale") || /\btle\b/.test(n) || n.includes("terminal")) {
    return "terminale";
  }
  return null;
}
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
    inscrit: !!e.inscrit,
    dateNais: e.dateNais ?? e.date_nais ?? null,
    lieuNais: e.lieuNais ?? e.lieu_nais ?? null,
    sexe: e.sexe ?? null,
    photo,
    domicile: e.domicile ?? null,
    telephone: e.telephone ?? null,
    niveauId: e.niveauId ?? e.id_niveau ?? null,
    sectionId: e.sectionId ?? e.id_section ?? null,
    niveau: e.niveau ? { id: e.niveau.id, nom: e.niveau.nom } : null,
    section: e.section ? { id: e.section.id, nom: e.section.nom, code: e.section.code } : null,
  };
}

/* Debug: classification des niveaux */
export async function debugLevels(_req, res) {
  try {
    const rows = await prisma.niveau.findMany({ select: { id: true, nom: true }, orderBy: { id: "asc" } });
    res.json({ niveaux: rows.map((n) => ({ id: n.id, nom: n.nom, classe: classNiveauName(n.nom) })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur debug niveaux." });
  }
}

/* GET /api/inscription/eleves  (listes pour écrans d’inscription) */
export async function listElevesInscription(req, res) {
  try {
    const q = req.query;
    const isTrue = (v) =>
      v === true || v === "true" || v === "1" || v === 1 || (typeof v === "string" && v.toLowerCase() === "true");

    const filterPT = isTrue(q.pt);
    const filterSeconde = isTrue(q.seconde);
    const onlyNonInscrits = isTrue(q.nonInscrits);
    const forceNiveauId = Number(q.niveauId);

    const where = {};
    if (onlyNonInscrits) where.inscrit = false;

    if (Number.isFinite(forceNiveauId) && forceNiveauId > 0) {
      where.niveauId = forceNiveauId;
    } else {
      // classe dynamique des niveaux
      const niveaux = await prisma.niveau.findMany({ select: { id: true, nom: true } });
      const idsSeconde = [], idsPremiere = [], idsTerminale = [];
      for (const n of niveaux) {
        const cls = classNiveauName(n.nom);
        if (cls === "seconde") idsSeconde.push(n.id);
        if (cls === "premiere") idsPremiere.push(n.id);
        if (cls === "terminale") idsTerminale.push(n.id);
      }
      if (filterPT) {
        const idsPT = [...idsPremiere, ...idsTerminale];
        if (idsPT.length) {
          where.niveauId = { in: idsPT };
        } else if (idsSeconde.length) {
          where.niveauId = { notIn: idsSeconde };
        }
      } else if (filterSeconde) {
        if (idsSeconde.length) where.niveauId = { in: idsSeconde };
      }
    }

    const rows = await prisma.eleve.findMany({
      where,
      include: { niveau: true, section: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    res.json({ eleves: rows.map(mapEleve) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur lors du chargement des élèves." });
  }
}

/* PUT /api/inscription/eleves/:id */
export async function updateEleveInscription(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID invalide." });

    const sectionCode = String(req.body?.sectionCode || "").trim().toUpperCase();
    const data = { inscrit: true };

    if (sectionCode) {
      const hard = SECTION_IDS;
      const targetId = hard[sectionCode];
      if (!targetId) return res.status(400).json({ message: "Section inconnue." });
      data.sectionId = targetId;
    }

    // photo optionnelle
    const file = (req.files || []).find((f) => f.fieldname === "photo") || (req.files || [])[0];
    if (file?.buffer?.length) data.photo = file.buffer;

    const updated = await prisma.eleve.update({
      where: { id },
      data,
      include: { niveau: true, section: true },
    });

    res.json({ eleve: mapEleve(updated) });
  } catch (e) {
    console.error("updateEleveInscription error:", e);
    if (e?.code === "P2025") return res.status(404).json({ message: "Élève introuvable." });
    res.status(500).json({ message: "Erreur lors de l'inscription." });
  }
}

/* NOUVEAU — GET /api/inscription/inscrits  (liste des élèves inscrits) */
export async function listElevesInscrits(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize) || 20));
    const niveauId = Number(req.query.niveauId);
    const sectionId = Number(req.query.sectionId);
    const q = String(req.query.q || "").trim();

    const where = { inscrit: true };
    if (Number.isFinite(niveauId) && niveauId > 0) where.niveauId = niveauId;
    if (Number.isFinite(sectionId) && sectionId > 0) where.sectionId = sectionId;
    if (q) {
      where.OR = [
        { nom: { contains: q, mode: "insensitive" } },
        { prenom: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.eleve.count({ where }),
      prisma.eleve.findMany({
        where,
        include: { niveau: true, section: true },
        orderBy: [{ nom: "asc" }, { prenom: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      items: rows.map(mapEleve),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur lors du chargement des inscrits." });
  }
}

/* NOUVEAU — GET /api/inscription/refs  (niveaux & sections pour les filtres) */
export async function getInscriptionRefs(_req, res) {
  try {
    const [niveaux, sections] = await Promise.all([
      prisma.niveau.findMany({ select: { id: true, nom: true }, orderBy: { id: "asc" } }),
      prisma.section.findMany({ select: { id: true, nom: true }, orderBy: { id: "asc" } }),
    ]);
    res.json({ niveaux, sections });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur refs." });
  }
}

/* POST /api/inscription/seconde/diviser  (A/B/C + inscrit=true) */
export async function divideSecondeSections(req, res) {
  try {
    const role = String(req.user?.role || "").toUpperCase();
    if (role !== "PROVISEUR") {
      return res.status(403).json({ message: "Action réservée au proviseur." });
    }

    const idA = SECTION_IDS.A;
    const idB = SECTION_IDS.B;
    const idC = SECTION_IDS.C;
    if (!idA || !idB || !idC) {
      return res.status(400).json({ message: "IDs des sections A/B/C non configurés." });
    }

    const niveaux = await prisma.niveau.findMany({ select: { id: true, nom: true } });
    const idsSeconde = niveaux.filter(n => classNiveauName(n.nom) === "seconde").map(n => n.id);
    if (!idsSeconde.length) return res.json({ updated: 0, assigned: { A: 0, B: 0, C: 0 } });

    const rows = await prisma.eleve.findMany({
      where: { niveauId: { in: idsSeconde } },
      select: { id: true, nom: true, prenom: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });
    if (!rows.length) return res.json({ updated: 0, assigned: { A: 0, B: 0, C: 0 } });

    const target = [idA, idB, idC];
    const assigned = { A: 0, B: 0, C: 0 };
    const ops = [];

    for (let i = 0; i < rows.length; i++) {
      const sid = target[i % 3];
      let key = "A"; if (sid === idB) key = "B"; if (sid === idC) key = "C";
      assigned[key]++;

      ops.push(
        prisma.eleve.update({
          where: { id: rows[i].id },
          data: { sectionId: sid, inscrit: true },
        })
      );
    }

    await prisma.$transaction(ops);
    res.json({ updated: rows.length, assigned });
  } catch (e) {
    console.error("divideSecondeSections error:", e);
    res.status(500).json({ message: "Erreur lors de la division des sections." });
  }
}
