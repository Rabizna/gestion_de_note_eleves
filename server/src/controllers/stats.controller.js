// server/src/controllers/stats.controller.js
import { prisma } from "../prisma.js";

function norm(s) {
  return String(s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
function classNiveauName(nom) {
  const n = norm(nom);
  if (n.includes("2nde") || n.includes("2de") || /\b2e?\b/.test(n) || n.includes("2eme") || n.includes("secon")) return "seconde";
  if (n.includes("prem") || n.includes("1re") || n.includes("1ere") || /\b1e?\b/.test(n)) return "premiere";
  if (n.includes("term") || n.includes("tale") || /\btle\b/.test(n) || n.includes("terminal")) return "terminale";
  return null;
}

export async function getEleveStats(_req, res) {
  try {
    const [niveaux, sections] = await Promise.all([
      prisma.niveau.findMany({ select: { id: true, nom: true } }),
      prisma.section.findMany({ select: { id: true, nom: true } }),
    ]);
    const nivById = Object.fromEntries(niveaux.map(n => [n.id, n.nom]));
    const secById = Object.fromEntries(sections.map(s => [s.id, s.nom]));

    const eleves = await prisma.eleve.findMany({
      select: { id: true, inscrit: true, redoublant: true, renvoye: true, sexe: true, niveauId: true, sectionId: true },
    });

    const total = eleves.length;
    const inscrits = eleves.filter(e => e.inscrit).length;
    const nonInscrits = total - inscrits;
    const redoublants = eleves.filter(e => e.redoublant).length;
    const renvoyes = eleves.filter(e => e.renvoye).length;

    const bySexeMap = new Map();
    for (const e of eleves) bySexeMap.set(e.sexe ?? "Inconnu", (bySexeMap.get(e.sexe ?? "Inconnu") || 0) + 1);
    const bySexe = Array.from(bySexeMap, ([sexe, count]) => ({ sexe, count }));

    const byNivMap = new Map();
    for (const e of eleves) {
      if (e.niveauId == null) continue;
      const id = e.niveauId, nom = nivById[id] ?? `Niveau #${id}`, cls = classNiveauName(nom);
      const v = byNivMap.get(id) || { niveauId: id, niveauNom: nom, classe: cls, count: 0 };
      v.count++; byNivMap.set(id, v);
    }
    const byNiveau = Array.from(byNivMap.values());

    const bySecMap = new Map();
    for (const e of eleves) {
      if (e.sectionId == null) continue;
      const id = e.sectionId, nom = secById[id] ?? `Section #${id}`;
      const v = bySecMap.get(id) || { sectionId: id, sectionNom: nom, count: 0 };
      v.count++; bySecMap.set(id, v);
    }
    const bySection = Array.from(bySecMap.values());

    const byNSMap = new Map();
    for (const e of eleves) {
      if (e.niveauId == null || e.sectionId == null) continue;
      const key = `${e.niveauId}-${e.sectionId}`;
      const niveauNom = nivById[e.niveauId] ?? `Niveau #${e.niveauId}`;
      const sectionNom = secById[e.sectionId] ?? `Section #${e.sectionId}`;
      const v = byNSMap.get(key) || {
        niveauId: e.niveauId, niveauNom, classe: classNiveauName(niveauNom),
        sectionId: e.sectionId, sectionNom, count: 0,
      };
      v.count++; byNSMap.set(key, v);
    }
    const byNiveauSection = Array.from(byNSMap.values());

    res.json({
      global: { total, inscrits, nonInscrits, redoublants, renvoyes },
      bySexe, byNiveau, bySection, byNiveauSection,
    });
  } catch (e) {
    console.error("getEleveStats error:", e);
    res.status(500).json({ message: "Erreur lors du calcul des statistiques." });
  }
}
