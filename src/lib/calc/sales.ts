import { D, Decimal, ZERO, pct, sum, type DecimalInput } from "@/lib/money";
import type { ChannelConfig } from "./pricing";

export interface SaleLineInput {
  quantity: DecimalInput;
  unitPrice: DecimalInput;
  /** null = ítem libre, sin costo conocido. */
  unitCost: DecimalInput | null;
}

export interface SaleProfitInput {
  items: SaleLineInput[];
  /** Descuento extra sobre el total de la venta, en %. */
  discountPercent: DecimalInput;
  /** IVA incluido en el precio (0 si no facturás con IVA), como fracción: 0,21. */
  vatRate: DecimalInput;
  /** Canal de venta (comisiones, pasarela, envío que absorbés). */
  channel: ChannelConfig | null;
}

export interface SaleProfit {
  /** Lo que cobraste (con el descuento extra). */
  total: Decimal;
  /** Ganancia neta estimada. */
  profit: Decimal;
  /** Lo cobrado por los ítems con costo conocido (base del margen). */
  countedRevenue: Decimal;
  /** Por ítem: lo cobrado y lo que dejó (null si no tiene costo). */
  lines: { revenue: Decimal; profit: Decimal | null }[];
  skippedItems: number;
}

/**
 * Ganancia neta de una venta: lo cobrado (con el descuento extra, sin IVA ni comisiones) menos el
 * costo de cada producto. El cargo fijo y el envío del canal se cuentan una vez por venta. Los ítems
 * libres no suman ganancia porque no sabemos cuánto costaron.
 */
export function saleProfit(input: SaleProfitInput): SaleProfit {
  const keep = D(1).minus(pct(input.discountPercent));
  const vat = D(input.vatRate).plus(1);
  const channel = input.channel ?? { name: "" };
  const feeRate = pct(channel.commissionPercent ?? 0)
    .plus(pct(channel.paymentFeePercent ?? 0))
    .plus(pct(channel.installmentsPercent ?? 0));

  const lines = input.items.map((i) => {
    const revenue = D(i.unitPrice).times(D(i.quantity)).times(keep);
    const profit =
      i.unitCost == null
        ? null
        : revenue
            .div(vat)
            .minus(revenue.times(feeRate))
            .minus(D(i.unitCost).times(D(i.quantity)));
    return { revenue, profit };
  });
  const known = lines.filter((l) => l.profit !== null);
  const perSale = known.length ? D(channel.fixedFee ?? 0).plus(D(channel.shippingCost ?? 0)) : ZERO;

  return {
    total: sum(lines.map((l) => l.revenue)),
    profit: sum(known.map((l) => l.profit!)).minus(perSale),
    countedRevenue: sum(known.map((l) => l.revenue)),
    lines,
    skippedItems: lines.length - known.length,
  };
}

export interface SaleTotalsInput {
  total: DecimalInput;
  profit: DecimalInput;
  countedRevenue: DecimalInput;
}

export interface SalesTotals {
  count: number;
  total: Decimal;
  profit: Decimal;
  /** Ganancia ÷ lo cobrado por ítems con costo, en % (null si no hay base). */
  margin: Decimal | null;
  /** Ticket promedio (null si no hubo ventas). */
  average: Decimal | null;
}

export function salesTotals(sales: SaleTotalsInput[]): SalesTotals {
  const total = sum(sales.map((s) => s.total));
  const profit = sum(sales.map((s) => s.profit));
  const counted = sum(sales.map((s) => s.countedRevenue));
  return {
    count: sales.length,
    total,
    profit,
    margin: counted.gt(0) ? profit.div(counted).times(100) : null,
    average: sales.length ? total.div(sales.length) : null,
  };
}

/** Variación porcentual de `now` contra `before` (null si antes era 0). */
export function percentChange(now: DecimalInput, before: DecimalInput): Decimal | null {
  const b = D(before);
  if (b.isZero()) return null;
  return D(now).minus(b).div(b.abs()).times(100);
}

/** "2026-10" del mes de una fecha (en UTC, como se guardan las fechas). */
export const monthKey = (date: Date) => date.toISOString().slice(0, 7);

/** Los últimos `count` meses terminando en `last` ("2026-10"), del más viejo al más nuevo. */
export function lastMonths(last: string, count: number): string[] {
  const [y, m] = last.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return monthKey(d);
  });
}

/** Suma lo vendido y la ganancia por mes. */
export function salesByMonth(
  sales: (SaleTotalsInput & { date: Date })[],
  months: string[],
): { month: string; total: Decimal; profit: Decimal; count: number }[] {
  return months.map((month) => {
    const list = sales.filter((s) => monthKey(s.date) === month);
    return {
      month,
      total: sum(list.map((s) => s.total)),
      profit: sum(list.map((s) => s.profit)),
      count: list.length,
    };
  });
}

export interface GroupRow {
  key: string;
  label: string;
  quantity: Decimal;
  revenue: Decimal;
  /** null si ningún ítem del grupo tiene costo. */
  profit: Decimal | null;
}

/** Agrupa ítems (por producto, canal, etc.) sumando cantidad, lo cobrado y la ganancia. */
export function groupLines(
  lines: {
    key: string;
    label: string;
    quantity: DecimalInput;
    revenue: DecimalInput;
    profit: DecimalInput | null;
  }[],
): GroupRow[] {
  const map = new Map<string, GroupRow>();
  for (const l of lines) {
    const row = map.get(l.key) ?? {
      key: l.key,
      label: l.label,
      quantity: ZERO,
      revenue: ZERO,
      profit: null,
    };
    row.quantity = row.quantity.plus(D(l.quantity));
    row.revenue = row.revenue.plus(D(l.revenue));
    if (l.profit != null) row.profit = (row.profit ?? ZERO).plus(D(l.profit));
    map.set(l.key, row);
  }
  return [...map.values()].sort((a, b) => b.revenue.comparedTo(a.revenue));
}
