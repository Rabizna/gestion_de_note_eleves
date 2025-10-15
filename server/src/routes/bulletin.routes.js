// server/src/routes/bulletin.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  bulletinMeta,
  listElevesByClass,
  getBulletinData,
} from "../controllers/bulletin.controller.js";

const router = Router();

// Métadonnées (labels des sous-boutons A/B/C ou L/S/OSE)
router.get("/meta", requireAuth, bulletinMeta);

// Liste d'élèves par niveau+section
router.get("/eleves", requireAuth, listElevesByClass);

// Données complètes du bulletin pour un élève
router.get("/data", requireAuth, getBulletinData);

export default router;