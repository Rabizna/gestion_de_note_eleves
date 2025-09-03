//server/src/routes/note.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listEleves,
  listMatieresForClass,
  createNote,
} from "../controllers/note.controller.js";

const router = Router();

router.use(requireAuth);

// Élèves par (cycle, sub)
router.get("/eleves", listEleves);                  // ?cycle=seconde&sub=A
router.get("/eleves/:cycle/:sub", listEleves);      // /eleves/seconde/A

// Matières/coefs par (cycle, sub)
router.get("/matieres", listMatieresForClass);
router.get("/matieres/:cycle/:sub", listMatieresForClass);

// Créer une note
router.post("/", createNote);

export default router;
