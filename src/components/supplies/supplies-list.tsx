"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangleIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/shared/money";
import { formatNumber } from "@/lib/money";

export interface SupplyRow {
  id: string;
  name: string;
  kind: "MATERIAL" | "SERVICE";
  category: string | null;
  purchaseUnit: string;
  usageUnit: string;
  packQuantity: string;
  packPrice: string;
  unitCost: string;
  supplier: string | null;
  daysSinceUpdate: number;
  stale: boolean;
  usedInCount: number;
}

export function SuppliesList({ rows }: { rows: SupplyRow[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [kind, setKind] = useState<SupplyRow["kind"] | null>(null);
  const hasBothKinds = rows.some((r) => r.kind === "SERVICE") && rows.some((r) => r.kind === "MATERIAL");
  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))].sort(),
    [rows],
  );
  const filtered = rows.filter(
    (r) =>
      (!category || r.category === category) &&
      (!kind || r.kind === kind) &&
      (!q || `${r.name} ${r.supplier ?? ""} ${r.category ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar insumo…" className="pl-8" />
        </div>
        {hasBothKinds && (
          <div className="flex gap-1 rounded-lg border bg-card p-0.5" role="radiogroup" aria-label="Tipo de insumo">
            {(
              [
                { value: null, label: "Todos" },
                { value: "MATERIAL", label: "Materiales" },
                { value: "SERVICE", label: "Servicios" },
              ] as const
            ).map((k) => (
              <button
                key={k.label}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => setKind(k.value)}
                className={
                  kind === k.value
                    ? "rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                    : "rounded-md px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:bg-muted"
                }
              >
                {k.label}
              </button>
            ))}
          </div>
        )}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Badge
              asChild
              variant={category === null ? "default" : "outline"}
              className="cursor-pointer"
            >
              <button type="button" onClick={() => setCategory(null)}>
                Todas
              </button>
            </Badge>
            {categories.map((c) => (
              <Badge key={c} asChild variant={category === c ? "default" : "outline"} className="cursor-pointer">
                <button type="button" onClick={() => setCategory(c === category ? null : c)}>
                  {c}
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <ul className="divide-y">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link
                href={`/insumos/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{r.name}</span>
                    {r.kind === "SERVICE" && <Badge variant="secondary">Servicio</Badge>}
                    {r.stale && (
                      <Badge variant="outline" className="border-kraft/70 text-[#8a4f12] dark:text-[#f0c27a]">
                        <AlertTriangleIcon /> {r.daysSinceUpdate} días sin actualizar
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    <Money value={r.packPrice} /> por {r.purchaseUnit}
                    {r.packQuantity !== "1" && ` de ${formatNumber(r.packQuantity)} ${r.usageUnit}`}
                    {r.category && ` · ${r.category}`}
                    {r.usedInCount > 0 && ` · en ${r.usedInCount} producto${r.usedInCount > 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="text-right">
                  <Money value={r.unitCost} className="font-semibold" />
                  <p className="text-xs text-muted-foreground">por {r.usageUnit}</p>
                </div>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nada coincide con la búsqueda.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
