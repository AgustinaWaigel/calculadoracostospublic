import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/products/product-editor";
import { getEditorOptions } from "@/server/editor-options";
import { productInclude } from "@/server/costing";
import { userDb } from "@/lib/db";

export const metadata = { title: "Producto" };

export default async function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const db = await userDb();
  const { id } = await params;
  const [product, options] = await Promise.all([
    db.product.findUnique({ where: { id }, include: productInclude }),
    getEditorOptions(),
  ]);
  if (!product) notFound();

  return (
    <ProductEditor
      key={product.updatedAt.toISOString()}
      options={options}
      defaults={{
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        batchYield: product.batchYield.toString(),
        wastePercent: product.wastePercent.toString(),
        includeFixedCosts: product.includeFixedCosts,
        fixedWeight: product.fixedWeight.toString(),
        marginPercent: product.marginPercent?.toString() ?? null,
        pricingMode: product.pricingMode,
        supplies: product.supplies.map((s) => ({ supplyId: s.supplyId, quantity: s.quantity.toString() })),
        labor: product.labor.map((l) => ({ profileId: l.profileId, minutes: l.minutes.toString() })),
        machines: product.machines.map((m) => ({ machineId: m.machineId, usage: m.usage.toString() })),
      }}
    />
  );
}
