import { NextResponse, type NextRequest } from "next/server";
import { syncSubscription, validWebhookSignature } from "@/server/mercadopago";

/**
 * Avisos de Mercado Pago cuando cambia una suscripción (alta, pausa, cancelación).
 * Se configura en el panel de MP → Tus integraciones → Webhooks, evento "Planes y suscripciones".
 */
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const body = (await request.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string } };
  const type = body.type ?? body.topic ?? params.get("type") ?? params.get("topic");
  const id = String(body.data?.id ?? params.get("data.id") ?? params.get("id") ?? "");
  if (!id) return NextResponse.json({ ok: true });

  if (!validWebhookSignature({ signature: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId: id })) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  if (type === "subscription_preapproval" || type === "preapproval") {
    try {
      await syncSubscription(id);
    } catch (e) {
      console.error("[mercadopago webhook]", e);
      // 500: MP reintenta el aviso más tarde.
      return NextResponse.json({ error: "No se pudo procesar" }, { status: 500 });
    }
  }
  // Los demás avisos (pagos de cada mes) no cambian el acceso: la suscripción manda.
  return NextResponse.json({ ok: true });
}
