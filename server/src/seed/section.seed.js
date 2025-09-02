// server/src/seed/section.seed.js
import { prisma } from "../prisma.js";

export async function seedSections() {
  // si tu veux ré-exécuter sans dupliquer, on met un petit garde-fou
  const count = await prisma.section.count();
  if (count > 0) return;

  await prisma.section.createMany({
    data: [
      { id: 1, nom: "A" },
      { id: 2, nom: "B" },
      { id: 3, nom: "C" },
      { id: 4, nom: "L" },
      { id: 5, nom: "S" },
      { id: 6, nom: "OSE" },
    ],
    skipDuplicates: true,
  });
}
