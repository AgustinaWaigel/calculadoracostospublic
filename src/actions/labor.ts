"use server";

import { revalidatePath } from "next/cache";
import { userDb } from "@/lib/db";
import { laborProfileSchema, marketRateSchema } from "@/lib/schemas";
import { fail, ok, zodFail, type ActionResult } from "@/lib/action-result";

function revalidateLabor() {
  revalidatePath("/mano-de-obra");
  revalidatePath("/productos", "layout");
  revalidatePath("/");
}

export async function saveLaborProfile(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const parsed = laborProfileSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, ...data } = parsed.data;
  const saved = id
    ? await db.laborProfile.update({ where: { id }, data })
    : await db.laborProfile.create({ data: { ...data, userId: db.$userId } });
  revalidateLabor();
  return ok({ id: saved.id }, id ? "Perfil actualizado" : "Perfil creado");
}

export async function deleteLaborProfile(id: string): Promise<ActionResult> {
  const db = await userDb();
  const used = await db.productLabor.findMany({ where: { profileId: id }, include: { product: true } });
  if (used.length > 0) {
    return fail(`No se puede borrar: lo usan ${used.map((u) => u.product.name).join(", ")}`);
  }
  await db.laborProfile.delete({ where: { id } });
  revalidateLabor();
  return ok(undefined, "Perfil eliminado");
}

export async function saveMarketRate(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const parsed = marketRateSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, ...data } = parsed.data;
  const saved = id
    ? await db.marketRate.update({ where: { id }, data })
    : await db.marketRate.create({ data: { ...data, userId: db.$userId } });
  revalidateLabor();
  return ok({ id: saved.id }, "Valor de referencia guardado");
}

export async function deleteMarketRate(id: string): Promise<ActionResult> {
  const db = await userDb();
  await db.marketRate.delete({ where: { id } });
  revalidateLabor();
  return ok(undefined, "Referencia eliminada");
}
