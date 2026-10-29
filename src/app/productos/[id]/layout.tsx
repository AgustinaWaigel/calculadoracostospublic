import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/ui-bits";
import { ProductRowActions } from "@/components/products/product-row-actions";
import { ProductTabs } from "@/components/products/product-tabs";
import { userDb } from "@/lib/db";

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const db = await userDb();
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, select: { id: true, name: true, category: true } });
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        description={product.category ?? undefined}
        actions={<ProductRowActions id={product.id} name={product.name} showLabels redirectAfterDelete="/productos" />}
      />
      <ProductTabs id={product.id} />
      {children}
    </>
  );
}
