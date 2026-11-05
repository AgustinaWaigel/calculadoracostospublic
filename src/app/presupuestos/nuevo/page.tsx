import { PageHeader } from "@/components/shared/ui-bits";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { getQuoteOptions } from "@/server/quote-options";

export const metadata = { title: "Nuevo presupuesto" };

export default async function NuevoPresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string }>;
}) {
  const { producto } = await searchParams;
  const { products, tiers, business, profit } = await getQuoteOptions();
  const validUntil = new Date(Date.now() + business.quoteValidityDays * 86_400_000).toISOString().slice(0, 10);
  const preselected = products.find((p) => p.id === producto);

  return (
    <>
      <PageHeader title="Nuevo presupuesto" />
      <QuoteEditor
        products={products}
        tiers={tiers}
        profit={profit}
        defaults={{
          clientName: "",
          clientPhone: null,
          clientEmail: null,
          notes: null,
          validUntil,
          status: "DRAFT",
          discountPercent: "0",
          paidAmount: "0",
          deliveryDate: null,
          volumeTiers: tiers.map((t) => ({ minQuantity: String(t.minQuantity), discountPercent: t.discountPercent })),
          items: [
            preselected
              ? { productId: preselected.id, description: preselected.name, quantity: "1", unitPrice: preselected.price }
              : { productId: null, description: "", quantity: "1", unitPrice: "" },
          ],
        }}
      />
    </>
  );
}
