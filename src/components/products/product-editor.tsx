"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, PlusIcon, PrinterIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldError, InfoTooltip } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { Combobox } from "@/components/shared/combobox";
import { useAction } from "@/components/shared/use-action";
import { CostBreakdownPie } from "./cost-breakdown-pie";
import { MarginTooltip } from "./margin-tooltip";
import { computeLive } from "./live-costing";
import { QuickSupplyDialog, type CreatedSupply } from "@/components/supplies/quick-supply-dialog";
import { QuickPrintDialog } from "@/components/print/quick-print-dialog";
import { saveProduct } from "@/actions/products";
import { productSchema, type ProductData, type ProductInput } from "@/lib/schemas";
import { formatMoney, formatNumber, formatPercent, toInputString } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useIndustry } from "@/components/providers";
import { INDUSTRIES } from "@/lib/industries";
import type { EditorOptions, ProductFormValues } from "./types";

/** Atajos de "tamaño para los fijos": cuántas unidades normales equivale el producto. */
const SIZES = [
  { value: "0,5", label: "Chico" },
  { value: "1", label: "Normal" },
  { value: "2", label: "Grande" },
  { value: "3", label: "Muy grande" },
];

const KIND_FILTERS = [
  { value: "MATERIAL", label: "Materiales" },
  { value: "SERVICE", label: "Servicios" },
];

