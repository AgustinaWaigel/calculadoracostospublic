import { CrownIcon, HourglassIcon, LockIcon, SparklesIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/ui-bits";
import { CancelSubscription, PlanPicker } from "@/components/billing/plan-picker";
import { getAccess, rawDb } from "@/lib/db";
import { requireUserId, sessionUser } from "@/lib/auth/server";
import { TRIAL_DAYS } from "@/lib/billing";
import { mpConfigured, syncSubscription } from "@/server/mercadopago";

export const metadata = { title: "Mi plan" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });
const SYNC_EVERY = 6 * 3_600_000;

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ volviste?: string }> }) {
  const userId = await requireUserId();
  const { volviste } = await searchParams;
  const before = await rawDb.business.findUnique({
    where: { id: userId },
    select: { mpPreapprovalId: true, subscriptionStatus: true, subscriptionSyncedAt: true },
  });
  // Al volver de Mercado Pago (o si hace rato que no se revisa) se consulta el estado de la suscripción.
  if (
    before?.mpPreapprovalId &&
    mpConfigured() &&
    (volviste || before.subscriptionStatus === "PENDING" || !before.subscriptionSyncedAt || Date.now() - before.subscriptionSyncedAt.getTime() > SYNC_EVERY)
  ) {
    await syncSubscription(before.mpPreapprovalId).catch((e) => console.error("[plan] sync", e));
  }
  const [access, user, business] = await Promise.all([
    getAccess(userId),
    sessionUser(),
    rawDb.business.findUnique({ where: { id: userId }, select: { currentPeriodEnd: true, trialEndsAt: true, subscriptionStatus: true } }),
  ]);

  const status = {
    founder: { icon: CrownIcon, title: "Cuenta fundadora", text: "Tenés todo gratis para siempre. ¡Gracias por estar desde el principio!" },
    active: access.ending
      ? { icon: HourglassIcon, title: "Suscripción cancelada", text: `Tenés todo hasta el ${business?.currentPeriodEnd ? dateFmt.format(business.currentPeriodEnd) : "fin del período"}; después pasás al plan gratis. Podés volver a suscribirte cuando quieras.` }
      : { icon: SparklesIcon, title: "Suscripción activa", text: `Tu suscripción está activa.${business?.currentPeriodEnd ? ` Próximo débito: ${dateFmt.format(business.currentPeriodEnd)}.` : ""}` },
    trial: { icon: HourglassIcon, title: `Prueba gratis: te quedan ${access.daysLeft} ${access.daysLeft === 1 ? "día" : "días"}`, text: `Durante ${TRIAL_DAYS} días tenés todo. Después seguís gratis con insumos y productos, o te suscribís para tener todo.` },
    free: { icon: LockIcon, title: "Plan gratis", text: "Cargás insumos y productos y ves su costo de materiales y su precio. Para mano de obra, costos fijos, presupuestos, ventas e inversiones, suscribite al plan completo." },
  }[access.kind];
  const pending = business?.subscriptionStatus === "PENDING" && access.kind !== "active";

  return (
    <>
      <PageHeader title="Mi plan" />
      <div className="grid gap-6">
        <Card>
          <CardContent className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-halo/30 text-primary">
              <status.icon className="size-5" />
            </span>
            <div className="grid gap-1">
              <p className="font-semibold">{status.title}</p>
              <p className="text-sm text-muted-foreground">{status.text}</p>
              {pending && (
                <p className="text-sm text-muted-foreground">
                  Tenés un pago pendiente en Mercado Pago. Si ya lo hiciste, puede tardar unos minutos en verse acá.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {access.kind !== "founder" &&
          (mpConfigured() ? (
            (access.kind !== "active" || access.ending) && <PlanPicker defaultEmail={user?.email ?? ""} />
          ) : (
            <p className="text-sm text-muted-foreground">Los pagos todavía no están habilitados.</p>
          ))}

        {access.kind === "active" && !access.ending && <CancelSubscription />}
      </div>
    </>
  );
}
