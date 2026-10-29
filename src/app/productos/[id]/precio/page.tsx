import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangleIcon, CoinsIcon, PercentIcon, ScaleIcon, ShapesIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoTooltip, StatCard } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { MarginTooltip } from "@/components/products/margin-tooltip";
import { PriceSimulator } from "@/components/products/price-simulator";
import { costProduct, getCostingContext, priceProduct, productInclude } from "@/server/costing";
import { contextToPlain } from "@/server/editor-options";
import { userDb } from "@/lib/db";
import { formatNumber, formatPercent } from "@/lib/money";

export const metadata = { title: "Precio de venta" };

export default async function PrecioPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await userDb();
  const { id } = await params;
  const [product, ctx] = await Promise.all([
    db.product.findUnique({ where: { id }, include: productInclude }),
    getCostingContext(),
  ]);
  if (!product) notFound();

  const cost = costProduct(product, ctx);
  let pricing;
  try {
    pricing = priceProduct(product, cost, ctx);
  } catch (e) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon />
        <AlertTitle>No se pudo calcular el precio</AlertTitle>
        <AlertDescription>{e instanceof Error ? e.message : "Revisá el margen del producto."}</AlertDescription>
      </Alert>
    );
  }
  const plainCtx = contextToPlain(ctx);
  const isRI = ctx.business.taxCondition === "RESPONSABLE_INSCRIPTO";

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Costo por unidad" icon={ShapesIcon} accent="lavanda" value={<Money value={cost.total.toString()} />} />
        <StatCard
          label={
            <span className="flex items-center gap-1">
              {pricing.mode === "MARGIN" ? "Margen" : "Markup"} <MarginTooltip />
            </span>
          }
          icon={PercentIcon}
          accent="tinta"
          value={formatPercent(pricing.percent, 0)}
        />
        <StatCard
          label="Te queda por unidad"
          icon={CoinsIcon}
          accent="amanecer"
          value={<Money value={pricing.takeHome.toString()} />}
          hint={
            pricing.ownLabor.gt(0) ? (
              <>
                tu trabajo <Money value={pricing.ownLabor.toString()} /> + margen{" "}
                <Money value={pricing.targetProfit.toString()} />
              </>
            ) : (
              "solo margen (sin trabajo propio)"
            )
          }
        />
        <StatCard
          label="Punto de equilibrio"
          icon={ScaleIcon}
          accent="kraft"
          value={pricing.breakEven ? `${formatNumber(pricing.breakEven.units, 0)} u/mes` : "—"}
          hint={pricing.breakEven ? "para cubrir los fijos" : "No cubre el costo variable"}
          tone={pricing.breakEven ? "default" : "bad"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            Precio sugerido por canal
            <InfoTooltip>
              Para cada canal sumamos sus comisiones, cargos y envío de modo que te quede la misma ganancia neta
              que en la venta directa. Las comisiones se calculan sobre el precio final.
            </InfoTooltip>
          </CardTitle>
          <CardAction>
            <Link href="/ajustes#canales" className="text-sm text-primary underline">
              Editar canales
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Precio final</TableHead>
                {isRI && <TableHead className="text-right">IVA</TableHead>}
                <TableHead className="text-right">Comisiones</TableHead>
                <TableHead className="text-right">Envío y cargos</TableHead>
                <TableHead className="text-right">Te queda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.channels.map((c) =>
                c.ok ? (
                  <TableRow key={c.channelName} className={c.type === "DIRECT" ? "bg-halo/15 dark:bg-halo/8" : undefined}>
                    <TableCell className="font-medium">
                      {c.channelName}
                      {c.isLoss && (
                        <Badge variant="destructive" className="ml-2">
                          Pérdida
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-lg font-bold text-tinta dark:text-menta">
                      <Money value={c.price.toString()} />
                    </TableCell>
                    {isRI && (
                      <TableCell className="text-right text-muted-foreground">
                        <Money value={c.vat.toString()} />
                      </TableCell>
                    )}
                    <TableCell className="text-right text-muted-foreground">
                      <Money value={c.commission.plus(c.paymentFee).plus(c.installments).toString()} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <Money value={c.shipping.plus(c.fixedFee).toString()} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={c.isLoss ? "text-destructive" : "text-tinta dark:text-menta"}>
                        <Money value={c.netProfit.plus(pricing.ownLabor).toString()} />
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {pricing.ownLabor.gt(0) ? (
                          <>
                            <Money value={c.netProfit.toString()} /> de margen ({formatPercent(c.netMarginPercent, 0)})
                          </>
                        ) : (
                          <>{formatPercent(c.netMarginPercent, 0)} del precio</>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={c.channelName}>
                    <TableCell className="font-medium">{c.channelName}</TableCell>
                    <TableCell colSpan={isRI ? 5 : 4} className="text-destructive">
                      {c.error}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Precios por cantidad</CardTitle>
          </CardHeader>
          <CardContent>
            {pricing.volume.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay tramos de descuento configurados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cantidad</TableHead>
                    <TableHead className="text-right">Descuento</TableHead>
                    <TableHead className="text-right">Precio c/u</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricing.volume.map((v) => (
                    <TableRow key={v.quantity}>
                      <TableCell>{formatNumber(v.quantity, 0)} u.</TableCell>
                      <TableCell className="text-right">{formatPercent(v.discountPercent, 0)}</TableCell>
                      <TableCell className="text-right">
                        <Money value={v.unitPrice.toString()} />
                        {v.unitProfit.lt(0) && (
                          <span className="block text-xs text-destructive">debajo del costo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <Money value={v.total.toString()} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <PriceSimulator unitCost={cost.total.toString()} channels={plainCtx.channels} settings={plainCtx.settings} />
          {pricing.breakEven && (
            <Card>
              <CardHeader>
                <CardTitle>Punto de equilibrio</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-pretty">
                Cada unidad deja <Money value={pricing.breakEven.contribution.toString()} className="font-semibold" />{" "}
                después de pagar materiales, mano de obra y comisiones. Para cubrir tus{" "}
                <Money value={ctx.monthlyFixed.toString()} /> de costos fijos necesitás vender{" "}
                <b>{formatNumber(pricing.breakEven.units, 0)} unidades por mes</b> (
                <Money value={pricing.breakEven.revenue.toString()} /> netos).
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
