import "server-only";
import type { Prisma } from "@prisma/client";
import { userDb } from "@/lib/db";
import { setUpAccount } from "./onboarding";
import {
  computeProductCost,
  fixedCostPerMinute,
  fixedCostPerUnit,
  summarizeProductPricing,
  totalMonthlyFixedCosts,
  type ProductCostBreakdown,
  type ProductPricingSummary,
} from "@/lib/calc";

export const productInclude = {
  supplies: { include: { supply: true }, orderBy: { id: "asc" } },
  labor: { include: { profile: true }, orderBy: { id: "asc" } },
  machines: { include: { machine: true }, orderBy: { id: "asc" } },
} satisfies Prisma.ProductInclude;

export type ProductWithRecipe = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Uno por cuenta: la primera vez se crea con valores por defecto. */
export async function getBusiness() {
  const db = await userDb();
  const existing = await db.business.findUnique({ where: { id: db.$userId } });
  return existing ?? setUpAccount(db);
}

export async function getCostingContext() {
  const db = await userDb();
  const [business, fixedCosts, machines, channels, tiers] = await Promise.all([
    getBusiness(),
    db.fixedCost.findMany({ where: { active: true } }),
    db.machine.count(),
    db.salesChannel.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.volumeTier.findMany({ orderBy: { minQuantity: "asc" } }),
  ]);
  const monthlyFixed = totalMonthlyFixedCosts(fixedCosts);
  return {
    business,
    monthlyFixed,
    fixedPerUnit: fixedCostPerUnit(monthlyFixed, business.monthlyUnitsEstimate),
    fixedPerMinute: fixedCostPerMinute(monthlyFixed, business.monthlyHoursEstimate),
    machineCount: machines,
    channels,
    tiers,
  };
}

export type CostingContext = Awaited<ReturnType<typeof getCostingContext>>;

/** Fijos según el método elegido: por tamaño (unidades normales) o por minutos de trabajo. */
function fixedInput(product: ProductWithRecipe, ctx: CostingContext) {
  if (!product.includeFixedCosts) return { fixedCostPerUnit: 0 };
  return ctx.business.fixedAllocation === "TIME"
    ? { fixedCostPerMinute: ctx.fixedPerMinute }
    : { fixedCostPerUnit: ctx.fixedPerUnit, fixedWeight: product.fixedWeight };
}

export function costProduct(product: ProductWithRecipe, ctx: CostingContext): ProductCostBreakdown {
  return computeProductCost({
    supplies: product.supplies.map((s) => ({
      id: s.supplyId,
      name: s.supply.name,
      packPrice: s.supply.packPrice,
      packQuantity: s.supply.packQuantity,
      quantity: s.quantity,
    })),
    labor: product.labor.map((l) => ({
      id: l.profileId,
      name: l.profile.name,
      hourlyRate: l.profile.hourlyRate,
      minutes: l.minutes,
      isOwn: l.profile.isOwn,
    })),
    machines: product.machines.map((m) => ({
      id: m.machineId,
      name: m.machine.name,
      price: m.machine.price,
      usefulLife: m.machine.usefulLife,
      lifeUnit: m.machine.lifeUnit,
      usage: m.usage,
    })),
    batchYield: product.batchYield,
    wastePercent: product.wastePercent,
    ...fixedInput(product, ctx),
  });
}

export function priceProduct(
  product: ProductWithRecipe,
  cost: ProductCostBreakdown,
  ctx: CostingContext,
): ProductPricingSummary {
  const b = ctx.business;
  return summarizeProductPricing({
    cost,
    settings: {
      taxCondition: b.taxCondition,
      ivaPercent: b.ivaPercent,
      defaultMarginPercent: b.defaultMarginPercent,
      pricingMode: b.pricingMode,
      roundTo: b.roundTo,
    },
    product: { marginPercent: product.marginPercent, pricingMode: product.pricingMode },
    channels: ctx.channels.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      commissionPercent: c.commissionPercent,
      fixedFee: c.fixedFee,
      shippingCost: c.shippingCost,
      paymentFeePercent: c.paymentFeePercent,
      installmentsPercent: c.installmentsPercent,
      priceAdjustPercent: c.priceAdjustPercent,
      applyIva: c.applyIva,
    })),
    tiers: ctx.tiers.map((t) => ({ minQuantity: t.minQuantity, discountPercent: t.discountPercent })),
    monthlyFixedCosts: ctx.monthlyFixed,
  });
}

/** Costo + precio de todos los productos (para listados y dashboard). */
export async function getAllProductsWithPricing() {
  const db = await userDb();
  const [ctx, products] = await Promise.all([
    getCostingContext(),
    db.product.findMany({ include: productInclude, orderBy: { updatedAt: "desc" } }),
  ]);
  return {
    ctx,
    items: products.map((product) => {
      const cost = costProduct(product, ctx);
      let pricing: ProductPricingSummary | null = null;
      let pricingError: string | null = null;
      try {
        pricing = priceProduct(product, cost, ctx);
      } catch (e) {
        pricingError = e instanceof Error ? e.message : "No se pudo calcular el precio";
      }
      return { product, cost, pricing, pricingError };
    }),
  };
}
