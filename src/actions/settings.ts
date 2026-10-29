"use server";

import { revalidatePath } from "next/cache";
import { userDb } from "@/lib/db";
import { businessSchema, channelSchema, volumeTiersSchema } from "@/lib/schemas";
import { ok, zodFail, type ActionResult } from "@/lib/action-result";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function saveBusiness(input: unknown): Promise<ActionResult> {
  const db = await userDb();
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  await db.business.upsert({
    where: { id: db.$userId },
    create: { id: db.$userId, ...parsed.data },
    update: parsed.data,
  });
  revalidateAll();
  return ok(undefined, "Datos del emprendimiento guardados");
}

export async function saveChannel(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const parsed = channelSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, ...data } = parsed.data;
  const saved = id
    ? await db.salesChannel.update({ where: { id }, data })
    : await db.salesChannel.create({ data: { ...data, userId: db.$userId, sortOrder: await db.salesChannel.count() } });
  revalidateAll();
  return ok({ id: saved.id }, "Canal guardado");
}

export async function deleteChannel(id: string): Promise<ActionResult> {
  const db = await userDb();
  await db.salesChannel.delete({ where: { id } });
  revalidateAll();
  return ok(undefined, "Canal eliminado");
}

export async function saveVolumeTiers(input: unknown): Promise<ActionResult> {
  const db = await userDb();
  const parsed = volumeTiersSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  await db.$transaction([
    db.volumeTier.deleteMany(),
    db.volumeTier.createMany({ data: parsed.data.map((t) => ({ ...t, userId: db.$userId })) }),
  ]);
  revalidateAll();
  return ok(undefined, "Descuentos por volumen guardados");
}
