import { prisma } from "../prisma.js";
import path from "path";

/* ---------- Helpers communs ---------- */
const norm = (x) => String(x || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const classNiveauName = (nom) => {
  const n = norm(nom);
  if (n.includes("2nde") || n.includes("2de") || /\b2e?\b/.test(n) || n.includes("2eme") || n.includes("secon")) return "seconde";
  if (n.includes("prem") || n.includes("1re") || n.includes("1ere") || /\b1e?\b/.test(n)) return "premiere";
  if (n.includes("term") || n.includes("tale") || /\btle\b/.test(n) || n.includes("terminal")) return "terminale";
  return null;
};
const toInt = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};
const toDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(+d) ? null : d;
};

/* ---------- (optionnel) niveaux legacy ---------- */
export async function getNiveaux(_req, res) {
  try {
    const niveaux = await prisma.niveau.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    });
    res.json({ niveaux });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur: niveaux." });
  }
}

/* ---------- création élève (inchangé sauf noms génériques) ---------- */
export async function createStudent(req, res) {
  try {
    const {
      nom, prenom, numeroActe, dateNaissance, lieuNaissance, niveauId,
      domicile, telephone, sexe, nbFrere, nbSoeur, distanceKm,
      pereNom, pereProfession, pereTel,
      mereNom, mereProfession, mereTel,
      tuteurNom, tuteurProfession, tuteurTel,
    } = req.body || {};

    if (!nom || !numeroActe || !dateNaissance || !lieuNaissance || !niveauId ||
        !domicile || !telephone || !sexe || !nbFrere || !nbSoeur || !distanceKm ||
        !pereNom || !pereProfession || !pereTel ||
        !mereNom || !mereProfession || !mereTel ||
        !tuteurNom || !tuteurProfession || !tuteurTel) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }

    let photoPath = null;
    if (req.file) {
      photoPath = path.posix.join("/uploads", path.basename(req.file.path));
    }

    const created = await prisma.eleve.create({
      data: {
        nom,
        prenom: prenom || null,
        numeroActe,
        dateNais: new Date(dateNaissance),
        lieuNais: lieuNaissance,
        niveauId: Number(niveauId),
        domicile,
        telephone,
        sexe,
        nbrFrere: Number(nbFrere),
        nbrSoeur: Number(nbSoeur),
        distance: String(distanceKm),
        nomPere: pereNom,
        professionPere: pereProfession,
        telephonePere: pereTel,
        nomMere: mereNom,
        professionMere: mereProfession,
        telephoneMere: mereTel,
        nomTuteur: tuteurNom,
        professionTuteur: tuteurProfession,
        telephoneTuteur: tuteurTel,
        photo: photoPath, // si upload sur disque
      },
      select: { id: true, nom: true, prenom: true, photo: true },
    });

    return res.status(201).json({ eleve: created });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erreur serveur: création élève." });
  }
}

/* ---------- mapping élève (photo multi-formats) ---------- */
function mapEleve(e) {
  if (!e) return null;

  const asDataUrl = (val) => {
    if (!val) return null;
    if (Buffer.isBuffer(val) || ArrayBuffer.isView(val)) {
      const buf = Buffer.isBuffer(val) ? val : Buffer.from(val);
      return `data:image/jpeg;base64,${buf.toString("base64")}`;
    }
    const s = String(val);
    if (s.startsWith("data:image")) return s;
    if (s.startsWith("/uploads/") || s.startsWith("http")) return s;
    if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 100) {
      return `data:image/jpeg;base64,${s.replace(/\s/g, "")}`;
    }
    return s;
  };

  return {
    id: e.id,
    nom: e.nom ?? "",
    prenom: e.prenom ?? "",
    numeroActe: e.numeroActe ?? e.numero_acte ?? "",
    dateNais: e.dateNais ?? e.date_nais ?? null,
    lieuNais: e.lieuNais ?? e.lieu_nais ?? "",
    sexe: e.sexe ?? "",
    photo: asDataUrl(e.photo),
    domicile: e.domicile ?? "",
    telephone: e.telephone ?? "",
    distance: e.distance ?? e.distanceKm ?? "",
    nbrFrere: e.nbrFrere ?? e.nb_frere ?? null,
    nbrSoeur: e.nbrSoeur ?? e.nb_soeur ?? null,
    nomPere: e.nomPere ?? e.pere_nom ?? "",
    professionPere: e.professionPere ?? e.pere_profession ?? "",
    telephonePere: e.telephonePere ?? e.pere_tel ?? "",
    nomMere: e.nomMere ?? e.mere_nom ?? "",
    professionMere: e.professionMere ?? e.mere_profession ?? "",
    telephoneMere: e.telephoneMere ?? e.mere_tel ?? "",
    nomTuteur: e.nomTuteur ?? e.tuteur_nom ?? "",
    professionTuteur: e.professionTuteur ?? e.tuteur_profession ?? "",
    telephoneTuteur: e.telephoneTuteur ?? e.tuteur_tel ?? "",
    niveauId: e.niveauId ?? e.id_niveau ?? null,
    sectionId: e.sectionId ?? e.id_section ?? null,
    niveau: e.niveau ? { id: e.niveau.id, nom: e.niveau.nom } : null,
    section: e.section ? { id: e.section.id, nom: e.section.nom, code: e.section.code } : null,
  };
}

