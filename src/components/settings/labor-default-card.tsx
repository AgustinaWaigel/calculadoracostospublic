"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAction } from "@/components/shared/use-action";
import { saveLaborDefault } from "@/actions/labor";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: true, title: "Lo hago yo", text: "Es ganancia: entra en el precio para que lo cubra, pero esa plata es tuya." },
  { value: false, title: "Le pago a alguien", text: "Es un costo: esa plata sale del negocio para pagarle a otra persona." },
];

/** Ajuste de la cuenta: quién hace el trabajo (lo usan los perfiles de mano de obra nuevos). */
export function LaborDefaultCard({ isOwn, profiles }: { isOwn: boolean; profiles: number }) {
  const [value, setValue] = useState(isOwn);
  const [applyToAll, setApplyToAll] = useState(false);
  const { pending, run } = useAction();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mano de obra</CardTitle>
        <p className="text-sm text-muted-foreground">¿Quién hace el trabajo de tus productos?</p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Quién hace el trabajo">
          {OPTIONS.map((o) => (
            <button
              key={o.title}
              type="button"
              role="radio"
              aria-checked={value === o.value}
              onClick={() => setValue(o.value)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors duration-150",
                value === o.value ? "border-primary bg-primary/10" : "hover:bg-muted",
              )}
            >
              <span className="block font-semibold">{o.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{o.text}</span>
            </button>
          ))}
        </div>
        {profiles > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={applyToAll} onCheckedChange={(c) => setApplyToAll(c === true)} />
            Aplicarlo también a mis {profiles} {profiles === 1 ? "perfil" : "perfiles"} de mano de obra actuales
          </label>
        )}
        <p className="text-xs text-muted-foreground">
          Si en tu emprendimiento hay de las dos (vos diseñás y alguien arma), lo podés elegir en cada perfil de Mano de obra.
        </p>
        <Button
          type="button"
          className="justify-self-start"
          disabled={pending || (value === isOwn && !applyToAll)}
          onClick={() => run(() => saveLaborDefault({ isOwn: value, applyToAll }))}
        >
          {pending && <Loader2Icon className="animate-spin" />}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
