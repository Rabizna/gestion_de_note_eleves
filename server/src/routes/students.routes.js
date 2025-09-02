// server/src/routes/students.routes.js
import { Router } from "express";
import multer from "multer";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getStudentById, updateStudent } from "../controllers/students.controller.js";

const router = Router();

/**
 * Ton schéma Prisma définit:
 *  - photo: Bytes?  -> on utilise multer.memoryStorage() pour obtenir file.buffer
 *  - dateNais / lieuNais / numeroActe / nbrFrere / nbrSoeur / distance / telephone...
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
});

// helpers
const toIntOrNull = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const emptyToNull = (v) => {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
};

// POST /api/students
router.post("/students", upload.single("photo"), async (req, res) => {
  try {
    const b = req.body || {};

    // Validation minimale (côté front tu vérifies déjà)
    const required = [
      "nom",
      "numeroActe",
      "dateNaissance",
      "lieuNaissance",
      "niveauId",
      "domicile",
      "telephone",
      "sexe",
      "pereNom",
      "pereProfession",
      "pereTel",
      "mereNom",
      "mereProfession",
      "mereTel",
      "tuteurNom",
      "tuteurProfession",
      "tuteurTel",
    ];
    const missing = required.filter((k) => !String(b[k] || "").trim());
    if (missing.length) {
      return res
        .status(400)
        .json({ message: `Champs manquants: ${missing.join(", ")}` });
    }

    // Conversions / mapping vers les VRAIS noms Prisma
    const data = {
      nom: emptyToNull(b.nom),
      prenom: emptyToNull(b.prenom),

      // schéma: dateNais / lieuNais / numeroActe
      dateNais: b.dateNaissance ? new Date(b.dateNaissance) : null,
      lieuNais: emptyToNull(b.lieuNaissance),
      numeroActe: emptyToNull(b.numeroActe),

      // relation
      niveauId: toIntOrNull(b.niveauId),

      // infos élève
      domicile: emptyToNull(b.domicile),
      telephone: emptyToNull(b.telephone), // unique
      sexe: emptyToNull(b.sexe),

      // compteurs + distance (varchar(5), ex: "1 km", "5+ km")
      nbrFrere: toIntOrNull(b.nbFrere),
      nbrSoeur: toIntOrNull(b.nbSoeur),
      distance: emptyToNull(b.distanceKm),

      // parents / tuteur (noms exacts du schéma)
      nomPere: emptyToNull(b.pereNom),
      professionPere: emptyToNull(b.pereProfession),
      telephonePere: emptyToNull(b.pereTel),

      nomMere: emptyToNull(b.mereNom),
      professionMere: emptyToNull(b.mereProfession),
      telephoneMere: emptyToNull(b.mereTel),

      nomTuteur: emptyToNull(b.tuteurNom),
      professionTuteur: emptyToNull(b.tuteurProfession),
      telephoneTuteur: emptyToNull(b.tuteurTel),

      // photo: Bytes?
      photo: req.file ? req.file.buffer : null,

      // tu peux initialiser inscrit/redoublant/renvoye si tu veux
      // inscrit: false,
      // redoublant: false,
      // renvoye: false,
    };

    // Création
    const eleve = await prisma.eleve.create({ data });
    return res.status(201).json({ eleve });
  } catch (e) {
    console.error("POST /api/students ->", e);

    // contrainte unique (ex: telephone déjà présent)
    if (e?.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Contrainte unique violée (téléphone déjà utilisé ?)" });
    }
    // contrainte FK (ex: niveauId invalide)
    if (e?.code === "P2003") {
      return res
        .status(400)
        .json({ message: "Référence invalide (niveau inexistant ?)" });
    }

    return res
      .status(500)
      .json({ message: "Erreur serveur pendant la création." });
  }
});

// GET /api/students/:id  → récupérer un élève
router.get("/students/:id", requireAuth, getStudentById);

// PUT /api/students/:id  → modifier un élève (photo optionnelle)
router.put(
  "/students/:id",
  requireAuth,
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) return res.status(400).json({ message: String(err) });
      next();
    });
  },
  updateStudent
);

export default router;
