import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/ui-bits";
import { SaleEditor } from "@/components/sales/sale-editor";
import { DeleteSaleButton } from "@/components/sales/delete-sale-button";
import { userDb } from "@/lib/db";
import { getSaleOptions, saleInclude } from "@/server/sales";

export const metadata = { title: "Venta" };

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeZone: "UTC",
});

export default async function VentaPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await userDb();
  const { id } = await params;
  const [sale, options] = await Promise.all([
    db.sale.findUnique({ where: { id }, include: saleInclude }),
    getSaleOptions(),
  ]);
  if (!sale) notFound();

  return (
    <>
      <PageHeader
        title={sale.clientName ? `Venta a ${sale.clientName}` : "Venta"}
        description={dateFmt.format(sale.date)}
        actions={<DeleteSaleButton id={sale.id} fromQuote={!!sale.quote} />}
      />
      <SaleEditor
        key={sale.updatedAt.toISOString()}
        products={options.products}
        channels={options.channels}
        taxCondition={options.taxCondition}
        ivaPercent={options.ivaPercent}
        quote={sale.quote}
        defaults={{
          id: sale.id,
          date: sale.date.toISOString().slice(0, 10),
          clientName: sale.clientName,
          channelId: sale.channelId,
          discountPercent: sale.discountPercent.toString(),
          notes: sale.notes,
          items: sale.items.map((i) => ({
            productId: i.productId,
            description: i.description,
            quantity: i.quantity.toString(),
            unitPrice: i.unitPrice.toString(),
            unitCost: i.unitCost?.toString() ?? "",
          })),
        }}
      />
    </>
  );
}
