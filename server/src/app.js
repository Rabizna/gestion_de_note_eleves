// server/src/app.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.routes.js";
import { refRouter } from "./routes/ref.routes.js";           // si présent
import studentsRouter from "./routes/students.routes.js";      // si présent
import inscriptionRouter from "./routes/inscription.routes.js";
import statsRouter from "./routes/stats.routes.js";            // <<< import
import absenceRouter from "./routes/absence.routes.js";

import matiereRoutes from "./routes/matiere.routes.js";

import coefficientsRoutes from "./routes/coefficients.routes.js";

export const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173", process.env.FRONT_ORIGIN].filter(Boolean),
    credentials: true,
  })
);

// (optionnel) petit log pour debug
app.use((req, _res, next) => { console.log(req.method, req.path); next(); });

// /uploads statique
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/matieres", matiereRoutes);

app.use("/api/coeff", coefficientsRoutes);

// —— routes ——
// Auth
app.use("/api/auth", authRouter);

// Référentiels / élèves (si tu les as)
if (refRouter) app.use("/api", refRouter);
if (studentsRouter) app.use("/api", studentsRouter);

// Absence
app.use("/api/absence", absenceRouter);

// Inscription
app.use("/api/inscription", inscriptionRouter);

// >>> STATS (monter AVANT le 404)
app.use("/api/stats", statsRouter);

app.use("/api/coefficients", coefficientsRoutes);

// 404 JSON pour toute route /api/* non gérée (A LA FIN !)
app.use("/api", (_req, res) => res.status(404).json({ message: "Route API introuvable." }));
