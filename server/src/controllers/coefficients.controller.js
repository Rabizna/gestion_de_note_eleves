import { prisma } from "../prisma.js";

/* Helpers */
const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const upsertOne = async ({ matiereId, niveauId, sectionId, coefficient }) => {
  const found = await prisma.coefficient.findFirst({
    where: { matiereId, niveauId, sectionId },
    select: { id: true },
  });
  if (found) {
    await prisma.coefficient.update({
      where: { id: found.id },
      data: { coefficient },
    });
    return "updated";
  }
  await prisma.coefficient.create({
    data: { matiereId, niveauId, sectionId, coefficient },
  });
  return "inserted";
};

/* GET /api/coefficients : liste brute */
export async function listCoefficients(_req, res) {
  try {
    const rows = await prisma.coefficient.findMany({
      select: {
        id: true,
        matiereId: true,
        niveauId: true,
        sectionId: true,
        coefficient: true,
        matiere: { select: { id: true, nom: true, code: true} },
      },
      orderBy: [{ matiere: { nom: "asc" } }],
    });

    const coefficients = rows.map((r) => ({
      id: r.id,
      id_matiere: r.matiereId,
      id_niveau: r.niveauId,
      id_section: r.sectionId,
      coefficient: r.coefficient,
      nom_matiere: r.matiere?.nom ?? null,
      code_matiere: r.matiere?.code ?? null,
    }));

    res.json({ coefficients });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur: lecture coefficients." });
  }
}

/* GET /api/coefficients/compact : vue compacte + renvoie aussi la brute en __raw */
export async function listCoefficientsCompact(_req, res) {
  try {
    const [rows, niveaux, sections, matieres] = await Promise.all([
      prisma.coefficient.findMany({
        select: { matiereId: true, niveauId: true, sectionId: true, coefficient: true },
      }),
      prisma.niveau.findMany({ select: { id: true, nom: true } }),
      prisma.section.findMany({ select: { id: true, nom: true } }),
      prisma.matiere.findMany({ select: { id: true, nom: true, code: true } }),
    ]);

    // ids utiles
    const idSeconde = niveaux.find((n) => norm(n.nom) === "seconde")?.id ?? null;
    const idPremiere = niveaux.find((n) => ["premiere", "première"].includes(norm(n.nom)))?.id ?? null;
    const idTerminale = niveaux.find((n) => ["terminal", "terminale"].includes(norm(n.nom)))?.id ?? null;
    const secId = (txt) => sections.find((s) => String(s.nom).toUpperCase().trim() === txt)?.id ?? null;
    const idA = secId("A"), idB = secId("B"), idC = secId("C"), idL = secId("L"), idS = secId("S"), idOSE = secId("OSE");

    // index [m][n][s] => coef
    const by = {};
    rows.forEach((r) => {
      by[r.matiereId] ??= {};
      by[r.matiereId][r.niveauId] ??= {};
      by[r.matiereId][r.niveauId][r.sectionId] = r.coefficient;
    });

    const groupCoef = (mid, pairs) => {
      const vals = [];
      for (const [niv, sec] of pairs) {
        const v = by?.[mid]?.[niv]?.[sec];
        if (typeof v !== "number") return null;
        vals.push(v);
      }
      return new Set(vals).size === 1 ? vals[0] : null;
    };

    const lines = matieres
      .slice()
      .sort((a, b) => (a.nom || "").localeCompare(b.nom || "", "fr"))
      .map((m) => ({
        matiere: `${m.nom}${m.code ? ` (${m.code})` : ""}`,
        secABC:
          idSeconde && idA && idB && idC
            ? groupCoef(m.id, [[idSeconde, idA], [idSeconde, idB], [idSeconde, idC]])
            : null,
        ptL:
          idPremiere && idTerminale && idL
            ? groupCoef(m.id, [[idPremiere, idL], [idTerminale, idL]])
            : null,
        ptS:
          idPremiere && idTerminale && idS
            ? groupCoef(m.id, [[idPremiere, idS], [idTerminale, idS]])
            : null,
        ptOSE:
          idPremiere && idTerminale && idOSE
            ? groupCoef(m.id, [[idPremiere, idOSE], [idTerminale, idOSE]])
            : null,
      }));

    res.json({ rows: lines, __raw: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur: lecture compact." });
  }
}

/* POST /api/coefficients/upsert-propagate */
export async function upsertPropagate(req, res) {
  try {
    const m = Number.parseInt(req.body?.matiereId);
    const n = Number.parseInt(req.body?.niveauId);
    const s = Number.parseInt(req.body?.sectionId);
    const c = Number.parseInt(req.body?.coefficient);

    if (!Number.isInteger(m) || !Number.isInteger(n) || !Number.isInteger(s) || !Number.isInteger(c) || c <= 0) {
      return res.status(400).json({ message: "matiereId, niveauId, sectionId et coefficient (>0) requis." });
    }

    const [niveaux, sections] = await Promise.all([
      prisma.niveau.findMany({ select: { id: true, nom: true } }),
      prisma.section.findMany({ select: { id: true, nom: true } }),
    ]);

    const idSeconde   = niveaux.find((x) => norm(x.nom) === "seconde")?.id ?? null;
    const idPremiere  = niveaux.find((x) => ["premiere", "première"].includes(norm(x.nom)))?.id ?? null;
    const idTerminale = niveaux.find((x) => ["terminal", "terminale"].includes(norm(x.nom)))?.id ?? null;

    const secId = (txt) => sections.find((x) => String(x.nom).toUpperCase().trim() === txt)?.id ?? null;
    const idA = secId("A"), idB = secId("B"), idC = secId("C"), idL = secId("L"), idS = secId("S"), idOSE = secId("OSE");

    let targets = [];
    if (n === idSeconde) {
      [idA, idB, idC].forEach((sid) => sid && targets.push({ matiereId: m, niveauId: n, sectionId: sid, coefficient: c }));
    } else if ((n === idPremiere || n === idTerminale) && [idL, idS, idOSE].includes(s)) {
      if (idPremiere)  targets.push({ matiereId: m, niveauId: idPremiere,  sectionId: s, coefficient: c });
      if (idTerminale) targets.push({ matiereId: m, niveauId: idTerminale, sectionId: s, coefficient: c });
    } else {
      targets.push({ matiereId: m, niveauId: n, sectionId: s, coefficient: c });
    }

    // dédoublonnage
    const seen = new Set();
    targets = targets.filter((t) => {
      const k = `${t.matiereId}-${t.niveauId}-${t.sectionId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    let inserted = 0, updated = 0;
    for (const t of targets) {
      const r = await upsertOne(t);
      if (r === "inserted") inserted++;
      else updated++;
    }

    res.json({ ok: true, inserted, updated, targets });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur: upsert avec propagation." });
  }
}

/* POST /api/coefficients/bulk-upsert */
export async function bulkUpsert(req, res) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: "items vide." });

    let inserted = 0, updated = 0, skipped = 0;
    for (const it of items) {
      const m = +it?.matiereId, n = +it?.niveauId, s = +it?.sectionId, c = +it?.coefficient;
      if (!m || !n || !s || !c) { skipped++; continue; }
      const r = await upsertOne({ matiereId: m, niveauId: n, sectionId: s, coefficient: c });
      if (r === "inserted") inserted++; else updated++;
    }
    res.json({ ok: true, inserted, updated, skipped });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur: bulk upsert." });
  }
}
