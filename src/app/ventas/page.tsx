import Link from "next/link";
import {
  FileTextIcon,
  PercentIcon,
  PlusIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, InfoTooltip, PageHeader, StatCard } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { PeriodSelect } from "@/components/sales/period-select";
import { SalesChart } from "@/components/sales/sales-chart";
import { getSales, type SaleRow } from "@/server/sales";
import { groupLines, lastMonths, monthKey, percentChange, salesByMonth, salesTotals } from "@/lib/calc/sales";
import { formatQuoteNumber } from "@/lib/quote-text";
import { D, formatNumber, formatPercent, type Decimal } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ventas" };

const ALL = "todo";
const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const monthLong = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthShort = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  timeZone: "UTC",
});
const monthDate = (key: string) => new Date(`${key}-01T00:00:00.000Z`);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "+12% vs septiembre" para el hint de las tarjetas. */
function Change({ value, label }: { value: Decimal | null; label: string }) {
  if (!value) return null;
  const up = value.gte(0);
  const Icon = up ? TrendingUpIcon : TrendingDownIcon;
  return (
    <span className={cn("inline-flex items-center gap-1", up ? "text-tinta dark:text-menta" : "text-destructive")}>
      <Icon className="size-3" />
      {up ? "+" : ""}
      {formatPercent(value, 0)} vs {label}
    </span>
  );
}

