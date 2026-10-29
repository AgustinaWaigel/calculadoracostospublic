import "server-only";
import { userDb } from "@/lib/db";
import { pct, ZERO } from "@/lib/money";
import { quoteProfit } from "@/lib/calc/investment";
import { costProduct, getCostingContext, productInclude } from "./costing";

export interface QuoteRecovery {
  quoteId: string;
  number: number;
  clientName: string;
  acceptedAt: Date;
  profit: string;
  /** Ítems libres que no entraron en la cuenta (sin costo conocido). */
  skippedItems: number;
}

/**
 * Ganancia estimada de cada presupuesto aceptado desde `since`, con el costo de hoy de cada producto
 * y el canal de venta directa.
 */
export async function getQuoteRecoveries(since: Date | null): Promise<QuoteRecovery[]> {
  const db = await userDb();
  const [ctx, quotes] = await Promise.all([
    getCostingContext(),
    db.quote.findMany({
      where: { status: "ACCEPTED", ...(since ? { acceptedAt: { gte: since } } : {}) },
      include: { items: { include: { product: { include: productInclude } } } },
      orderBy: { acceptedAt: "desc" },
    }),
  ]);
  const channel = ctx.channels.find((c) => c.type === "DIRECT") ?? ctx.channels[0] ?? { name: "Directo" };
  const vatRate =
    ctx.business.taxCondition === "RESPONSABLE_INSCRIPTO" && channel.applyIva !== false
      ? pct(ctx.business.ivaPercent)
      : ZERO;
  const costs = new Map<string, string>();

  return quotes.map((q) => {
    const { profit, skippedItems } = quoteProfit({
      items: q.items.map((i) => {
        let unitCost: string | null = null;
        if (i.product) {
          if (!costs.has(i.product.id)) costs.set(i.product.id, costProduct(i.product, ctx).total.toString());
          unitCost = costs.get(i.product.id)!;
        }
        return { quantity: i.quantity, unitPrice: i.unitPrice, unitCost };
      }),
      discountPercent: q.discountPercent,
      vatRate,
      channel,
    });
    return {
      quoteId: q.id,
      number: q.number,
      clientName: q.clientName,
      acceptedAt: q.acceptedAt ?? q.updatedAt,
      profit: profit.toString(),
      skippedItems,
    };
  });
}
