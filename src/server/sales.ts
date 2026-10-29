import "server-only";
import type { Prisma } from "@prisma/client";
import { userDb } from "@/lib/db";
import { pct, roundCents, ZERO } from "@/lib/money";
import { saleProfit } from "@/lib/calc/sales";
import { costProduct, getAllProductsWithPricing, getBusiness, getCostingContext, productInclude } from "./costing";
import type { SaleChannelOption, SaleProductOption } from "@/components/sales/types";

type Business = Awaited<ReturnType<typeof getBusiness>>;

/** IVA incluido en el precio para ese canal, como fracción (0 si no facturás con IVA). */
export function vatRateFor(
  business: Pick<Business, "taxCondition" | "ivaPercent">,
  channel: { applyIva?: boolean } | null,
) {
  return business.taxCondition === "RESPONSABLE_INSCRIPTO" && channel?.applyIva !== false
    ? pct(business.ivaPercent)
    : ZERO;
}

/** Productos (con su costo de hoy y su precio por canal) y canales, para el editor de ventas. */
export async function getSaleOptions() {
  const { ctx, items } = await getAllProductsWithPricing();
  const products: SaleProductOption[] = items
    .map((i) => {
      const prices: Record<string, string> = {};
      i.pricing?.channels.forEach((c, n) => {
        const id = ctx.channels[n]?.id;
        if (id && c.ok) prices[id] = roundCents(c.price).toString();
      });
      return {
        id: i.product.id,
        name: i.product.name,
        cost: roundCents(i.cost.total).toString(),
        price: i.pricing?.reference ? roundCents(i.pricing.reference.price).toString() : null,
        prices,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const channels: SaleChannelOption[] = ctx.channels.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    commissionPercent: c.commissionPercent.toString(),
    paymentFeePercent: c.paymentFeePercent.toString(),
    installmentsPercent: c.installmentsPercent.toString(),
    fixedFee: c.fixedFee.toString(),
    shippingCost: c.shippingCost.toString(),
    applyIva: c.applyIva,
  }));
  const defaultChannelId = (ctx.channels.find((c) => c.type === "DIRECT") ?? ctx.channels[0])?.id ?? null;
  return {
    products,
    channels,
    defaultChannelId,
    taxCondition: ctx.business.taxCondition,
    ivaPercent: ctx.business.ivaPercent.toString(),
  };
}

export const saleInclude = {
  items: { orderBy: { sortOrder: "asc" } },
  channel: true,
  quote: { select: { id: true, number: true } },
} satisfies Prisma.SaleInclude;

export interface SaleRow {
  id: string;
  date: Date;
  clientName: string | null;
  channelId: string | null;
  channelName: string | null;
  quote: { id: string; number: number } | null;
  total: string;
  profit: string;
  countedRevenue: string;
  skippedItems: number;
  items: {
    productId: string | null;
    description: string;
    quantity: string;
    revenue: string;
    profit: string | null;
  }[];
}

/** Ventas con su total y su ganancia ya calculados (del más nuevo al más viejo). */
export async function getSales(where: Prisma.SaleWhereInput = {}): Promise<SaleRow[]> {
  const db = await userDb();
  const [business, sales] = await Promise.all([
    getBusiness(),
    db.sale.findMany({
      where,
      include: saleInclude,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  return sales.map((s) => {
    const r = saleProfit({
      items: s.items,
      discountPercent: s.discountPercent,
      vatRate: vatRateFor(business, s.channel),
      channel: s.channel,
    });
    return {
      id: s.id,
      date: s.date,
      clientName: s.clientName,
      channelId: s.channelId,
      channelName: s.channel?.name ?? null,
      quote: s.quote,
      total: r.total.toString(),
      profit: r.profit.toString(),
      countedRevenue: r.countedRevenue.toString(),
      skippedItems: r.skippedItems,
      items: s.items.map((i, n) => ({
        productId: i.productId,
        description: i.description,
        quantity: i.quantity.toString(),
        revenue: r.lines[n].revenue.toString(),
        profit: r.lines[n].profit?.toString() ?? null,
      })),
    };
  });
}

/**
 * Datos de la venta que sale de un presupuesto aceptado: mismos ítems y precios, el costo de hoy de
 * cada producto y el canal de venta directa. Con ids sueltos (no `connect`): así el cliente de la
 * cuenta revisa que el canal, el presupuesto y los productos sean de la misma cuenta.
 */
export async function saleDataFromQuote(quoteId: string): Promise<Prisma.SaleUncheckedCreateInput | null> {
  const db = await userDb();
  const [ctx, quote] = await Promise.all([
    getCostingContext(),
    db.quote.findUnique({
      where: { id: quoteId },
      include: {
        items: {
          include: { product: { include: productInclude } },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
  ]);
  if (!quote) return null;
  const channel = ctx.channels.find((c) => c.type === "DIRECT") ?? ctx.channels[0] ?? null;
  return {
    userId: db.$userId,
    date: quote.acceptedAt ?? new Date(),
    clientName: quote.clientName,
    channelId: channel?.id ?? null,
    quoteId: quote.id,
    discountPercent: quote.discountPercent,
    items: {
      create: quote.items.map((i, sortOrder) => ({
        productId: i.productId,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitCost: i.product ? roundCents(costProduct(i.product, ctx).total) : null,
        sortOrder,
      })),
    },
  };
}
