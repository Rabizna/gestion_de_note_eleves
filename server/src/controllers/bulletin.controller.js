// server/src/controllers/bulletin.controller.js
import { prisma } from "../prisma.js";

/* IDs "de référence" pour tes niveaux/sections */
const CYCLE_IDS = { seconde: 1, premiere: 2, terminale: 3 };
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
    matricule: e.matricule ?? "",
    numero: e.numero ?? "",
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
export async function bulletinMeta(_req, res) {
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

/* ---------- DONNÉES BULLETIN ---------- */
export async function getBulletinData(req, res) {
  try {
    const { niveauId, sectionId } = getClassIds(req.query);
    const eleveId = Number(req.query.eleveId);

    if (!niveauId || !sectionId || !eleveId) {
      return res.status(400).json({ 
        message: "Paramètres 'niveau', 'section' et 'eleveId' requis." 
      });
    }

    // 1. Récupérer l'élève
    const eleve = await prisma.eleve.findUnique({
      where: { id: eleveId },
      include: { niveau: true, section: true },
    });

    if (!eleve || eleve.niveauId !== niveauId || eleve.sectionId !== sectionId) {
      return res.status(404).json({ message: "Élève introuvable dans cette classe." });
    }

    // 2. Récupérer les matières avec coefficients
    const matieres = await prisma.matiere.findMany({
      include: {
        coefficients: {
          where: {
            niveauId,
            sectionId,
          },
        },
      },
      orderBy: { nom: "asc" },
    });

    const matieresData = matieres.map(m => ({
      id: m.id,
      nom: m.nom,
      coef: m.coefficients[0]?.coefficient || 1,
    }));

    // 3. Récupérer tous les élèves de la classe
    const studentList = await prisma.eleve.findMany({
      where: { niveauId, sectionId },
      select: { id: true, nom: true, prenom: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    });

    const effectif = studentList.length;
    const idsAll = studentList.map(s => s.id);

    // 4. Récupérer toutes les notes de la classe
    const allNotes = await prisma.note.findMany({
      where: {
        eleveId: { in: idsAll },
      },
      select: {
        eleveId: true,
        matiereId: true,
        trimestre: true,
        statut: true,
        note: true,
      },
    });

    // 5. Organiser les notes par élève/matière/trimestre
    const classNotes = {};
    idsAll.forEach(sid => {
      classNotes[sid] = { notes: {} };
    });

    allNotes.forEach(r => {
      const sid = r.eleveId;
      const mid = r.matiereId;
      
      // Déterminer le trimestre
      let t = 0;
      const tt = String(r.trimestre || "").toLowerCase();
      if (tt.includes("1") || tt.includes("trim1") || tt.includes("premier")) t = 1;
      else if (tt.includes("2") || tt.includes("trim2") || tt.includes("deuxieme") || tt.includes("deuxième")) t = 2;
      else if (tt.includes("3") || tt.includes("trim3") || tt.includes("troisieme") || tt.includes("troisième")) t = 3;
      if (!t) return;

      // Déterminer le type de note (NJ ou NE)
      const stat = String(r.statut || "").toLowerCase();
      const val = r.note != null ? Number(r.note) : null;
      if (val === null) return;

      if (!classNotes[sid].notes[mid]) {
        classNotes[sid].notes[mid] = {};
      }
      if (!classNotes[sid].notes[mid][t]) {
        classNotes[sid].notes[mid][t] = {};
      }

      // NOTE_JOURNALIERE ou NOTE_EXAMEN
      if (stat.includes("journal")) {
        classNotes[sid].notes[mid][t].NJ = val;
      } else if (stat.includes("examen")) {
        classNotes[sid].notes[mid][t].NE = val;
      }
    });

    // 6. Notes de l'élève sélectionné
    const studentNotes = classNotes[eleveId]?.notes || {};

    // 7. Calculer les statistiques de classe
    const classStats = calculateClassStats(
      classNotes,
      matieresData,
      eleveId,
      effectif
    );

    // 8. Nom du niveau et section
    const nomNiveau = eleve.niveau?.nom || "";
    const nomSection = eleve.section?.nom || "";

    res.json({
      eleve: mapEleve(eleve),
      matieres: matieresData,
      studentNotes,
      classStats,
      effectif,
      nomNiveau,
      nomSection,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur chargement bulletin." });
  }
}

/* ---------- CALCUL STATISTIQUES CLASSE ---------- */
function calculateClassStats(classNotes, matieres, selectedId, effectif) {
  const coefMap = {};
  matieres.forEach(m => {
    coefMap[m.id] = Number(m.coef || 1);
  });

  // Calculer la moyenne d'un élève pour un trimestre
  function avgOfStudentTrim(sid, trim) {
    const notes = classNotes[sid]?.notes || {};
    let sumT = 0, sumC = 0;

    for (const mid in notes) {
      const byTrim = notes[mid][trim];
      if (!byTrim) continue;

      const nj = byTrim.NJ != null ? Number(byTrim.NJ) : null;
      const ne = byTrim.NE != null ? Number(byTrim.NE) : null;

      let moy = null;
      if (nj != null && ne != null) moy = (nj + ne) / 2;
      else if (nj != null) moy = nj;
      else if (ne != null) moy = ne;

      if (moy === null) continue;

      const c = coefMap[Number(mid)] || 1;
      sumT += moy * c;
      sumC += c;
    }

    return sumC > 0 ? sumT / sumC : null;
  }

  // Calculer la moyenne annuelle d'un élève
  function getAnnualAverage(sid) {
    const moyennes = [];
    for (let trim = 1; trim <= 3; trim++) {
      const avg = avgOfStudentTrim(sid, trim);
      if (avg !== null) moyennes.push(avg);
    }
    return moyennes.length === 3 ? moyennes.reduce((s, m) => s + m, 0) / 3 : null;
  }

  const suffix = n => (n === 1 ? 'er' : 'eme');
  const fmt = v => {
    if (v == null || isNaN(v)) return '';
    const rounded = Math.round(v * 100) / 100;
    return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
  };

  const classAvgs = {};
  const ranks = {};

  // Calcul par trimestre
  [1, 2, 3].forEach(trim => {
    const avgs = [];
    const ids = Object.keys(classNotes).map(Number);
    let allHaveAvg = true;

    ids.forEach(sid => {
      const v = avgOfStudentTrim(sid, trim);
      avgs.push({ sid, v });
      if (v === null) allHaveAvg = false;
    });

    // Moyenne de classe
    const vals = avgs.map(a => a.v).filter(v => v !== null);
    classAvgs[trim] = vals.length ? fmt(vals.reduce((s, x) => s + x, 0) / vals.length) : '';

    // Rang
    if (allHaveAvg) {
      avgs.sort((a, b) => b.v - a.v);
      const pos = avgs.findIndex(x => x.sid === selectedId) + 1;
      ranks[trim] = pos ? `${pos}${suffix(pos)}/${effectif}` : '';
    } else {
      ranks[trim] = '';
    }
  });

  // Calcul rang annuel
  const annualAvgs = [];
  const ids = Object.keys(classNotes).map(Number);
  let allHaveAnnualAvg = true;

  ids.forEach(sid => {
    const avg = getAnnualAverage(sid);
    annualAvgs.push({ sid, avg });
    if (avg === null) allHaveAnnualAvg = false;
  });

  let annualRank = '';
  if (allHaveAnnualAvg) {
    annualAvgs.sort((a, b) => b.avg - a.avg);
    const pos = annualAvgs.findIndex(x => x.sid === selectedId) + 1;
    annualRank = pos ? `${pos}${suffix(pos)}/${effectif}` : '';
  }

  return {
    classAvgs,
    ranks,
    annualRank,
  };
}