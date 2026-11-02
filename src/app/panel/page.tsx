import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/ui-bits";
import { getAdminStats, requireAdmin } from "@/server/admin";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Panel" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "America/Argentina/Buenos_Aires" });
const ACCESS_LABELS = { founder: "Fundadora", trial: "Prueba", free: "Gratis", active: "Paga" } as const;

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="grid gap-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="text-3xl font-semibold">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </CardContent>
    </Card>
  );
}

/** Porcentaje "x de y" para la activación. */
function Funnel({ label, value, of }: { label: string; value: number; of: number }) {
  const pct = of ? Math.round((value / of) * 100) : 0;
  return (
    <li className="grid gap-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value} de {of} · <strong className="text-foreground">{pct}%</strong>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

/** Panel solo para la dueña de la app: cómo vienen las cuentas, los planes y el uso. */
export default async function PanelPage() {
  await requireAdmin();
  const s = await getAdminStats();
  const maxWeek = Math.max(1, ...s.weekly.map((w) => w.count));

  return (
    <>
      <PageHeader title="Panel" description="Solo lo ves vos. Números de todas las cuentas." />
      <div className="grid gap-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Cuentas" value={s.accounts.total} hint={`${s.accounts.confirmed} con el mail confirmado`} />
          <Stat label="Nuevas" value={s.accounts.new7} hint={`en 7 días · ${s.accounts.new30} en 30 días`} />
          <Stat label="Entraron" value={s.accounts.active7} hint={`en 7 días · ${s.accounts.active30} en 30 días`} />
          <Stat label="Ingreso por mes" value={formatMoney(s.monthlyRevenue, "ARS", 0)} hint={`${s.plans.paying + s.plans.cancelling} suscripciones, antes de comisiones`} />
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Planes</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ["Pagan", s.plans.paying],
                  ["Cancelaron (siguen hasta fin de mes)", s.plans.cancelling],
                  ["En prueba", s.plans.trial],
                  ["Plan gratis", s.plans.free],
                  ["Fundadoras", s.plans.founder],
                  ["Pago pendiente en Mercado Pago", s.plans.pending],
                ].map(([label, n]) => (
                  <div key={label} className="flex justify-between gap-2 border-b py-1.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-semibold">{n}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>¿La usan?</CardTitle>
              <p className="text-sm text-muted-foreground">De las cuentas con emprendimiento armado, cuántas llegaron a cada paso.</p>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                <Funnel label="Cargaron un insumo" value={s.activation.withSupplies} of={s.activation.businesses} />
                <Funnel label="Armaron un producto" value={s.activation.withProducts} of={s.activation.businesses} />
                <Funnel label="Hicieron un presupuesto" value={s.activation.withQuotes} of={s.activation.businesses} />
                <Funnel label="Anotaron una venta" value={s.activation.withSales} of={s.activation.businesses} />
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cuentas nuevas por semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1.5">
                {s.weekly.map((w) => (
                  <li key={w.from.toISOString()} className="grid grid-cols-[88px_1fr_28px] items-center gap-2 text-sm">
                    <span className="text-muted-foreground">desde {dateFmt.format(w.from)}</span>
                    <div className="h-3 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-amanecer dark:bg-lavanda" style={{ width: `${(w.count / maxWeek) * 100}%` }} />
                    </div>
                    <span className="text-right font-semibold">{w.count}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rubros</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1.5 text-sm">
                {s.industries.map(([label, n]) => (
                  <li key={label} className="flex justify-between border-b py-1.5">
                    <span>{label}</span>
                    <span className="font-semibold">{n}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Últimas cuentas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 font-medium">Cuenta</th>
                  <th className="font-medium">Rubro</th>
                  <th className="font-medium">Alta</th>
                  <th className="font-medium">Último ingreso</th>
                  <th className="font-medium">Plan</th>
                  <th className="text-right font-medium">Insumos · productos · presup.</th>
                </tr>
              </thead>
              <tbody>
                {s.recent.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2">
                      <span className="block font-medium">{u.business ?? "—"}</span>
                      <span className={cn("block text-xs", u.confirmed ? "text-muted-foreground" : "text-destructive")}>
                        {u.email}
                        {!u.confirmed && " · sin confirmar"}
                      </span>
                    </td>
                    <td>{u.industry ?? "—"}</td>
                    <td>{u.createdAt ? dateFmt.format(u.createdAt) : "—"}</td>
                    <td>{u.lastSignIn ? dateFmt.format(u.lastSignIn) : "nunca"}</td>
                    <td>{u.access ? ACCESS_LABELS[u.access] : "—"}</td>
                    <td className="text-right">
                      {u.supplies} · {u.products} · {u.quotes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
