"use server";

import { revalidatePath } from "next/cache";
import { userDb } from "@/lib/db";
import { saleSchema } from "@/lib/schemas";
import { errorMessage, fail, ok, zodFail, type ActionResult } from "@/lib/action-result";

function revalidateSales(id?: string) {
  revalidatePath("/ventas");
  if (id) revalidatePath(`/ventas/${id}`);
  revalidatePath("/inversiones");
  revalidatePath("/");
}

/** "2026-10-27" → fecha a las 00:00 UTC (evita corrimientos por huso horario). */
const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

export async function saveSale(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, items, date, channelId, ...data } = parsed.data;
  const lines = items.map((i, sortOrder) => ({
    ...i,
    productId: i.productId || null,
    sortOrder,
  }));
  const fields = { ...data, date: toDate(date), channelId: channelId || null };

  try {
    if (!id) {
      const created = await db.sale.create({
        data: { ...fields, userId: db.$userId, items: { create: lines } },
      });
      revalidateSales(created.id);
      return ok({ id: created.id }, "Venta registrada");
    }
    await db.$transaction([
      db.saleItem.deleteMany({ where: { saleId: id } }),
      db.sale.update({
        where: { id },
        data: { ...fields, items: { create: lines } },
      }),
    ]);
    revalidateSales(id);
    return ok({ id }, "Venta guardada");
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function deleteSale(id: string): Promise<ActionResult> {
  const db = await userDb();
  await db.sale.delete({ where: { id } });
  revalidateSales();
  return ok(undefined, "Venta eliminada");
}
