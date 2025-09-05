// server/src/app.js
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.routes.js";
import { refRouter } from "./routes/ref.routes.js";
import studentsRouter from "./routes/students.routes.js";
import inscriptionRouter from "./routes/inscription.routes.js";
import statsRouter from "./routes/stats.routes.js";
import absenceRouter from "./routes/absence.routes.js";
import matiereRoutes from "./routes/matiere.routes.js";
import coefficientsRoutes from "./routes/coefficients.routes.js";
import noteRoutes from "./routes/note.routes.js";
import matriculeRoutes from "./routes/matricule.routes.js";

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

// Petit log
app.use((req, _res, next) => {
  console.log(req.method, req.path);
  next();
});

// ---------- Static /uploads (IMPORTANT: dossier réel "Uploads") ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servez TOUJOURS le dossier "Uploads" sous l'URL en minuscules /uploads
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "Uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=3600");
    },
  })
);

// ---------- Routes API ----------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/matieres", matiereRoutes);

// alias: /api/coeff et /api/coefficients pointent vers le même router
app.use("/api/coeff", coefficientsRoutes);
app.use("/api/coefficients", coefficientsRoutes);

app.use("/api/auth", authRouter);
if (refRouter) app.use("/api", refRouter);
if (studentsRouter) app.use("/api", studentsRouter);

app.use("/api/absence", absenceRouter);
app.use("/api/inscription", inscriptionRouter);
app.use("/api/stats", statsRouter);

// Notes (élèves/matières/insert)
app.use("/api/notes", noteRoutes);

// Matricules
app.use("/api/matricule", matriculeRoutes);

// 404 JSON (à la fin, après toutes les routes /api/*)
app.use("/api", (_req, res) =>
  res.status(404).json({ message: "Route API introuvable." })
);
