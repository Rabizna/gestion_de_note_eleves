/*
  Warnings:

  - A unique constraint covering the columns `[titulaire_niveau_id,titulaire_section_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "titulaire_niveau_id" INTEGER,
ADD COLUMN     "titulaire_section_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_titulaire_niveau_id_titulaire_section_id_key" ON "public"."User"("titulaire_niveau_id", "titulaire_section_id");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_titulaire_niveau_id_fkey" FOREIGN KEY ("titulaire_niveau_id") REFERENCES "public"."niveau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_titulaire_section_id_fkey" FOREIGN KEY ("titulaire_section_id") REFERENCES "public"."section"("id_section") ON DELETE SET NULL ON UPDATE CASCADE;
