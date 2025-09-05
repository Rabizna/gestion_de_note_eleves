// server/src/routes/matricule.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getAllEleves,
  attribuerMatricules,
  reordonnerMatricules,
  resetMatricules,
} from "../controllers/matricule.controller.js";

const router = Router();

// Protéger toutes les routes de ce module
router.use(requireAuth);

// GET /api/matricule/eleves
router.get("/eleves", getAllEleves);

// POST /api/matricule/attribuer
router.post("/attribuer", attribuerMatricules);

// PUT /api/matricule/reordonner
router.put("/reordonner", reordonnerMatricules);

// (optionnel pour tests) PUT /api/matricule/reset
router.put("/reset", resetMatricules);

export default router;
