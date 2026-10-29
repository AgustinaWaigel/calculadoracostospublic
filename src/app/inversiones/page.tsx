import Link from "next/link";
import {
  CalendarClockIcon,
  PencilIcon,
  PiggyBankIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, InfoTooltip, PageHeader, StatCard } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { MovementDialog } from "@/components/investments/movement-dialog";
import { RecoverySimulator } from "@/components/investments/recovery-simulator";
import { deleteInvestmentMovement } from "@/actions/investments";
import type { InvestmentMovement } from "@prisma/client";
import { userDb } from "@/lib/db";
import { investmentSummary } from "@/lib/calc/investment";
import { formatPercent, roundCents } from "@/lib/money";
import { getSales, type SaleRow } from "@/server/sales";
import { monthKey, salesTotals } from "@/lib/calc/sales";

export const metadata = { title: "Inversiones" };

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

type Movement = InvestmentMovement;

function MovementList({ movements, kind }: { movements: Movement[]; kind: Movement["kind"] }) {
  return (
    <ul className="divide-y">
      {movements.map((m) => (
        <li key={m.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{m.description}</p>
            <p className="text-xs text-muted-foreground">{dateFmt.format(m.date)}</p>
          </div>
          <Money value={m.amount.toString()} className="font-semibold" />
          <MovementDialog
            kind={kind}
            movement={{
              id: m.id,
              kind: m.kind,
              description: m.description,
              amount: m.amount.toString(),
              date: m.date.toISOString().slice(0, 10),
            }}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label={`Editar ${m.description}`}>
                <PencilIcon />
              </Button>
            }
          />
          <ConfirmDelete
            title={`¿Eliminar “${m.description}”?`}
            onConfirm={deleteInvestmentMovement.bind(null, m.id)}
          />
        </li>
      ))}
    </ul>
  );
}

