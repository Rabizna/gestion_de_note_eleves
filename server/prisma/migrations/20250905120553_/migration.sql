/*
  Warnings:

  - A unique constraint covering the columns `[matricule]` on the table `eleve` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "eleve_matricule_key" ON "public"."eleve"("matricule");
