import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/ui-bits";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { QuoteSummary } from "@/components/quotes/quote-summary";
import { getQuoteOptions, quoteTiersFromJson } from "@/server/quote-options";
import { getQuoteSummary } from "@/server/quote-summary";
import { userDb } from "@/lib/db";
import { buildQuoteMessage, formatQuoteNumber } from "@/lib/quote-text";
import { whatsappUrl } from "@/lib/whatsapp";

export const metadata = { title: "Presupuesto" };

export default async function PresupuestoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ merma?: string }>;
}) {
  const db = await userDb();
  const [{ id }, { merma }] = await Promise.all([params, searchParams]);
  const withWaste = merma === "1";
  const [quote, options, summary] = await Promise.all([
    db.quote.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        sale: { select: { id: true } },
      },
    }),
    getQuoteOptions(),
    getQuoteSummary(id, withWaste),
  ]);
  if (!quote) notFound();

  const expired = quote.validUntil.getTime() < Date.now() - 86_400_000 && quote.status !== "ACCEPTED";
  const message = buildQuoteMessage(quote, options.business.name);

  return (
    <>
      <PageHeader
        title={`Presupuesto ${formatQuoteNumber(quote.number)}`}
        description={
          <span className="inline-flex items-center gap-2">
            {quote.clientName}
            {expired && <Badge variant="destructive">Vencido</Badge>}
            {quote.sale && (
              <Link href={`/ventas/${quote.sale.id}`} className="text-primary underline">
                Ver la venta
              </Link>
            )}
          </span>
        }
        actions={
          <QuoteActions
            id={quote.id}
            status={quote.status}
            production={quote.production}
            hasPayment={quote.paidAmount.gt(0)}
            fileName={`ticket-${formatQuoteNumber(quote.number).slice(1)}.pdf`}
            whatsappHref={whatsappUrl(message, quote.clientPhone)}
          />
        }
      />
      <QuoteEditor
        key={quote.updatedAt.toISOString()}
        products={options.products}
        tiers={options.tiers}
        profit={options.profit}
        defaults={{
          id: quote.id,
          clientName: quote.clientName,
          clientPhone: quote.clientPhone,
          clientEmail: quote.clientEmail,
          notes: quote.notes,
          validUntil: quote.validUntil.toISOString().slice(0, 10),
          status: quote.status,
          discountPercent: quote.discountPercent.toString(),
          paidAmount: quote.paidAmount.toString(),
          deliveryDate: quote.deliveryDate?.toISOString().slice(0, 10) ?? null,
          volumeTiers: quoteTiersFromJson(quote.volumeTiers),
          items: quote.items.map((i) => ({
            productId: i.productId,
            description: i.description,
            quantity: i.quantity.toString(),
            unitPrice: i.unitPrice.toString(),
          })),
        }}
      />
      {summary && <QuoteSummary summary={summary} withWaste={withWaste} basePath={`/presupuestos/${quote.id}`} />}
    </>
  );
}
