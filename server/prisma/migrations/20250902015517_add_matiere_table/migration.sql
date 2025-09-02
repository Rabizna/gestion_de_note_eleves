-- CreateTable
CREATE TABLE "public"."matiere" (
    "id_matiere" SERIAL NOT NULL,
    "nom_matiere" VARCHAR(100) NOT NULL,
    "code_matiere" VARCHAR(20) NOT NULL,

    CONSTRAINT "matiere_pkey" PRIMARY KEY ("id_matiere")
);

-- CreateIndex
CREATE UNIQUE INDEX "matiere_nom_matiere_key" ON "public"."matiere"("nom_matiere");

-- CreateIndex
CREATE UNIQUE INDEX "matiere_code_matiere_key" ON "public"."matiere"("code_matiere");
