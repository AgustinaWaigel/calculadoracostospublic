-- CreateEnum
CREATE TYPE "InvestmentKind" AS ENUM ('INVESTMENT', 'RECOVERY');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "acceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "InvestmentMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "InvestmentKind" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentMovement_userId_date_idx" ON "InvestmentMovement"("userId", "date");


-- Los que ya estaban aceptados: la mejor fecha que tenemos es la última modificación.
UPDATE "Quote" SET "acceptedAt" = "updatedAt" WHERE "status" = 'ACCEPTED';

-- Igual que el resto: sin acceso por la API pública de Supabase.
ALTER TABLE "InvestmentMovement" ENABLE ROW LEVEL SECURITY;
