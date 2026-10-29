import { PageHeader } from "@/components/shared/ui-bits";
import { SupplyForm } from "@/components/supplies/supply-form";
import { userDb } from "@/lib/db";

export const metadata = { title: "Nuevo insumo" };

export default async function NuevoInsumoPage() {
  const db = await userDb();
  const categories = await db.supply.findMany({
    where: { category: { not: null } },
    distinct: ["category"],
    select: { category: true },
  });
  return (
    <>
      <PageHeader title="Nuevo insumo" />
      <SupplyForm categories={categories.map((c) => c.category!)} />
    </>
  );
}
