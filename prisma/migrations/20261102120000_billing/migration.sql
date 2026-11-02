-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('NONE', 'SIMPLE', 'COMPLETE', 'FOUNDER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'PENDING', 'AUTHORIZED', 'PAUSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "mpPreapprovalId" TEXT,
ADD COLUMN     "plan" "BillingPlan" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "subscriptionSyncedAt" TIMESTAMP(3),
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Business_mpPreapprovalId_key" ON "Business"("mpPreapprovalId");


-- Las cuentas que ya existen son fundadoras: plan Completo gratis para siempre.
UPDATE "Business" SET "plan" = 'FOUNDER';
