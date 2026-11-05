import Link from "next/link";
import { ClipboardListIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { MaterialsCard } from "@/components/quotes/materials-card";
import { ProductionSelect } from "@/components/quotes/production-select";
import { quoteTotals } from "@/lib/calc/quote";
import { D } from "@/lib/money";
import { formatQuoteNumber } from "@/lib/quote-text";
import { getOpenOrders } from "@/server/quote-summary";

export const metadata = { title: "Pedidos" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ merma?: string }> }) {
  const withWaste = (await searchParams).merma === "1";
  const { orders, materials } = await getOpenOrders(withWaste);
  // Las fechas de entrega se guardan a las 00:00 UTC: comparamos con el día de hoy en Argentina.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Presupuestos aceptados que todavía no entregaste, por fecha de entrega."
      />
      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardListIcon}
          title="No tenés pedidos pendientes"
          description="Cuando marques un presupuesto como Aceptado, aparece acá hasta que lo entregues."
          action={{ label: "Ver presupuestos", href: "/presupuestos" }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <Card className="gap-0 self-start overflow-hidden py-0">
            <ul className="divide-y">
              {orders.map((o) => {
                const total = quoteTotals(o.items, o.discountPercent).total;
                const balance = total.minus(D(o.paidAmount));
                const day = o.deliveryDate?.toISOString().slice(0, 10);
                return (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Link href={`/presupuestos/${o.id}`} className="min-w-0 flex-1 hover:underline">
                      <p className="truncate font-medium">
                        <span className="mr-2 text-sm text-muted-foreground tabular-nums">{formatQuoteNumber(o.number)}</span>
                        {o.clientName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.items.map((i) => `${D(i.quantity).toString()} × ${i.description}`).join(" · ")}
                      </p>
                    </Link>
                    <div className="flex flex-col items-end gap-1 text-sm">
                      {day ? (
                        <span className="flex items-center gap-1.5">
                          {day < today && <Badge variant="destructive">Atrasado</Badge>}
                          {day === today && <Badge>Hoy</Badge>}
                          {dateFmt.format(o.deliveryDate!)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin fecha de entrega</span>
                      )}
                      {balance.gt(0) ? (
                        <span className="text-xs text-muted-foreground">
                          Resta <Money value={balance.toString()} className="font-semibold text-foreground" />
                        </span>
                      ) : (
                        <span className="text-xs text-tinta dark:text-menta">Pagado</span>
                      )}
                    </div>
                    <ProductionSelect id={o.id} value={o.production} />
                  </li>
                );
              })}
            </ul>
          </Card>
          <MaterialsCard
            title="Lista de compras"
            materials={materials}
            withWaste={withWaste}
            basePath="/pedidos"
            empty="Ninguno de estos pedidos tiene productos con materiales en su receta."
          />
        </div>
      )}
    </>
  );
}
