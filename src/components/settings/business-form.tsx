"use client";

import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageIcon, Loader2Icon, SaveIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/ui-bits";
import { useAction } from "@/components/shared/use-action";
import { MarginTooltip } from "@/components/products/margin-tooltip";
import { saveBusiness } from "@/actions/settings";
import { businessSchema, TAX_LABELS, taxConditions, type BusinessInput } from "@/lib/schemas";
import { INDUSTRIES, industries } from "@/lib/industries";

/** Achica el logo a 256px y lo guarda como data URL (sirve para el PDF sin depender de un storage). */
async function resizeImage(file: File, max = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function BusinessForm({ defaults }: { defaults: BusinessInput }) {
  const form = useForm<BusinessInput, unknown, z.output<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: defaults });
  const { register, control, formState, getValues, setError, setValue, watch } = form;
  const { pending, run } = useAction<BusinessInput>(setError);
  const errors = formState.errors;
  const fileRef = useRef<HTMLInputElement>(null);
  const logo = watch("logoUrl");
  const taxCondition = watch("taxCondition");
  const industry = watch("industry");

  return (
    <form
      onSubmit={form.handleSubmit(() => run(() => saveBusiness(getValues())))}
      className="grid gap-4 lg:grid-cols-2"
    >
      <Card>
        <CardHeader>
          <CardTitle>Tu emprendimiento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 sm:col-span-2">
            <div className="grid size-16 place-items-center overflow-hidden rounded-lg border bg-muted">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Logo" className="size-full object-contain" />
              ) : (
                <ImageIcon className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                {logo ? "Cambiar logo" : "Subir logo"}
              </Button>
              {logo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setValue("logoUrl", null, { shouldDirty: true })}
                >
                  <XIcon /> Quitar
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setValue("logoUrl", await resizeImage(file), { shouldDirty: true });
                } catch {
                  toast.error("No pudimos leer esa imagen");
                }
                e.target.value = "";
              }}
            />
          </div>
          <Field label="Nombre" htmlFor="b-name" error={errors.name?.message} className="sm:col-span-2">
            <Input id="b-name" {...register("name")} />
          </Field>
          <Field label="Rubro" error={errors.industry?.message} hint="Cambia los ejemplos y qué secciones ves (la impresión es solo para papelería)." className="sm:col-span-2">
            <Controller
              control={control}
              name="industry"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-label="Rubro">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i === "OTRO" ? "Otro (escribís cuál)" : INDUSTRIES[i].label} · <span className="text-muted-foreground">{INDUSTRIES[i].hint}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          {industry === "OTRO" && (
            <Field label="¿Cuál es tu rubro?" htmlFor="b-industry-name" error={errors.industryName?.message} className="sm:col-span-2">
              <Input id="b-industry-name" placeholder="Ej: Cerámica, Cosmética natural, Sublimación…" {...register("industryName")} />
            </Field>
          )}
          <Field label="WhatsApp / teléfono" htmlFor="b-phone" error={errors.phone?.message}>
            <Input id="b-phone" type="tel" {...register("phone")} />
          </Field>
          <Field label="Email" htmlFor="b-email" error={errors.email?.message}>
            <Input id="b-email" type="email" {...register("email")} />
          </Field>
          <Field label="Instagram" htmlFor="b-ig" error={errors.instagram?.message}>
            <Input id="b-ig" placeholder="@tuemprendimiento" {...register("instagram")} />
          </Field>
          <Field label="Dirección / zona" htmlFor="b-address" error={errors.address?.message}>
            <Input id="b-address" {...register("address")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios e impuestos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Condición frente a AFIP/ARCA" error={errors.taxCondition?.message}>
            <Controller
              control={control}
              name="taxCondition"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taxConditions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TAX_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            label="IVA (%)"
            htmlFor="b-iva"
            error={errors.ivaPercent?.message}
            hint={taxCondition === "RESPONSABLE_INSCRIPTO" ? "Se suma al precio final" : "Solo aplica a Responsable Inscripto"}
          >
            <Input id="b-iva" inputMode="decimal" disabled={taxCondition !== "RESPONSABLE_INSCRIPTO"} {...register("ivaPercent")} />
          </Field>
          <Field
            label={
              <span className="flex items-center gap-1">
                Tipo de ganancia <MarginTooltip />
              </span>
            }
            error={errors.pricingMode?.message}
          >
            <Controller
              control={control}
              name="pricingMode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARGIN">Margen sobre el precio</SelectItem>
                    <SelectItem value="MARKUP">Markup sobre el costo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Porcentaje (%)" htmlFor="b-margin" error={errors.defaultMarginPercent?.message}>
            <Input id="b-margin" inputMode="decimal" {...register("defaultMarginPercent")} />
          </Field>
          <Field
            label="Redondear precios a"
            htmlFor="b-round"
            error={errors.roundTo?.message}
            hint="Ej: 10 → $1.982 pasa a $1.990. 0 = sin redondeo."
          >
            <Input id="b-round" inputMode="decimal" {...register("roundTo")} />
          </Field>
          <Field
            label="Producción mensual (unidades)"
            htmlFor="b-units"
            error={errors.monthlyUnitsEstimate?.message}
            hint="Para prorratear los costos fijos"
          >
            <Input id="b-units" type="number" min={1} {...register("monthlyUnitsEstimate")} />
          </Field>
          <Field label="Vigencia de presupuestos (días)" htmlFor="b-validity" error={errors.quoteValidityDays?.message}>
            <Input id="b-validity" type="number" min={1} {...register("quoteValidityDays")} />
          </Field>
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          Guardar
        </Button>
      </div>
    </form>
  );
}
