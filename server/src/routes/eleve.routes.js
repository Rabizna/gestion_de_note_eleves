// server/src/routes/eleve.routes.js
import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const eleveRouter = Router();

/** LIST */
eleveRouter.get("/eleves", requireAuth, async (_req, res) => {
  const eleves = await prisma.eleve.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: { niveau: true, section: true },
  });
  res.json({ eleves });
});

/** CREATE */
eleveRouter.post("/eleves", requireAuth, async (req, res) => {
  try {
    const data = req.body || {};
    // sécurisation légère des booleans
    ["inscrit", "redoublant", "renvoye"].forEach((k) => {
      if (k in data) data[k] = Boolean(data[k]);
    });
    // date
    if (data.dateNais) data.dateNais = new Date(data.dateNais);

    const eleve = await prisma.eleve.create({ data });
    res.json({ eleve });
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Création élève invalide" });
  }
});

/** UPDATE */
eleveRouter.put("/eleves/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body || {};
  if (data.dateNais) data.dateNais = new Date(data.dateNais);

  const eleve = await prisma.eleve.update({ where: { id }, data });
  res.json({ eleve });
});

/** DELETE */
eleveRouter.delete("/eleves/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await prisma.eleve.delete({ where: { id } });
  res.json({ ok: true });
});
