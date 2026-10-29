import Link from "next/link";
import { FileTextIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { Money } from "@/components/shared/money";
import { userDb } from "@/lib/db";
import { quoteTotals } from "@/lib/calc/quote";
import { formatQuoteNumber } from "@/lib/quote-text";
import { QUOTE_STATUS_LABELS } from "@/lib/schemas";

export const metadata = { title: "Presupuestos" };

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", timeZone: "UTC" });

const STATUS_VARIANT = {
  DRAFT: "outline",
  SENT: "secondary",
  ACCEPTED: "default",
  REJECTED: "destructive",
  EXPIRED: "outline",
} as const;

export default async function PresupuestosPage() {
  const db = await userDb();
  const quotes = await db.quote.findMany({ orderBy: { number: "desc" }, include: { items: true } });
  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Presupuestos"
        actions={
          <Button asChild>
            <Link href="/presupuestos/nuevo">
              <PlusIcon /> Nuevo presupuesto
            </Link>
          </Button>
        }
      />
      {quotes.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title="Todavía no hiciste presupuestos"
          description="Elegí productos y cantidades: el precio sugerido (con descuento por volumen) se completa solo."
          example={<>Ej: Lucía · 20 fotos plastificadas A4 · válido 7 días</>}
          action={{ label: "Crear el primero", href: "/presupuestos/nuevo" }}
        />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <ul className="divide-y">
            {quotes.map((q) => {
              const total = quoteTotals(q.items, q.discountPercent).total;
              const expired = q.validUntil.getTime() < now - 86_400_000 && !["ACCEPTED", "REJECTED"].includes(q.status);
              return (
                <li key={q.id}>
                  <Link href={`/presupuestos/${q.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <span className="w-14 text-sm text-muted-foreground tabular-nums">{formatQuoteNumber(q.number)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{q.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.items.length} ítem{q.items.length !== 1 && "s"} · válido hasta {dateFmt.format(q.validUntil)}
                      </p>
                    </div>
                    {expired ? (
                      <Badge variant="destructive">Vencido</Badge>
                    ) : (
                      <Badge variant={STATUS_VARIANT[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
                    )}
                    <Money value={total.toString()} className="w-28 text-right font-semibold" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
