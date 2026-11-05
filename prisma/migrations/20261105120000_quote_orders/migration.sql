-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "deliveryDate" TIMESTAMP(3),
ADD COLUMN     "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "production" "ProductionStatus" NOT NULL DEFAULT 'PENDING';
