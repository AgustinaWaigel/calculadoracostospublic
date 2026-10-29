"use server";

import { revalidatePath } from "next/cache";
import { userDb } from "@/lib/db";
import { investmentMovementSchema } from "@/lib/schemas";
import { ok, zodFail, type ActionResult } from "@/lib/action-result";

/** "2026-10-27" → fecha a las 00:00 UTC (evita corrimientos por huso horario). */
const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

export async function saveInvestmentMovement(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const parsed = investmentMovementSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, date, ...rest } = parsed.data;
  const data = { ...rest, date: toDate(date) };
  const saved = id
    ? await db.investmentMovement.update({ where: { id }, data })
    : await db.investmentMovement.create({ data: { ...data, userId: db.$userId } });
  revalidatePath("/inversiones");
  const message =
    data.kind === "INVESTMENT"
      ? id ? "Inversión actualizada" : "Inversión agregada"
      : id ? "Recupero actualizado" : "Recupero agregado";
  return ok({ id: saved.id }, message);
}

export async function deleteInvestmentMovement(id: string): Promise<ActionResult> {
  const db = await userDb();
  await db.investmentMovement.delete({ where: { id } });
  revalidatePath("/inversiones");
  return ok(undefined, "Movimiento eliminado");
}
