import { NextResponse } from "next/server";
import { renderTicketPng } from "@/components/quotes/quote-ticket";
import { loadQuoteDocument, quoteFileName } from "@/server/quote-document";

export const runtime = "nodejs";

/** Ticket del pedido como imagen PNG (?recibo = recibo de pago, ?ver = abrirlo en vez de bajarlo). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { q, error } = await loadQuoteDocument(id);
  if (error) return error;

  const search = new URL(request.url).searchParams;
  const receipt = search.has("recibo");

  let png: ArrayBuffer;
  try {
    png = await renderTicketPng(q, receipt);
  } catch (e) {
    console.error("No se pudo generar la imagen del ticket", id, e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo generar el ticket: ${message}` }, { status: 500 });
  }
  const filename = quoteFileName(receipt ? "recibo" : "ticket", q, "png");

  return new NextResponse(png, {
    headers: {
      "content-type": "image/png",
      "content-disposition": `${search.has("ver") ? "inline" : "attachment"}; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
