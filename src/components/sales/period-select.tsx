"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Elige el período de la página de ventas (?mes=2026-10 o ?mes=todo). */
export function PeriodSelect({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  return (
    <Select value={value} onValueChange={(v) => router.push(`/ventas?mes=${v}`)}>
      <SelectTrigger className="w-44" aria-label="Período">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
