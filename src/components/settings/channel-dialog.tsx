"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/shared/ui-bits";
import { useAction } from "@/components/shared/use-action";
import { saveChannel } from "@/actions/settings";
import { CHANNEL_LABELS, channelSchema, channelTypes, type ChannelInput } from "@/lib/schemas";
import { toInputString } from "@/lib/money";

export interface ChannelValues {
  id: string;
  name: string;
  type: (typeof channelTypes)[number];
  commissionPercent: string;
  fixedFee: string;
  shippingCost: string;
  paymentFeePercent: string;
  installmentsPercent: string;
  priceAdjustPercent: string;
  applyIva: boolean;
  active: boolean;
}

export function ChannelDialog({ trigger, channel }: { trigger: React.ReactNode; channel?: ChannelValues }) {
  const [open, setOpen] = useState(false);
  const form = useForm<ChannelInput, unknown, z.output<typeof channelSchema>>({
    resolver: zodResolver(channelSchema),
    values: {
      id: channel?.id,
      name: channel?.name ?? "",
      type: channel?.type ?? "OTHER",
      commissionPercent: toInputString(channel?.commissionPercent ?? "0"),
      fixedFee: toInputString(channel?.fixedFee ?? "0"),
      shippingCost: toInputString(channel?.shippingCost ?? "0"),
      paymentFeePercent: toInputString(channel?.paymentFeePercent ?? "0"),
      installmentsPercent: toInputString(channel?.installmentsPercent ?? "0"),
      priceAdjustPercent: toInputString(channel?.priceAdjustPercent ?? "0"),
      applyIva: channel?.applyIva ?? true,
      active: channel?.active ?? true,
    },
  });
  const { pending, run } = useAction<ChannelInput>(form.setError);
  const e = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{channel ? "Editar canal" : "Nuevo canal de venta"}</DialogTitle>
          <DialogDescription>
            Revisá las comisiones vigentes de cada plataforma: cambian seguido.
          </DialogDescription>
        </DialogHeader>
        <form
          id="channel-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit(() => run(() => saveChannel(form.getValues()), () => setOpen(false)))}
        >
          <Field label="Nombre" htmlFor="ch-name" error={e.name?.message}>
            <Input id="ch-name" {...form.register("name")} />
          </Field>
          <Field label="Tipo">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channelTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {CHANNEL_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Comisión del canal (%)" htmlFor="ch-comm" error={e.commissionPercent?.message} hint="Lo que cobra la plataforma sobre el precio">
            <Input id="ch-comm" inputMode="decimal" {...form.register("commissionPercent")} />
          </Field>
          <Field label="Cargo fijo por venta ($)" htmlFor="ch-fee" error={e.fixedFee?.message} hint="Algunas plataformas cobran un fijo en ventas chicas">
            <Input id="ch-fee" inputMode="decimal" {...form.register("fixedFee")} />
          </Field>
          <Field label="Mercado Pago / pasarela (%)" htmlFor="ch-pay" error={e.paymentFeePercent?.message}>
            <Input id="ch-pay" inputMode="decimal" {...form.register("paymentFeePercent")} />
          </Field>
          <Field label="Costo de cuotas (%)" htmlFor="ch-inst" error={e.installmentsPercent?.message}>
            <Input id="ch-inst" inputMode="decimal" {...form.register("installmentsPercent")} />
          </Field>
          <Field label="Envío que pagás vos ($)" htmlFor="ch-ship" error={e.shippingCost?.message}>
            <Input id="ch-ship" inputMode="decimal" {...form.register("shippingCost")} />
          </Field>
          <Field label="Ajuste de precio (%)" htmlFor="ch-adj" error={e.priceAdjustPercent?.message} hint="Ej: mayorista −20">
            <Input id="ch-adj" inputMode="decimal" {...form.register("priceAdjustPercent")} />
          </Field>
          <Controller
            control={form.control}
            name="applyIva"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!field.value} onCheckedChange={field.onChange} /> Factura con IVA (si sos RI)
              </label>
            )}
          />
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!field.value} onCheckedChange={field.onChange} /> Activo
              </label>
            )}
          />
        </form>
        <DialogFooter>
          <Button type="submit" form="channel-form" disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
