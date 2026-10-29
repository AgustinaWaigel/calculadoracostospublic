"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileTextIcon, Loader2Icon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldError, InfoTooltip } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { Combobox } from "@/components/shared/combobox";
import { useAction } from "@/components/shared/use-action";
import { saveSale } from "@/actions/sales";
import { saleSchema, type SaleData, type SaleInput } from "@/lib/schemas";
import { saleProfit } from "@/lib/calc/sales";
import { D, formatMoney, formatPercent, parseMoneyInput, pct, toInputString, ZERO } from "@/lib/money";
import { formatQuoteNumber } from "@/lib/quote-text";
import type { SaleChannelOption, SaleFormValues, SaleProductOption } from "./types";

const CUSTOM = "__custom__";
const NO_CHANNEL = "__none__";

export function SaleEditor({
  products,
  channels,
  taxCondition,
  ivaPercent,
  defaults,
  quote,
}: {
  products: SaleProductOption[];
  channels: SaleChannelOption[];
  taxCondition: string;
  ivaPercent: string;
  defaults: SaleFormValues;
  /** Si la venta salió de un presupuesto aceptado. */
  quote?: { id: string; number: number } | null;
}) {
  const router = useRouter();
  const form = useForm<SaleInput, unknown, SaleData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      ...defaults,
      clientName: defaults.clientName ?? "",
      notes: defaults.notes ?? "",
      discountPercent: toInputString(defaults.discountPercent),
      items: defaults.items.map((i) => ({
        ...i,
        quantity: toInputString(i.quantity),
        unitPrice: toInputString(i.unitPrice),
        unitCost: toInputString(i.unitCost),
      })),
    },
  });
  const { control, register, formState, getValues, setValue, setError } = form;
  const errors = formState.errors;
  const items = useFieldArray({ control, name: "items" });
  const { pending, run } = useAction<SaleInput>(setError);
  const productById = new Map(products.map((p) => [p.id, p]));
  const channelById = new Map(channels.map((c) => [c.id, c]));

  const priceFor = (p: SaleProductOption, channelId: string | null | undefined) =>
    (channelId && p.prices[channelId]) || p.price;

  const watched = useWatch({ control });
  const channel = watched.channelId ? (channelById.get(watched.channelId) ?? null) : null;
  const vatRate = taxCondition === "RESPONSABLE_INSCRIPTO" && channel?.applyIva !== false ? pct(ivaPercent) : ZERO;
  const num = (v: unknown) => parseMoneyInput(String(v ?? ""));
  const result = saleProfit({
    items: (watched.items ?? []).map((i) => ({
      quantity: num(i?.quantity) ?? 0,
      unitPrice: num(i?.unitPrice) ?? 0,
      unitCost: num(i?.unitCost),
    })),
    discountPercent: num(watched.discountPercent) ?? 0,
    vatRate,
    channel,
  });
  const margin = result.countedRevenue.gt(0) ? result.profit.div(result.countedRevenue).times(100) : null;

  function onProductChange(index: number, productId: string) {
    if (productId === CUSTOM) {
      setValue(`items.${index}.productId`, null);
      return;
    }
    const p = productById.get(productId);
    if (!p) return;
    setValue(`items.${index}.productId`, productId);
    setValue(`items.${index}.description`, p.name, { shouldValidate: true });
    const price = priceFor(p, getValues("channelId"));
    if (price)
      setValue(`items.${index}.unitPrice`, toInputString(price), {
        shouldValidate: true,
      });
    setValue(`items.${index}.unitCost`, toInputString(p.cost));
  }

  /** Al cambiar de canal, los ítems que tenían el precio sugerido pasan al del canal nuevo. */
  function onChannelChange(next: string | null) {
    const prev = getValues("channelId");
    setValue("channelId", next, { shouldDirty: true });
    getValues("items").forEach((item, i) => {
      const p = item.productId ? productById.get(item.productId) : undefined;
      if (!p) return;
      const before = priceFor(p, prev);
      const after = priceFor(p, next);
      const current = num(item.unitPrice);
      if (after && before && current && current.eq(D(before))) {
        setValue(`items.${i}.unitPrice`, toInputString(after), {
          shouldValidate: true,
        });
      }
    });
  }

  const onSubmit = form.handleSubmit(() =>
    run(
      () => saveSale(getValues()),
      (data) => {
        if (!defaults.id) router.push(`/ventas/${data.id}`);
        else router.refresh();
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Venta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {quote && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground sm:col-span-2">
                <FileTextIcon className="size-4" />
                Viene del presupuesto{" "}
                <Link href={`/presupuestos/${quote.id}`} className="font-semibold text-primary underline">
                  {formatQuoteNumber(quote.number)}
                </Link>
              </p>
            )}
            <Field label="Fecha" htmlFor="s-date" error={errors.date?.message}>
              <Input id="s-date" type="date" {...register("date")} />
            </Field>
            <Field label="Cliente" htmlFor="s-client" error={errors.clientName?.message} hint="Opcional">
              <Input id="s-client" placeholder="Ej: Lucía Pérez" {...register("clientName")} />
            </Field>
            <Field
              label={
                <span className="flex items-center gap-1">
                  Canal
                  <InfoTooltip>Por dónde vendiste: define las comisiones que se descuentan de la ganancia.</InfoTooltip>
                </span>
              }
              className="sm:col-span-2"
            >
              <Controller
                control={control}
                name="channelId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NO_CHANNEL}
                    onValueChange={(v) => onChannelChange(v === NO_CHANNEL ? null : v)}
                  >
                    <SelectTrigger className="w-full" aria-label="Canal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={NO_CHANNEL}>Sin canal (sin comisiones)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qué vendiste</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {items.fields.map((f, i) => {
              const productId = watched.items?.[i]?.productId;
              const line = result.lines[i];
              return (
                <div key={f.id} className="grid gap-2 rounded-xl border bg-background/50 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Combobox
                      ariaLabel="Producto"
                      value={productId ?? CUSTOM}
                      onChange={(v) => onProductChange(i, v)}
                      options={[
                        { value: CUSTOM, label: "Ítem libre (sin producto)" },
                        ...products.map((p) => ({
                          value: p.id,
                          label: p.name,
                          hint: p.price ? formatMoney(p.price, "ARS", 0) : undefined,
                        })),
                      ]}
                      searchPlaceholder="Buscar producto…"
                    />
                    <div>
                      <Input
                        placeholder="Descripción"
                        aria-label="Descripción"
                        {...register(`items.${i}.description`)}
                      />
                      <FieldError message={errors.items?.[i]?.description?.message} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-[100px_1fr_1fr_minmax(0,1fr)_auto]">
                    <Field label="Cantidad" className="gap-1">
                      <Input inputMode="decimal" aria-label="Cantidad" {...register(`items.${i}.quantity`)} />
                    </Field>
                    <Field label="Precio c/u" className="gap-1">
                      <Input
                        inputMode="decimal"
                        aria-label="Precio por unidad"
                        placeholder="$"
                        {...register(`items.${i}.unitPrice`)}
                      />
                    </Field>
                    <Field
                      label={
                        <span className="flex items-center gap-1">
                          Costo c/u
                          <InfoTooltip>
                            Se completa con el costo de hoy del producto y queda guardado, así la ganancia no cambia si
                            después suben los insumos. Vacío = no se cuenta en la ganancia.
                          </InfoTooltip>
                        </span>
                      }
                      className="gap-1"
                    >
                      <Input
                        inputMode="decimal"
                        aria-label="Costo por unidad"
                        placeholder="$"
                        {...register(`items.${i}.unitCost`)}
                      />
                    </Field>
                    <div className="col-span-2 pb-1.5 text-right sm:col-span-1">
                      <p className="text-xs text-muted-foreground">
                        {line?.profit ? (
                          <>
                            deja <Money value={line.profit.toString()} decimals={0} />
                          </>
                        ) : (
                          "Subtotal"
                        )}
                      </p>
                      <Money value={line?.revenue.toString() ?? 0} className="font-semibold" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mb-1 justify-self-end"
                      aria-label="Quitar ítem"
                      onClick={() => items.remove(i)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <FieldError
                    message={
                      errors.items?.[i]?.quantity?.message ??
                      errors.items?.[i]?.unitPrice?.message ??
                      errors.items?.[i]?.unitCost?.message
                    }
                  />
                </div>
              );
            })}
            <FieldError message={errors.items?.message ?? errors.items?.root?.message} />
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  items.append({
                    productId: null,
                    description: "",
                    quantity: "1",
                    unitPrice: "",
                    unitCost: "",
                  })
                }
              >
                <PlusIcon /> Agregar ítem
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea rows={3} placeholder="Ej: pagó por transferencia, retira el viernes." {...register("notes")} />
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Descuento extra" htmlFor="s-disc" error={errors.discountPercent?.message}>
              <div className="flex items-center gap-1">
                <Input id="s-disc" inputMode="decimal" className="text-right" {...register("discountPercent")} />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </Field>
            <dl className="grid gap-1.5 text-sm">
              <div className="flex items-baseline justify-between border-t pt-2">
                <dt className="text-base font-semibold">Cobraste</dt>
                <dd className="text-2xl font-bold tracking-tight tabular-nums">
                  <Money value={result.total.toString()} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ganancia estimada</dt>
                <dd
                  className={
                    result.profit.lt(0) ? "font-semibold text-destructive" : "font-semibold text-tinta dark:text-menta"
                  }
                >
                  <Money value={result.profit.toString()} />
                </dd>
              </div>
              {margin && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Margen</dt>
                  <dd className="tabular-nums">{formatPercent(margin, 0)}</dd>
                </div>
              )}
              {result.skippedItems > 0 && (
                <p className="text-xs text-muted-foreground">
                  {result.skippedItems} ítem
                  {result.skippedItems === 1 ? "" : "s"} sin costo: suma
                  {result.skippedItems === 1 ? "" : "n"} a lo cobrado pero no a la ganancia.
                </p>
              )}
            </dl>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {defaults.id ? "Guardar cambios" : "Registrar venta"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
