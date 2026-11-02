import Link from "next/link";
import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLANS } from "@/lib/billing";
import { formatMoney } from "@/lib/money";

/** Lo que ve alguien con plan Simple al entrar a una sección del Completo. */
export function LockedSection({ title }: { title: string }) {
  return (
    <Card className="mx-auto mt-6 max-w-lg text-center">
      <CardContent className="grid justify-items-center gap-3 py-8">
        <span className="grid size-12 place-items-center rounded-full bg-halo/30 text-primary">
          <LockIcon className="size-6" />
        </span>
        <h1 className="font-display text-2xl tracking-wide uppercase">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Esta sección es del plan Completo ({formatMoney(PLANS.COMPLETE.price, "ARS", 0)}/mes): presupuestos con PDF y WhatsApp,
          ventas con tu ganancia de cada mes e inversiones.
        </p>
        <Button asChild>
          <Link href="/plan">Ver planes</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
