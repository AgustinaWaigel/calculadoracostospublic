import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { QuotePdf } from "@/components/quotes/quote-pdf";
import { loadQuoteDocument, quoteFileName } from "@/server/quote-document";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const search = new URL(request.url).searchParams;
  // El ticket y el recibo ahora son imágenes: los links viejos (?ticket / ?recibo) van a la ruta nueva.
  if (search.has("ticket") || search.has("recibo")) {
    const url = new URL(`/api/presupuestos/${id}/ticket`, request.url);
    url.search = search.toString();
    return NextResponse.redirect(url);
  }

  const { q, error } = await loadQuoteDocument(id);
  if (error) return error;

  const element = createElement(QuotePdf, { q }) as unknown as React.ReactElement<DocumentProps>;
  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(element);
  } catch (e) {
    // Que el motivo se vea en el navegador y en los logs, no un 500 mudo.
    console.error("No se pudo generar el PDF del presupuesto", id, e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `No se pudo generar el PDF: ${message}` }, { status: 500 });
  }
  const inline = search.has("ver");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${quoteFileName("presupuesto", q, "pdf")}"`,
      "cache-control": "no-store",
    },
  });
}
