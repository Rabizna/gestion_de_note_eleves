-- CreateEnum
CREATE TYPE "public"."AbsPlage" AS ENUM ('MATIN', 'APRES_MIDI');

-- CreateTable
CREATE TABLE "public"."absence" (
    "id_Absence" SERIAL NOT NULL,
    "id_eleve" INTEGER NOT NULL,
    "date_absence" DATE NOT NULL,
    "plage" "public"."AbsPlage" NOT NULL,
    "motif" VARCHAR(255),
    "id_niveau" INTEGER,
    "id_section" INTEGER,

    CONSTRAINT "absence_pkey" PRIMARY KEY ("id_Absence")
);

-- CreateIndex
CREATE INDEX "idx_absence_date" ON "public"."absence"("date_absence");

-- CreateIndex
CREATE INDEX "idx_absence_niv_sec" ON "public"."absence"("id_niveau", "id_section");

-- CreateIndex
CREATE UNIQUE INDEX "absence_id_eleve_date_absence_plage_key" ON "public"."absence"("id_eleve", "date_absence", "plage");

-- AddForeignKey
ALTER TABLE "public"."absence" ADD CONSTRAINT "absence_id_eleve_fkey" FOREIGN KEY ("id_eleve") REFERENCES "public"."eleve"("id_eleve") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."absence" ADD CONSTRAINT "absence_id_niveau_fkey" FOREIGN KEY ("id_niveau") REFERENCES "public"."niveau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."absence" ADD CONSTRAINT "absence_id_section_fkey" FOREIGN KEY ("id_section") REFERENCES "public"."section"("id_section") ON DELETE SET NULL ON UPDATE CASCADE;
