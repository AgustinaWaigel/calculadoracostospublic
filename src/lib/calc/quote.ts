import { D, Decimal, ZERO, pct, roundCents, sum, type DecimalInput } from "@/lib/money";
import { discountForQuantity, type VolumeTierInput } from "./pricing";
import { supplyUnitCost } from "./supply";

export interface QuoteLine {
  quantity: DecimalInput;
  unitPrice: DecimalInput;
}

export interface QuoteTotals {
  lines: Decimal[];
  subtotal: Decimal;
  discount: Decimal;
  total: Decimal;
}

export function quoteTotals(items: QuoteLine[], discountPercent: DecimalInput = 0): QuoteTotals {
  const lines = items.map((i) => D(i.quantity).times(D(i.unitPrice)));
  const subtotal = sum(lines);
  const discount = subtotal.times(pct(discountPercent));
  return { lines, subtotal, discount, total: subtotal.minus(discount) };
}

export interface VolumePrice {
  listPrice: Decimal;
  /** Descuento por cantidad que corresponde (0 si no llega a ningún tramo). */
  discountPercent: Decimal;
  /** Precio por unidad con ese descuento, redondeado a centavos. */
  unitPrice: Decimal;
  /** Desde cuántas unidades rige el tramo aplicado. */
  tierMin: number | null;
  /** El próximo tramo, para avisar "llevando X tiene Y% off". */
  next: { minQuantity: number; discountPercent: Decimal } | null;
}

/** Precio de un producto para una cantidad, según los descuentos por volumen de Ajustes. */
export function volumePrice(listPrice: DecimalInput, quantity: number, tiers: VolumeTierInput[]): VolumePrice {
  const list = D(listPrice);
  const discountPercent = discountForQuantity(quantity, tiers);
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  const current = [...sorted].reverse().find((t) => quantity >= t.minQuantity && D(t.discountPercent).gt(0));
  const next = sorted.find((t) => t.minQuantity > quantity && D(t.discountPercent).gt(discountPercent));
  return {
    listPrice: list,
    discountPercent,
    unitPrice: roundCents(list.times(D(1).minus(pct(discountPercent)))),
    tierMin: current?.minQuantity ?? null,
    next: next ? { minQuantity: next.minQuantity, discountPercent: D(next.discountPercent) } : null,
  };
}

export interface QuoteBreakdown extends QuoteTotals {
  /** Lo que sumaría todo a precio de lista. */
  atList: Decimal;
  /** Cuánto bajó por los descuentos por cantidad de cada ítem. */
  volumeDiscount: Decimal;
}

/**
 * Totales con el desglose completo: precio de lista → descuento por cantidad (ya incluido en el
 * precio de cada ítem) → subtotal → descuento extra sobre el total → total.
 * `listPrice` va solo en los ítems que tienen el descuento por cantidad aplicado.
 */
export function quoteBreakdown(
  items: (QuoteLine & { listPrice?: DecimalInput | null })[],
  extraDiscountPercent: DecimalInput = 0,
): QuoteBreakdown {
  const totals = quoteTotals(items, extraDiscountPercent);
  const volumeDiscount = sum(
    items.map((i) => {
      if (i.listPrice == null) return ZERO;
      const saved = D(i.listPrice).minus(D(i.unitPrice)).times(D(i.quantity));
      return saved.gt(0) ? saved : ZERO;
    }),
  );
  return { ...totals, atList: totals.subtotal.plus(volumeDiscount), volumeDiscount };
}

export interface MaterialOrderLine {
  /** Unidades pedidas de este producto. */
  quantity: DecimalInput;
  batchYield: DecimalInput;
  /** Merma del producto en %: si viene, se suma a lo que hay que tener. */
  wastePercent?: DecimalInput;
  supplies: {
    id: string;
    name: string;
    usageUnit: string;
    purchaseUnit: string;
    packQuantity: DecimalInput;
    packPrice: DecimalInput;
    /** Cantidad usada por LOTE. */
    quantity: DecimalInput;
  }[];
}

export interface MaterialNeed {
  id: string;
  name: string;
  usageUnit: string;
  purchaseUnit: string;
  /** Cuánto se usa en todo el pedido, en unidades de uso. */
  needed: Decimal;
  packQuantity: Decimal;
  /** Paquetes enteros que alcanzan para el pedido. */
  packs: number;
  /** Lo que cuesta lo que se usa (no los paquetes enteros). */
  cost: Decimal;
}

/**
 * Materiales que lleva un pedido, sumando los insumos que se repiten entre productos.
 * Proporcional a lo pedido: 10 tarjetas con rinde 4 por hoja = 2,5 hojas (más la merma, si viene).
 */
export function quoteMaterials(lines: MaterialOrderLine[]): MaterialNeed[] {
  const byId = new Map<string, MaterialNeed>();
  for (const line of lines) {
    const batches = D(line.quantity)
      .div(D(line.batchYield))
      .times(D(1).plus(pct(line.wastePercent ?? 0)));
    for (const s of line.supplies) {
      const needed = D(s.quantity).times(batches);
      const cost = needed.times(supplyUnitCost(s));
      const prev = byId.get(s.id);
      byId.set(s.id, {
        id: s.id,
        name: s.name,
        usageUnit: s.usageUnit,
        purchaseUnit: s.purchaseUnit,
        packQuantity: D(s.packQuantity),
        needed: prev ? prev.needed.plus(needed) : needed,
        packs: 0,
        cost: prev ? prev.cost.plus(cost) : cost,
      });
    }
  }
  return [...byId.values()]
    .map((m) => ({ ...m, packs: m.needed.div(m.packQuantity).ceil().toNumber() }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
