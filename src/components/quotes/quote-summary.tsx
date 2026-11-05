import { ClockIcon, CoinsIcon, PiggyBankIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { D, formatNumber } from "@/lib/money";
import type { QuoteSummary as Summary } from "@/server/quote-summary";
import { MaterialsCard } from "./materials-card";

function formatMinutes(minutes: string) {
  const m = D(minutes).round().toNumber();
  const h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`;
}

/** Ganancia y materiales del pedido: es para vos, no sale en el PDF ni en el ticket. */
export function QuoteSummary({
  summary: s,
  withWaste,
  basePath,
}: {
  summary: Summary;
  withWaste: boolean;
  basePath: string;
}) {
  const loss = D(s.profit).lt(0);
  const keep = D(s.profit).plus(s.ownLabor);

  return (
    <section className="mt-6 grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">Para vos: cuánto te deja y qué necesitás</h2>
        <p className="text-sm text-muted-foreground">
          Con los costos de hoy y lo último que guardaste. Esto no lo ve el cliente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cobrás" value={<Money value={s.total} />} icon={CoinsIcon} />
        <StatCard
          label="Ganancia neta"
          value={<Money value={s.profit} />}
          tone={loss ? "bad" : "good"}
          icon={PiggyBankIcon}
          hint={s.channelName ? `Vendiendo por ${s.channelName}` : undefined}
        />
        <StatCard
          label="Te queda"
          value={<Money value={keep.toString()} />}
          tone={keep.lt(0) ? "bad" : "good"}
          hint={
            <>
              Ganancia + tu mano de obra (<Money value={s.ownLabor} />)
            </>
          }
        />
        <StatCard
          label="Tiempo de trabajo"
          value={formatMinutes(s.laborMinutes)}
          icon={ClockIcon}
          hint={<>Costo total: <Money value={s.cost} /></>}
        />
      </div>

      {s.skippedItems > 0 && (
        <p className="text-sm text-[#9a5b13] dark:text-[#f0c27a]">
          {s.skippedItems === 1 ? "Hay 1 ítem libre" : `Hay ${s.skippedItems} ítems libres`} (sin producto): no
          suma ganancia ni materiales porque no sabemos cuánto cuesta.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ganancia por ítem</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem</TableHead>
                  <TableHead className="text-right">Cobrás</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Ganancia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.items.map((i, n) => (
                  <TableRow key={n}>
                    <TableCell className="font-medium">
                      {formatNumber(i.quantity)} × {i.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={i.revenue} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {i.cost ? <Money value={i.cost} /> : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {i.profit ? (
                        <span className={D(i.profit).lt(0) ? "text-destructive" : "text-tinta dark:text-menta"}>
                          <Money value={i.profit} />
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <MaterialsCard
          title="Materiales que necesitás"
          materials={s.materials}
          withWaste={withWaste}
          basePath={basePath}
          empty="Ningún producto de este presupuesto tiene materiales cargados en su receta."
        />
      </div>
    </section>
  );
}
