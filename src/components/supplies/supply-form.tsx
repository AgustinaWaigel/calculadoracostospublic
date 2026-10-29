"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { useAction } from "@/components/shared/use-action";
import { saveSupply } from "@/actions/supplies";
import { supplySchema, type SupplyData, type SupplyInput } from "@/lib/schemas";
import { supplyUnitCost } from "@/lib/calc/supply";
import { parseMoneyInput, toInputString } from "@/lib/money";

const PURCHASE_UNITS = ["paquete", "rollo", "resma", "caja", "hoja", "unidad", "litro", "kg", "metro"];

export interface SupplyFormDefaults {
  id?: string;
  name: string;
  kind: "MATERIAL" | "SERVICE";
  category: string | null;
  purchaseUnit: string;
  usageUnit: string;
  packQuantity: string;
  packPrice: string;
  supplier: string | null;
  url: string | null;
}

export function SupplyForm({ defaults, categories }: { defaults?: SupplyFormDefaults; categories: string[] }) {
  const router = useRouter();
  const form = useForm<SupplyInput, unknown, SupplyData>({
    resolver: zodResolver(supplySchema),
    defaultValues: {
      id: defaults?.id,
      name: defaults?.name ?? "",
      kind: defaults?.kind ?? "MATERIAL",
      category: defaults?.category ?? "",
      purchaseUnit: defaults?.purchaseUnit ?? "paquete",
      usageUnit: defaults?.usageUnit ?? "unidad",
      packQuantity: toInputString(defaults?.packQuantity ?? "1"),
      packPrice: toInputString(defaults?.packPrice ?? ""),
      supplier: defaults?.supplier ?? "",
      url: defaults?.url ?? "",
      priceSource: "MANUAL",
    },
  });
  const { register, control, formState, getValues, setError } = form;
  const { pending, run } = useAction<SupplyInput>(setError);

  const [packPrice, packQuantity, usageUnit] = useWatch({
    control,
    name: ["packPrice", "packQuantity", "usageUnit"],
  });
  const price = parseMoneyInput(String(packPrice ?? ""));
  const qty = parseMoneyInput(String(packQuantity ?? ""));
  const unitCost = price && qty && qty.gt(0) ? supplyUnitCost({ packPrice: price, packQuantity: qty }) : null;

  const onSubmit = form.handleSubmit(() => {
    // Mandamos lo tipeado (no lo transformado): el servidor valida con el mismo schema.
    run(
      () => saveSupply(getValues()),
      (data) => {
        if (!defaults?.id) router.push(`/insumos/${data.id}`);
        else router.refresh();
      },
    );
  });

  const errors = formState.errors;

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos del insumo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="name" error={errors.name?.message} className="sm:col-span-2">
              <Input id="name" placeholder="Ej: Pouch plastificado A4" {...register("name")} />
            </Field>
            <Field label="Tipo" error={errors.kind?.message}>
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MATERIAL">Material</SelectItem>
                      <SelectItem value="SERVICE">Servicio tercerizado (impresión, corte…)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Categoría" htmlFor="category" error={errors.category?.message}>
              <Input id="category" list="supply-categories" placeholder="Papel, Tintas…" {...register("category")} />
              <datalist id="supply-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Proveedor" htmlFor="supplier" error={errors.supplier?.message}>
              <Input id="supplier" placeholder="Opcional" {...register("supplier")} />
            </Field>
            <Field label="Link" htmlFor="url" error={errors.url?.message}>
              <Input id="url" type="url" placeholder="https://…" {...register("url")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precio</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">Completá el precio del paquete y cuántas unidades trae.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Precio del paquete" htmlFor="packPrice" error={errors.packPrice?.message}>
                <Input id="packPrice" inputMode="decimal" placeholder="28.949" {...register("packPrice")} />
              </Field>
              <Field label="Unidad de compra" htmlFor="purchaseUnit" error={errors.purchaseUnit?.message}>
                <Input id="purchaseUnit" list="purchase-units" {...register("purchaseUnit")} />
                <datalist id="purchase-units">
                  {PURCHASE_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </Field>
              <Field
                label="Cantidad por paquete"
                htmlFor="packQuantity"
                error={errors.packQuantity?.message}
                hint="Ej: un pack de 100 pouches → 100"
              >
                <Input id="packQuantity" inputMode="decimal" {...register("packQuantity")} />
              </Field>
              <Field
                label="Unidad de uso"
                htmlFor="usageUnit"
                error={errors.usageUnit?.message}
                hint="Cómo lo contás en la receta: hoja, pouch, ml…"
              >
                <Input id="usageUnit" {...register("usageUnit")} />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Costo por {usageUnit || "unidad"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="text-3xl font-semibold text-primary">
              {unitCost ? <Money value={unitCost.toString()} /> : "—"}
            </div>
            {unitCost && price && qty && (
              <p className="text-xs text-muted-foreground">
                <Money value={price.toString()} /> ÷ {qty.toString().replace(".", ",")} {usageUnit}
              </p>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {defaults?.id ? "Guardar cambios" : "Crear insumo"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
