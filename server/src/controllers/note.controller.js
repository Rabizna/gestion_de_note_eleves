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

/** Photo:
 * - Buffer   -> data URL base64
 * - String   -> /Uploads/xxx  (⚠ casse respectée)
 * - null     -> /Uploads/defaut-eleve.png
 */
function encodePhoto(photo) {
  if (!photo) return "/Uploads/defaut-eleve.png";
  if (typeof photo !== "string") {
    try {
      return `data:image/jpeg;base64,${Buffer.from(photo).toString("base64")}`;
    } catch {
      return "/Uploads/defaut-eleve.png";
    }
  }
  let file = photo.replace(/\\/g, "/").trim();
  file = file.replace(/^\/?uploads\//i, "Uploads/").replace(/^\/?Uploads\//, "Uploads/");
  return `/${file}`;
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

/** Résout ids de niveau/section à partir des libellés URL. */
async function resolveIds(cycle, sub) {
  const c = norm(cycle);
  const sUpper = String(sub).toUpperCase().trim();

  const [niveaux, sections] = await Promise.all([
    prisma.niveau.findMany({ select: { id: true, nom: true } }),
    prisma.section.findMany({ select: { id: true, nom: true } }),
  ]);

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

/* ------------------- Élèves & Matières ------------------- */

/** GET /api/notes/eleves?cycle=&sub= */
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
        id: true, nom: true, prenom: true, sexe: true,
        dateNais: true, lieuNais: true, telephone: true, domicile: true,
        photo: true,
        niveau: { select: { nom: true } }, section: { select: { nom: true } },
      },
    });

    // fallback permissif si aucun ne remonte
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
          id: true, nom: true, prenom: true, sexe: true,
          dateNais: true, lieuNais: true, telephone: true, domicile: true,
          photo: true,
          niveau: { select: { nom: true } }, section: { select: { nom: true } },
        },
      });
    }

    const eleves = rows.map((e) => ({
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
      photo: encodePhoto(e.photo),
      photoUrl: encodePhoto(e.photo),
    }));

    return res.json({ eleves });
  } catch (e) {
    console.error("listEleves error:", e);
    return res.status(500).json({ message: "Erreur: lecture élèves." });
  }
}

