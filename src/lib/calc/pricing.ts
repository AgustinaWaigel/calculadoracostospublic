import { D, Decimal, HUNDRED, ZERO, pct, type DecimalInput } from "@/lib/money";

export type PricingMode = "MARGIN" | "MARKUP";
export type TaxCondition = "MONOTRIBUTO" | "RESPONSABLE_INSCRIPTO" | "EXENTO";

/**
 * Margen: la ganancia como % del PRECIO.  precio = costo ÷ (1 − margen)
 * Markup: la ganancia como % del COSTO.   precio = costo × (1 + markup)
 * Ej: costo $100, 50% de margen → $200; 50% de markup → $150.
 */
export function priceFromCost(cost: DecimalInput, percent: DecimalInput, mode: PricingMode): Decimal {
  const c = D(cost);
  const p = pct(percent);
  if (mode === "MARKUP") return c.times(p.plus(1));
  if (p.gte(1)) throw new RangeError("El margen tiene que ser menor a 100%");
  return c.div(new Decimal(1).minus(p));
}

/** Margen real de un precio (ganancia ÷ precio), en %. */
export function marginOf(price: DecimalInput, cost: DecimalInput): Decimal {
  const p = D(price);
  if (p.isZero()) return ZERO;
  return p.minus(D(cost)).div(p).times(HUNDRED);
}

/** Markup real de un precio (ganancia ÷ costo), en %. */
export function markupOf(price: DecimalInput, cost: DecimalInput): Decimal {
  const c = D(cost);
  if (c.isZero()) return ZERO;
  return D(price).minus(c).div(c).times(HUNDRED);
}

export function marginToMarkup(marginPercent: DecimalInput): Decimal {
  const m = pct(marginPercent);
  if (m.gte(1)) throw new RangeError("El margen tiene que ser menor a 100%");
  return m.div(new Decimal(1).minus(m)).times(HUNDRED);
}

export function markupToMargin(markupPercent: DecimalInput): Decimal {
  const k = pct(markupPercent);
  return k.div(k.plus(1)).times(HUNDRED);
}

export interface ChannelConfig {
  id?: string;
  name: string;
  type?: string;
  /** Comisión del canal sobre el precio final (plataformas de venta), en %. */
  commissionPercent?: DecimalInput;
  /** Cargo fijo por venta (ej: costo fijo de una plataforma en productos baratos). */
  fixedFee?: DecimalInput;
  /** Costo de envío que absorbés vos. */
  shippingCost?: DecimalInput;
  /** Pasarela de pago (Mercado Pago, etc.), en %. */
  paymentFeePercent?: DecimalInput;
  /** Costo de financiar cuotas, en %. */
  installmentsPercent?: DecimalInput;
  /** Ajuste final sobre el precio (ej: mayorista −20). */
  priceAdjustPercent?: DecimalInput;
  /** Si el canal factura con IVA (solo aplica a Responsable Inscripto). */
  applyIva?: boolean;
}

export interface ChannelPriceInput {
  unitCost: DecimalInput;
  /** Ganancia neta por unidad que querés conservar. */
  targetProfit: DecimalInput;
  channel: ChannelConfig;
  taxCondition: TaxCondition;
  ivaPercent?: DecimalInput;
  /** Redondear el precio final hacia arriba a múltiplos de este valor (ej: 10, 100). */
  roundTo?: DecimalInput;
}

export interface ChannelPriceResult {
  channelName: string;
  /** Precio final que paga el cliente (con IVA si corresponde). */
  price: Decimal;
  /** Precio sin IVA. */
  netOfVat: Decimal;
  vat: Decimal;
  commission: Decimal;
  paymentFee: Decimal;
  installments: Decimal;
  fixedFee: Decimal;
  shipping: Decimal;
  unitCost: Decimal;
  /** Lo que te queda limpio después de todo. */
  netProfit: Decimal;
  /** Ganancia neta ÷ precio final, en %. */
  netMarginPercent: Decimal;
  isLoss: boolean;
}

/**
 * Precio por canal manteniendo la ganancia neta.
 * Comisiones y pasarela se cobran sobre el precio final (con IVA):
 *
 *   precio = (costo + ganancia + cargo fijo + envío) ÷ (1/(1+IVA) − comisiones%)
 *
 * Después se aplica el ajuste del canal (mayorista) y el redondeo, y se recalcula la ganancia real.
 */
