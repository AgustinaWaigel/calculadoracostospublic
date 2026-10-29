"use client";

import { useState } from "react";
import { PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { MarginTooltip } from "@/components/products/margin-tooltip";
import { computeProductCost } from "@/lib/calc/product";
import { channelPrice, priceFromCost } from "@/lib/calc/pricing";
import { parseMoneyInput } from "@/lib/money";

interface Line {
  key: number;
  name: string;
  packPrice: string;
  packQuantity: string;
  quantity: string;
}

const EXAMPLE: Line[] = [
  { key: 1, name: "Pouch A4", packPrice: "28.949", packQuantity: "100", quantity: "1" },
  { key: 2, name: "Papel fotográfico", packPrice: "300", packQuantity: "1", quantity: "1" },
  { key: 3, name: "Impresión color", packPrice: "600", packQuantity: "1", quantity: "1" },
];

const n = (s: string) => parseMoneyInput(s);

/** Calculadora sin guardar nada: para sacar una cuenta rápida. */
export function QuickCalculator({ compact = false }: { compact?: boolean }) {
  const [lines, setLines] = useState<Line[]>(EXAMPLE);
  const [minutes, setMinutes] = useState("0");
  const [hourly, setHourly] = useState("6.000");
  const [yieldQty, setYieldQty] = useState("1");
  const [waste, setWaste] = useState("0");
  const [margin, setMargin] = useState("40");
  const [commission, setCommission] = useState("14");

  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  let total = null;
  let price = null;
  let commissionPrice = null;
  try {
    const cost = computeProductCost({
      supplies: lines.flatMap((l) => {
        const p = n(l.packPrice);
        const q = n(l.packQuantity);
        const u = n(l.quantity);
        return p && q?.gt(0) && u?.gt(0) ? [{ packPrice: p, packQuantity: q, quantity: u }] : [];
      }),
      labor: n(minutes)?.gt(0) && n(hourly) ? [{ hourlyRate: n(hourly)!, minutes: n(minutes)! }] : [],
      batchYield: n(yieldQty)?.gt(0) ? n(yieldQty)! : 1,
      wastePercent: n(waste) ?? 0 });
    total = cost.total;
    const m = n(margin) ?? 0;
    price = priceFromCost(cost.total, m, "MARGIN");
    commissionPrice = channelPrice({
      unitCost: cost.total,
      targetProfit: price.minus(cost.total),
      channel: { name: "Con comisión", commissionPercent: n(commission) ?? 0 },
      taxCondition: "MONOTRIBUTO" }).price;
  } catch {
    // Datos incompletos o margen >= 100%: no mostramos precio.
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora rápida</CardTitle>
        <CardAction>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLines([{ key: Date.now(), name: "", packPrice: "", packQuantity: "1", quantity: "1" }]);
            setMinutes("0");
            setYieldQty("1");
            setWaste("0");
          }}
        >
          <RotateCcwIcon /> Limpiar
        </Button>
        </CardAction>
      </CardHeader>
      <CardContent className={compact ? "grid gap-4" : "grid gap-4 lg:grid-cols-[1fr_300px]"}>
        <div className="grid content-start gap-3">
          <div className="hidden grid-cols-[1fr_100px_80px_70px_auto] gap-2 text-xs text-muted-foreground sm:grid">
            <span>Insumo</span>
            <span>Precio pack</span>
            <span>Trae</span>
            <span>Uso</span>
            <span className="w-7" />
          </div>
          {lines.map((l) => (
            <div key={l.key} className="grid grid-cols-3 gap-2 sm:grid-cols-[1fr_100px_80px_70px_auto]">
              <Input
                className="col-span-3 sm:col-span-1"
                placeholder="Insumo"
                aria-label="Insumo"
                value={l.name}
                onChange={(e) => update(l.key, { name: e.target.value })}
              />
              <Input inputMode="decimal" placeholder="$ pack" aria-label="Precio del paquete" value={l.packPrice} onChange={(e) => update(l.key, { packPrice: e.target.value })} />
              <Input inputMode="decimal" placeholder="Trae" aria-label="Unidades por paquete" value={l.packQuantity} onChange={(e) => update(l.key, { packQuantity: e.target.value })} />
              <div className="flex gap-1">
                <Input inputMode="decimal" placeholder="Uso" aria-label="Cantidad usada" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                <Button variant="ghost" size="icon-sm" className="sm:hidden" aria-label="Quitar" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                  <Trash2Icon />
                </Button>
              </div>
              <Button variant="ghost" size="icon-sm" className="hidden self-center sm:inline-flex" aria-label="Quitar" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLines((ls) => [...ls, { key: Date.now(), name: "", packPrice: "", packQuantity: "1", quantity: "1" }])}
            >
              <PlusIcon /> Agregar insumo
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Minutos de trabajo" htmlFor="qc-min">
              <Input id="qc-min" inputMode="decimal" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </Field>
            <Field label="Valor hora" htmlFor="qc-hour">
              <Input id="qc-hour" inputMode="decimal" value={hourly} onChange={(e) => setHourly(e.target.value)} />
            </Field>
            <Field label="Rinde (u/lote)" htmlFor="qc-yield">
              <Input id="qc-yield" inputMode="decimal" value={yieldQty} onChange={(e) => setYieldQty(e.target.value)} />
            </Field>
            <Field label="Merma %" htmlFor="qc-waste">
              <Input id="qc-waste" inputMode="decimal" value={waste} onChange={(e) => setWaste(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="grid content-start gap-3 rounded-lg bg-muted/50 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Costo por unidad</p>
            <p className="text-2xl font-semibold">{total ? <Money value={total.toString()} /> : "—"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={<span className="flex items-center gap-1">Margen % <MarginTooltip /></span>} htmlFor="qc-margin">
              <Input id="qc-margin" inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} />
            </Field>
            <Field label="Comisión de la plataforma %" htmlFor="qc-comm">
              <Input id="qc-comm" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
            </Field>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Venta directa</span>
            <span className="text-xl font-semibold text-primary">{price ? <Money value={price.toString()} /> : "—"}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Con comisión</span>
            <span className="font-semibold">{commissionPrice ? <Money value={commissionPrice.toString()} /> : "—"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
