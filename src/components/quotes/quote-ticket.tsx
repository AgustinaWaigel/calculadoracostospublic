import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { quoteTotals } from "@/lib/calc/quote";
import { D, formatMoney, formatNumber, formatPercent } from "@/lib/money";
import { formatQuoteNumber } from "@/lib/quote-text";
import { DISPLAY, PALETTE, TEXT, dateFmt, type QuotePdfData } from "./quote-pdf";

const deliveryFmt = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

// Ticket de 80 mm de ancho (el de las impresoras térmicas). El alto crece con la cantidad de ítems.
const WIDTH = 80 * 2.835;

const s = StyleSheet.create({
  page: { padding: 14, fontSize: 8.5, fontFamily: TEXT, color: PALETTE.ink },
  center: { textAlign: "center" },
  businessName: { fontFamily: DISPLAY, fontSize: 16, textAlign: "center", textTransform: "uppercase" },
  contact: { fontSize: 7.5, textAlign: "center", color: PALETTE.inkSoft },
  rule: { borderBottomWidth: 1, borderColor: PALETTE.ink, borderStyle: "dashed", marginVertical: 7 },
  title: { fontFamily: DISPLAY, fontSize: 13, textAlign: "center", textTransform: "uppercase", color: PALETTE.ink },
  row: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontWeight: 700 },
  item: { marginBottom: 4 },
  muted: { color: PALETTE.inkSoft, fontSize: 7.5 },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 3 },
  totalLabel: { fontFamily: DISPLAY, fontSize: 13, textTransform: "uppercase" },
  totalValue: { fontFamily: DISPLAY, fontSize: 15 },
  legal: { fontSize: 7, textAlign: "center", color: PALETTE.inkSoft, marginTop: 4 },
  phrase: { fontFamily: DISPLAY, fontSize: 10, textAlign: "center", color: PALETTE.ink, marginTop: 2 },
});

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

/**
 * Ticket del pedido: corto, para darle al cliente en mano (para quién, para cuándo, cuánto pagó y
 * cuánto le falta). Con `receipt` es el recibo de lo que ya pagó (no es una factura).
 */
export function QuoteTicket({ q, receipt = false }: { q: QuotePdfData; receipt?: boolean }) {
  const t = quoteTotals(q.items, q.discountPercent);
  const paid = D(q.paidAmount);
  const balance = t.total.minus(paid);
  const kind = receipt ? "Recibo" : "Pedido";
  const contact = [q.business.phone, q.business.instagram, q.business.address].filter(Boolean);

  return (
    <Document title={`${kind} ${formatQuoteNumber(q.number)} - ${q.clientName}`} author={q.business.name}>
      <Page size={{ width: WIDTH }} style={s.page} wrap={false}>
        <Text style={s.businessName}>{q.business.name}</Text>
        {contact.map((c) => (
          <Text key={c} style={s.contact}>
            {c}
          </Text>
        ))}

        <View style={s.rule} />
        <Text style={s.title}>
          {kind} {formatQuoteNumber(q.number)}
        </Text>
        <Text style={[s.center, s.muted]}>{dateFmt.format(receipt ? new Date() : q.createdAt)}</Text>
        <Text style={[s.center, { marginTop: 3 }]}>
          Para: <Text style={s.bold}>{q.clientName}</Text>
        </Text>
        {q.deliveryDate && (
          <Text style={s.center}>
            Entrega: <Text style={s.bold}>{deliveryFmt.format(q.deliveryDate)}</Text>
          </Text>
        )}

        <View style={s.rule} />
        {q.items.map((item, i) => (
          <View key={i} style={s.item}>
            <Text style={s.bold}>{item.description}</Text>
            <Line label={`${formatNumber(item.quantity)} × ${formatMoney(item.unitPrice)}`} value={formatMoney(t.lines[i])} />
          </View>
        ))}

        <View style={s.rule} />
        {!D(q.discountPercent).isZero() && (
          <>
            <Line label="Subtotal" value={formatMoney(t.subtotal)} />
            <Line label={`Descuento ${formatPercent(q.discountPercent, 0)}`} value={`-${formatMoney(t.discount)}`} />
          </>
        )}
        <View style={s.total}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>{formatMoney(t.total)}</Text>
        </View>
        <View style={{ marginTop: 3 }}>
          <Line label={receipt ? "Recibimos" : "Seña"} value={paid.gt(0) ? formatMoney(paid) : "Sin seña"} />
        </View>
        <View style={s.total}>
          <Text style={s.bold}>Resta pagar</Text>
          <Text style={s.bold}>{formatMoney(balance.gt(0) ? balance : 0)}</Text>
        </View>

        {q.notes && (
          <>
            <View style={s.rule} />
            <Text>{q.notes}</Text>
          </>
        )}

        <View style={s.rule} />
        <Text style={s.phrase}>{PALETTE.closing}</Text>
        <Text style={[s.center, s.muted]}>¡Gracias por tu pedido!</Text>
        {receipt && <Text style={s.legal}>Comprobante no válido como factura.</Text>}
      </Page>
    </Document>
  );
}
