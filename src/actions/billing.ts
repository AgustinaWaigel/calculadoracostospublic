"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccess, rawDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth/server";
import { PLANS, type PaidPlan } from "@/lib/billing";
import {
  MercadoPagoError,
  cancelSubscription as mpCancel,
  changeSubscriptionPlan,
  createSubscription,
  syncSubscription,
} from "@/server/mercadopago";

export type BillingState = { error?: string; notice?: string } | undefined;

async function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

const subscribeSchema = z.object({
  plan: z.enum(["SIMPLE", "COMPLETE"]),
  email: z.string().trim().toLowerCase().email("Revisá el mail"),
});

/** Suscribirse (o cambiar de plan si ya tiene una suscripción activa). */
export async function subscribe(_: BillingState, form: FormData): Promise<BillingState> {
  const userId = await requireUserId();
  const parsed = subscribeSchema.safeParse({ plan: form.get("plan"), email: form.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const plan: PaidPlan = parsed.data.plan;

  const business = await rawDb.business.findUnique({
    where: { id: userId },
    select: { plan: true, mpPreapprovalId: true, subscriptionStatus: true },
  });
  if (!business) return { error: "Entrá primero al inicio para terminar de armar tu cuenta." };
  if (business.plan === "FOUNDER") return { notice: "Tu cuenta es fundadora: ya tenés el plan Completo gratis." };

  let checkout: string;
  try {
    if (business.mpPreapprovalId && business.subscriptionStatus === "AUTHORIZED") {
      if (business.plan === plan) return { notice: `Ya tenés el plan ${PLANS[plan].name}.` };
      await changeSubscriptionPlan(business.mpPreapprovalId, plan);
      await rawDb.business.update({ where: { id: userId }, data: { plan } });
      revalidatePath("/", "layout");
      return { notice: `Listo: pasaste al plan ${PLANS[plan].name}. El próximo débito ya va con el precio nuevo.` };
    }
    const sub = await createSubscription({ userId, plan, email: parsed.data.email, backUrl: `${await appUrl()}/plan?volviste=1` });
    if (!sub.init_point) return { error: "Mercado Pago no devolvió el link de pago. Probá de nuevo." };
    await rawDb.business.update({
      where: { id: userId },
      data: { mpPreapprovalId: sub.id, subscriptionStatus: "PENDING", plan },
    });
    checkout = sub.init_point;
  } catch (e) {
    return { error: e instanceof MercadoPagoError ? e.message : "No se pudo iniciar la suscripción. Probá de nuevo." };
  }
  redirect(checkout);
}

export async function cancelMySubscription(): Promise<BillingState> {
  const userId = await requireUserId();
  const business = await rawDb.business.findUnique({ where: { id: userId }, select: { mpPreapprovalId: true } });
  if (!business?.mpPreapprovalId) return { error: "No tenés una suscripción activa." };
  try {
    await mpCancel(business.mpPreapprovalId);
    await syncSubscription(business.mpPreapprovalId);
  } catch (e) {
    return { error: e instanceof MercadoPagoError ? e.message : "No se pudo cancelar. Probá de nuevo." };
  }
  revalidatePath("/", "layout");
  const access = await getAccess(userId);
  return {
    notice: access.daysLeft
      ? `Suscripción cancelada. Seguís con tu plan ${access.daysLeft} días más (lo que ya pagaste).`
      : "Suscripción cancelada.",
  };
}
