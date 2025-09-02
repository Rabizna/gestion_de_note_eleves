/*
  Warnings:

  - You are about to alter the column `code_matiere` on the `matiere` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `VarChar(10)`.

*/
-- AlterTable
ALTER TABLE "public"."matiere" ALTER COLUMN "nom_matiere" SET DATA TYPE VARCHAR(150),
ALTER COLUMN "code_matiere" SET DATA TYPE VARCHAR(10);

-- CreateTable
CREATE TABLE "public"."coefficient" (
    "id_coefficient" SERIAL NOT NULL,
    "id_matiere" INTEGER NOT NULL,
    "id_niveau" INTEGER NOT NULL,
    "id_section" INTEGER NOT NULL,
    "coefficient" INTEGER NOT NULL,

    CONSTRAINT "coefficient_pkey" PRIMARY KEY ("id_coefficient")
);

-- CreateIndex
CREATE UNIQUE INDEX "coefficient_id_matiere_id_niveau_id_section_key" ON "public"."coefficient"("id_matiere", "id_niveau", "id_section");

-- AddForeignKey
ALTER TABLE "public"."coefficient" ADD CONSTRAINT "coefficient_id_matiere_fkey" FOREIGN KEY ("id_matiere") REFERENCES "public"."matiere"("id_matiere") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coefficient" ADD CONSTRAINT "coefficient_id_niveau_fkey" FOREIGN KEY ("id_niveau") REFERENCES "public"."niveau"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coefficient" ADD CONSTRAINT "coefficient_id_section_fkey" FOREIGN KEY ("id_section") REFERENCES "public"."section"("id_section") ON DELETE CASCADE ON UPDATE CASCADE;
