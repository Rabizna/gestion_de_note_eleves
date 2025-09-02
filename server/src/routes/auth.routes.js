// server/src/routes/auth.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { register, login, me, logout, updateProfile } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);

/* ---------- Multer (accepte n'importe quel nom de champ fichier) ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dossier uploads à la racine du projet "server/"
const uploadsDir = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`),
});

// Pas de filter ici -> on accepte (jpg/png/jpeg/gif/…) ; à restreindre si tu veux.
const uploadAny = multer({ storage }).any(); // <= clé: ANY champs

// PUT /api/auth/profile : met à jour nom, email et photo (multipart OU JSON)
router.put("/profile", requireAuth, uploadAny, updateProfile);

export default router;
