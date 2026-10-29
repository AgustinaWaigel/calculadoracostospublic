import { CogIcon, PencilIcon, PlusIcon, ReceiptIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, InfoTooltip, PageHeader } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { FixedCostDialog } from "@/components/fixed-costs/fixed-cost-dialog";
import { MachineDialog } from "@/components/fixed-costs/machine-dialog";
import { FixedAllocationForm, FixedCostToggle } from "@/components/fixed-costs/fixed-cost-row-controls";
import { deleteFixedCost, deleteMachine } from "@/actions/fixed-costs";
import { userDb } from "@/lib/db";
import { machineAmortizationRate, totalMonthlyFixedCosts } from "@/lib/calc/fixed-costs";
import { FIXED_COST_LABELS } from "@/lib/schemas";
import { formatNumber } from "@/lib/money";
import { getBusiness } from "@/server/costing";

export const metadata = { title: "Costos fijos" };

export default async function CostosFijosPage() {
  const db = await userDb();
  const [costs, machines, business] = await Promise.all([
    db.fixedCost.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
    db.machine.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { usedIn: true } } } }),
    getBusiness(),
  ]);
  const total = totalMonthlyFixedCosts(costs);

  return (
    <>
      <PageHeader
        title="Costos fijos"
        actions={
          <FixedCostDialog
            trigger={
              <Button>
                <PlusIcon /> Nuevo costo fijo
              </Button>
            }
          />
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-4 sm:grid-cols-3 sm:items-start">
          <div>
            <p className="text-xs text-muted-foreground">Total por mes</p>
            <p className="text-2xl font-semibold">
              <Money value={total.toString()} />
            </p>
          </div>
          <FixedAllocationForm
            total={total.toString()}
            method={business.fixedAllocation}
            units={business.monthlyUnitsEstimate}
            hours={business.monthlyHoursEstimate}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {costs.length === 0 ? (
          <EmptyState
            icon={ReceiptIcon}
            title="Sin costos fijos"
            description="Alquiler, luz, internet, monotributo, suscripciones… todo lo que pagás aunque no vendas."
            example={<>Ej: Monotributo $40.000 · Internet $18.000 · Canva Pro $9.000</>}
          />
        ) : (
          <Card className="gap-0 self-start py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Gastos mensuales</CardTitle>
            </CardHeader>
            <ul className="divide-y">
              {costs.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <FixedCostToggle id={c.id} active={c.active} name={c.name} />
                  <div className="min-w-0 flex-1">
                    <p className={c.active ? "font-medium" : "font-medium text-muted-foreground line-through"}>
                      {c.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{FIXED_COST_LABELS[c.category]}</p>
                  </div>
                  <Money value={c.monthlyAmount.toString()} className="font-semibold" />
                  <FixedCostDialog
                    cost={{
                      id: c.id,
                      name: c.name,
                      category: c.category,
                      monthlyAmount: c.monthlyAmount.toString(),
                      active: c.active }}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${c.name}`}>
                        <PencilIcon />
                      </Button>
                    }
                  />
                  <ConfirmDelete title={`¿Eliminar “${c.name}”?`} onConfirm={deleteFixedCost.bind(null, c.id)} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="gap-0 self-start py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-1.5">
              Máquinas y herramientas
              <InfoTooltip>
                En vez de prorratearse por mes, la máquina se “gasta” con el uso: en cada producto indicás cuántas
                unidades u horas la usa.
              </InfoTooltip>
            </CardTitle>
          </CardHeader>
          <ul className="divide-y">
            {machines.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <CogIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <Money value={m.price.toString()} /> ÷ {formatNumber(m.usefulLife, 0)}{" "}
                    {m.lifeUnit === "HOURS" ? "horas" : "unidades"}
                    {m._count.usedIn > 0 && ` · en ${m._count.usedIn} producto(s)`}
                  </p>
                </div>
                <div className="text-right">
                  <Money value={machineAmortizationRate(m).toString()} className="font-semibold" />
                  <p className="text-xs text-muted-foreground">por {m.lifeUnit === "HOURS" ? "hora" : "unidad"}</p>
                </div>
                <MachineDialog
                  machine={{
                    id: m.id,
                    name: m.name,
                    price: m.price.toString(),
                    usefulLife: m.usefulLife.toString(),
                    lifeUnit: m.lifeUnit }}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${m.name}`}>
                      <PencilIcon />
                    </Button>
                  }
                />
                <ConfirmDelete title={`¿Eliminar “${m.name}”?`} onConfirm={deleteMachine.bind(null, m.id)} />
              </li>
            ))}
            {machines.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Ej: Plastificadora A4 de $120.000 que dura 20.000 plastificados → $6 por uso.
              </li>
            )}
          </ul>
          <div className="border-t p-3">
            <MachineDialog
              trigger={
                <Button variant="secondary" size="sm">
                  <PlusIcon /> Agregar máquina
                </Button>
              }
            />
          </div>
        </Card>
      </div>
    </>
  );
}
