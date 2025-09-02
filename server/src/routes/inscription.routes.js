// server/src/routes/inscription.routes.js
import { Router } from "express";
import multer from "multer";
import {
  listElevesInscription,
  updateEleveInscription,
  debugLevels,
  divideSecondeSections,
  listElevesInscrits,       // <<< NEW
  getInscriptionRefs,       // <<< NEW
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
router.get("/refs", requireAuth, getInscriptionRefs);          // <<< NEW

// Liste (écrans d’inscription)
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

// Division Seconde A/B/C (proviseur) + inscrit=true
router.post("/seconde/diviser", requireAuth, divideSecondeSections);

// <<< NEW — Liste des élèves inscrits
router.get("/inscrits", requireAuth, listElevesInscrits);

export default router;
