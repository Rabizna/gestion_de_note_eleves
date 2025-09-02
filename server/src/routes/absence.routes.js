// server/src/routes/absence.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  absenceMeta,
  listElevesByClass,
  createAbsence,
  listAbsencesByStudent,
  statsAbsencesForClass,
  updateAbsenceMotif,
} from "../controllers/absence.controller.js";

const router = Router();

// Métadonnées (labels des sous-boutons)
router.get("/meta", requireAuth, absenceMeta);

// Liste d’élèves par niveau+section (pour formulaire & archive)
router.get("/eleves", requireAuth, listElevesByClass);

// Création d’une absence (formulaire)
router.post("/", requireAuth, createAbsence);

// Absences d’un élève (pour fiche archive)
router.get("/by-student/:id", requireAuth, listAbsencesByStudent);

// Stats d’absences par élève (pour graphique archive)
router.get("/archive/stats", requireAuth, statsAbsencesForClass);

// MAJ motif d’une absence
router.put("/:id", requireAuth, updateAbsenceMotif);

export default router;
