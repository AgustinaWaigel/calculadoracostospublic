/**
 * Planes y acceso. Funciones puras: las usan el servidor (para permitir o no escribir) y la
 * interfaz (avisos, secciones bloqueadas).
 */

export const TRIAL_DAYS = 14;

export const PLANS = {
  SIMPLE: {
    name: "Simple",
    price: 15000,
    summary: "Costos y precios de tus productos",
    features: ["Insumos", "Productos con receta y precio por canal", "Mano de obra y costos fijos", "Calculadora de impresión", "Calculadora rápida"],
  },
  COMPLETE: {
    name: "Completo",
    price: 20000,
    summary: "Todo, más presupuestos, ventas e inversiones",
    features: ["Todo lo del plan Simple", "Presupuestos con PDF y WhatsApp", "Ventas y ganancia por mes", "Inversiones y recupero"],
  },
} as const;

export type PaidPlan = keyof typeof PLANS;
export type Tier = "NONE" | "SIMPLE" | "COMPLETE";

/** Secciones y tablas que son solo del plan Completo. */
export const COMPLETE_SECTIONS = ["/presupuestos", "/ventas", "/inversiones", "/api/presupuestos"];
export const COMPLETE_MODELS = new Set(["Quote", "QuoteItem", "Sale", "SaleItem", "InvestmentMovement"]);

export interface BillingFields {
  plan: "NONE" | "SIMPLE" | "COMPLETE" | "FOUNDER";
  subscriptionStatus: "NONE" | "PENDING" | "AUTHORIZED" | "PAUSED" | "CANCELLED";
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

export interface Access {
  /** founder: gratis para siempre · active: suscripción al día · trial: prueba · expired: solo lectura. */
  kind: "founder" | "active" | "trial" | "expired";
  /** Hasta dónde puede escribir. */
  tier: Tier;
  /** Plan de la suscripción (si tiene). */
  plan: PaidPlan | null;
  /** Días que le quedan de prueba, o de lo ya pagado si canceló. */
  daysLeft: number | null;
  /** La suscripción está cancelada o pausada pero todavía tiene días pagos. */
  ending: boolean;
}

const DAY = 86_400_000;
const daysUntil = (d: Date, now: Date) => Math.max(0, Math.ceil((d.getTime() - now.getTime()) / DAY));

export function accessFor(b: BillingFields, now = new Date()): Access {
  if (b.plan === "FOUNDER") return { kind: "founder", tier: "COMPLETE", plan: null, daysLeft: null, ending: false };
  const plan = b.plan === "SIMPLE" || b.plan === "COMPLETE" ? b.plan : null;
  if (plan) {
    const paidUntil = b.currentPeriodEnd && b.currentPeriodEnd > now ? b.currentPeriodEnd : null;
    if (b.subscriptionStatus === "AUTHORIZED") {
      return { kind: "active", tier: plan, plan, daysLeft: null, ending: false };
    }
    // Canceló o se pausó: mantiene lo que ya pagó hasta que termine el período.
    if ((b.subscriptionStatus === "CANCELLED" || b.subscriptionStatus === "PAUSED") && paidUntil) {
      return { kind: "active", tier: plan, plan, daysLeft: daysUntil(paidUntil, now), ending: true };
    }
  }
  if (b.trialEndsAt && b.trialEndsAt > now) {
    return { kind: "trial", tier: "COMPLETE", plan, daysLeft: daysUntil(b.trialEndsAt, now), ending: false };
  }
  return { kind: "expired", tier: "NONE", plan, daysLeft: 0, ending: false };
}

/** ¿Puede crear, cambiar o borrar filas de esta tabla? */
export function canWrite(tier: Tier, model: string): boolean {
  if (tier === "COMPLETE") return true;
  if (tier === "SIMPLE") return !COMPLETE_MODELS.has(model);
  return false;
}

/** La sección es del plan Completo y la cuenta tiene el Simple. (Sin plan se puede mirar todo.) */
export function sectionLocked(tier: Tier, pathname: string): boolean {
  return tier === "SIMPLE" && COMPLETE_SECTIONS.some((s) => pathname === s || pathname.startsWith(`${s}/`));
}

export function writeBlockedMessage(tier: Tier): string {
  return tier === "SIMPLE"
    ? "Esto es del plan Completo. Podés cambiar de plan desde Mi plan."
    : "Tu prueba gratis terminó: podés ver tus datos, pero para cargar o editar necesitás un plan.";
}

/** Plan según el monto que cobra la suscripción (si se cambió de plan, el monto manda). */
export function planFromAmount(amount: number | null | undefined): PaidPlan | null {
  if (amount == null) return null;
  return (Object.keys(PLANS) as PaidPlan[]).find((p) => PLANS[p].price === Number(amount)) ?? null;
}

/** Estado de la suscripción de Mercado Pago (preapproval) → el nuestro. */
export function statusFromMp(status: string | null | undefined): BillingFields["subscriptionStatus"] {
  switch (status) {
    case "authorized":
      return "AUTHORIZED";
    case "paused":
      return "PAUSED";
    case "cancelled":
      return "CANCELLED";
    case "pending":
      return "PENDING";
    default:
      return "NONE";
  }
}
