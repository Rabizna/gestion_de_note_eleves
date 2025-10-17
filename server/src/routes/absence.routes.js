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
  todayCountsByClass, // ⬅️ import
} from "../controllers/absence.controller.js";
import { requireTitulaireOrProviseurForClass } from "../middleware/roleGuards.js";

const router = Router();

// Métadonnées (labels des sous-boutons)
router.get("/meta", requireAuth, absenceMeta);

// Liste d’élèves par niveau+section (pour formulaire & archive)
router.get("/eleves", requireAuth, listElevesByClass);

// Création d’une absence (protégé)
router.post("/", requireAuth, requireTitulaireOrProviseurForClass, createAbsence);

// Absences d’un élève
router.get("/by-student/:id", requireAuth, listAbsencesByStudent);

// Stats d’absences par élève (archive)
router.get("/archive/stats", requireAuth, statsAbsencesForClass);

// MAJ motif d’une absence (protégé)
router.put("/:id", requireAuth, requireTitulaireOrProviseurForClass, updateAbsenceMotif);

// 🆕 Compteurs du jour par classe
// Chemin consommé par le front : /api/absence/today-by-class
router.get("/today-by-class", requireAuth, todayCountsByClass);

export default router;
