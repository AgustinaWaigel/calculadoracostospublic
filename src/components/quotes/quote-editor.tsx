"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangleIcon, Loader2Icon, PlusIcon, SaveIcon, TagIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, InfoTooltip } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { Combobox } from "@/components/shared/combobox";
import { useAction } from "@/components/shared/use-action";
import { saveQuote } from "@/actions/quotes";
import { quoteSchema, type QuoteData, type QuoteInput } from "@/lib/schemas";
import { quoteBreakdown, volumePrice, type VolumePrice } from "@/lib/calc/quote";
import { saleProfit } from "@/lib/calc/sales";
import type { VolumeTierInput } from "@/lib/calc/pricing";
import { D, formatMoney, formatPercent, parseMoneyInput, roundCents, sum, toInputString } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { QuoteFormValues, QuoteProductOption, QuoteProfitContext } from "./types";

const CUSTOM = "__custom__";
const EXTRA_CHIPS = [0, 5, 10, 15];
/** Por debajo de este margen avisamos que el ítem deja poco. */
const LOW_MARGIN = 0.1;

/** Tramos del form → tramos para calcular (los que están a medio escribir no cuentan). */
function parseTiers(rows: { minQuantity?: unknown; discountPercent?: unknown }[] | undefined) {
  return (rows ?? []).flatMap((t) => {
    const minQuantity = Number(t?.minQuantity);
    const discountPercent = parseMoneyInput(String(t?.discountPercent ?? ""));
    return Number.isInteger(minQuantity) && minQuantity >= 1 && discountPercent
      ? [{ minQuantity, discountPercent }]
      : [];
  });
}