function GroupTable({ rows, unit }: { rows: ReturnType<typeof groupLines>; unit?: boolean }) {
  const max = rows[0]?.revenue ?? D(0);
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.key} className="grid gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{r.label}</span>
            <Money value={r.revenue.toString()} decimals={0} className="font-semibold" />
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-amanecer dark:bg-lavanda"
              style={{
                width: `${max.gt(0) ? r.revenue.div(max).times(100).toNumber() : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {unit
              ? `${formatNumber(r.quantity, 2)} u.`
              : `${formatNumber(r.quantity, 0)} venta${r.quantity.eq(1) ? "" : "s"}`}
            {" · "}
            {r.profit ? (
              <>
                ganancia <Money value={r.profit.toString()} decimals={0} />
              </>
            ) : (
              "sin costo cargado"
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default async function VentasPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const sales = await getSales();

  const thisMonth = monthKey(new Date());
  const period = mes === ALL || (mes && /^\d{4}-\d{2}$/.test(mes)) ? mes : thisMonth;
  const inPeriod = (s: SaleRow) => period === ALL || monthKey(s.date) === period;
  const list = sales.filter(inPeriod);
  const totals = salesTotals(list);

  // Comparación con el mes anterior (solo cuando se mira un mes).
  const prevKey = period === ALL ? null : lastMonths(period, 2)[0];
  const prev = prevKey ? salesTotals(sales.filter((s) => monthKey(s.date) === prevKey)) : null;
  const prevLabel = prevKey ? monthShort.format(monthDate(prevKey)) : "";

  const months = lastMonths(thisMonth, 12);
  const chart = salesByMonth(sales, months).map((m) => ({
    label: capitalize(monthShort.format(monthDate(m.month))),
    total: m.total.toNumber(),
    profit: m.profit.toNumber(),
  }));
  const periodOptions = [
    ...[...months].reverse().map((m) => ({
      value: m,
      label: capitalize(monthLong.format(monthDate(m))),
    })),
    { value: ALL, label: "Todo" },
  ];
  if (period !== ALL && !months.includes(period)) {
    periodOptions.unshift({
      value: period,
      label: capitalize(monthLong.format(monthDate(period))),
    });
  }
  const periodLabel = period === ALL ? "desde el principio" : `en ${monthLong.format(monthDate(period))}`;

  const byProduct = groupLines(
    list.flatMap((s) =>
      s.items.map((i) => ({
        key: i.productId ?? `libre:${i.description.trim().toLowerCase()}`,
        label: i.description,
        quantity: i.quantity,
        revenue: i.revenue,
        profit: i.profit,
      })),
    ),
  ).slice(0, 8);
  const byChannel = groupLines(
    list.map((s) => ({
      key: s.channelId ?? "none",
      label: s.channelName ?? "Sin canal",
      quantity: 1,
      revenue: s.total,
      profit: D(s.countedRevenue).gt(0) ? s.profit : null,
    })),
  );

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Lo que vendiste y cuánto te dejó."
        actions={
          <>
            <PeriodSelect value={period} options={periodOptions} />
            <Button asChild>
              <Link href="/ventas/nueva">
                <PlusIcon /> Nueva venta
              </Link>
            </Button>
          </>
        }
      />

      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingBagIcon}
          title="Todavía no registraste ventas"
          description="Cargá cada venta con lo que vendiste y a cuánto. Los presupuestos que marques como aceptados se suman solos."
          example={<>Ej: 20 fotos plastificadas A4 a Lucía · $36.000 · Mercado Pago</>}
          action={{ label: "Registrar la primera", href: "/ventas/nueva" }}
        />
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Vendiste"
              icon={WalletIcon}
              accent="amanecer"
              value={<Money value={totals.total.toString()} decimals={0} />}
              hint={prev ? <Change value={percentChange(totals.total, prev.total)} label={prevLabel} /> : periodLabel}
            />
            <StatCard
              label="Ganancia"
              icon={TrendingUpIcon}
              accent="menta"
              tone={totals.profit.lt(0) ? "bad" : totals.profit.gt(0) ? "good" : "default"}
              value={<Money value={totals.profit.toString()} decimals={0} />}
              hint={prev ? <Change value={percentChange(totals.profit, prev.profit)} label={prevLabel} /> : periodLabel}
            />
            <StatCard
              label="Ventas"
              icon={ReceiptIcon}
              accent="lavanda"
              value={totals.count}
              hint={
                totals.average ? (
                  <>
                    ticket promedio <Money value={totals.average.toString()} decimals={0} />
                  </>
                ) : undefined
              }
            />
            <StatCard
              label="Margen"
              icon={PercentIcon}
              accent="halo"
              value={totals.margin ? formatPercent(totals.margin, 0) : "—"}
              hint="ganancia sobre lo vendido"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Últimos 12 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesChart data={chart} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card className="self-start">
              <CardHeader>
                <CardTitle>Lo que más vendiste</CardTitle>
              </CardHeader>
              <CardContent>
                {byProduct.length ? (
                  <GroupTable rows={byProduct} unit />
                ) : (
                  <p className="text-sm text-muted-foreground">Sin ventas {periodLabel}.</p>
                )}
              </CardContent>
            </Card>
            <Card className="self-start">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  Por canal
                  <InfoTooltip>
                    Cada canal descuenta sus comisiones de la ganancia (las configurás en Ajustes → Canales).
                  </InfoTooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {byChannel.length ? (
                  <GroupTable rows={byChannel} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sin ventas {periodLabel}.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Ventas {periodLabel}</CardTitle>
            </CardHeader>
            {list.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No hay ventas en este período.</p>
            ) : (
              <ul className="divide-y">
                {list.map((s) => (
                  <li key={s.id}>
                    <Link href={`/ventas/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                      <span className="w-14 text-sm text-muted-foreground tabular-nums">{dateFmt.format(s.date)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {s.clientName ?? s.items.map((i) => i.description).join(", ")}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.items.length} ítem{s.items.length !== 1 && "s"}
                          {s.channelName && ` · ${s.channelName}`}
                          {s.skippedItems > 0 && ` · ${s.skippedItems} sin costo`}
                        </p>
                      </div>
                      {s.quote && (
                        <Badge variant="outline" className="hidden gap-1 sm:inline-flex">
                          <FileTextIcon className="size-3" />
                          {formatQuoteNumber(s.quote.number)}
                        </Badge>
                      )}
                      <div className="w-28 text-right">
                        <Money value={s.total} decimals={0} className="font-semibold" />
                        <p
                          className={cn(
                            "text-xs",
                            D(s.profit).lt(0) ? "text-destructive" : "text-tinta dark:text-menta",
                          )}
                        >
                          <Money value={s.profit} decimals={0} />
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
