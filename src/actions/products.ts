"use server";

import { revalidatePath } from "next/cache";
import { userDb } from "@/lib/db";
import { productSchema } from "@/lib/schemas";
import { errorMessage, fail, ok, zodFail, type ActionResult } from "@/lib/action-result";

function revalidateProducts(id?: string) {
  revalidatePath("/productos");
  if (id) revalidatePath(`/productos/${id}`, "layout");
  revalidatePath("/");
}

export async function saveProduct(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, supplies, labor, machines, ...data } = parsed.data;
  const fields = { ...data, pricingMode: data.pricingMode ?? null };

  try {
    if (!id) {
      const created = await db.product.create({
        data: {
          userId: db.$userId,
          ...fields,
          supplies: { create: supplies },
          labor: { create: labor },
          machines: { create: machines },
        },
      });
      revalidateProducts(created.id);
      return ok({ id: created.id }, "Producto creado");
    }

    // La receta se reemplaza completa: más simple y consistente que diffear líneas.
    await db.$transaction([
      db.productSupply.deleteMany({ where: { productId: id } }),
      db.productLabor.deleteMany({ where: { productId: id } }),
      db.productMachine.deleteMany({ where: { productId: id } }),
      db.product.update({
        where: { id },
        data: {
          ...fields,
          supplies: { create: supplies },
          labor: { create: labor },
          machines: { create: machines },
        },
      }),
    ]);
    revalidateProducts(id);
    return ok({ id }, "Producto guardado");
  } catch (e) {
    return fail(errorMessage(e));
  }
}

/** Duplica un producto con toda su receta, para crear variantes rápido. */
export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const p = await db.product.findUnique({
    where: { id },
    include: { supplies: true, labor: true, machines: true },
  });
  if (!p) return fail("El producto no existe");
  const copy = await db.product.create({
    data: {
      userId: db.$userId,
      name: `${p.name} (copia)`,
      description: p.description,
      category: p.category,
      batchYield: p.batchYield,
      wastePercent: p.wastePercent,
      includeFixedCosts: p.includeFixedCosts,
      fixedWeight: p.fixedWeight,
      marginPercent: p.marginPercent,
      pricingMode: p.pricingMode,
      duplicatedFromId: p.id,
      supplies: { create: p.supplies.map((s) => ({ supplyId: s.supplyId, quantity: s.quantity })) },
      labor: { create: p.labor.map((l) => ({ profileId: l.profileId, minutes: l.minutes })) },
      machines: { create: p.machines.map((m) => ({ machineId: m.machineId, usage: m.usage })) },
    },
  });
  revalidateProducts();
  return ok({ id: copy.id }, "Producto duplicado: cambiale lo que necesites");
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const db = await userDb();
  await db.product.delete({ where: { id } });
  revalidateProducts();
  return ok(undefined, "Producto eliminado");
}
