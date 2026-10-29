"use server";

import { revalidatePath } from "next/cache";
import { userDb } from "@/lib/db";
import { D } from "@/lib/money";
import { printAsSupplySchema, printInksSchema } from "@/lib/schemas";
import { errorMessage, fail, ok, zodFail, type ActionResult } from "@/lib/action-result";
import { getReferenceUsdRate } from "@/lib/dolar";

/** Guarda la lista completa de tintas (reemplaza la anterior). */
export async function savePrintInks(input: unknown): Promise<ActionResult> {
  const db = await userDb();
  const parsed = printInksSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  await db.$transaction([
    db.printInk.deleteMany(),
    db.printInk.createMany({ data: parsed.data.map((ink, sortOrder) => ({ ...ink, sortOrder, userId: db.$userId })) }),
  ]);
  revalidatePath("/impresion");
  return ok(undefined, "Tintas guardadas");
}

/**
 * Guarda el costo por hoja como un insumo de tipo servicio, para usarlo en las recetas.
 * Si ya existe un insumo con ese nombre, le actualiza el precio (y queda en el historial).
 */
export async function savePrintAsSupply(input: unknown): Promise<ActionResult<{ id: string; created: boolean }>> {
  const db = await userDb();
  const parsed = printAsSupplySchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { name, costPerSheet } = parsed.data;

  try {
    const usdRate = await getReferenceUsdRate();
    const history = { packPrice: costPerSheet, packQuantity: "1", source: "MANUAL" as const, usdRate };
    const existing = await db.supply.findFirst({ where: { name } });

    let id: string;
    let created = false;
    if (existing) {
      const changed = !D(existing.packPrice).eq(costPerSheet) || !D(existing.packQuantity).eq(1);
      await db.supply.update({
        where: { id: existing.id },
        data: {
          packPrice: costPerSheet,
          packQuantity: "1",
          priceUpdatedAt: new Date(),
          ...(changed && { priceHistory: { create: history } }),
        },
      });
      id = existing.id;
    } else {
      const supply = await db.supply.create({
        data: {
          userId: db.$userId,
          name,
          kind: "SERVICE",
          category: "Impresión",
          purchaseUnit: "hoja",
          usageUnit: "hoja",
          packQuantity: "1",
          packPrice: costPerSheet,
          supplier: "Impresión propia",
          priceHistory: { create: history },
        },
      });
      id = supply.id;
      created = true;
    }
    revalidatePath("/", "layout");
    return ok({ id, created }, created ? `Insumo “${name}” creado` : `Insumo “${name}” actualizado`);
  } catch (e) {
    return fail(errorMessage(e));
  }
}
