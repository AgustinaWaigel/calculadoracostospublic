"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccess, rawDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth/server";
import {
  MercadoPagoError,
  cancelSubscription as mpCancel,
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
  email: z.string().trim().toLowerCase().email("Revisá el mail"),
});

/** Suscribirse: crea la suscripción en Mercado Pago y manda a pagar. */
export async function subscribe(_: BillingState, form: FormData): Promise<BillingState> {
  const userId = await requireUserId();
  const parsed = subscribeSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const business = await rawDb.business.findUnique({
    where: { id: userId },
    select: { plan: true, mpPreapprovalId: true, subscriptionStatus: true },
  });
  if (!business) return { error: "Entrá primero al inicio para terminar de armar tu cuenta." };
  if (business.plan === "FOUNDER") return { notice: "Tu cuenta es fundadora: ya tenés todo gratis." };
  if (business.subscriptionStatus === "AUTHORIZED") return { notice: "Ya tenés la suscripción activa." };

  let checkout: string;
  try {
    const sub = await createSubscription({ userId, email: parsed.data.email, backUrl: `${await appUrl()}/plan?volviste=1` });
    if (!sub.init_point) return { error: "Mercado Pago no devolvió el link de pago. Probá de nuevo." };
    await rawDb.business.update({
      where: { id: userId },
      data: { mpPreapprovalId: sub.id, subscriptionStatus: "PENDING", plan: "COMPLETE" },
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
      ? `Suscripción cancelada. Seguís con acceso ${access.daysLeft} días más (lo que ya pagaste).`
      : "Suscripción cancelada.",
  };
}
