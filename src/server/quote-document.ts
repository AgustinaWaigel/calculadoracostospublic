import "server-only";
import { NextResponse } from "next/server";
import type { QuotePdfData } from "@/components/quotes/quote-pdf";
import { userDb } from "@/lib/db";
import { getBusiness } from "@/server/costing";
import { formatQuoteNumber } from "@/lib/quote-text";
import { isSafeLogo } from "@/lib/schemas";
import { sectionLocked } from "@/lib/billing";

/**
 * Lee el presupuesto y el negocio para armar el PDF o el ticket. Si algo falla devuelve la
 * respuesta de error lista para mandar.
 */
export async function loadQuoteDocument(
  id: string,
): Promise<{ q: QuotePdfData; error?: never } | { q?: never; error: NextResponse }> {
  const db = await userDb();
  if (sectionLocked(db.$tier, "/api/presupuestos")) {
    return { error: NextResponse.json({ error: "Los presupuestos son del plan completo." }, { status: 403 }) };
  }
  let quote, business;
  try {
    [quote, business] = await Promise.all([
      db.quote.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } }),
      getBusiness(),
    ]);
  } catch (e) {
    console.error("No se pudo leer el presupuesto", id, e);
    return { error: NextResponse.json({ error: "No se pudo leer el presupuesto de la base de datos" }, { status: 503 }) };
  }
  if (!quote) return { error: NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 }) };

  return {
    q: {
      number: quote.number,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail,
      notes: quote.notes,
      discountPercent: quote.discountPercent.toString(),
      paidAmount: quote.paidAmount.toString(),
      deliveryDate: quote.deliveryDate,
      items: quote.items.map((i) => ({
        description: i.description,
        quantity: i.quantity.toString(),
        unitPrice: i.unitPrice.toString(),
      })),
      business: {
        name: business.name,
        // Defensa extra: solo imágenes embebidas (una URL haría que el servidor la vaya a buscar).
        logoUrl: business.logoUrl && isSafeLogo(business.logoUrl) ? business.logoUrl : null,
        phone: business.phone,
        email: business.email,
        instagram: business.instagram,
        address: business.address,
      },
    },
  };
}

/** "presupuesto-0012-juana-perez.pdf" */
export function quoteFileName(kind: string, q: Pick<QuotePdfData, "number" | "clientName">, ext: string) {
  const client = q.clientName
    .normalize("NFD")
    .replace(/[^\w]+/g, "-")
    .toLowerCase();
  return `${kind}-${formatQuoteNumber(q.number).slice(1)}-${client}.${ext}`;
}