/** GET /api/notes/matieres?cycle=&sub= */
export async function listMatieresForClass(req, res) {
  try {
    const cycle = req.params.cycle ?? req.query.cycle;
    const sub = req.params.sub ?? req.query.sub ?? req.query.section;
    if (!cycle || !sub) return res.status(400).json({ message: "cycle et sub requis." });

    const { niveauId, sectionId } = await resolveIds(cycle, sub);

    let rows = await prisma.coefficient.findMany({
      where: { niveauId, sectionId },
      select: { coefficient: true, matiere: { select: { id: true, nom: true, code: true } } },
      orderBy: [{ matiere: { nom: "asc" } }],
    });

    if (!rows.length) {
      rows = await prisma.coefficient.findMany({
        where: {
          AND: [
            { niveau: { nom: { contains: String(cycle).slice(0, 5), mode: "insensitive" } } },
            { section: { nom: { equals: sub, mode: "insensitive" } } },
          ],
        },
        select: { coefficient: true, matiere: { select: { id: true, nom: true, code: true } } },
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

/* ------------------- Création d’une note ------------------- */

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
    const statut = mapStatut(typeLabel);

    const eleve = await prisma.eleve.findUnique({
      where: { id: eleveId },
      select: { id: true, niveauId: true, sectionId: true, nom: true, prenom: true, photo: true },
    });
    if (!eleve) return res.status(404).json({ message: "Élève non trouvé." });
    if (!eleve.niveauId || !eleve.sectionId)
      return res.status(400).json({ message: "Élève sans niveau/section." });

    const coefRow = await prisma.coefficient.findFirst({
      where: { matiereId, niveauId: eleve.niveauId, sectionId: eleve.sectionId },
      select: { coefficient: true },
    });
    const coefficient = Number(coefRow?.coefficient || 1);

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

    const data = {
      eleveId,
      matiereId,
      trimestre,
      statut,
      note,
      noteTotalJournalier: statut === "NOTE_JOURNALIERE" ? note * coefficient : null,
      noteTotalExamen: statut === "NOTE_EXAMEN" ? note * coefficient : null,
      noteMoyenne: null,
      noteTotal: null,
    };

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

/* ------------------- Archive / Radar / Update ------------------- */

/** GET /api/notes/archive?cycle=&sub=&matiere=&trimestre=&type= */
export async function listNotesForArchive(req, res) {
  try {
    const cycle = req.params.cycle ?? req.query.cycle;
    const sub = req.params.sub ?? req.query.sub ?? req.query.section;
    const matiere = req.query.matiere;
    const trimestre = req.query.trimestre;
    const type = req.query.type;

    if (!cycle || !sub || !matiere || !trimestre || !type) {
      return res.status(400).json({ message: "cycle, sub, matiere, trimestre et type requis." });
    }

    const { niveauId, sectionId } = await resolveIds(cycle, sub);
    const trimestreEnum = mapTrimestre(trimestre);
    const statutEnum = mapStatut(type);
    const matiereId = Number(matiere);

    // coefficient pour la matière dans cette classe
    const coefRow = await prisma.coefficient.findFirst({
      where: { matiereId, niveauId, sectionId },
      select: { coefficient: true },
    });
    const coefficient = Number(coefRow?.coefficient || 1);

    // élèves de la classe
    const els = await prisma.eleve.findMany({
      where: { niveauId, sectionId },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: { id: true, nom: true, prenom: true, photo: true },
    });

    // notes existantes pour ce filtre
    const notes = await prisma.note.findMany({
      where: { matiereId, trimestre: trimestreEnum, statut: statutEnum, eleve: { niveauId, sectionId } },
      select: { eleveId: true, note: true },
    });
    const map = new Map(notes.map((n) => [n.eleveId, Number(n.note)]));

    const payload = els.map((e) => {
      const note = map.get(e.id);
      return {
        idEleve: e.id,
        nom: e.nom ?? "",
        prenom: e.prenom ?? "",
        photo: encodePhoto(e.photo),
        note: note ?? null,
        coefficient,
        noteTotal: note != null ? Number((note * coefficient).toFixed(2)) : null,
      };
    });

    return res.json({ notes: payload });
  } catch (e) {
    console.error("listNotesForArchive error:", e);
    return res.status(500).json({ message: "Erreur: lecture des notes." });
  }
}

/** GET /api/notes/radar?cycle=&sub=&idEleve=&trimestre=&type=tout */
export async function getNotesForRadar(req, res) {
  try {
    const cycle = req.params.cycle ?? req.query.cycle;
    const sub = req.params.sub ?? req.query.sub ?? req.query.section;
    const eleveId = Number(req.query.idEleve);
    const trimestre = req.query.trimestre;

    if (!cycle || !sub || !eleveId || !trimestre) {
      return res.status(400).json({ message: "cycle, sub, idEleve et trimestre requis." });
    }

    const { niveauId, sectionId } = await resolveIds(cycle, sub);
    const trimestreEnum = mapTrimestre(trimestre);

    const coeffs = await prisma.coefficient.findMany({
      where: { niveauId, sectionId },
      select: { matiere: { select: { id: true } } },
      orderBy: [{ matiere: { nom: "asc" } }],
    });
    const matiereIds = coeffs.map((c) => c.matiere.id);

    const all = await prisma.note.findMany({
      where: { eleveId, trimestre: trimestreEnum },
      select: { matiereId: true, note: true, statut: true },
    });

    const mapJ = new Map();
    const mapE = new Map();
    for (const n of all) {
      if (n.statut === "NOTE_JOURNALIERE") mapJ.set(n.matiereId, Number(n.note) || 0);
      if (n.statut === "NOTE_EXAMEN") mapE.set(n.matiereId, Number(n.note) || 0);
    }

    const notes_j = matiereIds.map((id) => mapJ.get(id) ?? 0.0);
    const notes_e = matiereIds.map((id) => mapE.get(id) ?? 0.0);

    return res.json({ notes_j, notes_e });
  } catch (e) {
    console.error("getNotesForRadar error:", e);
    return res.status(500).json({ message: "Erreur: récupération des notes pour le graphique." });
  }
}

/** PUT /api/notes/update */
export async function updateNote(req, res) {
  try {
    const eleveId = Number(req.body?.eleveId);
    const matiereId = Number(req.body?.matiereId);
    const note = Number(req.body?.note);
    const trimestreLabel = String(req.body?.trimestre || "");
    const noteStatut = String(req.body?.noteStatut || "");

    if (!eleveId || !matiereId || Number.isNaN(note) || !trimestreLabel || !noteStatut) {
      return res.status(400).json({ message: "Champs requis: eleveId, matiereId, note, trimestre, noteStatut." });
    }
    if (note < 0 || note > 20) {
      return res.status(400).json({ message: "La note doit être comprise entre 0 et 20." });
    }

    const trimestre = mapTrimestre(trimestreLabel);
    const statut = mapStatut(noteStatut);

    // On récupère la classe de l'élève pour recalculer le coefficient
    const eleve = await prisma.eleve.findUnique({
      where: { id: eleveId },
      select: { niveauId: true, sectionId: true },
    });
    if (!eleve) return res.status(404).json({ message: "Élève non trouvé." });

    const coefRow = await prisma.coefficient.findFirst({
      where: { matiereId, niveauId: eleve.niveauId, sectionId: eleve.sectionId },
      select: { coefficient: true },
    });
    const coefficient = Number(coefRow?.coefficient || 1);

    const data = {
      note,
      noteTotalJournalier: statut === "NOTE_JOURNALIERE" ? note * coefficient : null,
      noteTotalExamen:     statut === "NOTE_EXAMEN"      ? note * coefficient : null,
    };

    // ⚠️ update sur la contrainte unique COMPOSÉE nommée "uq_note_eleve_matiere_trim_statut"
    const saved = await prisma.note.update({
      where: {
        uq_note_eleve_matiere_trim_statut: { eleveId, matiereId, trimestre, statut },
      },
      data,
      select: { id: true, note: true, noteTotalJournalier: true, noteTotalExamen: true },
    });

    const noteTotal = statut === "NOTE_JOURNALIERE" ? saved.noteTotalJournalier : saved.noteTotalExamen;
    return res.json({ ok: true, id: saved.id, coefficient, note: saved.note, noteTotal });
  } catch (e) {
    // P2025 = record not found -> aucune note existante (on ne crée pas depuis l’archive)
    if (e?.code === "P2025") {
      return res.status(404).json({
        message: "Aucune note existante pour cet élève / matière / trimestre / type (création interdite depuis l'archive).",
      });
    }
    console.error("updateNote error:", e);
    return res.status(500).json({ message: "Erreur: mise à jour de la note." });
  }
}

