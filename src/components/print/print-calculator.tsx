"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DropletIcon, Loader2Icon, MinusIcon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldError, InfoTooltip } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { Combobox } from "@/components/shared/combobox";
import { useAction } from "@/components/shared/use-action";
import { savePrintAsSupply, savePrintInks } from "@/actions/print";
import {
  COVERAGE_LEVELS,
  PAPER_SIZES,
  REFERENCE_COVERAGE,
  areaFactor,
  evenCoverage,
  printCost,
  type InkChannel,
  type PrintCostResult,
} from "@/lib/calc/print";
import { INK_CHANNEL_LABELS, inkChannels, printInksSchema, type PrintInksInput } from "@/lib/schemas";
import { formatMoney, formatNumber, parseMoneyInput, toInputString } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface SavedInk {
  name: string;
  channel: InkChannel;
  color: string;
  bottlePrice: string;
  yieldPages: number;
}

export interface PaperOption {
  id: string;
  name: string;
  unitCost: string;
  usageUnit: string;
}

const inkFormSchema = z.object({ inks: printInksSchema });
type InkForm = { inks: PrintInksInput };

/** Precios de ejemplo para arrancar: el usuario los reemplaza por los suyos. */
const TYPICAL_CMYK: SavedInk[] = [
  { name: "Negro", channel: "K", color: "#1f2937", bottlePrice: "12000", yieldPages: 7500 },
  { name: "Cian", channel: "C", color: "#06b6d4", bottlePrice: "12000", yieldPages: 6000 },
  { name: "Magenta", channel: "M", color: "#d946ef", bottlePrice: "12000", yieldPages: 6000 },
  { name: "Amarillo", channel: "Y", color: "#facc15", bottlePrice: "12000", yieldPages: 6000 },
];

const CHANNEL_COLORS: Record<InkChannel, string> = {
  K: "#1f2937",
  C: "#06b6d4",
  M: "#d946ef",
  Y: "#facc15",
  LC: "#67e8f9",
  LM: "#f0abfc",
  OTRO: "#9ca3af",
};

const toForm = (inks: SavedInk[]) =>
  inks.map((i) => ({ ...i, bottlePrice: toInputString(i.bottlePrice), yieldPages: String(i.yieldPages) }));

const n = (v: unknown) => (v === undefined || v === null || v === "" ? null : parseMoneyInput(String(v)));

