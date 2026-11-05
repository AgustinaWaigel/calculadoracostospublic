import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { QuotePdf } from "@/components/quotes/quote-pdf";
import { QuoteTicket } from "@/components/quotes/quote-ticket";
import { userDb } from "@/lib/db";
import { getBusiness } from "@/server/costing";
import { formatQuoteNumber } from "@/lib/quote-text";
import { isSafeLogo } from "@/lib/schemas";
import { sectionLocked } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await userDb();
  if (sectionLocked(db.$tier, "/api/presupuestos")) {
    return NextResponse.json({ error: "Los presupuestos son del plan completo." }, { status: 403 });
  }
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

  const search = new URL(request.url).searchParams;
  // ?ticket = versión angosta (80 mm) para imprimir o darle al cliente en mano; ?recibo = lo mismo, como recibo de pago.
  const receipt = search.has("recibo");
  const ticket = receipt || search.has("ticket");
  const q = {
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
  };
  const element = (
    ticket ? createElement(QuoteTicket, { q, receipt }) : createElement(QuotePdf, { q })
  ) as unknown as React.ReactElement<DocumentProps>;

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(element);
  } catch (e) {
    // Que el motivo se vea en el navegador y en los logs, no un 500 mudo.
    console.error("No se pudo generar el PDF del presupuesto", id, e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo generar el PDF: ${message}` }, { status: 500 });
  }
  const filename = `${receipt ? "recibo" : ticket ? "ticket" : "presupuesto"}-${formatQuoteNumber(quote.number).slice(1)}-${quote.clientName
    .normalize("NFD")
    .replace(/[^\w]+/g, "-")
    .toLowerCase()}.pdf`;
  const inline = search.has("ver");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
