import { existsSync } from "node:fs";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { quoteTotals } from "@/lib/calc/quote";
import { D, formatMoney, formatNumber, formatPercent } from "@/lib/money";
import { formatQuoteNumber } from "@/lib/quote-text";

export interface QuotePdfData {
  number: number;
  createdAt: Date;
  validUntil: Date;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  notes: string | null;
  discountPercent: string;
  items: { description: string; quantity: string; unitPrice: string }[];
  business: {
    name: string;
    logoUrl: string | null;
    phone: string | null;
    email: string | null;
    instagram: string | null;
    address: string | null;
  };
}

// Paleta neutra en verdes: el presupuesto va a nombre de cada emprendimiento, no de una marca.
const PALETTE = {
  ink: "#0B5E41", // verde oscuro: textos y portada
  inkSoft: "#2F6E55",
  paper: "#FFFFFF",
  rowAlt: "#F1F7F3",
  line: "#D5E7DC",
  mint: "#7CC4A0",
  mintLight: "#DCEFE4",
  lime: "#B9D53B",
  closing: "Gracias por tu consulta",
};

// Las fuentes viajan con la app (licencia OFL): Londrina Solid para títulos y precios, Karla para el resto.
// Si en el servidor no aparecen los archivos, el PDF sale igual con Helvetica en vez de fallar.
const fontsDir = path.join(process.cwd(), "src/assets/fonts");
const fontFile = (name: string) => path.join(fontsDir, name);
const hasBrandFonts = ["LondrinaSolid-Regular.ttf", "Karla-400.ttf", "Karla-700.ttf"].every((f) => existsSync(fontFile(f)));
if (hasBrandFonts) {
  Font.register({ family: "Londrina", src: fontFile("LondrinaSolid-Regular.ttf") });
  Font.register({
    family: "Karla",
    fonts: [
      { src: fontFile("Karla-400.ttf"), fontWeight: 400 },
      { src: fontFile("Karla-700.ttf"), fontWeight: 700 },
    ],
  });
}
const DISPLAY = hasBrandFonts ? "Londrina" : "Helvetica-Bold";
const TEXT = hasBrandFonts ? "Karla" : "Helvetica";
Font.registerHyphenationCallback((word) => [word]);

const PAD = 40;

const s = StyleSheet.create({
  page: { paddingBottom: 90, fontSize: 10, fontFamily: TEXT, color: PALETTE.ink },
  // Portada verde oscuro con el título en menta.
  header: {
    backgroundColor: PALETTE.ink,
    paddingHorizontal: PAD,
    paddingVertical: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 64, height: 64, objectFit: "contain", borderRadius: 8 },
  businessName: { fontFamily: DISPLAY, fontSize: 24, color: PALETTE.paper, textTransform: "uppercase" },
  contact: { color: PALETTE.mintLight, fontSize: 9, marginTop: 1 },
  title: { fontFamily: DISPLAY, fontSize: 28, color: PALETTE.mint, textAlign: "right", textTransform: "uppercase" },
  meta: { textAlign: "right", color: PALETTE.mintLight, fontSize: 9, marginTop: 1 },
  number: { textAlign: "right", color: PALETTE.paper, fontFamily: DISPLAY, fontSize: 14 },
  // Cinta de colores debajo de la portada.
  ribbon: { flexDirection: "row", height: 6 },
  body: { paddingHorizontal: PAD, paddingTop: 26 },
  label: {
    fontSize: 8,
    fontWeight: 700,
    color: PALETTE.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  clientName: { fontFamily: DISPLAY, fontSize: 18, color: PALETTE.ink },
  muted: { color: PALETTE.inkSoft },
  section: { marginBottom: 20 },
  table: { borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: PALETTE.ink },
  headRow: { flexDirection: "row", paddingVertical: 7, backgroundColor: PALETTE.inkSoft },
  th: { fontSize: 8, fontWeight: 700, color: PALETTE.paper, textTransform: "uppercase", letterSpacing: 0.8 },
  row: { flexDirection: "row", paddingVertical: 7, borderTopWidth: 1, borderColor: PALETTE.line },
  rowAlt: { backgroundColor: PALETTE.rowAlt },
  cDesc: { flex: 1, paddingHorizontal: 8 },
  cQty: { width: 50, textAlign: "right", paddingHorizontal: 8 },
  cPrice: { width: 95, textAlign: "right", paddingHorizontal: 8 },
  cTotal: { width: 95, textAlign: "right", paddingHorizontal: 8, fontWeight: 700 },
  totals: { marginTop: 12, marginLeft: "auto", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, paddingHorizontal: 10 },
  // Total en verde claro con texto verde oscuro.
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: PALETTE.mintLight,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PALETTE.ink,
  },
  grandLabel: { fontFamily: DISPLAY, fontSize: 16, textTransform: "uppercase" },
  grandValue: { fontFamily: DISPLAY, fontSize: 18 },
  validity: { marginTop: 8, textAlign: "right", fontSize: 9, color: PALETTE.inkSoft },
  notes: { marginTop: 24, padding: 12, backgroundColor: PALETTE.rowAlt, borderRadius: 6 },
  // Pie verde oscuro.
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: PALETTE.ink,
    paddingVertical: 14,
    paddingHorizontal: PAD,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerPhrase: { fontFamily: DISPLAY, fontSize: 13, color: PALETTE.mint },
  footerMeta: { fontSize: 8, color: PALETTE.mintLight },
});

