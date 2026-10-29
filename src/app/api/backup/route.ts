import { NextResponse, type NextRequest } from "next/server";
import { exportAll } from "@/server/backup";
import { getAllProductsWithPricing } from "@/server/costing";
import { userDb } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { supplyUnitCost } from "@/lib/calc/supply";
import { roundCents } from "@/lib/money";

const stamp = () => new Date().toISOString().slice(0, 10);

function download(body: string, filename: string, type: string) {
  return new NextResponse(body, {
    headers: {
      "content-type": `${type}; charset=utf-8`,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

/**
 * GET /api/backup?format=json                  → backup completo
 * GET /api/backup?format=csv&table=insumos     → insumos (re-importable)
 * GET /api/backup?format=csv&table=productos   → productos con costo y precio
 */
export async function GET(request: NextRequest) {
  const db = await userDb();
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const table = request.nextUrl.searchParams.get("table") ?? "insumos";

  if (format === "json") {
    return download(JSON.stringify(await exportAll(), null, 2), `costos-backup-${stamp()}.json`, "application/json");
  }

  if (format === "csv" && table === "insumos") {
    const supplies = await db.supply.findMany({ orderBy: { name: "asc" } });
    const rows = supplies.map((s) => ({
      nombre: s.name,
      tipo: s.kind === "SERVICE" ? "servicio" : "material",
      categoria: s.category,
      unidad_compra: s.purchaseUnit,
      unidad_uso: s.usageUnit,
      cantidad_paquete: s.packQuantity.toString().replace(".", ","),
      precio_paquete: s.packPrice.toString().replace(".", ","),
      costo_unitario: roundCents(supplyUnitCost(s)).toString().replace(".", ","),
      proveedor: s.supplier,
      link: s.url,
      actualizado: s.priceUpdatedAt.toISOString().slice(0, 10),
    }));
    return download(toCsv(rows), `insumos-${stamp()}.csv`, "text/csv");
  }

  if (format === "csv" && table === "productos") {
    const { items } = await getAllProductsWithPricing();
    const rows = items.map(({ product, cost, pricing }) => ({
      nombre: product.name,
      categoria: product.category,
      costo_materiales: roundCents(cost.materials.plus(cost.waste)).toString().replace(".", ","),
      costo_mano_obra: roundCents(cost.labor).toString().replace(".", ","),
      costo_fijos: roundCents(cost.fixed.plus(cost.machines)).toString().replace(".", ","),
      costo_total: roundCents(cost.total).toString().replace(".", ","),
      precio_directo: pricing?.reference ? roundCents(pricing.reference.price).toString().replace(".", ",") : "",
      ganancia_neta: pricing?.reference ? roundCents(pricing.reference.netProfit).toString().replace(".", ",") : "",
    }));
    return download(toCsv(rows), `productos-${stamp()}.csv`, "text/csv");
  }

  return NextResponse.json({ error: "Formato o tabla no soportados" }, { status: 400 });
}
