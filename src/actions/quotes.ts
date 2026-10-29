"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userDb } from "@/lib/db";
import { quoteSchema, quoteStatuses } from "@/lib/schemas";
import { errorMessage, fail, ok, zodFail, type ActionResult } from "@/lib/action-result";
import { saleDataFromQuote } from "@/server/sales";

function revalidateQuotes(id?: string) {
  revalidatePath("/presupuestos");
  if (id) revalidatePath(`/presupuestos/${id}`);
  revalidatePath("/");
}

/** "2026-10-27" → fecha a las 00:00 UTC (evita corrimientos por huso horario). */
const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

export async function saveQuote(input: unknown): Promise<ActionResult<{ id: string }>> {
  const db = await userDb();
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { id, items, validUntil, ...data } = parsed.data;
  const lines = items.map((i, sortOrder) => ({ ...i, productId: i.productId || null, sortOrder }));

  try {
    if (!id) {
      const created = await db.$transaction(async (tx) => {
        const business = await tx.business.upsert({
          where: { id: db.$userId },
          create: { id: db.$userId, name: "Mi Emprendimiento", quoteNumberSeq: 1 },
          update: { quoteNumberSeq: { increment: 1 } },
        });
        // Por si el contador quedó atrás (ej: backup importado), nunca repetimos número.
        const last = await tx.quote.aggregate({ _max: { number: true } });
        const number = Math.max(business.quoteNumberSeq, (last._max.number ?? 0) + 1);
        if (number !== business.quoteNumberSeq) {
          await tx.business.update({ where: { id: db.$userId }, data: { quoteNumberSeq: number } });
        }
        return tx.quote.create({
          data: {
            userId: db.$userId,
            ...data,
            number,
            validUntil: toDate(validUntil),
            items: { create: lines },
          },
        });
      });
      revalidateQuotes(created.id);
      return ok({ id: created.id }, `Presupuesto #${created.number} creado`);
    }

    await db.$transaction([
      db.quoteItem.deleteMany({ where: { quoteId: id } }),
      db.quote.update({
        where: { id },
        data: { ...data, validUntil: toDate(validUntil), items: { create: lines } },
      }),
    ]);
    revalidateQuotes(id);
    return ok({ id }, "Presupuesto guardado");
  } catch (e) {
    return fail(errorMessage(e));
  }
}

export async function setQuoteStatus(id: string, status: unknown): Promise<ActionResult> {
  const db = await userDb();
  const parsed = z.enum(quoteStatuses).safeParse(status);
  if (!parsed.success) return fail("Estado inválido");
  const current = await db.quote.findUnique({
    where: { id },
    select: { status: true, acceptedAt: true, sale: { select: { id: true } } },
  });
  if (!current) return fail("No existe el presupuesto");
  const accepted = parsed.data === "ACCEPTED";
  await db.quote.update({
    where: { id },
    data: {
      status: parsed.data,
      // Si ya estaba aceptado, se queda con su fecha original.
      acceptedAt: accepted ? (current.status === "ACCEPTED" && current.acceptedAt) || new Date() : null,
    },
  });

  // Aceptado = vendido: se registra la venta (y se borra si deja de estar aceptado).
  let message = "Estado actualizado";
  if (accepted && !current.sale) {
    const data = await saleDataFromQuote(id);
    if (data) {
      await db.sale.create({ data });
      message = "Aceptado: se registró la venta";
    }
  } else if (!accepted && current.sale) {
    await db.sale.delete({ where: { id: current.sale.id } });
    message = "Estado actualizado: se quitó la venta";
  }

  revalidateQuotes(id);
  revalidatePath("/ventas");
  revalidatePath("/inversiones");
  return ok(undefined, message);
}

export async function deleteQuote(id: string): Promise<ActionResult> {
  const db = await userDb();
  await db.quote.delete({ where: { id } });
  revalidateQuotes();
  return ok(undefined, "Presupuesto eliminado");
}
