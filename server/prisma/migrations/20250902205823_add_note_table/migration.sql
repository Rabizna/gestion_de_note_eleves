-- CreateEnum
CREATE TYPE "public"."Trimestre" AS ENUM ('1er trimestre', '2eme trimestre', '3eme trimestre');

-- CreateEnum
CREATE TYPE "public"."NoteStatut" AS ENUM ('Note Journalière', 'Note Examen', 'Note Moyenne', 'Note Totale');

-- CreateTable
CREATE TABLE "public"."note" (
    "id_note" SERIAL NOT NULL,
    "id_eleve" INTEGER NOT NULL,
    "id_matiere" INTEGER NOT NULL,
    "trimestre" "public"."Trimestre" NOT NULL,
    "note" DOUBLE PRECISION,
    "note_total_journalier" DOUBLE PRECISION,
    "note_total_examen" DOUBLE PRECISION,
    "note_moyenne" DOUBLE PRECISION,
    "note_total" DOUBLE PRECISION,
    "note_statut" "public"."NoteStatut",

    CONSTRAINT "note_pkey" PRIMARY KEY ("id_note")
);

-- CreateIndex
CREATE INDEX "idx_note_eleve" ON "public"."note"("id_eleve");

-- CreateIndex
CREATE INDEX "idx_note_matiere" ON "public"."note"("id_matiere");

-- CreateIndex
CREATE UNIQUE INDEX "note_id_eleve_id_matiere_trimestre_key" ON "public"."note"("id_eleve", "id_matiere", "trimestre");

-- AddForeignKey
ALTER TABLE "public"."note" ADD CONSTRAINT "note_id_eleve_fkey" FOREIGN KEY ("id_eleve") REFERENCES "public"."eleve"("id_eleve") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."note" ADD CONSTRAINT "note_id_matiere_fkey" FOREIGN KEY ("id_matiere") REFERENCES "public"."matiere"("id_matiere") ON DELETE CASCADE ON UPDATE CASCADE;
