-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TaxCondition" AS ENUM ('MONOTRIBUTO', 'RESPONSABLE_INSCRIPTO', 'EXENTO');

-- CreateEnum
CREATE TYPE "FixedAllocation" AS ENUM ('SIZE', 'TIME');

-- CreateEnum
CREATE TYPE "PricingMode" AS ENUM ('MARGIN', 'MARKUP');

-- CreateEnum
CREATE TYPE "SupplyKind" AS ENUM ('MATERIAL', 'SERVICE');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "FixedCostCategory" AS ENUM ('ALQUILER', 'SERVICIOS', 'INTERNET', 'IMPUESTOS', 'SUSCRIPCIONES', 'OTROS');

-- CreateEnum
CREATE TYPE "LifeUnit" AS ENUM ('UNITS', 'HOURS');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('DIRECT', 'WHOLESALE', 'OTHER');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "instagram" TEXT,
    "address" TEXT,
    "taxCondition" "TaxCondition" NOT NULL DEFAULT 'MONOTRIBUTO',
    "ivaPercent" DECIMAL(65,30) NOT NULL DEFAULT 21,
    "monthlyUnitsEstimate" INTEGER NOT NULL DEFAULT 100,
    "fixedAllocation" "FixedAllocation" NOT NULL DEFAULT 'SIZE',
    "monthlyHoursEstimate" INTEGER NOT NULL DEFAULT 80,
    "defaultMarginPercent" DECIMAL(65,30) NOT NULL DEFAULT 40,
    "pricingMode" "PricingMode" NOT NULL DEFAULT 'MARGIN',
    "roundTo" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 7,
    "quoteNumberSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supply" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SupplyKind" NOT NULL DEFAULT 'MATERIAL',
    "category" TEXT,
    "purchaseUnit" TEXT NOT NULL,
    "usageUnit" TEXT NOT NULL DEFAULT 'unidad',
    "packQuantity" DECIMAL(65,30) NOT NULL,
    "packPrice" DECIMAL(65,30) NOT NULL,
    "supplier" TEXT,
    "url" TEXT,
    "priceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyPriceHistory" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "packPrice" DECIMAL(65,30) NOT NULL,
    "packQuantity" DECIMAL(65,30) NOT NULL,
    "source" "PriceSource" NOT NULL DEFAULT 'MANUAL',
    "usdRate" DECIMAL(65,30),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hourlyRate" DECIMAL(65,30) NOT NULL,
    "isOwn" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hourlyRate" DECIMAL(65,30) NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedCost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FixedCostCategory" NOT NULL DEFAULT 'OTROS',
    "monthlyAmount" DECIMAL(65,30) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "usefulLife" DECIMAL(65,30) NOT NULL,
    "lifeUnit" "LifeUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "batchYield" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "wastePercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "includeFixedCosts" BOOLEAN NOT NULL DEFAULT true,
    "fixedWeight" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "marginPercent" DECIMAL(65,30),
    "pricingMode" "PricingMode",
    "duplicatedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSupply" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ProductSupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLabor" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "minutes" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ProductLabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMachine" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "usage" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "ProductMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesChannel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL DEFAULT 'OTHER',
    "commissionPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "fixedFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "shippingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paymentFeePercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "installmentsPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "priceAdjustPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "applyIva" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SalesChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolumeTier" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "discountPercent" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "VolumeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "notes" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "discountPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "volumeTiers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintInk" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'OTRO',
    "color" TEXT NOT NULL DEFAULT '#999999',
    "bottlePrice" DECIMAL(65,30) NOT NULL,
    "yieldPages" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintInk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supply_userId_idx" ON "Supply"("userId");

-- CreateIndex
CREATE INDEX "Supply_category_idx" ON "Supply"("category");

-- CreateIndex
CREATE INDEX "SupplyPriceHistory_supplyId_recordedAt_idx" ON "SupplyPriceHistory"("supplyId", "recordedAt");

-- CreateIndex
CREATE INDEX "LaborProfile_userId_idx" ON "LaborProfile"("userId");

-- CreateIndex
CREATE INDEX "MarketRate_userId_idx" ON "MarketRate"("userId");

-- CreateIndex
CREATE INDEX "FixedCost_userId_idx" ON "FixedCost"("userId");

-- CreateIndex
CREATE INDEX "Machine_userId_idx" ON "Machine"("userId");

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "Product"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSupply_productId_supplyId_key" ON "ProductSupply"("productId", "supplyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLabor_productId_profileId_key" ON "ProductLabor"("productId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMachine_productId_machineId_key" ON "ProductMachine"("productId", "machineId");

-- CreateIndex
CREATE INDEX "SalesChannel_userId_idx" ON "SalesChannel"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VolumeTier_userId_minQuantity_key" ON "VolumeTier"("userId", "minQuantity");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_userId_number_key" ON "Quote"("userId", "number");

-- CreateIndex
CREATE INDEX "PrintInk_userId_idx" ON "PrintInk"("userId");

-- AddForeignKey
ALTER TABLE "SupplyPriceHistory" ADD CONSTRAINT "SupplyPriceHistory_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSupply" ADD CONSTRAINT "ProductSupply_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSupply" ADD CONSTRAINT "ProductSupply_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLabor" ADD CONSTRAINT "ProductLabor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLabor" ADD CONSTRAINT "ProductLabor_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LaborProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMachine" ADD CONSTRAINT "ProductMachine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMachine" ADD CONSTRAINT "ProductMachine_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Supabase publica las tablas de `public` por su API con la clave anónima. La app entra con
-- Prisma (rol dueño, que no pasa por RLS), así que se activa RLS sin políticas: por la API no se
-- puede leer ni escribir nada.
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supply" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplyPriceHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LaborProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FixedCost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Machine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductSupply" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductLabor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductMachine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesChannel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VolumeTier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuoteItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrintInk" ENABLE ROW LEVEL SECURITY;
