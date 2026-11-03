"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/shared/ui-bits";
import { cancelMySubscription, subscribe, type BillingState } from "@/actions/billing";
import { PLAN } from "@/lib/billing";
import { formatMoney } from "@/lib/money";

function Feedback({ state }: { state: BillingState }) {
  if (state?.error) {
    return (
      <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state?.notice) return <p role="status" className="rounded-md bg-menta/25 px-3 py-2 text-sm">{state.notice}</p>;
  return null;
}

/** El plan (uno solo, con todo) y el botón para suscribirse con Mercado Pago. */
export function PlanPicker({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState(subscribe, undefined);

  return (
    <Card className="border-primary/50 ring-1 ring-primary/30">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline justify-between gap-2">
          <span>{PLAN.name}</span>
          <span className="text-xl">
            {formatMoney(PLAN.price, "ARS", 0)}
            <span className="text-sm font-normal text-muted-foreground"> /mes</span>
          </span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">Todo incluido. Se cancela cuando quieras.</p>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <ul className="grid gap-1.5 text-sm">
            {PLAN.features.map((f) => (
              <li key={f} className="flex gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
              </li>
            ))}
          </ul>
          <Field
            label="Mail de tu cuenta de Mercado Pago"
            htmlFor="mp-email"
            hint="Con ese mail entrás a pagar. El débito es automático todos los meses."
          >
            <Input id="mp-email" name="email" type="email" required defaultValue={defaultEmail} autoComplete="email" />
          </Field>
          <Button type="submit" disabled={pending} className="justify-self-start">
            {pending && <Loader2Icon className="animate-spin" />}
            Suscribirme con Mercado Pago
          </Button>
          <p className="text-xs text-muted-foreground">
            Al suscribirte aceptás los{" "}
            <Link href="/terminos" target="_blank" className="underline underline-offset-4">
              términos y condiciones
            </Link>
            . Tenés 10 días para arrepentirte y que te devolvamos lo pagado.
          </p>
          <Feedback state={state} />
        </form>
      </CardContent>
    </Card>
  );
}

export function CancelSubscription() {
  const [state, action, pending] = useActionState(cancelMySubscription, undefined);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("¿Cancelar la suscripción? Seguís con acceso hasta que termine lo que ya pagaste.")) e.preventDefault();
      }}
      className="grid gap-2"
    >
      <Button type="submit" variant="ghost" size="sm" disabled={pending} className="justify-self-start text-muted-foreground">
        {pending && <Loader2Icon className="animate-spin" />}
        Cancelar suscripción
      </Button>
      <Feedback state={state} />
    </form>
  );
}
