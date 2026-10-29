"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rawDb, userDb } from "@/lib/db";
import { requireUserId } from "@/lib/auth/server";
import { parseCsv } from "@/lib/csv";
import { D } from "@/lib/money";
import { isSafeLogo, supplySchema } from "@/lib/schemas";
import { errorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { BACKUP_VERSION } from "@/server/backup";

const rows = z.array(z.record(z.string(), z.unknown()));
const backupSchema = z.object({
  app: z.literal("calculadora-costos"),
  version: z.number().max(BACKUP_VERSION),
  data: z.object({
    business: rows,
    supplies: rows,
    supplyPriceHistory: rows,
    laborProfiles: rows,
    marketRates: rows,
    fixedCosts: rows,
    machines: rows,
    products: rows,
    productSupplies: rows,
    productLabor: rows,
    productMachines: rows,
    salesChannels: rows,
    volumeTiers: rows,
    quotes: rows,
    quoteItems: rows,
    // Opcional: los backups anteriores a la calculadora de impresión no la traen.
    printInks: rows.default([]),
    investmentMovements: rows.default([]),
  }),
});

type Row = Record<string, unknown>;

// Columnas que apuntan a otra tabla del backup: se traducen a los ids nuevos.
const REFS: Record<string, Record<string, string>> = {
  supplyPriceHistory: { supplyId: "supplies" },
  productSupplies: { productId: "products", supplyId: "supplies" },
  productLabor: { productId: "products", profileId: "laborProfiles" },
  productMachines: { productId: "products", machineId: "machines" },
  quoteItems: { quoteId: "quotes", productId: "products" },
  products: { duplicatedFromId: "products" },
};
const OWNED_TABLES = [
  "supplies",
  "laborProfiles",
  "marketRates",
  "fixedCosts",
  "machines",
  "products",
  "salesChannels",
  "volumeTiers",
  "quotes",
  "printInks",
  "investmentMovements",
] as const;
// Valores de versiones anteriores (con Mercado Libre) que ya no existen.
const OLD_PRICE_SOURCES = new Set(["MELI_SEARCH", "MELI_LINK", "MELI_REFRESH"]);
const OLD_CHANNEL_TYPES = new Set(["MELI_CLASSIC", "MELI_PREMIUM"]);

/**
 * Pasa el backup a la cuenta: ids nuevos (los del archivo pueden existir en otra cuenta),
 * referencias traducidas, `userId` propio y sin columnas que ya no existen.
 */
function adopt(d: z.infer<typeof backupSchema>["data"], userId: string) {
  const ids: Record<string, Map<string, string>> = {};
  for (const table of [...OWNED_TABLES, "supplyPriceHistory", "productSupplies", "productLabor", "productMachines", "quoteItems"] as const) {
    ids[table] = new Map(d[table].map((r) => [String(r.id), crypto.randomUUID()]));
  }
  const map = (table: keyof typeof d) =>
    d[table].map((r) => {
      const { meliItemId: _m, userId: _u, ...row }: Row = { ...r };
      void _m;
      void _u;
      if (ids[table]) row.id = ids[table].get(String(r.id));
      for (const [field, target] of Object.entries(REFS[table] ?? {})) {
        if (row[field] == null) continue;
        const mapped = ids[target].get(String(row[field]));
        // Un producto borrado deja la línea del presupuesto suelta; en lo demás, el backup está roto.
        if (!mapped && field !== "productId" && field !== "duplicatedFromId") throw new Error(`Falta ${target} ${row[field]}`);
        row[field] = mapped ?? null;
      }
      if (OWNED_TABLES.includes(table as (typeof OWNED_TABLES)[number])) row.userId = userId;
      if (OLD_PRICE_SOURCES.has(String(row.source))) row.source = "MANUAL";
      if (OLD_CHANNEL_TYPES.has(String(row.type))) row.type = "OTHER";
      return row;
    });
  const [business] = d.business;
  return {
    business: business
      ? { ...business, id: userId, logoUrl: typeof business.logoUrl === "string" && isSafeLogo(business.logoUrl) ? business.logoUrl : null }
      : { id: userId, name: "Mi Emprendimiento" },
    supplies: map("supplies"),
    supplyPriceHistory: map("supplyPriceHistory"),
    laborProfiles: map("laborProfiles"),
    marketRates: map("marketRates"),
    fixedCosts: map("fixedCosts"),
    machines: map("machines"),
    products: map("products"),
    productSupplies: map("productSupplies"),
    productLabor: map("productLabor"),
    productMachines: map("productMachines"),
    salesChannels: map("salesChannels"),
    volumeTiers: map("volumeTiers"),
    quotes: map("quotes"),
    quoteItems: map("quoteItems"),
    printInks: map("printInks"),
    investmentMovements: map("investmentMovements"),
  };
}

/** Restaura un backup JSON completo (reemplaza todos los datos de la cuenta). */
export async function importBackup(json: string): Promise<ActionResult<{ counts: Record<string, number> }>> {
  const userId = await requireUserId();
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return fail("El archivo no es un JSON válido");
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) return fail("El archivo no parece un backup de esta app");
  const d = parsed.data.data;

  // Prisma acepta strings para Decimal y fechas ISO: los datos se insertan tal cual.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const as = (r: unknown) => r as any;
  try {
    const rows = adopt(d, userId);
    // Con el cliente sin filtro: todos los ids son nuevos y todo lleva el userId de la cuenta.
    const mine = { userId };
    await rawDb.$transaction(
      async (tx) => {
        // Las hijas se borran en cascada con su padre.
        await tx.quote.deleteMany({ where: mine });
        await tx.product.deleteMany({ where: mine });
        await tx.supply.deleteMany({ where: mine });
        await tx.laborProfile.deleteMany({ where: mine });
        await tx.marketRate.deleteMany({ where: mine });
        await tx.fixedCost.deleteMany({ where: mine });
        await tx.machine.deleteMany({ where: mine });
        await tx.salesChannel.deleteMany({ where: mine });
        await tx.volumeTier.deleteMany({ where: mine });
        await tx.printInk.deleteMany({ where: mine });
        await tx.investmentMovement.deleteMany({ where: mine });
        await tx.business.deleteMany({ where: { id: userId } });

        await tx.business.create({ data: as(rows.business) });
        await tx.supply.createMany({ data: as(rows.supplies) });
        await tx.supplyPriceHistory.createMany({ data: as(rows.supplyPriceHistory) });
        await tx.laborProfile.createMany({ data: as(rows.laborProfiles) });
        await tx.marketRate.createMany({ data: as(rows.marketRates) });
        await tx.fixedCost.createMany({ data: as(rows.fixedCosts) });
        await tx.machine.createMany({ data: as(rows.machines) });
        await tx.product.createMany({ data: as(rows.products) });
        await tx.productSupply.createMany({ data: as(rows.productSupplies) });
        await tx.productLabor.createMany({ data: as(rows.productLabor) });
        await tx.productMachine.createMany({ data: as(rows.productMachines) });
        await tx.salesChannel.createMany({ data: as(rows.salesChannels) });
        await tx.volumeTier.createMany({ data: as(rows.volumeTiers) });
        await tx.quote.createMany({ data: as(rows.quotes) });
        await tx.quoteItem.createMany({ data: as(rows.quoteItems) });
        await tx.printInk.createMany({ data: as(rows.printInks) });
        await tx.investmentMovement.createMany({ data: as(rows.investmentMovements) });
      },
      { timeout: 30_000 },
    );
  } catch (e) {
    return fail(`No se pudo restaurar: ${errorMessage(e).slice(0, 200)}`);
  }
  revalidatePath("/", "layout");
  const counts = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.length]));
  return ok({ counts }, "Backup restaurado");
}

