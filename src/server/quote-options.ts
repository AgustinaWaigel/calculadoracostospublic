import "server-only";
import type { Prisma } from "@prisma/client";
import { getAllProductsWithPricing } from "./costing";
import { roundCents } from "@/lib/money";
import { vatRateFor } from "./sales";
import type { QuoteProductOption, QuoteProfitContext } from "@/components/quotes/types";

export async function getQuoteOptions() {
  const { ctx, items } = await getAllProductsWithPricing();
  const products: QuoteProductOption[] = items
    .filter((i) => i.pricing?.reference)
    .map((i) => ({
      id: i.product.id,
      name: i.product.name,
      price: roundCents(i.pricing!.reference!.price).toString(),
      cost: i.cost.total.toString(),
      ownLabor: i.cost.ownLabor.toString(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  // Mismo canal que usa la venta cuando el presupuesto se acepta.
  const channel = ctx.channels.find((c) => c.type === "DIRECT") ?? ctx.channels[0] ?? null;
  const profit: QuoteProfitContext = {
    vatRate: vatRateFor(ctx.business, channel).toString(),
    channel: channel && {
      name: channel.name,
      commissionPercent: channel.commissionPercent.toString(),
      paymentFeePercent: channel.paymentFeePercent.toString(),
      installmentsPercent: channel.installmentsPercent.toString(),
      fixedFee: channel.fixedFee.toString(),
      shippingCost: channel.shippingCost.toString(),
    },
  };
  return {
    products,
    profit,
    tiers: ctx.tiers.map((t) => ({ minQuantity: t.minQuantity, discountPercent: t.discountPercent.toString() })),
    business: ctx.business,
  };
}

/** Los descuentos por cantidad guardados en un presupuesto, listos para el editor. */
export function quoteTiersFromJson(json: Prisma.JsonValue): { minQuantity: string; discountPercent: string }[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((t) =>
    t && typeof t === "object" && !Array.isArray(t) && t.minQuantity != null && t.discountPercent != null
      ? [{ minQuantity: String(t.minQuantity), discountPercent: String(t.discountPercent) }]
      : [],
  );
}
