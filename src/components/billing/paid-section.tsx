import Link from "next/link";
import { CheckIcon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { currentAccess } from "@/lib/db";
import { PLAN, sectionLocked } from "@/lib/billing";
import { formatMoney } from "@/lib/money";

/** Sección del plan completo: con el plan gratis se muestra qué incluye y cómo suscribirse. */
export async function PaidSection({ path, title, children }: { path: string; title: string; children: React.ReactNode }) {
  const { tier } = await currentAccess();
  if (!sectionLocked(tier, path)) return children;
  return (
    <Card className="mx-auto mt-6 max-w-lg">
      <CardContent className="grid justify-items-center gap-4 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-halo/30 text-primary">
          <LockIcon className="size-6" />
        </span>
        <h1 className="font-display text-2xl tracking-wide uppercase">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Es parte del plan completo ({formatMoney(PLAN.price, "ARS", 0)}/mes). Con el plan gratis seguís cargando insumos y productos.
        </p>
        <ul className="grid gap-1.5 text-left text-sm">
          {PLAN.features.map((f) => (
            <li key={f} className="flex gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
            </li>
          ))}
        </ul>
        <Button asChild>
          <Link href="/plan">Suscribirme</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