export function channelPrice(input: ChannelPriceInput): ChannelPriceResult {
  const { channel } = input;
  const cost = D(input.unitCost);
  const vatRate =
    input.taxCondition === "RESPONSABLE_INSCRIPTO" && channel.applyIva !== false
      ? pct(input.ivaPercent ?? 21)
      : ZERO;
  const feeRate = pct(channel.commissionPercent ?? 0)
    .plus(pct(channel.paymentFeePercent ?? 0))
    .plus(pct(channel.installmentsPercent ?? 0));
  const fixedFee = D(channel.fixedFee ?? 0);
  const shipping = D(channel.shippingCost ?? 0);

  const keepRate = new Decimal(1).div(vatRate.plus(1)).minus(feeRate);
  if (keepRate.lte(0)) {
    throw new RangeError(`Las comisiones de "${channel.name}" se comen todo el precio`);
  }

  let price = cost.plus(D(input.targetProfit)).plus(fixedFee).plus(shipping).div(keepRate);
  price = price.times(pct(channel.priceAdjustPercent ?? 0).plus(1));
  if (input.roundTo && D(input.roundTo).gt(0)) {
    const step = D(input.roundTo);
    price = price.div(step).ceil().times(step);
  }

  return breakdownForPrice({ price, cost, vatRate, channel, fixedFee, shipping });
}

/** Desglosa un precio final dado (sirve para "¿cuánto me queda si vendo a $X?"). */
export function breakdownForPrice(args: {
  price: DecimalInput;
  cost: DecimalInput;
  vatRate: Decimal;
  channel: ChannelConfig;
  fixedFee?: Decimal;
  shipping?: Decimal;
}): ChannelPriceResult {
  const price = D(args.price);
  const cost = D(args.cost);
  const { channel, vatRate } = args;
  const fixedFee = args.fixedFee ?? D(channel.fixedFee ?? 0);
  const shipping = args.shipping ?? D(channel.shippingCost ?? 0);
  const netOfVat = price.div(vatRate.plus(1));
  const vat = price.minus(netOfVat);
  const commission = price.times(pct(channel.commissionPercent ?? 0));
  const paymentFee = price.times(pct(channel.paymentFeePercent ?? 0));
  const installments = price.times(pct(channel.installmentsPercent ?? 0));
  const netProfit = netOfVat
    .minus(commission)
    .minus(paymentFee)
    .minus(installments)
    .minus(fixedFee)
    .minus(shipping)
    .minus(cost);
  return {
    channelName: channel.name,
    price,
    netOfVat,
    vat,
    commission,
    paymentFee,
    installments,
    fixedFee,
    shipping,
    unitCost: cost,
    netProfit,
    netMarginPercent: price.isZero() ? ZERO : netProfit.div(price).times(HUNDRED),
    isLoss: netProfit.lt(0),
  };
}

export interface VolumeTierInput {
  minQuantity: number;
  discountPercent: DecimalInput;
}

export interface VolumeRow {
  quantity: number;
  discountPercent: Decimal;
  unitPrice: Decimal;
  total: Decimal;
  /** Ganancia por unidad con el descuento aplicado (precio − costo − comisiones no incluidas). */
  unitProfit: Decimal;
}

/** Descuento que corresponde a una cantidad (el tramo más alto alcanzado). */
export function discountForQuantity(quantity: number, tiers: VolumeTierInput[]): Decimal {
  const tier = [...tiers]
    .sort((a, b) => b.minQuantity - a.minQuantity)
    .find((t) => quantity >= t.minQuantity);
  return tier ? D(tier.discountPercent) : ZERO;
}

/** Tabla de precios por cantidad (1, 10, 50, 100 unidades...). */
export function volumeTable(
  unitPrice: DecimalInput,
  unitCost: DecimalInput,
  tiers: VolumeTierInput[],
  quantities: number[] = tiers.map((t) => t.minQuantity),
): VolumeRow[] {
  const price = D(unitPrice);
  return [...quantities]
    .sort((a, b) => a - b)
    .map((quantity) => {
      const discountPercent = discountForQuantity(quantity, tiers);
      const discounted = price.times(new Decimal(1).minus(pct(discountPercent)));
      return {
        quantity,
        discountPercent,
        unitPrice: discounted,
        total: discounted.times(quantity),
        unitProfit: discounted.minus(D(unitCost)),
      };
    });
}
