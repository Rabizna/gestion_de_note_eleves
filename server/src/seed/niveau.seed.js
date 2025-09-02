import { prisma } from "../prisma.js";

export async function seedNiveaux() {
  const count = await prisma.niveau.count();
  if (count > 0) return;

  await prisma.niveau.createMany({
    data: [
      { id: 1, nom: "Seconde"   },
      { id: 2, nom: "Première"  },
      { id: 3, nom: "Terminale" },
    ],
    skipDuplicates: true,
  });
}
