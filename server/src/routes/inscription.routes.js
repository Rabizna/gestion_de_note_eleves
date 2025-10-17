// server/src/routes/inscription.routes.js
import { Router } from "express";
import multer from "multer";
import {
  listElevesInscription,
  updateEleveInscription,
  debugLevels,
  divideSecondeSections,
  listElevesInscrits,
  getInscriptionRefs,
  updateAllClassNumbers,
} from "../controllers/inscription.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// DEBUG
router.get("/levels-debug", requireAuth, debugLevels);

// Refs pour filtres
router.get("/refs", requireAuth, getInscriptionRefs);

// Liste (écrans d'inscription)
router.get("/eleves", requireAuth, listElevesInscription);

// MAJ élève (inscription PT)
router.put(
  "/eleves/:id",
  requireAuth,
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) return res.status(400).json({ message: String(err) });
      next();
    });
  },
  updateEleveInscription
);

// Division Seconde A/B/C (proviseur) + inscrit=true + numérotation
router.post("/seconde/diviser", requireAuth, divideSecondeSections);

// Liste des élèves inscrits (avec numéros)
router.get("/inscrits", requireAuth, listElevesInscrits);

// Mise à jour manuelle/automatique des numéros
router.post("/update-numbers", requireAuth, updateAllClassNumbers);

export default router;