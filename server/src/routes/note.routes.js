// server/src/routes/note.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listEleves,
  listMatieresForClass,
  listNotesForArchive,
  getNotesForRadar,
  createNote,
  updateNote,
} from "../controllers/note.controller.js";
import { requireTitulaireOrProviseurForClass } from "../middleware/roleGuards.js";

const router = Router();
router.use(requireAuth);

// Élèves (lecture libre)
router.get("/eleves", listEleves);
router.get("/eleves/:cycle/:sub", listEleves);

// Matières / coefficients (lecture libre)
router.get("/matieres", listMatieresForClass);
router.get("/matieres/:cycle/:sub", listMatieresForClass);

// Création de note
// → Protégé: seul proviseur ou titulaire de la classe peut créer
router.post("/", requireTitulaireOrProviseurForClass, createNote);

// Archive + Radar (lecture libre)
router.get("/archive", listNotesForArchive);
router.get("/radar", getNotesForRadar);

// Mise à jour de note
// → Protégé: seul proviseur ou titulaire de la classe peut modifier
router.put("/update", requireTitulaireOrProviseurForClass, updateNote);

export default router;
