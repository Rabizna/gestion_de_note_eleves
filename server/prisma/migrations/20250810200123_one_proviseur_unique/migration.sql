-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROVISEUR', 'PROFESSEUR');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");


-- Index unique partiel : max 1 PROVISEUR
CREATE UNIQUE INDEX one_proviseur_unique
ON "User" ((CASE WHEN role = 'PROVISEUR' THEN 1 ELSE NULL END));
