import Link from "next/link";
import { PackageIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/shared/ui-bits";
import { SuppliesList, type SupplyRow } from "@/components/supplies/supplies-list";
import { userDb } from "@/lib/db";
import { daysSince, isPriceStale, supplyUnitCost } from "@/lib/calc/supply";

export const metadata = { title: "Insumos" };

export default async function InsumosPage() {
  const db = await userDb();
  const supplies = await db.supply.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { usedIn: true } } },
  });
  const now = new Date();
  const rows: SupplyRow[] = supplies.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    category: s.category,
    purchaseUnit: s.purchaseUnit,
    usageUnit: s.usageUnit,
    packQuantity: s.packQuantity.toString(),
    packPrice: s.packPrice.toString(),
    unitCost: supplyUnitCost(s).toString(),
    supplier: s.supplier,
    daysSinceUpdate: daysSince(s.priceUpdatedAt, now),
    stale: isPriceStale(s.priceUpdatedAt, now),
    usedInCount: s._count.usedIn,
  }));
  const staleCount = rows.filter((r) => r.stale).length;

  return (
    <>
      <PageHeader
        title="Insumos"
        description={
          staleCount > 0
            ? `${staleCount} insumo${staleCount > 1 ? "s" : ""} con precio de hace más de 30 días. Con la inflación, conviene revisarlos.`
            : "Materiales y servicios que usás para producir. Calculamos el costo por unidad."
        }
        actions={
          <Button asChild>
            <Link href="/insumos/nuevo">
              <PlusIcon /> Nuevo insumo
            </Link>
          </Button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Todavía no cargaste insumos"
          example={<>Ej: “Pouch plastificado A4” · pack de 100 a $28.949 → $289,49 c/u</>}
          action={{ label: "Cargar el primero", href: "/insumos/nuevo" }}
        />
      ) : (
        <SuppliesList rows={rows} />
      )}
    </>
  );
}
