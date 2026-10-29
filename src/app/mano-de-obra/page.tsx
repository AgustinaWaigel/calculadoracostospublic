import { ClockIcon, PencilIcon, PlusIcon, TrendingDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { LaborProfileDialog } from "@/components/labor/labor-profile-dialog";
import { HourlyRateCalculator } from "@/components/labor/hourly-rate-calculator";
import { MarketRatesCard } from "@/components/labor/market-rates-card";
import { deleteLaborProfile } from "@/actions/labor";
import { userDb } from "@/lib/db";
import { compareHourlyRate } from "@/lib/calc/labor";
import { formatPercent } from "@/lib/money";

export const metadata = { title: "Mano de obra" };

export default async function ManoDeObraPage() {
  const db = await userDb();
  const [profiles, rates] = await Promise.all([
    db.laborProfile.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { usedIn: true } } } }),
    db.marketRate.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const marketValues = rates.map((r) => r.hourlyRate);
  const comparisons = new Map(profiles.map((p) => [p.id, compareHourlyRate(p.hourlyRate, marketValues)]));
  const below = profiles.filter((p) => comparisons.get(p.id)?.isBelowMarket);

  return (
    <>
      <PageHeader
        title="Mano de obra"
        actions={
          <LaborProfileDialog
            trigger={
              <Button>
                <PlusIcon /> Nuevo perfil
              </Button>
            }
          />
        }
      />

      {below.length > 0 && (
        <Alert className="mb-4 border-kraft/70 text-[#8a4f12] dark:text-[#f0c27a]">
          <TrendingDownIcon />
          <AlertTitle>Estás cobrando por debajo del mercado</AlertTitle>
          <AlertDescription>
            {below.map((p) => p.name).join(", ")} {below.length > 1 ? "están" : "está"} por debajo de la mediana de
            tus valores de referencia.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-4">
          {profiles.length === 0 ? (
            <EmptyState
              icon={ClockIcon}
              title="No hay perfiles de trabajo"
              description="Creá uno por tipo de tarea: no vale lo mismo una hora de diseño que una de armado."
              example={<>Ej: Diseño $8.000/h · Producción $6.000/h · Armado $5.000/h</>}
            />
          ) : (
            <Card className="gap-0 py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>Perfiles</CardTitle>
              </CardHeader>
              <ul className="divide-y">
                {profiles.map((p) => {
                  const cmp = comparisons.get(p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: p.color ?? "#999" }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.isOwn ? "Lo hacés vos: es ganancia" : "Se le paga a alguien: es costo"}
                          {" · "}
                          {p._count.usedIn > 0 ? `En ${p._count.usedIn} producto(s)` : "Sin usar todavía"}
                          {" · "}
                          <Money value={p.hourlyRate.div(60).toString()} /> por minuto
                        </p>
                      </div>
                      {cmp && (
                        <Badge
                          variant="outline"
                          className={
                            cmp.isBelowMarket
                              ? "border-kraft/70 text-[#8a4f12] dark:text-[#f0c27a]"
                              : "border-menta text-tinta dark:text-menta"
                          }
                        >
                          {cmp.diffPercent.gte(0) ? "+" : ""}
                          {formatPercent(cmp.diffPercent, 0)} vs. mercado
                        </Badge>
                      )}
                      <Money value={p.hourlyRate.toString()} className="font-semibold" />
                      <span className="text-xs text-muted-foreground">/h</span>
                      <LaborProfileDialog
                        profile={{
                          id: p.id,
                          name: p.name,
                          hourlyRate: p.hourlyRate.toString(),
                          isOwn: p.isOwn,
                          color: p.color,
                        }}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Editar ${p.name}`}>
                            <PencilIcon />
                          </Button>
                        }
                      />
                      <ConfirmDelete title={`¿Eliminar “${p.name}”?`} onConfirm={deleteLaborProfile.bind(null, p.id)} />
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          <HourlyRateCalculator />
        </div>
        <MarketRatesCard
          rates={rates.map((r) => ({
            id: r.id,
            label: r.label,
            hourlyRate: r.hourlyRate.toString(),
            source: r.source,
          }))}
        />
      </div>
    </>
  );
}