export function QuoteEditor({
  products,
  tiers,
  profit,
  defaults,
}: {
  products: QuoteProductOption[];
  tiers: { minQuantity: number; discountPercent: string }[];
  profit: QuoteProfitContext;
  defaults: QuoteFormValues;
}) {
  const router = useRouter();
  const form = useForm<QuoteInput, unknown, QuoteData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      ...defaults,
      clientPhone: defaults.clientPhone ?? "",
      clientEmail: defaults.clientEmail ?? "",
      notes: defaults.notes ?? "",
      discountPercent: toInputString(defaults.discountPercent),
      paidAmount: D(defaults.paidAmount).isZero() ? "" : toInputString(defaults.paidAmount),
      deliveryDate: defaults.deliveryDate ?? "",
      volumeTiers: defaults.volumeTiers.map((t) => ({ ...t, discountPercent: toInputString(t.discountPercent) })),
      items: defaults.items.map((i) => ({
        ...i,
        quantity: toInputString(i.quantity),
        unitPrice: toInputString(i.unitPrice),
      })),
    },
  });
  const { control, register, formState, getValues, setValue, setError } = form;
  const errors = formState.errors;
  const items = useFieldArray({ control, name: "items" });
  const tierRows = useFieldArray({ control, name: "volumeTiers" });
  const [editingTiers, setEditingTiers] = useState(false);
  const showTierEditor = editingTiers || !!errors.volumeTiers;
  const { pending, run } = useAction<QuoteInput>(setError);
  const productById = new Map(products.map((p) => [p.id, p]));

  const qtyOf = (v: unknown) => parseMoneyInput(String(v ?? ""))?.toNumber() ?? 0;
  /** Precio sugerido de un producto para esa cantidad (con el descuento por cantidad que toque). */
  const suggest = (
    productId: string | null | undefined,
    quantity: unknown,
    withTiers: VolumeTierInput[],
  ): VolumePrice | null => {
    const p = productId ? productById.get(productId) : undefined;
    return p ? volumePrice(p.price, Math.max(qtyOf(quantity), 1), withTiers) : null;
  };

  // Ítems con el precio escrito a mano: no se lo pisamos al cambiar la cantidad.
  const [manual, setManual] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const initialTiers = parseTiers(defaults.volumeTiers);
    defaults.items.forEach((item, i) => {
      const s = suggest(item.productId, item.quantity, initialTiers);
      const id = items.fields[i]?.id;
      if (id && s && !s.unitPrice.eq(D(item.unitPrice))) set.add(id);
    });
    return set;
  });
  const markManual = (id: string, on: boolean) =>
    setManual((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const watched = useWatch({ control });
  const quoteTiers = parseTiers(watched.volumeTiers);
  const activeTiers = quoteTiers.filter((t) => t.discountPercent.gt(0)).sort((a, b) => a.minQuantity - b.minQuantity);
  const lines = (watched.items ?? []).map((item, i) => {
    const id = items.fields[i]?.id ?? "";
    const quantity = parseMoneyInput(String(item?.quantity ?? "")) ?? D(0);
    const unitPrice = parseMoneyInput(String(item?.unitPrice ?? "")) ?? D(0);
    const suggested = suggest(item?.productId, item?.quantity, quoteTiers);
    const isManual = manual.has(id);
    const product = item?.productId ? productById.get(item.productId) : undefined;
    return { id, quantity, unitPrice, suggested, isManual, product };
  });
  const extraPercent = parseMoneyInput(String(watched.discountPercent ?? "")) ?? D(0);
  const totals = quoteBreakdown(
    lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      listPrice: !l.isManual && l.suggested?.discountPercent.gt(0) ? l.suggested.listPrice : null,
    })),
    extraPercent,
  );
  // Ganancia estimada con los costos de hoy, igual que en la sección de abajo pero sin tener que guardar.
  const estimate = saleProfit({
    items: lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, unitCost: l.product?.cost ?? null })),
    discountPercent: extraPercent,
    vatRate: profit.vatRate,
    channel: profit.channel,
  });
  const ownLabor = sum(lines.map((l) => (l.product ? D(l.product.ownLabor).times(l.quantity) : D(0))));
  const paid = parseMoneyInput(String(watched.paidAmount ?? "")) ?? D(0);
  const balance = totals.total.minus(paid);

  function setSuggestedPrice(index: number, productId: string | null | undefined, quantity: unknown) {
    const s = suggest(productId, quantity, parseTiers(getValues("volumeTiers")));
    if (s) setValue(`items.${index}.unitPrice`, toInputString(s.unitPrice), { shouldValidate: true });
  }

  /** Al tocar los descuentos, los ítems con precio sugerido se recalculan (los escritos a mano no). */
  function repriceItems() {
    items.fields.forEach((f, i) => {
      if (!manual.has(f.id)) setSuggestedPrice(i, getValues(`items.${i}.productId`), getValues(`items.${i}.quantity`));
    });
  }

  function replaceTiers(next: { minQuantity: string; discountPercent: string }[]) {
    tierRows.replace(next);
    repriceItems();
  }

  function onProductChange(index: number, productId: string) {
    if (productId === CUSTOM) {
      setValue(`items.${index}.productId`, null);
      return;
    }
    const p = productById.get(productId);
    if (!p) return;
    setValue(`items.${index}.productId`, productId);
    setValue(`items.${index}.description`, p.name, { shouldValidate: true });
    markManual(items.fields[index].id, false);
    setSuggestedPrice(index, productId, getValues(`items.${index}.quantity`));
  }

  const onSubmit = form.handleSubmit(() =>
    run(
      () => saveQuote(getValues()),
      (data) => {
        if (!defaults.id) router.push(`/presupuestos/${data.id}`);
        else router.refresh();
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="q-client" error={errors.clientName?.message} className="sm:col-span-2">
              <Input id="q-client" placeholder="Ej: Lucía Pérez" {...register("clientName")} />
            </Field>
            <Field label="WhatsApp" htmlFor="q-phone" error={errors.clientPhone?.message} hint="Para mandarle el presupuesto">
              <Input id="q-phone" type="tel" placeholder="11 1234-5678" {...register("clientPhone")} />
            </Field>
            <Field label="Email" htmlFor="q-email" error={errors.clientEmail?.message}>
              <Input id="q-email" type="email" {...register("clientEmail")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qué le cotizás</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {activeTiers.length > 0 ? (
                <>
                  Descuento por cantidad en este presupuesto:
                  {activeTiers.map((t) => (
                    <span key={t.minQuantity} className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                      {t.minQuantity}+ → −{formatPercent(t.discountPercent, 0)}
                    </span>
                  ))}
                </>
              ) : (
                "Sin descuento por cantidad en este presupuesto."
              )}
              {!showTierEditor && (
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  onClick={() => setEditingTiers(true)}
                >
                  {activeTiers.length > 0 ? "cambiar" : "agregar"}
                </button>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {showTierEditor && (
              <div className="grid gap-2 rounded-xl border border-dashed bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Solo cambia este presupuesto. Los de siempre están en{" "}
                  <Link href="/ajustes" className="text-primary underline">
                    Ajustes
                  </Link>
                  .
                </p>
                {tierRows.fields.length > 0 && (
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs text-muted-foreground">
                    <span>Desde (unidades)</span>
                    <span>Descuento (%)</span>
                    <span className="w-7" />
                  </div>
                )}
                {tierRows.fields.map((t, i) => (
                  <div key={t.id} className="grid gap-1">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Input
                        type="number"
                        min={1}
                        aria-label="Desde"
                        {...register(`volumeTiers.${i}.minQuantity`, { onChange: repriceItems })}
                      />
                      <Input
                        inputMode="decimal"
                        aria-label="Descuento"
                        {...register(`volumeTiers.${i}.discountPercent`, { onChange: repriceItems })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Quitar tramo"
                        onClick={() => {
                          tierRows.remove(i);
                          repriceItems();
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                    <FieldError
                      message={
                        errors.volumeTiers?.[i]?.minQuantity?.message ?? errors.volumeTiers?.[i]?.discountPercent?.message
                      }
                    />
                  </div>
                ))}
                <FieldError message={errors.volumeTiers?.message ?? errors.volumeTiers?.root?.message} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => tierRows.append({ minQuantity: "", discountPercent: "" })}
                  >
                    <PlusIcon /> Agregar tramo
                  </Button>
                  {tierRows.fields.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => replaceTiers([])}>
                      Sin descuento
                    </Button>
                  )}
                  {tiers.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        replaceTiers(
                          tiers.map((t) => ({ minQuantity: String(t.minQuantity), discountPercent: toInputString(t.discountPercent) })),
                        )
                      }
                    >
                      Usar los de Ajustes
                    </Button>
                  )}
                  <Button type="button" size="sm" className="ml-auto" onClick={() => setEditingTiers(false)}>
                    Listo
                  </Button>
                </div>
              </div>
            )}
            {items.fields.map((f, i) => {
              const productId = watched.items?.[i]?.productId;
              const line = lines[i];
              const s = line?.suggested;
              const volumeApplied = s && !line.isManual && s.discountPercent.gt(0);
              return (
                <div key={f.id} className="grid gap-2 rounded-xl border bg-background/50 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Combobox
                      ariaLabel="Producto"
                      value={productId ?? CUSTOM}
                      onChange={(v) => onProductChange(i, v)}
                      options={[
                        { value: CUSTOM, label: "Ítem libre (sin producto)" },
                        ...products.map((p) => ({ value: p.id, label: p.name, hint: formatMoney(p.price, "ARS", 0) })),
                      ]}
                      searchPlaceholder="Buscar producto…"
                    />
                    <div>
                      <Input placeholder="Descripción" aria-label="Descripción" {...register(`items.${i}.description`)} />
                      <FieldError message={errors.items?.[i]?.description?.message} />
                    </div>
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[110px_150px_minmax(0,1fr)_auto]">
                    <Field label="Cantidad" className="gap-1">
                      <Controller
                        control={control}
                        name={`items.${i}.quantity`}
                        render={({ field }) => (
                          <Input
                            inputMode="decimal"
                            aria-label="Cantidad"
                            value={String(field.value ?? "")}
                            onChange={(e) => {
                              field.onChange(e);
                              // El precio acompaña la cantidad (tramos de descuento), salvo que lo hayas escrito vos.
                              if (!manual.has(f.id)) setSuggestedPrice(i, getValues(`items.${i}.productId`), e.target.value);
                            }}
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    </Field>
                    <Field label="Precio c/u" className="gap-1">
                      <Input
                        inputMode="decimal"
                        aria-label="Precio por unidad"
                        placeholder="$"
                        {...register(`items.${i}.unitPrice`, { onChange: () => s && markManual(f.id, true) })}
                      />
                    </Field>
                    <div className="hidden pb-1.5 text-right sm:block">
                      <p className="text-xs text-muted-foreground">Subtotal</p>
                      <Money value={totals.lines[i]?.toString() ?? 0} className="font-semibold" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mb-1"
                      aria-label="Quitar ítem"
                      onClick={() => items.remove(i)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <FieldError message={errors.items?.[i]?.quantity?.message ?? errors.items?.[i]?.unitPrice?.message} />
                  {(() => {
                    const est = estimate.lines[i];
                    if (!est?.profit || est.revenue.lte(0)) return null;
                    const loss = est.profit.lt(0);
                    if (!loss && est.profit.div(est.revenue).gte(LOW_MARGIN)) return null;
                    return (
                      <p
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-medium",
                          loss ? "text-destructive" : "text-[#9a5b13] dark:text-[#f0c27a]",
                        )}
                      >
                        <AlertTriangleIcon className="size-3.5 shrink-0" />
                        {loss ? (
                          <>
                            Con este precio perdés <Money value={est.profit.abs().toString()} />
                          </>
                        ) : (
                          <>
                            Te deja poco: <Money value={est.profit.toString()} /> (
                            {formatPercent(est.profit.div(est.revenue).times(100), 0)})
                          </>
                        )}
                      </p>
                    );
                  })()}

                  {/* Qué pasó con el precio de este ítem, en una línea. */}
                  {s && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      {volumeApplied ? (
                        <>
                          <span className="inline-flex items-center gap-1 rounded-full bg-halo/35 px-2 py-0.5 font-semibold text-tinta dark:bg-halo/15 dark:text-halo">
                            <TagIcon className="size-3" />−{formatPercent(s.discountPercent, 0)} por cantidad ({s.tierMin} o más)
                          </span>
                          <span className="text-muted-foreground">
                            lista <Money value={s.listPrice.toString()} className="line-through" />
                          </span>
                        </>
                      ) : line.isManual ? (
                        <>
                          <span className="text-muted-foreground">
                            Precio a mano · sugerido <Money value={s.unitPrice.toString()} />
                          </span>
                          <button
                            type="button"
                            className="font-semibold text-primary underline-offset-2 hover:underline"
                            onClick={() => {
                              markManual(f.id, false);
                              setSuggestedPrice(i, productId, getValues(`items.${i}.quantity`));
                            }}
                          >
                            Usar sugerido
                          </button>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Precio de lista</span>
                      )}
                      {!line.isManual && s.next && (
                        <span className="text-muted-foreground">
                          · con {s.next.minQuantity} o más: −{formatPercent(s.next.discountPercent, 0)}
                        </span>
                      )}
                      <span className="ml-auto font-semibold sm:hidden">
                        <Money value={totals.lines[i]?.toString() ?? 0} />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            <FieldError message={errors.items?.message ?? errors.items?.root?.message} />
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => items.append({ productId: null, description: "", quantity: "1", unitPrice: "" })}
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
            <Textarea rows={3} placeholder="Ej: seña del 50%, entrega en 5 días hábiles." {...register("notes")} />
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="grid gap-1.5 text-sm">
              {totals.volumeDiscount.gt(0) && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">A precio de lista</dt>
                    <dd>
                      <Money value={totals.atList.toString()} />
                    </dd>
                  </div>
                  <div className="flex justify-between text-tinta dark:text-menta">
                    <dt>Descuento por cantidad</dt>
                    <dd>
                      − <Money value={totals.volumeDiscount.toString()} />
                    </dd>
                  </div>
                </>
              )}
              <div className="flex justify-between font-medium">
                <dt>Subtotal</dt>
                <dd>
                  <Money value={totals.subtotal.toString()} />
                </dd>
              </div>
            </dl>

            <Field
              label={
                <span className="flex items-center gap-1">
                  Descuento extra
                  <InfoTooltip>
                    Un descuento sobre el total, aparte del de cantidad (que ya está en el precio de cada ítem). Por
                    ejemplo, por pago en efectivo o cliente frecuente.
                  </InfoTooltip>
                </span>
              }
              htmlFor="q-disc"
              error={errors.discountPercent?.message}
            >
              <div className="flex items-center gap-1.5">
                <div className="grid flex-1 grid-cols-4 gap-1 rounded-lg border bg-muted/40 p-0.5" role="radiogroup" aria-label="Descuento extra rápido">
                  {EXTRA_CHIPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={extraPercent.eq(c)}
                      onClick={() => setValue("discountPercent", String(c), { shouldValidate: true, shouldDirty: true })}
                      className={cn(
                        "rounded-md py-1 text-xs font-semibold tabular-nums transition-colors duration-150",
                        extraPercent.eq(c) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {c === 0 ? "No" : `${c}%`}
                    </button>
                  ))}
                </div>
                <div className="flex w-20 items-center gap-1">
                  <Input id="q-disc" inputMode="decimal" className="text-right" aria-label="Otro porcentaje" {...register("discountPercent")} />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </Field>

            <dl className="grid gap-1.5 text-sm">
              {totals.discount.gt(0) && (
                <div className="flex justify-between text-tinta dark:text-menta">
                  <dt>Descuento extra {formatPercent(extraPercent, 0)}</dt>
                  <dd>
                    − <Money value={totals.discount.toString()} />
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t pt-2">
                <dt className="text-base font-semibold">Total</dt>
                <dd className="text-2xl font-bold tracking-tight tabular-nums">
                  <span className="resalte">
                    <Money value={totals.total.toString()} />
                  </span>
                </dd>
              </div>
              {(totals.volumeDiscount.gt(0) || totals.discount.gt(0)) && (
                <p className="text-right text-xs text-muted-foreground">
                  Le ahorrás <Money value={totals.volumeDiscount.plus(totals.discount).toString()} /> en total.
                </p>
              )}
            </dl>

            <dl className="grid gap-1 rounded-lg border border-dashed p-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  Ganancia estimada
                  <InfoTooltip>
                    Con los costos de hoy{profit.channel ? `, vendiendo por ${profit.channel.name}` : ""}. Solo la ves vos:
                    no sale en el PDF ni en el ticket.
                  </InfoTooltip>
                </dt>
                <dd className={cn("font-semibold", estimate.profit.lt(0) ? "text-destructive" : "text-tinta dark:text-menta")}>
                  <Money value={estimate.profit.toString()} />
                </dd>
              </div>
              {ownLabor.gt(0) && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <dt>Te queda con tu mano de obra</dt>
                  <dd>
                    <Money value={estimate.profit.plus(ownLabor).toString()} />
                  </dd>
                </div>
              )}
              {estimate.skippedItems > 0 && (
                <p className="text-xs text-muted-foreground">Los ítems libres no cuentan: no sabemos cuánto cuestan.</p>
              )}
            </dl>

            <Field label="Seña / ya pagó" htmlFor="q-paid" error={errors.paidAmount?.message}>
              <div className="flex items-center gap-1.5">
                <Input id="q-paid" inputMode="decimal" placeholder="$ 0" {...register("paidAmount")} />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setValue("paidAmount", toInputString(roundCents(totals.total.div(2))), {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  50%
                </Button>
              </div>
            </Field>
            {paid.gt(0) && (
              <div className="-mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Resta pagar</span>
                <span className={cn("font-semibold", balance.lt(0) && "text-destructive")}>
                  <Money value={balance.toString()} />
                </span>
              </div>
            )}

            <Field label="Fecha de entrega" htmlFor="q-delivery" error={errors.deliveryDate?.message} hint="Para ordenar tus pedidos">
              <Input id="q-delivery" type="date" {...register("deliveryDate")} />
            </Field>

            <Field label="Válido hasta" htmlFor="q-valid" error={errors.validUntil?.message}>
              <Input id="q-valid" type="date" {...register("validUntil")} />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {defaults.id ? "Guardar cambios" : "Crear presupuesto"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
