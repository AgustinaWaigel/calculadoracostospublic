import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { rawDb } from "@/lib/db";
import { PLANS, planFromAmount, statusFromMp, type PaidPlan } from "@/lib/billing";

/**
 * Suscripciones de Mercado Pago ("preapproval"): débito automático todos los meses.
 * https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post
 */
const API = "https://api.mercadopago.com";

export const mpConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN);

export class MercadoPagoError extends Error {}

interface Preapproval {
  id: string;
  status: string;
  external_reference?: string;
  init_point?: string;
  next_payment_date?: string;
  auto_recurring?: { transaction_amount?: number };
}

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new MercadoPagoError("Los pagos todavía no están configurados. Escribinos y lo resolvemos.");
  const res = await fetch(API + path, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    console.error("[mercadopago]", res.status, path, body.message);
    throw new MercadoPagoError(mpMessage(body.message));
  }
  return body;
}

/** Los errores de MP vienen en inglés y técnicos: los más comunes, en criollo. */
function mpMessage(message?: string) {
  if (message && /payer.*email|email.*payer|collector/i.test(message)) {
    return "Mercado Pago no aceptó ese mail. Usá el mail de tu cuenta de Mercado Pago.";
  }
  return "Mercado Pago no respondió bien. Probá de nuevo en un rato.";
}

const reason = (plan: PaidPlan) => `Calculadora de Insumos · Plan ${PLANS[plan].name}`;

export async function createSubscription(opts: { userId: string; plan: PaidPlan; email: string; backUrl: string }) {
  return mp<Preapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: reason(opts.plan),
      external_reference: opts.userId,
      payer_email: opts.email,
      back_url: opts.backUrl,
      status: "pending",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: PLANS[opts.plan].price,
        currency_id: "ARS",
      },
    }),
  });
}

/** Cambia el monto (y el nombre) de una suscripción activa: el próximo débito ya va con el plan nuevo. */
export async function changeSubscriptionPlan(id: string, plan: PaidPlan) {
  return mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ reason: reason(plan), auto_recurring: { transaction_amount: PLANS[plan].price, currency_id: "ARS" } }),
  });
}

export async function cancelSubscription(id: string) {
  return mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/**
 * Trae la suscripción de MP y actualiza la cuenta. Es la única fuente de verdad: los avisos del
 * webhook solo dicen "cambió la suscripción X" y acá se consulta a MP con nuestra clave.
 */
export async function syncSubscription(id: string) {
  const p = await mp<Preapproval>(`/preapproval/${encodeURIComponent(id)}`);
  const userId = p.external_reference;
  if (!userId) return;
  const business = await rawDb.business.findUnique({
    where: { id: userId },
    select: { plan: true, mpPreapprovalId: true },
  });
  if (!business || business.plan === "FOUNDER") return;
  const status = statusFromMp(p.status);
  // Un aviso viejo de otra suscripción (por ejemplo, una que quedó sin pagar) no pisa la actual.
  if (business.mpPreapprovalId && business.mpPreapprovalId !== p.id && status !== "AUTHORIZED") return;

  const plan = planFromAmount(p.auto_recurring?.transaction_amount);
  const nextPayment = p.next_payment_date ? new Date(p.next_payment_date) : null;
  await rawDb.business.update({
    where: { id: userId },
    data: {
      mpPreapprovalId: p.id,
      subscriptionStatus: status,
      ...(plan && { plan }),
      // Lo pagado dura hasta el próximo débito: si cancela, conserva el acceso hasta esa fecha.
      ...(status === "AUTHORIZED" && nextPayment && { currentPeriodEnd: nextPayment }),
      subscriptionSyncedAt: new Date(),
    },
  });
}

/**
 * Firma de los avisos de MP (header x-signature: "ts=…,v1=…").
 * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function validWebhookSignature(opts: { signature: string | null; requestId: string | null; dataId: string }) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // Sin clave configurada no se puede validar (igual se consulta a MP con la nuestra).
  if (!opts.signature) return false;
  const parts = Object.fromEntries(opts.signature.split(",").map((kv) => kv.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  const manifest = `id:${id};${opts.requestId ? `request-id:${opts.requestId};` : ""}ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
