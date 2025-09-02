// server/src/routes/ref.routes.js
import { Router } from "express";
import { prisma } from "../prisma.js";

export const refRouter = Router();

/**
 * GET /api/refs/niveaux  (alias: /api/niveaux)
 * Retourne: { niveaux: [{ id, nom }] }
 *
 * Remarque:
 * - Le mapping supporte des schémas avec "id/nom" OU "id_niveau/nom_niveau".
 */
refRouter.get(["/refs/niveaux", "/niveaux"], async (_req, res) => {
  try {
    // Pas de "select" ni "orderBy" pour rester compatible avec les deux schémas
    const rows = await prisma.niveau.findMany();

    const niveaux = (rows || []).map((r) => ({
      id:
        r.id ??
        r.id_niveau ??
        r.ID ??
        r.ID_NIVEAU ??
        null,
      nom:
        r.nom ??
        r.nom_niveau ??
        r.NOM ??
        r.NOM_NIVEAU ??
        "",
    }));

    return res.json({ niveaux });
  } catch (e) {
    console.error("GET /api/refs/niveaux ->", e);
    return res
      .status(500)
      .json({ message: "Impossible de charger les niveaux." });
  }
});
