import { z } from "zod";
import {
  decimalField,
  idField,
  optionalDecimalField,
  optionalText,
  optionalUrl,
  percentField,
  requiredText,
} from "./common";

export * from "./common";

// ───────── Enums compartidos (espejo de Prisma) ─────────

export const supplyKinds = ["MATERIAL", "SERVICE"] as const;
export const priceSources = ["MANUAL", "IMPORT"] as const;
export const fixedCostCategories = [
  "ALQUILER",
  "SERVICIOS",
  "INTERNET",
  "IMPUESTOS",
  "SUSCRIPCIONES",
  "OTROS",
] as const;
export const lifeUnits = ["UNITS", "HOURS"] as const;
export const pricingModes = ["MARGIN", "MARKUP"] as const;
export const taxConditions = ["MONOTRIBUTO", "RESPONSABLE_INSCRIPTO", "EXENTO"] as const;
export const channelTypes = ["DIRECT", "WHOLESALE", "OTHER"] as const;
export const quoteStatuses = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;

export const FIXED_COST_LABELS: Record<(typeof fixedCostCategories)[number], string> = {
  ALQUILER: "Alquiler",
  SERVICIOS: "Luz, gas y agua",
  INTERNET: "Internet y teléfono",
  IMPUESTOS: "Impuestos (monotributo, IIBB)",
  SUSCRIPCIONES: "Suscripciones",
  OTROS: "Otros",
};

export const TAX_LABELS: Record<(typeof taxConditions)[number], string> = {
  MONOTRIBUTO: "Monotributista",
  RESPONSABLE_INSCRIPTO: "Responsable Inscripto",
  EXENTO: "Exento",
};

export const CHANNEL_LABELS: Record<(typeof channelTypes)[number], string> = {
  DIRECT: "Venta directa",
  WHOLESALE: "Mayorista",
  OTHER: "Otro",
};

export const QUOTE_STATUS_LABELS: Record<(typeof quoteStatuses)[number], string> = {
  DRAFT: "Borrador",
  SENT: "Enviado",
  ACCEPTED: "Aceptado",
  REJECTED: "Rechazado",
  EXPIRED: "Vencido",
};

export const PRICE_SOURCE_LABELS: Record<(typeof priceSources)[number], string> = {
  MANUAL: "Manual",
  IMPORT: "Importado",
};

// ───────── Insumos ─────────

export const supplySchema = z.object({
  id: idField.optional(),
  name: requiredText("El nombre"),
  kind: z.enum(supplyKinds),
  category: optionalText(60),
  purchaseUnit: requiredText("La unidad de compra", 30),
  usageUnit: requiredText("La unidad de uso", 30),
  packQuantity: decimalField({ min: 0, gt: true, label: "La cantidad por paquete" }),
  packPrice: decimalField({ min: 0, label: "El precio" }),
  supplier: optionalText(120),
  url: optionalUrl,
  priceSource: z.enum(priceSources).default("MANUAL"),
});
export type SupplyInput = z.input<typeof supplySchema>;
export type SupplyData = z.output<typeof supplySchema>;

// ───────── Mano de obra ─────────

export const laborProfileSchema = z.object({
  id: idField.optional(),
  name: requiredText("El nombre", 60),
  hourlyRate: decimalField({ min: 0, label: "El valor hora" }),
  isOwn: z.boolean().default(true),
  color: optionalText(20),
});
export type LaborProfileInput = z.input<typeof laborProfileSchema>;

export const marketRateSchema = z.object({
  id: idField.optional(),
  label: requiredText("La descripción", 80),
  hourlyRate: decimalField({ min: 0, gt: true, label: "El valor hora" }),
  source: optionalText(120),
});
export type MarketRateInput = z.input<typeof marketRateSchema>;

export const hourlyGoalSchema = z.object({
  monthlyIncome: decimalField({ min: 0, gt: true, label: "El ingreso mensual" }),
  hoursPerMonth: decimalField({ min: 0, gt: true, max: 744, label: "Las horas por mes" }),
});

