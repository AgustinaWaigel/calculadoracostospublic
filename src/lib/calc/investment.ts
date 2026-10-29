import { D, Decimal, ZERO, pct, sum, type DecimalInput } from "@/lib/money";
import type { ChannelConfig } from "./pricing";

const DAYS_PER_MONTH = 30.44;

export interface InvestmentMovementInput {
  kind: "INVESTMENT" | "RECOVERY";
  amount: DecimalInput;
  date: Date;
}

export interface InvestmentSummary {
  invested: Decimal;
  recovered: Decimal;
  /** Lo que falta recuperar (0 si ya se recuperó todo). */
  remaining: Decimal;
  /** 0 a 100. */
  progressPercent: Decimal;
  /** Lo recuperado por encima de lo invertido. */
  surplus: Decimal;
  /** Desde la primera inversión. */
  startedAt: Date | null;
  /** Meses desde la primera inversión (mínimo 1, para no inflar el ritmo del primer mes). */
  monthsElapsed: number;
  /** Lo que venís recuperando por mes en promedio (null si todavía no recuperaste nada). */
  monthlyPace: Decimal | null;
  /** A ese ritmo, cuántos meses faltan (null si no hay ritmo). */
  monthsLeft: number | null;
  /** A ese ritmo, cuándo terminás de recuperar. */
  recoveryDate: Date | null;
}

/** Meses (enteros, hacia arriba) para recuperar `remaining` ganando `perMonth` por mes. */
export function monthsToRecover(remaining: DecimalInput, perMonth: DecimalInput): number | null {
  const r = D(remaining);
  if (r.lte(0)) return 0;
  const m = D(perMonth);
  if (m.lte(0)) return null;
  return r.div(m).ceil().toNumber();
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getTime() + months * DAYS_PER_MONTH * 86_400_000);
}

export function investmentSummary(movements: InvestmentMovementInput[], now: Date = new Date()): InvestmentSummary {
  const of = (kind: InvestmentMovementInput["kind"]) => movements.filter((m) => m.kind === kind);
  const investments = of("INVESTMENT");
  const invested = sum(investments.map((m) => m.amount));
  const recovered = sum(of("RECOVERY").map((m) => m.amount));
  const remaining = Decimal.max(invested.minus(recovered), ZERO);
  const progressPercent = invested.gt(0) ? Decimal.min(recovered.div(invested).times(100), D(100)) : ZERO;

  const startedAt = investments.length
    ? new Date(Math.min(...investments.map((m) => m.date.getTime())))
    : null;
  const monthsElapsed = startedAt
    ? Math.max(1, (now.getTime() - startedAt.getTime()) / (DAYS_PER_MONTH * 86_400_000))
    : 1;
  const monthlyPace = recovered.gt(0) ? recovered.div(monthsElapsed) : null;
  const monthsLeft = monthlyPace ? monthsToRecover(remaining, monthlyPace) : null;

  return {
    invested,
    recovered,
    remaining,
    progressPercent,
    surplus: Decimal.max(recovered.minus(invested), ZERO),
    startedAt,
    monthsElapsed,
    monthlyPace,
    monthsLeft,
    recoveryDate: monthsLeft != null && monthsLeft > 0 ? addMonths(now, monthsLeft) : null,
  };
}

export interface QuoteProfitInput {
  items: { quantity: DecimalInput; unitPrice: DecimalInput; /** null = ítem libre, sin costo conocido. */ unitCost: DecimalInput | null }[];
  /** Descuento extra sobre el total del presupuesto, en %. */
  discountPercent: DecimalInput;
  /** IVA incluido en el precio (0 si no facturás con IVA), como fracción: 0,21. */
  vatRate: DecimalInput;
  /** Canal de venta (comisiones, pasarela, envío que absorbés). */
  channel: ChannelConfig;
}

/**
 * Ganancia neta estimada de un presupuesto aceptado: lo cobrado (con el descuento extra, sin IVA ni
 * comisiones) menos el costo de cada producto. El cargo fijo y el envío del canal se cuentan una vez
 * por presupuesto. Los ítems libres no se cuentan porque no sabemos cuánto costaron.
 */
export function quoteProfit(input: QuoteProfitInput): { profit: Decimal; skippedItems: number } {
  const keep = D(1).minus(pct(input.discountPercent));
  const vat = D(input.vatRate).plus(1);
  const feeRate = pct(input.channel.commissionPercent ?? 0)
    .plus(pct(input.channel.paymentFeePercent ?? 0))
    .plus(pct(input.channel.installmentsPercent ?? 0));
  const known = input.items.filter((i) => i.unitCost != null);
  if (known.length === 0) return { profit: ZERO, skippedItems: input.items.length };

  const lines = known.map((i) => {
    const charged = D(i.unitPrice).times(D(i.quantity)).times(keep);
    return charged.div(vat).minus(charged.times(feeRate)).minus(D(i.unitCost!).times(D(i.quantity)));
  });
  const perSale = D(input.channel.fixedFee ?? 0).plus(D(input.channel.shippingCost ?? 0));
  return { profit: sum(lines).minus(perSale), skippedItems: input.items.length - known.length };
}
