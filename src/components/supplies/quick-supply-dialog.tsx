"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { useAction } from "@/components/shared/use-action";
import { saveSupply } from "@/actions/supplies";
import { supplySchema, type SupplyData, type SupplyInput } from "@/lib/schemas";
import { supplyUnitCost } from "@/lib/calc/supply";
import { parseMoneyInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { EditorOptions } from "@/components/products/types";

export type CreatedSupply = EditorOptions["supplies"][number];

const KINDS = [
  { value: "MATERIAL", label: "Material", hint: "Papel, pouch, cinta…" },
  { value: "SERVICE", label: "Servicio", hint: "Impresión, envío, corte…" },
] as const;

/**
 * Alta rápida de un insumo sin salir de donde estás (por ejemplo, armando un producto).
 * Solo lo esencial; el resto se completa después en Insumos.
 */
export function QuickSupplyDialog({
  open,
  onOpenChange,
  defaultName = "",
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  onCreated: (supply: CreatedSupply) => void;
}) {
  const form = useForm<SupplyInput, unknown, SupplyData>({
    resolver: zodResolver(supplySchema),
    defaultValues: blank(defaultName),
  });
  const { register, control, setValue, getValues, setError, reset } = form;
  const errors = form.formState.errors;
  const { pending, run } = useAction<SupplyInput>(setError);

  // Cada vez que se abre, arranca limpio con lo que se venía buscando.
  useEffect(() => {
    if (open) reset(blank(defaultName));
  }, [open, defaultName, reset]);

  const [kind, packPrice, packQuantity, usageUnit] = useWatch({
    control,
    name: ["kind", "packPrice", "packQuantity", "usageUnit"],
  });
  const price = parseMoneyInput(String(packPrice ?? ""));
  const qty = parseMoneyInput(String(packQuantity ?? ""));
  const unitCost = price && qty?.gt(0) ? supplyUnitCost({ packPrice: price, packQuantity: qty }) : null;

  const submit = (e: React.FormEvent) => {
    // El diálogo vive dentro del formulario del producto: que este submit no lo dispare.
    e.stopPropagation();
    void form.handleSubmit(() =>
      run(
        () => saveSupply(getValues()),
        ({ id }) => {
          const v = getValues();
          const p = parseMoneyInput(String(v.packPrice))!;
          const q = parseMoneyInput(String(v.packQuantity))!;
          onCreated({
            id,
            name: String(v.name).trim(),
            kind: v.kind,
            usageUnit: String(v.usageUnit).trim(),
            packPrice: p.toString(),
            packQuantity: q.toString(),
            unitCost: supplyUnitCost({ packPrice: p, packQuantity: q }).toString(),
          });
          onOpenChange(false);
        },
      ),
    )(e);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo insumo</DialogTitle>
          <DialogDescription>Lo guardamos y queda elegido. Lo que ya cargaste no se pierde.</DialogDescription>
        </DialogHeader>
        <form id="quick-supply-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1 sm:col-span-2" role="radiogroup" aria-label="Tipo">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === k.value}
                    onClick={() => {
                      field.onChange(k.value);
                      // Un servicio se suele pagar por unidad: dejamos las unidades simples.
                      if (k.value === "SERVICE" && getValues("purchaseUnit") === "paquete") {
                        setValue("purchaseUnit", "unidad");
                      }
                    }}
                    className={cn(
                      "rounded-lg px-3 py-2 text-left transition-colors duration-150",
                      field.value === k.value ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted",
                    )}
                  >
                    <span className="block text-sm font-semibold">{k.label}</span>
                    <span className={cn("block text-xs", field.value === k.value ? "opacity-80" : "text-muted-foreground")}>
                      {k.hint}
                    </span>
                  </button>
                ))}
              </div>
            )}
          />
          <Field label="Nombre" htmlFor="qs-name" error={errors.name?.message} className="sm:col-span-2">
            <Input
              id="qs-name"
              autoFocus
              placeholder={kind === "SERVICE" ? "Ej: Impresión A4 color" : "Ej: Papel fotográfico A4"}
              {...register("name")}
            />
          </Field>
          <Field label="Precio" htmlFor="qs-price" error={errors.packPrice?.message}>
            <Input id="qs-price" inputMode="decimal" placeholder="$" {...register("packPrice")} />
          </Field>
          <Field label="Viene por" htmlFor="qs-purchase" error={errors.purchaseUnit?.message} hint="paquete, resma, rollo…">
            <Input id="qs-purchase" list="qs-purchase-units" {...register("purchaseUnit")} />
            <datalist id="qs-purchase-units">
              {["paquete", "resma", "rollo", "caja", "hoja", "unidad", "metro", "litro"].map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Field>
          <Field label="Cantidad que trae" htmlFor="qs-qty" error={errors.packQuantity?.message}>
            <Input id="qs-qty" inputMode="decimal" {...register("packQuantity")} />
          </Field>
          <Field label="La usás por" htmlFor="qs-usage" error={errors.usageUnit?.message} hint="hoja, unidad, metro…">
            <Input id="qs-usage" {...register("usageUnit")} />
          </Field>
        </form>
        {unitCost && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            Te sale <Money value={unitCost.toString()} className="font-semibold" /> por {usageUnit || "unidad"}.
          </p>
        )}
        <DialogFooter>
          <Button type="submit" form="quick-supply-form" disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            Guardar y usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function blank(name: string): SupplyInput {
  return {
    name,
    kind: "MATERIAL",
    category: "",
    purchaseUnit: "paquete",
    usageUnit: "unidad",
    packQuantity: "1",
    packPrice: "",
    supplier: "",
    url: "",
    priceSource: "MANUAL",
  };
}
