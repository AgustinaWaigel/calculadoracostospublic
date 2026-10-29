"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { addMonths, monthsToRecover } from "@/lib/calc/investment";
import { parseMoneyInput, toInputString } from "@/lib/money";

const monthFmt = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

/** "¿Y si recupero $X por mes?": cuántos meses faltan con el monto que elijas. */
export function RecoverySimulator({ remaining, suggested }: { remaining: string; suggested: string | null }) {
  const [perMonth, setPerMonth] = useState(suggested ? toInputString(suggested) : "");
  const amount = parseMoneyInput(perMonth);
  const months = amount ? monthsToRecover(remaining, amount) : null;

  return (
    <div className="grid gap-3">
      <Field
        label="¿Cuánto podés recuperar por mes?"
        htmlFor="sim-per-month"
        hint={suggested ? "Arranca con tu promedio hasta ahora. Probá otros montos." : "Lo que te queda de ganancia por mes."}
      >
        <Input
          id="sim-per-month"
          inputMode="decimal"
          placeholder="$"
          value={perMonth}
          onChange={(e) => setPerMonth(e.target.value)}
        />
      </Field>
      {months != null && months > 0 && (
        <p className="text-sm">
          Recuperando <Money value={amount!.toString()} decimals={0} /> por mes, te faltan{" "}
          <strong>
            {months} {months === 1 ? "mes" : "meses"}
          </strong>{" "}
          (para {monthFmt.format(addMonths(new Date(), months))}).
        </p>
      )}
    </div>
  );
}
