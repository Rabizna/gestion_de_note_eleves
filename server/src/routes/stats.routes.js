// server/src/routes/stats.routes.js
import { Router } from "express";
import { getEleveStats } from "../controllers/stats.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/stats/eleves
router.get("/eleves", requireAuth, getEleveStats);

export default router;
