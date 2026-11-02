import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { QuotePdf } from "@/components/quotes/quote-pdf";
import { userDb } from "@/lib/db";
import { getBusiness } from "@/server/costing";
import { formatQuoteNumber } from "@/lib/quote-text";
import { isSafeLogo } from "@/lib/schemas";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await userDb();
  const { id } = await params;
  let quote, business;
  try {
    [quote, business] = await Promise.all([
      db.quote.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } }),
      getBusiness(),
    ]);
  } catch (e) {
    console.error("No se pudo leer el presupuesto para el PDF", id, e);
    return NextResponse.json({ error: "No se pudo leer el presupuesto de la base de datos" }, { status: 503 });
  }
  if (!quote) return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });

  const element = createElement(QuotePdf, {
    q: {
      number: quote.number,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail,
      notes: quote.notes,
      discountPercent: quote.discountPercent.toString(),
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
  }) as unknown as React.ReactElement<DocumentProps>;

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(element);
  } catch (e) {
    // Que el motivo se vea en el navegador y en los logs, no un 500 mudo.
    console.error("No se pudo generar el PDF del presupuesto", id, e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo generar el PDF: ${message}` }, { status: 500 });
  }
  const filename = `presupuesto-${formatQuoteNumber(quote.number).slice(1)}-${quote.clientName
    .normalize("NFD")
    .replace(/[^\w]+/g, "-")
    .toLowerCase()}.pdf`;
  const inline = new URL(request.url).searchParams.has("ver");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