const RIBBON = [PALETTE.mint, PALETTE.lime, PALETTE.mintLight, PALETTE.inkSoft];

const dateFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeZone: "UTC" });

export function QuotePdf({ q }: { q: QuotePdfData }) {
  const t = quoteTotals(q.items, q.discountPercent);
  const contact = [q.business.phone, q.business.email, q.business.instagram, q.business.address].filter(Boolean);

  return (
    <Document title={`Presupuesto ${formatQuoteNumber(q.number)} - ${q.clientName}`} author={q.business.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
            {q.business.logoUrl && <Image src={q.business.logoUrl} style={s.logo} />}
            <View>
              <Text style={s.businessName}>{q.business.name}</Text>
              {contact.map((c) => (
                <Text key={c} style={s.contact}>
                  {c}
                </Text>
              ))}
            </View>
          </View>
          <View>
            <Text style={s.title}>Presupuesto</Text>
            <Text style={s.number}>{formatQuoteNumber(q.number)}</Text>
            <Text style={s.meta}>{dateFmt.format(q.createdAt)}</Text>
          </View>
        </View>
        <View style={s.ribbon}>
          {RIBBON.map((c) => (
            <View key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>

        <View style={s.body}>
          <View style={s.section}>
            <Text style={s.label}>Para</Text>
            <Text style={s.clientName}>{q.clientName}</Text>
            {q.clientPhone && <Text style={s.muted}>{q.clientPhone}</Text>}
            {q.clientEmail && <Text style={s.muted}>{q.clientEmail}</Text>}
          </View>

          <View style={s.table}>
            <View style={s.headRow}>
              <Text style={[s.th, s.cDesc]}>Descripción</Text>
              <Text style={[s.th, s.cQty]}>Cant.</Text>
              <Text style={[s.th, s.cPrice]}>Precio unit.</Text>
              <Text style={[s.th, s.cTotal]}>Subtotal</Text>
            </View>
            {q.items.map((item, i) => (
              <View key={i} style={i % 2 === 1 ? [s.row, s.rowAlt] : s.row} wrap={false}>
                <Text style={s.cDesc}>{item.description}</Text>
                <Text style={s.cQty}>{formatNumber(item.quantity)}</Text>
                <Text style={s.cPrice}>{formatMoney(item.unitPrice)}</Text>
                <Text style={s.cTotal}>{formatMoney(t.lines[i])}</Text>
              </View>
            ))}
          </View>

          <View style={s.totals} wrap={false}>
            {!D(q.discountPercent).isZero() && (
              <>
                <View style={s.totalRow}>
                  <Text>Subtotal</Text>
                  <Text>{formatMoney(t.subtotal)}</Text>
                </View>
                <View style={s.totalRow}>
                  <Text>Descuento {formatPercent(q.discountPercent, 0)}</Text>
                  <Text>-{formatMoney(t.discount)}</Text>
                </View>
              </>
            )}
            <View style={s.grandTotal}>
              <Text style={s.grandLabel}>Total</Text>
              <Text style={s.grandValue}>{formatMoney(t.total)}</Text>
            </View>
            <Text style={s.validity}>Válido hasta el {dateFmt.format(q.validUntil)}</Text>
          </View>

          {q.notes && (
            <View style={s.notes} wrap={false}>
              <Text style={s.label}>Notas</Text>
              <Text>{q.notes}</Text>
            </View>
          )}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerPhrase}>{PALETTE.closing}</Text>
          <Text style={s.footerMeta}>
            {q.business.name} · {formatQuoteNumber(q.number)} · Precios en pesos argentinos
          </Text>
        </View>
      </Page>
    </Document>
  );
}
