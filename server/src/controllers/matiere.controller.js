// server/src/controllers/matiere.controller.js
import { prisma } from "../prisma.js";

/**
 * GET /api/matieres
 * Liste des matières
 */
export async function listMatieres(_req, res) {
  try {
    const matieres = await prisma.matiere.findMany({
      select: { id: true, nom: true, code: true },
      orderBy: { id: "asc" },
    });
    res.json({ matieres });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erreur serveur: liste des matières." });
  }
}

/**
 * POST /api/matieres
 * body: { nom, code }
 */
export async function createMatiere(req, res) {
  try {
    const nom = String(req.body?.nom || "").trim();
    const code = String(req.body?.code || "").trim().toUpperCase();

    if (!nom || !code) {
      return res.status(400).json({ message: "Nom et code sont obligatoires." });
    }
    if (!/^[A-Z0-9]{2,10}$/.test(code)) {
      return res.status(400).json({ message: "Code: 2–10 caractères A–Z / 0–9." });
    }

    const created = await prisma.matiere.create({
      data: { nom, code },
      select: { id: true, nom: true, code: true },
    });

    res.status(201).json({ matiere: created });
  } catch (e) {
    // Prisma: contrainte unique violée
    if (e?.code === "P2002") {
      return res.status(409).json({ message: "Ce nom ou ce code existe déjà." });
    }
    console.error(e);
    res.status(500).json({ message: "Erreur serveur: création matière." });
  }
}
