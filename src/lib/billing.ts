/**
 * Planes y acceso. Funciones puras: las usan el servidor (para permitir o no escribir) y la
 * interfaz (avisos, secciones bloqueadas).
 */

export const TRIAL_DAYS = 14;

/** Plan pago: todo. */
export const PLAN = {
  name: "Plan completo",
  price: 15000,
  features: [
    "Mano de obra y costos fijos en el costo de cada producto",
    "Presupuestos con PDF y WhatsApp",
    "Ventas y ganancia por mes",
    "Inversiones y recupero",
    "Calculadora rápida y herramientas de tu rubro (como la tinta por hoja en papelería)",
  ],
} as const;

/** Plan gratis: para siempre, solo insumos y productos. */
export const FREE_PLAN = {
  name: "Plan gratis",
  features: ["Insumos con historial de precios", "Productos con su costo de materiales y precio sugerido"],
} as const;

/** FREE: insumos y productos · COMPLETE: todo. */
export type Tier = "FREE" | "COMPLETE";

/** Lo que se puede escribir con el plan gratis (los datos del emprendimiento y Ajustes, siempre). */
const FREE_MODELS = new Set(["Business", "Supply", "SupplyPriceHistory", "Product", "ProductSupply", "ProductLabor", "ProductMachine", "SalesChannel", "VolumeTier"]);

/** Secciones del plan completo. */
export const PAID_SECTIONS = ["/mano-de-obra", "/costos-fijos", "/presupuestos", "/ventas", "/inversiones", "/impresion", "/calculadora", "/api/presupuestos"];

export function canWrite(tier: Tier, model: string): boolean {
  return tier === "COMPLETE" || FREE_MODELS.has(model);
}

export function sectionLocked(tier: Tier, pathname: string): boolean {
  return tier === "FREE" && PAID_SECTIONS.some((s) => pathname === s || pathname.startsWith(`${s}/`));
}

export interface BillingFields {
  plan: "NONE" | "SIMPLE" | "COMPLETE" | "FOUNDER";
  subscriptionStatus: "NONE" | "PENDING" | "AUTHORIZED" | "PAUSED" | "CANCELLED";
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
}

export interface Access {
  /** founder: todo gratis para siempre · active: suscripción al día · trial: prueba · free: plan gratis. */
  kind: "founder" | "active" | "trial" | "free";
  /** Hasta dónde puede escribir. */
  tier: Tier;
  /** Días que le quedan de prueba, o de lo ya pagado si canceló. */
  daysLeft: number | null;
  /** La suscripción está cancelada o pausada pero todavía tiene días pagos. */
  ending: boolean;
}

const DAY = 86_400_000;
const daysUntil = (d: Date, now: Date) => Math.max(0, Math.ceil((d.getTime() - now.getTime()) / DAY));

export function accessFor(b: BillingFields, now = new Date()): Access {
  if (b.plan === "FOUNDER") return { kind: "founder", tier: "COMPLETE", daysLeft: null, ending: false };
  // SIMPLE quedó de cuando había dos planes: hoy es el mismo plan con todo.
  if (b.plan === "SIMPLE" || b.plan === "COMPLETE") {
    const paidUntil = b.currentPeriodEnd && b.currentPeriodEnd > now ? b.currentPeriodEnd : null;
    if (b.subscriptionStatus === "AUTHORIZED") {
      return { kind: "active", tier: "COMPLETE", daysLeft: null, ending: false };
    }
    // Canceló o se pausó: mantiene lo que ya pagó hasta que termine el período.
    if ((b.subscriptionStatus === "CANCELLED" || b.subscriptionStatus === "PAUSED") && paidUntil) {
      return { kind: "active", tier: "COMPLETE", daysLeft: daysUntil(paidUntil, now), ending: true };
    }
  }
  if (b.trialEndsAt && b.trialEndsAt > now) {
    return { kind: "trial", tier: "COMPLETE", daysLeft: daysUntil(b.trialEndsAt, now), ending: false };
  }
  return { kind: "free", tier: "FREE", daysLeft: null, ending: false };
}

export const WRITE_BLOCKED = "Esto es del plan completo. Suscribite desde Mi plan para usarlo.";

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