export function ProductEditor({ options, defaults }: { options: EditorOptions; defaults?: ProductFormValues }) {
  const router = useRouter();
  const [initialValues] = useState<ProductInput>(() => ({
      id: defaults?.id,
      name: defaults?.name ?? "",
      description: defaults?.description ?? "",
      category: defaults?.category ?? "",
      batchYield: toInputString(defaults?.batchYield ?? "1"),
      wastePercent: toInputString(defaults?.wastePercent ?? "0"),
      includeFixedCosts: defaults?.includeFixedCosts ?? true,
      fixedWeight: toInputString(defaults?.fixedWeight ?? "1"),
      marginPercent: toInputString(defaults?.marginPercent ?? null),
      pricingMode: defaults?.pricingMode ?? null,
      supplies: defaults?.supplies.map((s) => ({ ...s, quantity: toInputString(s.quantity) })) ?? [
        { supplyId: "", quantity: "1" },
      ],
      labor: defaults?.labor.map((l) => ({ ...l, minutes: toInputString(l.minutes) })) ?? [],
      machines: defaults?.machines.map((m) => ({ ...m, usage: toInputString(m.usage) })) ?? [],
  }));
  const form = useForm<ProductInput, unknown, ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues,
  });
  const { control, register, formState, getValues, setError } = form;
  const errors = formState.errors;
  const supplies = useFieldArray({ control, name: "supplies" });
  const labor = useFieldArray({ control, name: "labor" });
  const machines = useFieldArray({ control, name: "machines" });
  const { pending, run } = useAction<ProductInput>(setError);

  const values = useWatch({ control });

  // Insumos creados desde acá: se usan al toque, hasta que el servidor los mande en `options`.
  const [created, setCreated] = useState<CreatedSupply[]>([]);
  const allSupplies = [
    ...options.supplies.filter((s) => !created.some((c) => c.id === s.id)),
    ...created,
  ].sort((a, b) => a.name.localeCompare(b.name, "es"));
  const live = computeLive(values, { ...options, supplies: allSupplies });
  const supplyById = new Map(allSupplies.map((s) => [s.id, s]));

  // Alta rápida: para qué fila se crea (null = cerrado).
  const [newSupply, setNewSupply] = useState<{ row: number; name: string } | null>(null);
  const [newPrint, setNewPrint] = useState<{ row: number } | null>(null);
  const { print: prints, examples } = INDUSTRIES[useIndustry()];
  function pickCreated(row: number, supply: CreatedSupply) {
    setCreated((list) => [...list.filter((s) => s.id !== supply.id), supply]);
    if (row >= supplies.fields.length) supplies.append({ supplyId: supply.id, quantity: "1" });
    else form.setValue(`supplies.${row}.supplyId`, supply.id, { shouldDirty: true });
  }
  // Fila vacía para usar, o una nueva al final.
  const freeRow = () => {
    const i = (getValues("supplies") ?? []).findIndex((s) => !s.supplyId);
    return i === -1 ? supplies.fields.length : i;
  };

  // Borrador en este navegador: si salís de la página sin guardar, lo recuperás al volver.
  const draftKey = `borrador-producto:${defaults?.id ?? "nuevo"}`;
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) ?? "null") as { values?: ProductInput } | null;
      if (saved?.values) {
        form.reset(saved.values, { keepDefaultValues: true });
        toast.info("Recuperamos lo que estabas cargando.", {
          duration: 8000,
          action: {
            label: "Descartar",
            onClick: () => {
              try {
                localStorage.removeItem(draftKey);
              } catch {
                // sin storage: no hay nada que borrar
              }
              form.reset(initialValues);
            },
          },
        });
      }
    } catch {
      // borrador roto o sin storage: arrancamos de cero
    }
    setDraftReady(true);
    // Solo al abrir el editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const valuesJson = JSON.stringify(values);
  const isDirty = form.formState.isDirty;
  useEffect(() => {
    if (!draftReady || !isDirty) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), values: getValues() }));
      } catch {
        // sin storage: no guardamos borrador
      }
    }, 400);
    return () => clearTimeout(t);
  }, [valuesJson, draftReady, draftKey, isDirty, getValues]);
  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // sin storage
    }
  };
  const machineById = new Map(options.machines.map((m) => [m.id, m]));
  const lineCost = (list: { id?: string; batchCost: { toString(): string } }[] | undefined, id?: string) =>
    list?.find((l) => l.id === id)?.batchCost.toString();

  const mode = values.pricingMode ?? options.settings.pricingMode;
  const ref = live.summary?.reference;

  const onSubmit = form.handleSubmit(() => {
    // Sacamos las líneas vacías antes de mandar.
    const raw = getValues();
    run(
      () =>
        saveProduct({
          ...raw,
          supplies: (raw.supplies ?? []).filter((s) => s.supplyId),
          labor: (raw.labor ?? []).filter((l) => l.profileId),
          machines: (raw.machines ?? []).filter((m) => m.machineId),
        }),
      (data) => {
        clearDraft();
        form.reset(getValues());
        if (!defaults?.id) router.push(`/productos/${data.id}`);
        else router.refresh();
      },
    );
  });

  // Validamos ignorando líneas vacías (el usuario puede dejar una fila sin completar).
  const submit = (e: React.FormEvent) => {
    const raw = getValues();
    form.setValue("supplies", (raw.supplies ?? []).filter((s) => s.supplyId));
    form.setValue("labor", (raw.labor ?? []).filter((l) => l.profileId));
    form.setValue("machines", (raw.machines ?? []).filter((m) => m.machineId));
    void onSubmit(e);
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Producto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="p-name" error={errors.name?.message}>
              <Input id="p-name" placeholder={examples.product} {...register("name")} />
            </Field>
            <Field label="Categoría" htmlFor="p-category" error={errors.category?.message}>
              <Input id="p-category" list="product-categories" placeholder="Opcional" {...register("category")} />
              <datalist id="product-categories">
                {options.categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {options.categories.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Categorías que ya usaste">
                  {options.categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={values.category === c}
                      onClick={() => form.setValue("category", values.category === c ? "" : c, { shouldDirty: true })}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs transition-colors duration-150",
                        values.category === c
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Descripción" htmlFor="p-desc" className="sm:col-span-2">
              <Textarea id="p-desc" rows={2} placeholder="Opcional" {...register("description")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rinde y merma</CardTitle>
            <CardDescription>Las cantidades de abajo son para un lote completo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field
              label={
                <span className="flex items-center gap-1">
                  Unidades por lote
                  <InfoTooltip>
                    Si de 1 hoja A4 salen 4 tarjetas, poné 4: el costo de la hoja se divide entre las 4.
                  </InfoTooltip>
                </span>
              }
              htmlFor="p-yield"
              error={errors.batchYield?.message}
            >
              <Input id="p-yield" inputMode="decimal" {...register("batchYield")} />
            </Field>
            <Field
              label={
                <span className="flex items-center gap-1">
                  Merma (%)
                  <InfoTooltip>Material que se pierde: impresiones fallidas, recortes, pruebas.</InfoTooltip>
                </span>
              }
              htmlFor="p-waste"
              error={errors.wastePercent?.message}
            >
              <Input id="p-waste" inputMode="decimal" {...register("wastePercent")} />
            </Field>
            <div className="grid gap-2 sm:col-span-3">
              <Controller
                control={control}
                name="includeFixedCosts"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                    Incluir costos fijos
                    {values.includeFixedCosts !== false && live.cost && (
                      <span className="font-normal text-muted-foreground">
                        · <Money value={live.cost.fixed.toString()} />
                        /u
                      </span>
                    )}
                  </label>
                )}
              />
              {values.includeFixedCosts !== false &&
                (options.fixedAllocation === "TIME" ? (
                  <p className="text-xs text-muted-foreground">
                    Se reparten por tiempo:{" "}
                    {live.cost ? formatNumber(live.cost.laborMinutes, 1) : 0} min de trabajo por unidad ×{" "}
                    <Money value={options.fixedPerMinute} />
                    /min.{" "}
                    <Link href="/costos-fijos" className="text-primary underline">
                      Cambiar método
                    </Link>
                  </p>
                ) : (
                  <Field
                    label={
                      <span className="flex items-center gap-1">
                        Tamaño para los fijos
                        <InfoTooltip>
                          Cuántas unidades normales equivale este producto. Uno grande ocupa más lugar, luz y tiempo
                          de taller que uno chico, así que se lleva más parte de los fijos.
                        </InfoTooltip>
                      </span>
                    }
                    htmlFor="p-weight"
                    error={errors.fixedWeight?.message}
                    hint={
                      <>
                        <Money value={options.fixedPerUnit} /> por unidad normal ×{" "}
                        {String(values.fixedWeight || "1")}.{" "}
                        <Link href="/costos-fijos" className="text-primary underline">
                          Cambiar método
                        </Link>
                      </>
                    }
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {SIZES.map((s) => (
                        <Button
                          key={s.value}
                          type="button"
                          size="sm"
                          variant={String(values.fixedWeight ?? "").replace(".", ",") === s.value ? "default" : "outline"}
                          onClick={() => form.setValue("fixedWeight", s.value, { shouldValidate: true })}
                        >
                          {s.label} ×{s.value}
                        </Button>
                      ))}
                      <Input
                        id="p-weight"
                        inputMode="decimal"
                        aria-label="Tamaño personalizado"
                        className="w-20"
                        {...register("fixedWeight")}
                      />
                    </div>
                  </Field>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insumos</CardTitle>
            <CardDescription>Se aceptan fracciones: 0,25 hoja, 1,5 m…</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {allSupplies.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Todavía no tenés insumos: creá el primero con el botón de abajo, sin salir de acá.
              </p>
            )}
            {supplies.fields.map((f, i) => {
              const sel = supplyById.get(values.supplies?.[i]?.supplyId ?? "");
              return (
                <div key={f.id} className="grid grid-cols-[1fr_auto_auto] items-start gap-2 sm:grid-cols-[1fr_120px_110px_auto]">
                  <Controller
                    control={control}
                    name={`supplies.${i}.supplyId`}
                    render={({ field }) => (
                      <Combobox
                        ariaLabel="Insumo"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Elegí un insumo"
                        searchPlaceholder="Buscar insumo…"
                        options={allSupplies.map((s) => ({
                          value: s.id,
                          label: s.name,
                          hint: `${formatMoney(s.unitCost)}/${s.usageUnit}`,
                          group: s.kind,
                        }))}
                        filters={KIND_FILTERS}
                        emptyText="No está cargado."
                        footer={(search, close) => (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="justify-start"
                              onClick={() => {
                                close();
                                setNewSupply({ row: i, name: search });
                              }}
                            >
                              <PlusIcon /> {search ? `Crear “${search}”` : "Crear insumo nuevo"}
                            </Button>
                            {prints && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                                onClick={() => {
                                  close();
                                  setNewPrint({ row: i });
                                }}
                              >
                                <PrinterIcon /> Calcular una impresión
                              </Button>
                            )}
                          </>
                        )}
                        className="col-span-3 sm:col-span-1"
                      />
                    )}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Input inputMode="decimal" aria-label="Cantidad" {...register(`supplies.${i}.quantity`)} />
                      <span className="w-12 truncate text-xs text-muted-foreground">{sel?.usageUnit}</span>
                    </div>
                    <FieldError message={errors.supplies?.[i]?.quantity?.message} />
                  </div>
                  <div className="self-center text-right text-sm">
                    <Money value={lineCost(live.cost?.lines.supplies, sel?.id) ?? 0} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="self-center"
                    aria-label="Quitar insumo"
                    onClick={() => supplies.remove(i)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              );
            })}
            <FieldError message={errors.supplies?.message ?? errors.supplies?.root?.message} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => supplies.append({ supplyId: "", quantity: "1" })}
              >
                <PlusIcon /> Agregar insumo
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewSupply({ row: freeRow(), name: "" })}>
                <PlusIcon /> Crear insumo nuevo
              </Button>
              {prints && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setNewPrint({ row: freeRow() })}>
                  <PrinterIcon /> Agregar impresión
                </Button>
              )}
            </div>
            <QuickSupplyDialog
              open={newSupply !== null}
              onOpenChange={(o) => !o && setNewSupply(null)}
              defaultName={newSupply?.name}
              onCreated={(s) => newSupply && pickCreated(newSupply.row, s)}
            />
            <QuickPrintDialog
              open={newPrint !== null}
              onOpenChange={(o) => !o && setNewPrint(null)}
              inks={options.inks}
              onCreated={(s) => newPrint && pickCreated(newPrint.row, s)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mano de obra</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {options.profiles.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Primero creá un perfil en{" "}
                <Link href="/mano-de-obra" className="font-medium text-primary underline">
                  Mano de obra
                </Link>
                .
              </p>
            )}
            {labor.fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_120px_auto] items-start gap-2 sm:grid-cols-[1fr_120px_110px_auto]">
                <Controller
                  control={control}
                  name={`labor.${i}.profileId`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full" aria-label="Perfil">
                        <SelectValue placeholder="Perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} · {formatMoney(p.hourlyRate, "ARS", 0)}/h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Input inputMode="decimal" aria-label="Minutos" {...register(`labor.${i}.minutes`)} />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                  <FieldError message={errors.labor?.[i]?.minutes?.message} />
                </div>
                <div className="hidden self-center text-right text-sm sm:block">
                  <Money value={lineCost(live.cost?.lines.labor, values.labor?.[i]?.profileId) ?? 0} />
                </div>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => labor.remove(i)}>
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            <FieldError message={errors.labor?.message ?? errors.labor?.root?.message} />
            {options.profiles.length > 0 && (
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => labor.append({ profileId: options.profiles[0].id, minutes: "10" })}
                >
                  <PlusIcon /> Agregar tiempo de trabajo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {options.machines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Máquinas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {machines.fields.map((f, i) => {
                const m = machineById.get(values.machines?.[i]?.machineId ?? "");
                return (
                  <div key={f.id} className="grid grid-cols-[1fr_120px_auto] items-start gap-2 sm:grid-cols-[1fr_140px_110px_auto]">
                    <Controller
                      control={control}
                      name={`machines.${i}.machineId`}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full" aria-label="Máquina">
                            <SelectValue placeholder="Máquina" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.machines.map((mm) => (
                              <SelectItem key={mm.id} value={mm.id}>
                                {mm.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Input inputMode="decimal" aria-label="Uso" {...register(`machines.${i}.usage`)} />
                        <span className="text-xs text-muted-foreground">{m?.lifeUnit === "HOURS" ? "min" : "usos"}</span>
                      </div>
                      <FieldError message={errors.machines?.[i]?.usage?.message} />
                    </div>
                    <div className="hidden self-center text-right text-sm sm:block">
                      <Money value={lineCost(live.cost?.lines.machines, m?.id) ?? 0} />
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => machines.remove(i)}>
                      <Trash2Icon />
                    </Button>
                  </div>
                );
              })}
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => machines.append({ machineId: options.machines[0].id, usage: "1" })}
                >
                  <PlusIcon /> Agregar máquina
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Resumen en vivo */}
      <div className="grid content-start gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Costo por unidad</CardTitle>
            {live.cost && !live.cost.batchYield.eq(1) && (
              <CardDescription>
                Lote de {live.cost.batchYield.toString().replace(".", ",")} unidades:{" "}
                <Money value={live.cost.batchVariable.toString()} /> sin fijos
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-3xl font-semibold text-primary">
              <Money value={live.cost?.total.toString() ?? 0} />
            </p>
            <CostBreakdownPie slices={live.slices} />
            {live.cost && live.cost.waste.gt(0) && (
              <p className="text-xs text-muted-foreground">
                Incluye <Money value={live.cost.waste.toString()} /> de merma.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Ganancia
              <MarginTooltip />
            </CardTitle>
            <CardDescription>
              Por defecto: {formatPercent(options.settings.defaultMarginPercent, 0)} de{" "}
              {options.settings.pricingMode === "MARGIN" ? "margen" : "markup"} (Ajustes).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <Controller
                control={control}
                name="pricingMode"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "DEFAULT"}
                    onValueChange={(v) => field.onChange(v === "DEFAULT" ? null : v)}
                  >
                    <SelectTrigger className="w-full" aria-label="Tipo de ganancia">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEFAULT">Usar el de Ajustes</SelectItem>
                      <SelectItem value="MARGIN">Margen sobre el precio</SelectItem>
                      <SelectItem value="MARKUP">Markup sobre el costo</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <div className="flex items-center gap-1">
                <Input
                  inputMode="decimal"
                  placeholder={toInputString(options.settings.defaultMarginPercent)}
                  aria-label="Porcentaje"
                  {...register("marginPercent")}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <FieldError message={errors.marginPercent?.message} />
            {live.error && <p className="text-xs text-destructive">{live.error}</p>}
            {live.summary && ref && (
              <dl className="grid gap-1.5 text-sm">
                <div className="mb-1 flex justify-between">
                  <dt className="text-muted-foreground">{ref.channelName}</dt>
                  <dd className="text-lg font-semibold">
                    <Money value={ref.price.toString()} />
                  </dd>
                </div>
                {live.summary.ownLabor.gt(0) && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tu trabajo</dt>
                    <dd>
                      <Money value={live.summary.ownLabor.toString()} />
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {mode === "MARGIN" ? "Margen" : "Markup"} ({formatPercent(live.summary.percent, 0)})
                  </dt>
                  <dd>
                    <Money value={live.summary.targetProfit.toString()} />
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-semibold">
                  <dt>Te queda por unidad</dt>
                  <dd className="text-tinta dark:text-menta">
                    <Money value={live.summary.takeHome.toString()} />
                  </dd>
                </div>
                <p className="text-xs text-muted-foreground">
                  {live.summary.ownLabor.gt(0)
                    ? "Tu trabajo va dentro del costo para que el precio lo cubra, pero esa plata es tuya."
                    : "Sin trabajo propio cargado: solo te queda el margen."}
                  {defaults?.id && (
                    <>
                      {" "}
                      <Link href={`/productos/${defaults.id}/precio`} className="text-primary underline">
                        ver todos los canales
                      </Link>
                    </>
                  )}
                </p>
              </dl>
            )}
            <Button type="submit" disabled={pending} className="mt-1">
              {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {defaults?.id ? "Guardar cambios" : "Crear producto"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
