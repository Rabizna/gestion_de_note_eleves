-- CreateTable
CREATE TABLE "eleve" (
    "id_eleve" SERIAL NOT NULL,
    "nom" VARCHAR(100),
    "prenom" VARCHAR(100),
    "inscrit" BOOLEAN NOT NULL DEFAULT false,
    "redoublant" BOOLEAN NOT NULL DEFAULT false,
    "renvoye" BOOLEAN NOT NULL DEFAULT false,
    "date_nais" DATE,
    "lieu_nais" VARCHAR(100),
    "sexe" VARCHAR(20),
    "photo" BYTEA,
    "numero_acte" VARCHAR(100),
    "domicile" VARCHAR(255),
    "distance" VARCHAR(5),
    "nbr_soeur" INTEGER,
    "nbr_frere" INTEGER,
    "nom_pere" VARCHAR(100),
    "profession_pere" VARCHAR(100),
    "telephone_pere" VARCHAR(20),
    "nom_mere" VARCHAR(100),
    "profession_mere" VARCHAR(100),
    "telephone_mere" VARCHAR(20),
    "nom_tuteur" VARCHAR(100),
    "profession_tuteur" VARCHAR(100),
    "telephone_tuteur" VARCHAR(20),
    "telephone" VARCHAR(20),
    "numero" INTEGER,
    "matricule" INTEGER,
    "id_niveau" INTEGER,
    "id_section" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eleve_pkey" PRIMARY KEY ("id_eleve")
);

-- CreateTable
CREATE TABLE "niveau" (
    "id" INTEGER NOT NULL,
    "nom_niveau" VARCHAR(100) NOT NULL,

    CONSTRAINT "niveau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section" (
    "id_section" SERIAL NOT NULL,
    "nom_section" VARCHAR(100) NOT NULL,

    CONSTRAINT "section_pkey" PRIMARY KEY ("id_section")
);

-- CreateIndex
CREATE UNIQUE INDEX "eleve_telephone_key" ON "eleve"("telephone");

-- AddForeignKey
ALTER TABLE "eleve" ADD CONSTRAINT "eleve_id_niveau_fkey" FOREIGN KEY ("id_niveau") REFERENCES "niveau"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleve" ADD CONSTRAINT "eleve_id_section_fkey" FOREIGN KEY ("id_section") REFERENCES "section"("id_section") ON DELETE SET NULL ON UPDATE CASCADE;
