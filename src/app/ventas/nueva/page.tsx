import { PageHeader } from "@/components/shared/ui-bits";
import { SaleEditor } from "@/components/sales/sale-editor";
import { getSaleOptions } from "@/server/sales";

export const metadata = { title: "Nueva venta" };

export default async function NuevaVentaPage({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { producto } = await searchParams;
  const { products, channels, defaultChannelId, taxCondition, ivaPercent } = await getSaleOptions();
  const preselected = products.find((p) => p.id === producto);
  const price = preselected && ((defaultChannelId && preselected.prices[defaultChannelId]) || preselected.price);

  return (
    <>
      <PageHeader title="Nueva venta" />
      <SaleEditor
        products={products}
        channels={channels}
        taxCondition={taxCondition}
        ivaPercent={ivaPercent}
        defaults={{
          date: new Date().toISOString().slice(0, 10),
          clientName: null,
          channelId: defaultChannelId,
          discountPercent: "0",
          notes: null,
          items: [
            preselected
              ? {
                  productId: preselected.id,
                  description: preselected.name,
                  quantity: "1",
                  unitPrice: price ?? "",
                  unitCost: preselected.cost,
                }
              : {
                  productId: null,
                  description: "",
                  quantity: "1",
                  unitPrice: "",
                  unitCost: "",
                },
          ],
        }}
      />
    </>
  );
}
