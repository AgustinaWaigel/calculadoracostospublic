"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { saveInvestmentMovement } from "@/actions/investments";
import { investmentMovementSchema, type InvestmentMovementInput } from "@/lib/schemas";
import { toInputString } from "@/lib/money";

export interface MovementValues {
  id: string;
  kind: "INVESTMENT" | "RECOVERY";
  description: string;
  amount: string;
  date: string;
}

const COPY = {
  INVESTMENT: {
    newTitle: "Nueva inversión",
    editTitle: "Editar inversión",
    description: "Lo que pusiste para arrancar o crecer: máquinas, stock inicial, herramientas, marca, web…",
    placeholder: "Ej: Impresora, primer stock de papel",
  },
  RECOVERY: {
    newTitle: "Nuevo recupero",
    editTitle: "Editar recupero",
    description:
      "Plata que recuperaste por fuera de tus ventas (las ventas ya suman solas). Por ejemplo, si vendiste una máquina vieja.",
    placeholder: "Ej: Vendí la impresora vieja",
  },
} as const;

const today = () => new Date().toISOString().slice(0, 10);

export function MovementDialog({
  trigger,
  kind,
  movement,
}: {
  trigger: React.ReactNode;
  kind: MovementValues["kind"];
  movement?: MovementValues;
}) {
  const [open, setOpen] = useState(false);
  const copy = COPY[kind];
  const form = useForm<InvestmentMovementInput, unknown, z.output<typeof investmentMovementSchema>>({
    resolver: zodResolver(investmentMovementSchema),
    values: {
      id: movement?.id,
      kind,
      description: movement?.description ?? "",
      amount: toInputString(movement?.amount ?? ""),
      date: movement?.date ?? today(),
    },
  });
  const { pending, run } = useAction<InvestmentMovementInput>(form.setError);
  const errors = form.formState.errors;
  const formId = `movement-form-${movement?.id ?? kind}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{movement ? copy.editTitle : copy.newTitle}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          className="grid gap-4"
          onSubmit={form.handleSubmit(() =>
            run(
              () => saveInvestmentMovement(form.getValues()),
              () => setOpen(false),
            ),
          )}
        >
          <Field label="Descripción" htmlFor={`${formId}-desc`} error={errors.description?.message}>
            <Input id={`${formId}-desc`} placeholder={copy.placeholder} {...form.register("description")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monto" htmlFor={`${formId}-amount`} error={errors.amount?.message}>
              <Input id={`${formId}-amount`} inputMode="decimal" placeholder="$" {...form.register("amount")} />
            </Field>
            <Field label="Fecha" htmlFor={`${formId}-date`} error={errors.date?.message}>
              <Input id={`${formId}-date`} type="date" {...form.register("date")} />
            </Field>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form={formId} disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
