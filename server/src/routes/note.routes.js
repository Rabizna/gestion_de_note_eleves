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

const router = Router();
router.use(requireAuth);

// Élèves
router.get("/eleves", listEleves);
router.get("/eleves/:cycle/:sub", listEleves);

// Matières / coefficients
router.get("/matieres", listMatieresForClass);
router.get("/matieres/:cycle/:sub", listMatieresForClass);

// Création
router.post("/", createNote);

// Archive + Radar + Update
router.get("/archive", listNotesForArchive);
router.get("/radar", getNotesForRadar);
router.put("/update", updateNote);

export default router;