/**
 * Importa insumos desde CSV (mismas columnas que la exportación).
 * Si ya existe un insumo con el mismo nombre, actualiza su precio (y registra el historial).
 */
export async function importSuppliesCsv(
  text: string,
): Promise<ActionResult<{ created: number; updated: number; errors: string[] }>> {
  const db = await userDb();
  const records = parseCsv(text);
  if (records.length === 0) return fail("El CSV está vacío o no tiene encabezados");

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const [i, r] of records.entries()) {
    const parsed = supplySchema.safeParse({
      name: r.nombre ?? r.name,
      kind: (r.tipo ?? "").toLowerCase().startsWith("serv") ? "SERVICE" : "MATERIAL",
      category: r.categoria,
      purchaseUnit: r.unidad_compra || "unidad",
      usageUnit: r.unidad_uso || "unidad",
      packQuantity: r.cantidad_paquete || "1",
      packPrice: r.precio_paquete ?? r.precio,
      supplier: r.proveedor,
      url: r.link,
      priceSource: "IMPORT",
    });
    if (!parsed.success) {
      errors.push(`Fila ${i + 2}: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    const { priceSource, id: _id, ...data } = parsed.data;
    void _id;
    const existing = await db.supply.findFirst({ where: { name: data.name } });
    if (existing) {
      const changed = !D(existing.packPrice).eq(data.packPrice) || !D(existing.packQuantity).eq(data.packQuantity);
      await db.supply.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...(changed && {
            priceUpdatedAt: new Date(),
            priceHistory: { create: { packPrice: data.packPrice, packQuantity: data.packQuantity, source: priceSource } },
          }),
        },
      });
      updated++;
    } else {
      await db.supply.create({
        data: {
          userId: db.$userId,
          ...data,
          priceHistory: { create: { packPrice: data.packPrice, packQuantity: data.packQuantity, source: priceSource } },
        },
      });
      created++;
    }
  }
  revalidatePath("/", "layout");
  return ok(
    { created, updated, errors },
    `Importados: ${created} nuevos, ${updated} actualizados${errors.length ? `, ${errors.length} con errores` : ""}`,
  );
}