/** Resumen de las ventas (el detalle está en /ventas). */
function SalesCard({ sales }: { sales: SaleRow[] }) {
  const all = salesTotals(sales);
  const month = salesTotals(sales.filter((x) => monthKey(x.date) === monthKey(new Date())));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-1.5">
          <ShoppingBagIcon className="size-4 text-muted-foreground" />
          Tus ventas
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href="/ventas">Ver ventas</Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay ventas.{" "}
            <Link href="/ventas/nueva" className="text-primary underline">
              Registrá una
            </Link>{" "}
            o marcá un presupuesto como aceptado.
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Ventas", value: all.count },
                {
                  label: "Total vendido",
                  value: <Money value={all.total.toString()} decimals={0} />,
                },
                {
                  label: "Ganancia",
                  value: (
                    <Money
                      value={all.profit.toString()}
                      decimals={0}
                      className={all.profit.lt(0) ? "text-destructive" : "text-tinta dark:text-menta"}
                    />
                  ),
                },
                {
                  label: "Margen",
                  value: all.margin ? formatPercent(all.margin, 0) : "—",
                },
              ].map((x) => (
                <div key={x.label} className="rounded-lg bg-muted/40 p-3">
                  <dt className="text-xs text-muted-foreground">{x.label}</dt>
                  <dd className="text-xl font-bold tabular-nums">{x.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">
              Este mes: {month.count} {month.count === 1 ? "venta" : "ventas"} ·{" "}
              <Money value={month.total.toString()} decimals={0} /> vendido ·{" "}
              <Money value={month.profit.toString()} decimals={0} /> de ganancia
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default async function InversionesPage() {
  const db = await userDb();
  const [movements, sales] = await Promise.all([
    db.investmentMovement.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    getSales(),
  ]);
  const investments = movements.filter((m) => m.kind === "INVESTMENT");
  const recoveries = movements.filter((m) => m.kind === "RECOVERY");
  const firstInvestment = investments.length ? new Date(Math.min(...investments.map((m) => m.date.getTime()))) : null;
  // Las ventas desde la primera inversión suman solas, con su ganancia.
  const salesSince = firstInvestment ? sales.filter((x) => x.date >= firstInvestment) : [];
  const fromSales = salesTotals(salesSince);
  const s = investmentSummary([
    ...movements,
    ...salesSince.map((x) => ({
      kind: "RECOVERY" as const,
      amount: x.profit,
      date: x.date,
    })),
  ]);
  const done = investments.length > 0 && s.remaining.lte(0);

  const newInvestment = (
    <MovementDialog
      kind="INVESTMENT"
      trigger={
        <Button>
          <PlusIcon /> Nueva inversión
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Inversiones"
        description="Lo que pusiste para arrancar y cuánto te falta para recuperarlo."
        actions={newInvestment}
      />

      {investments.length === 0 ? (
        <div className="grid gap-4">
          <EmptyState
            icon={PiggyBankIcon}
            title="Cargá lo que invertiste"
            description="Máquinas, herramientas, stock inicial, el logo, la web… todo lo que pusiste antes de vender. Después vas sumando lo que recuperás."
            example={<>Ej: Plastificadora $120.000 · Primer stock de papel $45.000 · Logo $30.000</>}
          />
          <SalesCard sales={sales} />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Invertiste"
              icon={WalletIcon}
              accent="kraft"
              value={<Money value={s.invested.toString()} decimals={0} />}
            />
            <StatCard
              label="Recuperaste"
              icon={TrendingUpIcon}
              accent="menta"
              tone={s.recovered.gt(0) ? "good" : "default"}
              value={<Money value={s.recovered.toString()} decimals={0} />}
              hint={`${formatPercent(s.progressPercent, 0)} de lo invertido`}
            />
            <StatCard
              label={done ? "Ganancia extra" : "Te falta"}
              icon={PiggyBankIcon}
              accent="halo"
              tone={done ? "good" : "warn"}
              value={<Money value={(done ? s.surplus : s.remaining).toString()} decimals={0} />}
              hint={done ? "¡Ya recuperaste todo!" : undefined}
            />
            <StatCard
              label="Lo recuperás en"
              icon={CalendarClockIcon}
              accent="cielo"
              value={
                done ? "Listo" : s.monthsLeft != null ? `${s.monthsLeft} ${s.monthsLeft === 1 ? "mes" : "meses"}` : "—"
              }
              hint={
                done
                  ? undefined
                  : s.recoveryDate
                    ? `para ${monthFmt.format(s.recoveryDate)}, a tu ritmo`
                    : "Cargá un recupero para estimarlo"
              }
            />
          </div>

          <Card>
            <CardContent className="grid gap-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">Recupero</span>
                <span className="tabular-nums text-muted-foreground">{formatPercent(s.progressPercent, 0)}</span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Recupero de la inversión"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(s.progressPercent.toNumber())}
              >
                <div
                  className="h-full rounded-full bg-tinta transition-[width] duration-500 dark:bg-menta"
                  style={{ width: `${s.progressPercent.toNumber()}%` }}
                />
              </div>
              {s.startedAt && (
                <p className="text-xs text-muted-foreground">
                  Desde {dateFmt.format(s.startedAt)}
                  {s.monthlyPace && (
                    <>
                      {" "}
                      · venís recuperando <Money value={s.monthlyPace.toString()} decimals={0} /> por mes en promedio
                    </>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          <SalesCard sales={sales} />

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_320px]">
            <Card className="gap-0 self-start py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>Lo que invertiste</CardTitle>
              </CardHeader>
              <MovementList movements={investments} kind="INVESTMENT" />
              <div className="border-t p-3">
                <MovementDialog
                  kind="INVESTMENT"
                  trigger={
                    <Button variant="secondary" size="sm">
                      <PlusIcon /> Agregar inversión
                    </Button>
                  }
                />
              </div>
            </Card>

            <Card className="gap-0 self-start py-0">
              <CardHeader className="border-b py-4">
                <CardTitle className="flex items-center gap-1.5">
                  Lo que recuperaste
                  <InfoTooltip>
                    Tus ventas suman solas (lo cobrado sin IVA ni comisiones, menos el costo). A mano cargá solo
                    entradas que no sean ventas.
                  </InfoTooltip>
                </CardTitle>
              </CardHeader>
              {salesSince.length > 0 && (
                <Link href="/ventas?mes=todo" className="flex items-center gap-3 border-b px-4 py-3 hover:bg-muted/50">
                  <ShoppingBagIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Ganancia de tus ventas</p>
                    <p className="text-xs text-muted-foreground">
                      {fromSales.count} venta{fromSales.count === 1 ? "" : "s"} desde el{" "}
                      {dateFmt.format(firstInvestment!)} · vendido{" "}
                      <Money value={fromSales.total.toString()} decimals={0} />
                    </p>
                  </div>
                  <Money
                    value={fromSales.profit.toString()}
                    className={fromSales.profit.lt(0) ? "font-semibold text-destructive" : "font-semibold"}
                  />
                </Link>
              )}
              {recoveries.length > 0 && (
                <>
                  {salesSince.length > 0 && (
                    <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground">
                      Cargados a mano
                    </div>
                  )}
                  <MovementList movements={recoveries} kind="RECOVERY" />
                </>
              )}
              {recoveries.length === 0 && salesSince.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Todavía nada. Cuando registres una venta, su ganancia aparece acá sola.
                </p>
              )}
              <div className="border-t p-3">
                <MovementDialog
                  kind="RECOVERY"
                  trigger={
                    <Button variant="secondary" size="sm">
                      <PlusIcon /> Agregar recupero
                    </Button>
                  }
                />
              </div>
            </Card>

            {!done && (
              <Card className="self-start">
                <CardHeader>
                  <CardTitle>¿Y si…?</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecoverySimulator
                    remaining={s.remaining.toString()}
                    suggested={s.monthlyPace ? roundCents(s.monthlyPace).toString() : null}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