export function PrintCalculator({ savedInks, papers }: { savedInks: SavedInk[]; papers: PaperOption[] }) {
  // ── Tintas (se guardan en la base) ──
  const form = useForm<InkForm, unknown, z.output<typeof inkFormSchema>>({
    resolver: zodResolver(inkFormSchema),
    defaultValues: { inks: toForm(savedInks) },
  });
  const inks = useFieldArray({ control: form.control, name: "inks" });
  const watchedInks = useWatch({ control: form.control, name: "inks" }) ?? [];
  const saveInks = useAction<InkForm>();

  const inkErrors = form.formState.errors.inks;

  // ── Trabajo a imprimir (no se guarda) ──
  const [color, setColor] = useState(true);
  const [level, setLevel] = useState<number>(25);
  const [doubleSided, setDoubleSided] = useState(false);
  const [sizeId, setSizeId] = useState("A4");
  const [custom, setCustom] = useState({ w: "210", h: "297" });
  const [waste, setWaste] = useState("10");
  const [paperId, setPaperId] = useState(papers[0]?.id ?? "none");
  const [copies, setCopies] = useState(1);

  const size = PAPER_SIZES.find((s) => s.id === sizeId);
  const factor =
    sizeId === "CUSTOM"
      ? n(custom.w)?.gt(0) && n(custom.h)?.gt(0)
        ? areaFactor(n(custom.w)!, n(custom.h)!)
        : null
      : size
        ? areaFactor(size.widthMm, size.heightMm)
        : null;
  const paper = papers.find((p) => p.id === paperId);

  let result: PrintCostResult | null = null;
  let error: string | null = null;
  try {
    // Blanco y negro usa solo las tintas negras; color, todas. La ocupación se reparte en partes iguales.
    const used = inks.fields.flatMap((f, i) => {
      const ink = watchedInks[i];
      const price = n(ink?.bottlePrice);
      const yieldPages = n(ink?.yieldPages);
      return ink && (color || ink.channel === "K") && price && yieldPages?.gt(0)
        ? [{ id: f.id, name: ink.name || "Tinta", bottlePrice: price, yieldPages }]
        : [];
    });
    if (!color && used.length === 0 && inks.fields.length > 0) {
      throw new Error("Para blanco y negro, marcá una de tus tintas como Negro (K).");
    }
    const lines = used.map((ink) => ({ ...ink, coverage: evenCoverage(level, used.length) }));
    if (lines.length > 0 && factor) {
      result = printCost({
        inks: lines,
        areaFactor: factor,
        wastePercent: n(waste) ?? 0,
        paperCost: paper?.unitCost ?? 0,
        sides: doubleSided ? 2 : 1,
        copies,
      });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Revisá los datos";
  }

  // ── Guardar como insumo ──
  const sizeLabel = sizeId === "CUSTOM" ? `${custom.w}×${custom.h} mm` : (size?.id ?? "").replace("FOTO", "foto ");
  const [supplyName, setSupplyName] = useState<string | null>(null);
  const [includePaper, setIncludePaper] = useState(false);
  const defaultName = `Impresión ${sizeLabel} ${color ? "color" : "B/N"} ${level}%${doubleSided ? " doble faz" : ""}`;
  const saveSupply = useAction();
  const costToSave = result ? (includePaper ? result.perSheet : result.ink) : null;
  const maxLine = result ? Math.max(...result.lines.map((l) => l.cost.toNumber()), 0) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Tus tintas
              <InfoTooltip>
                El rendimiento lo informa el fabricante en la caja o la web: “rinde 7.500 páginas”. Se mide en hojas
                A4 con {REFERENCE_COVERAGE}% de cobertura (norma ISO/IEC 24711).
              </InfoTooltip>
            </CardTitle>
            {inks.fields.length === 0 && (
              <CardAction>
                <Button size="sm" variant="secondary" onClick={() => inks.replace(toForm(TYPICAL_CMYK))}>
                  Cargar CMYK de ejemplo
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={form.handleSubmit(() => saveInks.run(
                  () => savePrintInks(form.getValues("inks")),
                  () => form.reset(form.getValues()),
                ),
              )}
            >
              {inks.fields.length === 0 && (
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Ej: botella de tinta negra $12.000 que rinde 7.500 páginas → $1,60 por página de texto.
                </p>
              )}
              {inks.fields.length > 0 && (
                <div className="hidden grid-cols-[32px_1fr_130px_150px_100px_auto] gap-2 text-xs text-muted-foreground sm:grid">
                  <span />
                  <span>Nombre</span>
                  <span>Color</span>
                  <span>Precio del bote</span>
                  <span>Rinde (pág.)</span>
                  <span className="w-7" />
                </div>
              )}
              {inks.fields.map((f, i) => (
                <div
                  key={f.id}
                  className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-2 sm:grid-cols-[32px_minmax(0,1fr)_130px_150px_100px_auto]"
                >
                  {/* Controlado: si queda sin valor, el navegador lo pone en #000000. */}
                  <Controller
                    control={form.control}
                    name={`inks.${i}.color`}
                    render={({ field }) => (
                      <input
                        type="color"
                        aria-label="Color de la tinta"
                        className="size-8 cursor-pointer rounded-md border bg-transparent p-0.5"
                        value={field.value || CHANNEL_COLORS.OTRO}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                  <div>
                    <Input aria-label="Nombre" placeholder="Negro" {...form.register(`inks.${i}.name`)} />
                    <FieldError message={inkErrors?.[i]?.name?.message} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="sm:order-last"
                    aria-label="Quitar tinta"
                    onClick={() => inks.remove(i)}
                  >
                    <Trash2Icon />
                  </Button>
                  <Controller
                    control={form.control}
                    name={`inks.${i}.channel`}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          // Radix puede disparar "" al montar dentro de un <form>: lo ignoramos.
                          if (!v || v === field.value) return;
                          field.onChange(v);
                          form.setValue(`inks.${i}.color`, CHANNEL_COLORS[v as InkChannel]);
                        }}
                      >
                        <SelectTrigger className="col-span-3 w-full sm:col-span-1" aria-label="Canal de color">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {inkChannels.map((c) => (
                            <SelectItem key={c} value={c}>
                              {INK_CHANNEL_LABELS[c]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <Input inputMode="decimal" className="min-w-0" aria-label="Precio del bote" placeholder="$ bote" {...form.register(`inks.${i}.bottlePrice`)} />
                    <FieldError message={inkErrors?.[i]?.bottlePrice?.message} />
                  </div>
                  <div>
                    <Input inputMode="numeric" className="min-w-0" aria-label="Rendimiento en páginas" placeholder="Páginas" {...form.register(`inks.${i}.yieldPages`)} />
                    <FieldError message={inkErrors?.[i]?.yieldPages?.message} />
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    inks.append({ name: "", channel: "OTRO", color: CHANNEL_COLORS.OTRO, bottlePrice: "", yieldPages: "" })
                  }
                >
                  <PlusIcon /> Agregar tinta
                </Button>
                <Button type="submit" size="sm" disabled={saveInks.pending || !form.formState.isDirty}>
                  {saveInks.pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                  Guardar tintas
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              Qué vas a imprimir
              <InfoTooltip>
                Elegí cuántas hojas, si es a color y cuánta tinta lleva. Si las tintas se te acaban antes de lo que
                dice acá, subí la ocupación.
              </InfoTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Field label="Total de hojas">
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-2">
                <Button
                  type="button"
                  size="icon-lg"
                  className="size-14 rounded-xl [&_svg:not([class*='size-'])]:size-6"
                  aria-label="Una hoja menos"
                  disabled={copies <= 1}
                  onClick={() => setCopies((c) => Math.max(1, c - 1))}
                >
                  <MinusIcon />
                </Button>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-label="Total de hojas"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  className="w-full min-w-0 bg-transparent text-center text-4xl font-bold text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <Button
                  type="button"
                  size="icon-lg"
                  className="size-14 rounded-xl [&_svg:not([class*='size-'])]:size-6"
                  aria-label="Una hoja más"
                  onClick={() => setCopies((c) => c + 1)}
                >
                  <PlusIcon />
                </Button>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/40 p-1" role="radiogroup" aria-label="Color">
              {[
                { value: false, label: "Blanco y negro", swatch: [CHANNEL_COLORS.K] },
                { value: true, label: "A color", swatch: [CHANNEL_COLORS.C, CHANNEL_COLORS.M, CHANNEL_COLORS.Y, CHANNEL_COLORS.K] },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={color === o.value}
                  onClick={() => setColor(o.value)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition-colors duration-150",
                    color === o.value ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted",
                  )}
                >
                  <span className="flex -space-x-1" aria-hidden>
                    {o.swatch.map((c) => (
                      <span key={c} className="size-3 rounded-full ring-2 ring-card" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  {o.label}
                </button>
              ))}
            </div>

            <Field
              label={
                <span className="flex items-center gap-1">
                  Ocupación de tinta
                  <InfoTooltip>
                    Cuánto de la hoja se cubre de tinta: 10% es texto, 100% es una foto que cubre toda la hoja. Se
                    calcula con el promedio de tus tintas{color ? "" : " negras"}.
                  </InfoTooltip>
                </span>
              }
            >
              <div className="grid grid-cols-5 gap-1 rounded-xl border bg-muted/40 p-1" role="radiogroup" aria-label="Ocupación de tinta">
                {COVERAGE_LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={level === l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      "rounded-lg py-2.5 text-sm font-semibold tabular-nums transition-colors",
                      level === l ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted",
                    )}
                  >
                    {l}%
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tamaño">
                <Select value={sizeId} onValueChange={setSizeId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPER_SIZES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="CUSTOM">Otra medida…</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <label className="flex h-9 items-center justify-between gap-3 self-end rounded-lg border bg-muted/40 px-3 text-sm font-medium">
                Doble cara
                <Switch checked={doubleSided} onCheckedChange={setDoubleSided} />
              </label>
              {sizeId === "CUSTOM" && (
                <Field label="Medida (mm)" className="sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <Input inputMode="decimal" aria-label="Ancho en mm" value={custom.w} onChange={(e) => setCustom((c) => ({ ...c, w: e.target.value }))} />
                    ×
                    <Input inputMode="decimal" aria-label="Alto en mm" value={custom.h} onChange={(e) => setCustom((c) => ({ ...c, h: e.target.value }))} />
                  </div>
                </Field>
              )}
              <Field
                label={
                  <span className="flex items-center gap-1">
                    Merma de tinta (%)
                    <InfoTooltip>
                      Tinta que se va en limpiezas de cabezal, purgas y pruebas. En sistemas continuos suele andar
                      entre 10% y 20%.
                    </InfoTooltip>
                  </span>
                }
                htmlFor="pr-waste"
              >
                <Input id="pr-waste" inputMode="decimal" value={waste} onChange={(e) => setWaste(e.target.value)} />
              </Field>
              <Field
                label="Papel"
                hint={
                  papers.length === 0 ? (
                    <>
                      Cargá el papel como{" "}
                      <Link href="/insumos/nuevo" className="text-primary underline">
                        insumo
                      </Link>{" "}
                      para sumarlo.
                    </>
                  ) : undefined
                }
              >
                <Combobox
                  ariaLabel="Papel"
                  value={paperId}
                  onChange={setPaperId}
                  options={[
                    { value: "none", label: "Sin papel (solo tinta)" },
                    ...papers.map((p) => ({ value: p.id, label: p.name, hint: `${formatMoney(p.unitCost)}/${p.usageUnit}` })),
                  ]}
                  searchPlaceholder="Buscar papel…"
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DropletIcon className="size-4" /> Costo por hoja
            </CardTitle>
            {factor && !factor.eq(1) && (
              <CardDescription>Equivale a {formatNumber(factor, 2)} hojas A4 de tinta.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!result && !error && (
              <p className="text-sm text-muted-foreground">Cargá al menos una tinta con precio y rendimiento.</p>
            )}
            {result && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Tinta</p>
                  <p className="text-3xl font-bold tracking-tight tabular-nums">
                    <span className="resalte">
                      <Money value={result.ink.toString()} />
                    </span>
                  </p>
                </div>
                <ul className="grid gap-2 text-sm">
                  {result.lines.map((l) => {
                    const ink = watchedInks[inks.fields.findIndex((f) => f.id === l.id)];
                    return (
                      <li key={l.id} className="grid gap-1">
                        <div className="flex justify-between gap-2">
                          <span className="truncate">
                            {l.name} <span className="text-xs text-muted-foreground">{formatNumber(l.coverage, 1)}%</span>
                          </span>
                          <Money value={l.cost.toString()} />
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${maxLine > 0 ? (l.cost.toNumber() / maxLine) * 100 : 0}%`,
                              backgroundColor: ink?.color,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <dl className="grid gap-1 border-t pt-3 text-sm">
                  {paper && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Papel ({paper.name})</dt>
                      <dd>
                        <Money value={result.paper.toString()} />
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold">
                    <dt>Total por hoja</dt>
                    <dd>
                      <Money value={result.perSheet.toString()} />
                    </dd>
                  </div>
                  {result.copies > 1 && (
                    <div className="flex justify-between font-semibold">
                      <dt>{formatNumber(result.copies, 0)} hojas</dt>
                      <dd>
                        <Money value={result.total.toString()} />
                      </dd>
                    </div>
                  )}
                </dl>
                {result.sheetsPerSet !== null && (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Con un juego de tintas imprimís unas <b>{formatNumber(result.sheetsPerSet, 0)} hojas</b> así antes de
                    que se termine el primer color.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {result && costToSave && (
          <Card>
            <CardHeader>
              <CardTitle>Usarlo en tus productos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Nombre del insumo" htmlFor="pr-supply-name">
                <Input
                  id="pr-supply-name"
                  value={supplyName ?? defaultName}
                  onChange={(e) => setSupplyName(e.target.value)}
                />
              </Field>
              {paper && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={includePaper} onCheckedChange={(v) => setIncludePaper(v === true)} />
                  Incluir el papel (si no, cargalo aparte en la receta)
                </label>
              )}
              <Button
                variant="secondary"
                disabled={saveSupply.pending}
                onClick={() =>
                  saveSupply.run(() =>
                    savePrintAsSupply({
                      name: supplyName ?? defaultName,
                      costPerSheet: toInputString(costToSave.toDecimalPlaces(4)),
                    }),
                  )
                }
              >
                {saveSupply.pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
                Guardar a <Money value={costToSave.toString()} /> por hoja
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
