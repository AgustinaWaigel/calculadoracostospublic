import "server-only";
import type { Prisma } from "@prisma/client";
import { userDb } from "@/lib/db";
import { D, sum, ZERO, type DecimalInput } from "@/lib/money";
import { quoteMaterials, type MaterialNeed, type MaterialOrderLine } from "@/lib/calc/quote";
import { saleProfit } from "@/lib/calc/sales";
import { costProduct, getCostingContext, productInclude } from "./costing";
import { vatRateFor } from "./sales";

export type MaterialRow = Omit<MaterialNeed, "needed" | "packQuantity" | "cost"> & {
  needed: string;
  packQuantity: string;
  cost: string;
};

export interface QuoteSummary {
  total: string;
  cost: string;
  /** Ganancia neta (lo que queda después de costos, IVA y comisiones del canal directo). */
  profit: string;
  /** Tu mano de obra: ya está en el costo, pero es plata que te queda a vos. */
  ownLabor: string;
  laborMinutes: string;
  channelName: string | null;
  /** Ítems libres (sin producto): no se sabe cuánto cuestan ni qué materiales llevan. */
  skippedItems: number;
  items: { description: string; quantity: string; revenue: string; cost: string | null; profit: string | null }[];
  materials: MaterialRow[];
}

const quoteWithRecipes = {
  items: { include: { product: { include: productInclude } }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.QuoteInclude;

type QuoteWithRecipes = Prisma.QuoteGetPayload<{ include: typeof quoteWithRecipes }>;

/** Lo que lleva cada ítem con producto, listo para sumar materiales. */
function materialLines(quote: QuoteWithRecipes, withWaste: boolean): MaterialOrderLine[] {
  return quote.items.flatMap((i) =>
    i.product
      ? [
          {
            quantity: i.quantity,
            batchYield: i.product.batchYield,
            wastePercent: withWaste ? i.product.wastePercent : 0,
            supplies: i.product.supplies
              .filter((s) => s.supply.kind === "MATERIAL")
              .map((s) => ({
                id: s.supplyId,
                name: s.supply.name,
                usageUnit: s.supply.usageUnit,
                purchaseUnit: s.supply.purchaseUnit,
                packQuantity: s.supply.packQuantity,
                packPrice: s.supply.packPrice,
                quantity: s.quantity,
              })),
          },
        ]
      : [],
  );
}

const toRows = (materials: MaterialNeed[]): MaterialRow[] =>
  materials.map((m) => ({
    ...m,
    needed: m.needed.toString(),
    packQuantity: m.packQuantity.toString(),
    cost: m.cost.toString(),
  }));

/** Lo que deja un presupuesto y los materiales que lleva, con los costos de hoy (solo para vos). */
export async function getQuoteSummary(quoteId: string, withWaste = false): Promise<QuoteSummary | null> {
  const db = await userDb();
  const [ctx, quote] = await Promise.all([
    getCostingContext(),
    db.quote.findUnique({ where: { id: quoteId }, include: quoteWithRecipes }),
  ]);
  if (!quote) return null;

  // Mismo canal que usa la venta cuando el presupuesto se acepta.
  const channel = ctx.channels.find((c) => c.type === "DIRECT") ?? ctx.channels[0] ?? null;
  const costs = quote.items.map((i) => (i.product ? costProduct(i.product, ctx) : null));
  const r = saleProfit({
    items: quote.items.map((i, n) => ({ quantity: i.quantity, unitPrice: i.unitPrice, unitCost: costs[n]?.total ?? null })),
    discountPercent: quote.discountPercent,
    vatRate: vatRateFor(ctx.business, channel),
    channel,
  });
  const perItem = (pick: (c: NonNullable<(typeof costs)[number]>) => DecimalInput) =>
    sum(quote.items.map((i, n) => (costs[n] ? D(pick(costs[n])).times(i.quantity) : ZERO)));

  return {
    total: r.total.toString(),
    cost: perItem((c) => c.total).toString(),
    profit: r.profit.toString(),
    ownLabor: perItem((c) => c.ownLabor).toString(),
    laborMinutes: perItem((c) => c.laborMinutes).toString(),
    channelName: channel?.name ?? null,
    skippedItems: r.skippedItems,
    items: quote.items.map((i, n) => ({
      description: i.description,
      quantity: i.quantity.toString(),
      revenue: r.lines[n].revenue.toString(),
      cost: costs[n] ? costs[n].total.times(i.quantity).toString() : null,
      profit: r.lines[n].profit?.toString() ?? null,
    })),
    materials: toRows(quoteMaterials(materialLines(quote, withWaste))),
  };
}

/** Pedidos aceptados que todavía no se entregaron, con la lista de compras de todos juntos. */
export async function getOpenOrders(withWaste = false) {
  const db = await userDb();
  const quotes = await db.quote.findMany({
    where: { status: "ACCEPTED", production: { not: "DELIVERED" } },
    include: quoteWithRecipes,
    orderBy: [{ deliveryDate: { sort: "asc", nulls: "last" } }, { number: "asc" }],
  });
  return {
    orders: quotes.map((q) => ({
      id: q.id,
      number: q.number,
      clientName: q.clientName,
      clientPhone: q.clientPhone,
      deliveryDate: q.deliveryDate,
      production: q.production,
      paidAmount: q.paidAmount.toString(),
      items: q.items.map((i) => ({ description: i.description, quantity: i.quantity.toString(), unitPrice: i.unitPrice.toString() })),
      discountPercent: q.discountPercent.toString(),
    })),
    materials: toRows(quoteMaterials(quotes.flatMap((q) => materialLines(q, withWaste)))),
  };
}
