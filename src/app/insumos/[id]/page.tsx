import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { SupplyForm } from "@/components/supplies/supply-form";
import { SupplyActions } from "@/components/supplies/supply-actions";
import { PriceHistoryChart, type HistoryPoint } from "@/components/supplies/price-history-chart";
import { userDb } from "@/lib/db";
import { D, formatPercent, formatNumber } from "@/lib/money";
import { daysSince, isPriceStale, priceChangePercent, supplyUnitCost } from "@/lib/calc/supply";
import { PRICE_SOURCE_LABELS } from "@/lib/schemas";

export const metadata = { title: "Insumo" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function InsumoPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await userDb();
  const { id } = await params;
  const [supply, categories] = await Promise.all([
    db.supply.findUnique({
      where: { id },
      include: {
        priceHistory: { orderBy: { recordedAt: "asc" } },
        usedIn: { include: { product: { select: { id: true, name: true } } } } } }),
    db.supply.findMany({ where: { category: { not: null } }, distinct: ["category"], select: { category: true } }),
  ]);
  if (!supply) notFound();

  const stale = isPriceStale(supply.priceUpdatedAt);
  const points: HistoryPoint[] = supply.priceHistory.map((h) => {
    const unit = supplyUnitCost(h);
    return {
      date: h.recordedAt.toISOString(),
      unitCost: unit.toNumber(),
      unitCostUsd: h.usdRate ? unit.div(h.usdRate).toNumber() : null };
  });
  const history = [...supply.priceHistory].reverse();

  return (
    <>
      <PageHeader
        title={supply.name}
        description={`Precio actualizado hace ${daysSince(supply.priceUpdatedAt)} días`}
        actions={<SupplyActions id={supply.id} stale={stale} />}
      />

      {stale && (
        <Alert className="mb-4 border-kraft/70 text-[#8a4f12] dark:text-[#f0c27a]">
          <AlertTriangleIcon />
          <AlertTitle>Este insumo no se actualiza hace más de 30 días</AlertTitle>
          <AlertDescription>
            Con la inflación, el costo real puede ser bastante más alto. Revisá el precio o confirmá que sigue igual.
          </AlertDescription>
        </Alert>
      )}

      <SupplyForm
        categories={categories.map((c) => c.category!)}
        defaults={{
          id: supply.id,
          name: supply.name,
          kind: supply.kind,
          category: supply.category,
          purchaseUnit: supply.purchaseUnit,
          usageUnit: supply.usageUnit,
          packQuantity: supply.packQuantity.toString(),
          packPrice: supply.packPrice.toString(),
          supplier: supply.supplier,
          url: supply.url,
        }}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Evolución del precio</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <PriceHistoryChart points={points} />
            {history.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Paquete</TableHead>
                    <TableHead className="text-right">Por {supply.usageUnit}</TableHead>
                    <TableHead className="text-right">Variación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h, i) => {
                    const prev = history[i + 1];
                    const change = prev ? priceChangePercent(supplyUnitCost(prev), supplyUnitCost(h)) : null;
                    return (
                      <TableRow key={h.id}>
                        <TableCell>
                          {dateFmt.format(h.recordedAt)}
                          <Badge variant="outline" className="ml-2 hidden sm:inline-flex">
                            {PRICE_SOURCE_LABELS[h.source]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Money value={h.packPrice.toString()} />
                          {!D(h.packQuantity).eq(1) && (
                            <span className="text-muted-foreground"> / {formatNumber(h.packQuantity)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Money value={supplyUnitCost(h).toString()} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {change && !change.isZero() ? (
                            <span className={change.gt(0) ? "text-red-600 dark:text-red-400" : "text-tinta dark:text-menta"}>
                              {change.gt(0) ? "+" : ""}
                              {formatPercent(change)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Se usa en</CardTitle>
          </CardHeader>
          <CardContent>
            {supply.usedIn.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no está en ninguna receta.</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {supply.usedIn.map((u) => (
                  <li key={u.id} className="flex justify-between gap-2">
                    <Link href={`/productos/${u.product.id}`} className="hover:underline">
                      {u.product.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {formatNumber(u.quantity, 4)} {supply.usageUnit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
