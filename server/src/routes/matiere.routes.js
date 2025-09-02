// server/src/routes/matiere.routes.js
import { Router } from "express";
import { listMatieres, createMatiere } from "../controllers/matiere.controller.js";

const router = Router();

router.get("/", listMatieres);
router.post("/", createMatiere);

// (optionnel) pour plus tard: router.put("/:id", ...), router.delete("/:id", ...)

export default router;