/* ---------- GET /api/students/:id ---------- */
export async function getStudentById(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID invalide." });
    const e = await prisma.eleve.findUnique({
      where: { id },
      include: { niveau: true, section: true },
    });
    if (!e) return res.status(404).json({ message: "Élève introuvable." });
    res.json({ eleve: mapEleve(e) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur chargement élève." });
  }
}

/* ---------- PUT /api/students/:id (niveau jamais modifié) ---------- */
export async function updateStudent(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID invalide." });

    // élève actuel (pour récupérer son niveau et vérifier les règles de section)
    const current = await prisma.eleve.findUnique({
      where: { id },
      include: { niveau: true, section: true },
    });
    if (!current) return res.status(404).json({ message: "Élève introuvable." });

    const b = req.body || {};
    // on ne touche JAMAIS à niveauId (verrou côté back)
    const requestedSectionId = toInt(b.sectionId);

    // Validation de la section selon le niveau
    let dataSection = {};
    if (requestedSectionId) {
      const targetSection = await prisma.section.findUnique({ where: { id: requestedSectionId } });
      if (!targetSection) return res.status(400).json({ message: "Section inconnue." });

      const cls = classNiveauName(current.niveau?.nom);
      const allowedCodes = cls === "seconde" ? ["A","B","C"] : ["L","S","OSE"];
      const code = String(targetSection.code || targetSection.nom || "").toUpperCase();
      if (!allowedCodes.includes(code)) {
        return res.status(400).json({ message: `Section invalide pour ce niveau. Autorisées: ${allowedCodes.join(", ")}` });
      }
      dataSection.sectionId = requestedSectionId;
    }

    const data = {
      // niveauId: (jamais)
      nom: String(b.nom || "").trim(),
      prenom: String(b.prenom || "").trim(),
      numeroActe: String(b.numeroActe || "").trim(),
      dateNais: toDate(b.dateNaissance),
      lieuNais: String(b.lieuNaissance || "").trim(),
      domicile: String(b.domicile || "").trim(),
      telephone: String(b.telephone || "").trim(),
      sexe: String(b.sexe || "").trim(),
      nbrFrere: toInt(b.nbFrere),
      nbrSoeur: toInt(b.nbSoeur),
      distance: String(b.distanceKm || "").trim(),
      nomPere: String(b.pereNom || "").trim(),
      professionPere: String(b.pereProfession || "").trim(),
      telephonePere: String(b.pereTel || "").trim(),
      nomMere: String(b.mereNom || "").trim(),
      professionMere: String(b.mereProfession || "").trim(),
      telephoneMere: String(b.mereTel || "").trim(),
      nomTuteur: String(b.tuteurNom || "").trim(),
      professionTuteur: String(b.tuteurProfession || "").trim(),
      telephoneTuteur: String(b.tuteurTel || "").trim(),
      ...dataSection,
    };

    // photo optionnelle
    const file =
      (req.files || []).find((f) => f.fieldname === "photo") ||
      (req.files || [])[0];
    if (file?.buffer?.length) data.photo = file.buffer;

    const updated = await prisma.eleve.update({
      where: { id },
      data,
      include: { niveau: true, section: true },
    });

    res.json({ eleve: mapEleve(updated) });
  } catch (e) {
    console.error(e);
    if (e?.code === "P2025") return res.status(404).json({ message: "Élève introuvable." });
    res.status(500).json({ message: "Erreur mise à jour élève." });
  }
}
