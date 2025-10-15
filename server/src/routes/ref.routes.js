// server/src/routes/ref.routes.js
import { Router } from "express";
import { prisma } from "../prisma.js";

export const refRouter = Router();

/**
 * GET /api/refs/niveaux  (alias: /api/niveaux)
 * Retourne: { niveaux: [{ id, nom }] }
 */
refRouter.get(["/refs/niveaux", "/niveaux"], async (_req, res) => {
  try {
    const rows = await prisma.niveau.findMany();
    const niveaux = (rows || []).map((r) => ({
      id:  r.id ?? r.id_niveau ?? r.ID ?? r.ID_NIVEAU ?? null,
      nom: r.nom ?? r.nom_niveau ?? r.NOM ?? r.NOM_NIVEAU ?? "",
    }));
    return res.json({ niveaux });
  } catch (e) {
    console.error("GET /api/refs/niveaux ->", e);
    return res.status(500).json({ message: "Impossible de charger les niveaux." });
  }
});

/**
 * GET /api/refs/sections  (alias: /api/sections)
 * Retourne: { sections: [{ id, nom }] }
 */
refRouter.get(["/refs/sections", "/sections"], async (_req, res) => {
  try {
    const rows = await prisma.section.findMany();
    const sections = (rows || []).map((r) => {
      const id = r.id ?? r.id_section ?? r.ID ?? r.ID_SECTION ?? null;
      const nom = r.nom ?? r.nom_section ?? r.NOM ?? r.NOM_SECTION ?? "";
      return { id, nom };
    });
    return res.json({ sections });
  } catch (e) {
    console.error("GET /api/refs/sections ->", e);
    return res.status(500).json({ message: "Impossible de charger les sections." });
  }
});