// ───────── Costos fijos y máquinas ─────────

export const fixedCostSchema = z.object({
  id: idField.optional(),
  name: requiredText("El nombre", 80),
  category: z.enum(fixedCostCategories),
  monthlyAmount: decimalField({ min: 0, label: "El monto mensual" }),
  active: z.boolean().default(true),
});
export type FixedCostInput = z.input<typeof fixedCostSchema>;

export const machineSchema = z.object({
  id: idField.optional(),
  name: requiredText("El nombre", 80),
  price: decimalField({ min: 0, label: "El precio" }),
  usefulLife: decimalField({ min: 0, gt: true, label: "La vida útil" }),
  lifeUnit: z.enum(lifeUnits),
});
export type MachineInput = z.input<typeof machineSchema>;

// ───────── Productos ─────────

export const productSchema = z
  .object({
    id: idField.optional(),
    name: requiredText("El nombre", 120),
    description: optionalText(500),
    category: optionalText(60),
    batchYield: decimalField({ min: 0, gt: true, label: "El rinde por lote" }),
    wastePercent: percentField("La merma"),
    includeFixedCosts: z.boolean().default(true),
    fixedWeight: decimalField({ min: 0, gt: true, label: "El tamaño" }),
    marginPercent: optionalDecimalField({ min: 0, max: 10000, label: "El margen" }),
    pricingMode: z.enum(pricingModes).nullable().optional(),
    supplies: z
      .array(
        z.object({
          supplyId: idField,
          quantity: decimalField({ min: 0, gt: true, label: "La cantidad" }),
        }),
      )
      .default([]),
    labor: z
      .array(
        z.object({
          profileId: idField,
          minutes: decimalField({ min: 0, gt: true, label: "Los minutos" }),
        }),
      )
      .default([]),
    machines: z
      .array(
        z.object({
          machineId: idField,
          usage: decimalField({ min: 0, gt: true, label: "El uso" }),
        }),
      )
      .default([]),
  })
  .superRefine((p, ctx) => {
    const dup = (ids: string[]) => ids.length !== new Set(ids).size;
    if (dup(p.supplies.map((s) => s.supplyId)))
      ctx.addIssue({ code: "custom", path: ["supplies"], message: "Hay insumos repetidos" });
    if (dup(p.labor.map((l) => l.profileId)))
      ctx.addIssue({ code: "custom", path: ["labor"], message: "Hay perfiles repetidos" });
    if (dup(p.machines.map((m) => m.machineId)))
      ctx.addIssue({ code: "custom", path: ["machines"], message: "Hay máquinas repetidas" });
    if ((p.pricingMode ?? "MARGIN") === "MARGIN" && p.marginPercent && Number(p.marginPercent) >= 100)
      ctx.addIssue({ code: "custom", path: ["marginPercent"], message: "El margen tiene que ser menor a 100%" });
  });
export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

// ───────── Emprendimiento ─────────

export const businessSchema = z
  .object({
    name: requiredText("El nombre del emprendimiento", 80),
    logoUrl: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || v.length < 400_000, "El logo es muy pesado (máx. ~300 KB)"),
    phone: optionalText(40),
    email: optionalText(120),
    instagram: optionalText(60),
    address: optionalText(160),
    taxCondition: z.enum(taxConditions),
    ivaPercent: percentField("El IVA"),
    monthlyUnitsEstimate: z.coerce
      .number({ message: "Ingresá un número" })
      .int("Tiene que ser un número entero")
      .min(1, "Tiene que ser al menos 1"),
    defaultMarginPercent: decimalField({ min: 0, max: 10000, label: "El margen" }),
    pricingMode: z.enum(pricingModes),
    roundTo: decimalField({ min: 0, label: "El redondeo" }),
    quoteValidityDays: z.coerce.number().int().min(1).max(365),
  })
  .superRefine((b, ctx) => {
    if (b.pricingMode === "MARGIN" && Number(b.defaultMarginPercent) >= 100)
      ctx.addIssue({
        code: "custom",
        path: ["defaultMarginPercent"],
        message: "El margen tiene que ser menor a 100% (usá markup si querés más)",
      });
  });
