/**
 * Planes y acceso. Funciones puras: las usan el servidor (para permitir o no escribir) y la
 * interfaz (avisos, secciones bloqueadas).
 */

export const TRIAL_DAYS = 14;

/** Un solo plan con todo. */
export const PLAN = {
  name: "Calculadora de Insumos",
  price: 15000,
  features: [
    "Insumos, productos con receta y precio por canal",
    "Mano de obra y costos fijos",
    "Presupuestos con PDF y WhatsApp",
    "Ventas y ganancia por mes",
    "Inversiones y recupero",
    "Herramientas de tu rubro (como la tinta por hoja en papelería)",
  ],
} as const;

/** NONE: solo mirar · COMPLETE: todo. */
export type Tier = "NONE" | "COMPLETE";

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
  return { kind: "expired", tier: "NONE", daysLeft: 0, ending: false };
}

export const WRITE_BLOCKED = "Tu prueba gratis terminó: podés ver tus datos, pero para cargar o editar necesitás suscribirte.";

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
