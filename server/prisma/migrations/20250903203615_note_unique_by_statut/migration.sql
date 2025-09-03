/*
  Warnings:

  - A unique constraint covering the columns `[id_eleve,id_matiere,trimestre,note_statut]` on the table `note` will be added. If there are existing duplicate values, this will fail.
  - Made the column `note_statut` on table `note` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."note_id_eleve_id_matiere_trimestre_key";

-- AlterTable
ALTER TABLE "public"."note" ALTER COLUMN "note_statut" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "note_id_eleve_id_matiere_trimestre_note_statut_key" ON "public"."note"("id_eleve", "id_matiere", "trimestre", "note_statut");
