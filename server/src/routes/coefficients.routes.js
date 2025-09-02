import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listCoefficients,
  listCoefficientsCompact,
  upsertPropagate,
  bulkUpsert,
} from "../controllers/coefficients.controller.js";

const router = Router();

router.get("/", requireAuth, listCoefficients);
router.get("/compact", requireAuth, listCoefficientsCompact);
router.post("/upsert-propagate", requireAuth, upsertPropagate);
router.post("/bulk-upsert", requireAuth, bulkUpsert);

export default router;
