"use client";

import { useActionState } from "react";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/shared/ui-bits";
import { cancelMySubscription, subscribe, type BillingState } from "@/actions/billing";
import { PLANS, type PaidPlan } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

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

/** Los dos planes con su botón. Si ya tiene suscripción activa, el botón cambia de plan. */
export function PlanPicker({
  current,
  active,
  defaultEmail,
}: {
  current: PaidPlan | null;
  active: boolean;
  defaultEmail: string;
}) {
  const [state, action, pending] = useActionState(subscribe, undefined);

  return (
    <form action={action} className="grid gap-4">
      {!active && (
        <Field label="Mail de tu cuenta de Mercado Pago" htmlFor="mp-email" hint="Con ese mail entrás a pagar. El débito es automático todos los meses y lo podés cancelar cuando quieras.">
          <Input id="mp-email" name="email" type="email" required defaultValue={defaultEmail} autoComplete="email" />
        </Field>
      )}
      {active && <input type="hidden" name="email" value={defaultEmail} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(PLANS) as PaidPlan[]).map((key) => {
          const plan = PLANS[key];
          const isCurrent = active && current === key;
          return (
            <Card key={key} className={cn(key === "COMPLETE" && "border-primary/50 ring-1 ring-primary/30")}>
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between gap-2">
                  <span>Plan {plan.name}</span>
                  <span className="text-xl">
                    {formatMoney(plan.price, "ARS", 0)}
                    <span className="text-sm font-normal text-muted-foreground"> /mes</span>
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{plan.summary}</p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ul className="grid gap-1.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button type="submit" name="plan" value={key} disabled={pending || isCurrent} variant={key === "COMPLETE" ? "default" : "outline"}>
                  {pending && <Loader2Icon className="animate-spin" />}
                  {isCurrent ? "Tu plan actual" : active ? `Pasar al ${plan.name}` : `Suscribirme al ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Feedback state={state} />
    </form>
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