export type BusinessInput = z.input<typeof businessSchema>;

// ───────── Canales y volumen ─────────

export const channelSchema = z.object({
  id: idField.optional(),
  name: requiredText("El nombre", 60),
  type: z.enum(channelTypes),
  commissionPercent: percentField("La comisión", 99),
  fixedFee: decimalField({ min: 0, label: "El cargo fijo" }),
  shippingCost: decimalField({ min: 0, label: "El envío" }),
  paymentFeePercent: percentField("La comisión de la pasarela", 99),
  installmentsPercent: percentField("El costo de cuotas", 99),
  priceAdjustPercent: decimalField({ min: -99, max: 1000, label: "El ajuste" }),
  applyIva: z.boolean().default(true),
  active: z.boolean().default(true),
});
export type ChannelInput = z.input<typeof channelSchema>;

const volumeTierSchema = z.object({
  minQuantity: z.coerce.number().int().min(1, "Mínimo 1 unidad"),
  discountPercent: percentField("El descuento", 99),
});
const uniqueTiers = (tiers: { minQuantity: number }[]) => new Set(tiers.map((t) => t.minQuantity)).size === tiers.length;

export const volumeTiersSchema = z
  .array(volumeTierSchema)
  .min(1, "Cargá al menos un tramo")
  .refine(uniqueTiers, "Hay cantidades repetidas");
export type VolumeTiersInput = z.input<typeof volumeTiersSchema>;

// ───────── Presupuestos ─────────

export const quoteSchema = z.object({
  id: idField.optional(),
  clientName: requiredText("El nombre del cliente", 120),
  clientPhone: optionalText(40),
  clientEmail: optionalText(120),
  notes: optionalText(1000),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  status: z.enum(quoteStatuses).default("DRAFT"),
  discountPercent: percentField("El descuento", 99),
  /** Descuentos por cantidad de este presupuesto (copia de Ajustes al crearlo; vacío = sin descuento). */
  volumeTiers: z.array(volumeTierSchema).refine(uniqueTiers, "Hay cantidades repetidas").default([]),
  items: z
    .array(
      z.object({
        productId: z.string().nullable().optional(),
        description: requiredText("La descripción", 200),
        quantity: decimalField({ min: 0, gt: true, label: "La cantidad" }),
        unitPrice: decimalField({ min: 0, label: "El precio" }),
      }),
    )
    .min(1, "Agregá al menos un ítem"),
});
export type QuoteInput = z.input<typeof quoteSchema>;
export type QuoteData = z.output<typeof quoteSchema>;

// ───────── Calculadora de impresión ─────────

export const inkChannels = ["K", "C", "M", "Y", "LC", "LM", "OTRO"] as const;

export const INK_CHANNEL_LABELS: Record<(typeof inkChannels)[number], string> = {
  K: "Negro",
  C: "Cian",
  M: "Magenta",
  Y: "Amarillo",
  LC: "Cian claro",
  LM: "Magenta claro",
  OTRO: "Otro",
};

export const printInksSchema = z
  .array(
    z.object({
      name: requiredText("El nombre", 40),
      channel: z.enum(inkChannels),
      color: z.string().regex(/^#[0-9a-f]{6}$/i, "Color inválido"),
      bottlePrice: decimalField({ min: 0, label: "El precio del bote" }),
      yieldPages: z.coerce
        .number({ message: "Ingresá un número" })
        .int("Tiene que ser un número entero")
        .min(1, "El rendimiento tiene que ser al menos 1 página"),
    }),
  )
  .max(12, "Máximo 12 tintas");
export type PrintInksInput = z.input<typeof printInksSchema>;

export const printAsSupplySchema = z.object({
  name: requiredText("El nombre", 120),
  costPerSheet: decimalField({ min: 0, label: "El costo" }),
});
