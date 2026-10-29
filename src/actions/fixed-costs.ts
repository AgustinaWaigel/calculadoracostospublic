"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userDb } from "@/lib/db";
import { fixedCostSchema, machineSchema } from "@/lib/schemas";
import { fail, ok, zodFail, type ActionResult } from "@/lib/action-result";

function revalidateFixed() {
  revalidatePath("/costos-fijos");
  revalidatePath("/productos", "layout");
  revalidatePath("/");
}

export async function saveFixedCost(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const parsed = fixedCostSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, ...data } = parsed.data;
  const saved = id ? await db.fixedCost.update({ where: { id }, data }) : await db.fixedCost.create({ data: { ...data, userId: db.$userId } });
  revalidateFixed();
  return ok({ id: saved.id }, id ? "Costo fijo actualizado" : "Costo fijo agregado");
}

export async function toggleFixedCost(id: string, active: boolean): Promise<ActionResult> {
  const db = await userDb();
  await db.fixedCost.update({ where: { id }, data: { active } });
  revalidateFixed();
  return ok(undefined, active ? "Incluido en el prorrateo" : "Excluido del prorrateo");
}

export async function deleteFixedCost(id: string): Promise<ActionResult> {
  const db = await userDb();
  await db.fixedCost.delete({ where: { id } });
  revalidateFixed();
  return ok(undefined, "Costo fijo eliminado");
}

const countField = z.coerce.number().int("Tiene que ser un número entero").min(1, "Tiene que ser al menos 1");
const allocationSchema = z.object({
  fixedAllocation: z.enum(["SIZE", "TIME"]),
  monthlyUnitsEstimate: countField,
  monthlyHoursEstimate: countField.max(744, "Un mes tiene 744 horas como mucho"),
});

/** Cómo se reparten los fijos: por tamaño (unidades normales por mes) o por tiempo (horas por mes). */
export async function updateFixedAllocation(input: unknown): Promise<ActionResult> {
  const db = await userDb();
  const parsed = allocationSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  await db.business.upsert({
    where: { id: db.$userId },
    create: { id: db.$userId, name: "Mi Emprendimiento", ...parsed.data },
    update: parsed.data,
  });
  revalidateFixed();
  return ok(undefined, "Reparto de fijos actualizado");
}

export async function saveMachine(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const parsed = machineSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, ...data } = parsed.data;
  const saved = id ? await db.machine.update({ where: { id }, data }) : await db.machine.create({ data: { ...data, userId: db.$userId } });
  revalidateFixed();
  return ok({ id: saved.id }, id ? "Máquina actualizada" : "Máquina agregada");
}

export async function deleteMachine(id: string): Promise<ActionResult> {
  const db = await userDb();
  const used = await db.productMachine.findMany({ where: { machineId: id }, include: { product: true } });
  if (used.length > 0) return fail(`No se puede borrar: la usan ${used.map((u) => u.product.name).join(", ")}`);
  await db.machine.delete({ where: { id } });
  revalidateFixed();
  return ok(undefined, "Máquina eliminada");
}
