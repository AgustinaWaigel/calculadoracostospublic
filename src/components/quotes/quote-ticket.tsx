import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CSSProperties, ReactNode } from "react";
import { ImageResponse } from "next/og";
import satori from "satori";
import { quoteTotals } from "@/lib/calc/quote";
import { D, formatMoney, formatNumber, formatPercent } from "@/lib/money";
import { formatQuoteNumber } from "@/lib/quote-text";
import type { QuotePdfData } from "./quote-pdf";
import { PALETTE } from "./quote-palette";

const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "UTC" });
const deliveryFmt = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// Ancho del ticket en píxeles (proporción de un ticket térmico de 80 mm, con buena resolución para
// mandarlo por WhatsApp). El alto crece con la cantidad de ítems.
const WIDTH = 720;
/** Escala de puntos (los tamaños del ticket en PDF) a píxeles. */
const px = (pt: number) => Math.round(pt * 3.2 * 10) / 10;

const DISPLAY = "Londrina";
const TEXT = "Karla";

const s = {
  page: {
    width: WIDTH,
    display: "flex",
    flexDirection: "column",
    padding: px(12),
    fontSize: px(11),
    fontFamily: TEXT,
    color: PALETTE.ink,
    background: PALETTE.paper,
  },
  center: { display: "flex", justifyContent: "center", textAlign: "center", flexWrap: "wrap" },
  businessName: { fontFamily: DISPLAY, fontSize: px(20), textTransform: "uppercase" },
  contact: { fontSize: px(9.5), color: PALETTE.inkSoft },
  rule: { borderBottom: `2px dashed ${PALETTE.ink}`, marginTop: px(7), marginBottom: px(7) },
  title: { fontFamily: DISPLAY, fontSize: px(16), textTransform: "uppercase" },
  row: { display: "flex", justifyContent: "space-between" },
  bold: { fontWeight: 700 },
  muted: { color: PALETTE.inkSoft, fontSize: px(9.5) },
  total: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: px(3) },
  totalLabel: { fontFamily: DISPLAY, fontSize: px(17), textTransform: "uppercase" },
  totalValue: { fontFamily: DISPLAY, fontSize: px(20) },
  legal: { fontSize: px(9), color: PALETTE.inkSoft, marginTop: px(4) },
  phrase: { fontFamily: DISPLAY, fontSize: px(13), marginTop: px(2) },
} satisfies Record<string, CSSProperties>;

function Line({ label, value, style }: { label: string; value: string; style?: CSSProperties }) {
  return (
    <div style={{ ...s.row, ...style }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Center({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...s.center, ...style }}>{children}</div>;
}

const Rule = () => <div style={s.rule} />;

/**
 * Ticket del pedido: corto, para darle al cliente (para quién, para cuándo, cuánto pagó y cuánto
 * le falta). Con `receipt` es el recibo de lo que ya pagó (no es una factura).
 */
export function QuoteTicket({ q, receipt = false }: { q: QuotePdfData; receipt?: boolean }) {
  const t = quoteTotals(q.items, q.discountPercent);
  const paid = D(q.paidAmount);
  const balance = t.total.minus(paid);
  const kind = receipt ? "Recibo" : "Pedido";
  const contact = [q.business.phone, q.business.instagram, q.business.address].filter(Boolean) as string[];

  return (
    <div style={s.page}>
      <Center style={s.businessName}>{q.business.name}</Center>
      {contact.map((c) => (
        <Center key={c} style={s.contact}>
          {c}
        </Center>
      ))}

      <Rule />
      <Center style={s.title}>{`${kind} ${formatQuoteNumber(q.number)}`}</Center>
      <Center style={s.muted}>{dateFmt.format(receipt ? new Date() : q.createdAt)}</Center>
      <Center style={{ marginTop: px(3) }}>
        <span style={{ marginRight: px(2) }}>Para:</span>
        <span style={s.bold}>{q.clientName}</span>
      </Center>
      {q.deliveryDate && (
        <Center>
          <span style={{ marginRight: px(2) }}>Entrega:</span>
          <span style={s.bold}>{deliveryFmt.format(q.deliveryDate)}</span>
        </Center>
      )}

      <Rule />
      {q.items.map((item, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", marginBottom: px(4) }}>
          <span style={s.bold}>{item.description}</span>
          <Line label={`${formatNumber(item.quantity)} × ${formatMoney(item.unitPrice)}`} value={formatMoney(t.lines[i])} />
        </div>
      ))}

      <Rule />
      {!D(q.discountPercent).isZero() && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Line label="Subtotal" value={formatMoney(t.subtotal)} />
          <Line label={`Descuento ${formatPercent(q.discountPercent, 0)}`} value={`-${formatMoney(t.discount)}`} />
        </div>
      )}
      <div style={s.total}>
        <span style={s.totalLabel}>Total</span>
        <span style={s.totalValue}>{formatMoney(t.total)}</span>
      </div>
      <Line
        style={{ marginTop: px(3) }}
        label={receipt ? "Recibimos" : "Seña"}
        value={paid.gt(0) ? formatMoney(paid) : "Sin seña"}
      />
      <div style={{ ...s.total, ...s.bold }}>
        <span>Resta pagar</span>
        <span>{formatMoney(balance.gt(0) ? balance : 0)}</span>
      </div>

      {q.notes && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Rule />
          <div style={{ display: "flex", whiteSpace: "pre-wrap" }}>{q.notes}</div>
        </div>
      )}

      <Rule />
      <Center style={s.phrase}>{PALETTE.closing}</Center>
      <Center style={s.muted}>¡Gracias por tu pedido!</Center>
      {receipt && <Center style={s.legal}>Comprobante no válido como factura.</Center>}
    </div>
  );
}

// Las fuentes viajan con la app (licencia OFL), igual que en el PDF.
let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 700 }[]> | null = null;
function loadFonts() {
  const dir = path.join(process.cwd(), "src/assets/fonts");
  fontsPromise ??= Promise.all([
    readFile(path.join(dir, "LondrinaSolid-Regular.ttf")).then((data) => ({ name: DISPLAY, data, weight: 400 as const })),
    readFile(path.join(dir, "Karla-400.ttf")).then((data) => ({ name: TEXT, data, weight: 400 as const })),
    readFile(path.join(dir, "Karla-700.ttf")).then((data) => ({ name: TEXT, data, weight: 700 as const })),
  ]).catch((e) => {
    fontsPromise = null;
    throw e;
  });
  return fontsPromise;
}

/** Arma el ticket como PNG. Primero mide el alto (crece con los ítems) y después lo dibuja. */
export async function renderTicketPng(q: QuotePdfData, receipt = false): Promise<ArrayBuffer> {
  const fonts = await loadFonts();
  const element = <QuoteTicket q={q} receipt={receipt} />;
  const svg = await satori(element, { width: WIDTH, fonts });
  const height = Math.ceil(Number(/<svg[^>]*\sheight="([\d.]+)"/.exec(svg)?.[1] ?? 1200));
  const image = new ImageResponse(element, { width: WIDTH, height, fonts });
  return image.arrayBuffer();
}
