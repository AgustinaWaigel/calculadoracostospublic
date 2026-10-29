import "server-only";
import { userDb } from "@/lib/db";
import { supplyUnitCost } from "@/lib/calc/supply";
import { getCostingContext, type CostingContext } from "./costing";
import type { EditorOptions } from "@/components/products/types";
import type { InkChannel } from "@/lib/calc/print";

export function contextToPlain(ctx: CostingContext): Omit<EditorOptions, "supplies" | "profiles" | "machines" | "categories" | "inks"> {
  const b = ctx.business;
  return {
    fixedPerUnit: ctx.fixedPerUnit.toString(),
    fixedPerMinute: ctx.fixedPerMinute.toString(),
    fixedAllocation: b.fixedAllocation,
    monthlyFixed: ctx.monthlyFixed.toString(),
    monthlyUnitsEstimate: b.monthlyUnitsEstimate,
    settings: {
      taxCondition: b.taxCondition,
      ivaPercent: b.ivaPercent.toString(),
      defaultMarginPercent: b.defaultMarginPercent.toString(),
      pricingMode: b.pricingMode,
      roundTo: b.roundTo.toString(),
    },
    channels: ctx.channels.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      commissionPercent: c.commissionPercent.toString(),
      fixedFee: c.fixedFee.toString(),
      shippingCost: c.shippingCost.toString(),
      paymentFeePercent: c.paymentFeePercent.toString(),
      installmentsPercent: c.installmentsPercent.toString(),
      priceAdjustPercent: c.priceAdjustPercent.toString(),
      applyIva: c.applyIva,
    })),
    tiers: ctx.tiers.map((t) => ({ minQuantity: t.minQuantity, discountPercent: t.discountPercent.toString() })),
  };
}

export async function getEditorOptions(): Promise<EditorOptions> {
  const db = await userDb();
  const [ctx, supplies, profiles, machines, categories, inks] = await Promise.all([
    getCostingContext(),
    db.supply.findMany({ orderBy: { name: "asc" } }),
    db.laborProfile.findMany({ orderBy: { createdAt: "asc" } }),
    db.machine.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({ where: { category: { not: null } }, distinct: ["category"], select: { category: true } }),
    db.printInk.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return {
    ...contextToPlain(ctx),
    supplies: supplies.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      usageUnit: s.usageUnit,
      packPrice: s.packPrice.toString(),
      packQuantity: s.packQuantity.toString(),
      unitCost: supplyUnitCost(s).toString(),
    })),
    profiles: profiles.map((p) => ({ id: p.id, name: p.name, hourlyRate: p.hourlyRate.toString(), isOwn: p.isOwn, color: p.color })),
    machines: machines.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price.toString(),
      usefulLife: m.usefulLife.toString(),
      lifeUnit: m.lifeUnit,
    })),
    categories: categories.map((c) => c.category!),
    inks: inks.map((i) => ({
      name: i.name,
      channel: i.channel as InkChannel,
      bottlePrice: i.bottlePrice.toString(),
      yieldPages: i.yieldPages,
    })),
  };
}
