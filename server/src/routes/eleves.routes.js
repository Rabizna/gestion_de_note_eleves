import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listAllEleves } from "../controllers/eleve.controller.js";

const router = Router();

// ➜ /api/eleves/all
router.get("/all", requireAuth, listAllEleves);

export default router;
