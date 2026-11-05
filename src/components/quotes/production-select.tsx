"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAction } from "@/components/shared/use-action";
import { setQuoteProduction } from "@/actions/quotes";
import { PRODUCTION_LABELS, productionStatuses } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** En qué anda un pedido aceptado: para hacer → en proceso → listo → entregado. */
export function ProductionSelect({
  id,
  value,
  className,
}: {
  id: string;
  value: (typeof productionStatuses)[number];
  className?: string;
}) {
  const router = useRouter();
  const { pending, run } = useAction();
  return (
    <Select value={value} disabled={pending} onValueChange={(v) => run(() => setQuoteProduction(id, v), () => router.refresh())}>
      <SelectTrigger className={cn("w-36", className)} aria-label="Estado del pedido">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {productionStatuses.map((s) => (
          <SelectItem key={s} value={s}>
            {PRODUCTION_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
