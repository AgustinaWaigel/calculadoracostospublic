/** Rubros: qué secciones ve cada uno y con qué ejemplos y unidades se le habla. */

export const industries = ["PAPELERIA", "GASTRONOMIA", "TALLER", "MANUALIDADES", "OTRO"] as const;
export type Industry = (typeof industries)[number];

interface IndustryConfig {
  label: string;
  hint: string;
  /** Muestra la calculadora de impresión (tinta por hoja). */
  print: boolean;
  examples: { supply: string; service: string; category: string; product: string; packPrice: string; usage: string; pack: string };
  units: string[];
}

export const INDUSTRIES: Record<Industry, IndustryConfig> = {
  PAPELERIA: {
    label: "Papelería e imprenta",
    hint: "Agendas, tarjetas, stickers, impresiones…",
    print: true,
    examples: { service: "Ej: Impresión A4 color", pack: "Ej: un pack de 100 pouches → 100", supply: "Ej: Pouch plastificado A4", category: "Papel, Tintas…", product: "Ej: Foto plastificada A4", packPrice: "28.949", usage: "hoja, pouch, ml…" },
    units: ["paquete", "resma", "rollo", "caja", "hoja", "unidad", "litro", "metro"],
  },
  GASTRONOMIA: {
    label: "Gastronomía",
    hint: "Pastelería, panificados, viandas…",
    print: false,
    examples: { service: "Ej: Envío en moto", pack: "Ej: una bolsa de 1 kg que usás por gramo → 1000", supply: "Ej: Harina 000", category: "Secos, Lácteos…", product: "Ej: Torta de chocolate", packPrice: "1.200", usage: "g, ml, unidad…" },
    units: ["kg", "g", "litro", "ml", "docena", "maple", "unidad", "paquete", "caja"],
  },
  TALLER: {
    label: "Taller",
    hint: "Carpintería, herrería, costura, cuero…",
    print: false,
    examples: { service: "Ej: Corte láser", pack: "Ej: un rollo de 50 metros → 50", supply: "Ej: Placa MDF 3 mm", category: "Maderas, Herrajes…", product: "Ej: Caja de té de madera", packPrice: "15.000", usage: "placa, metro, unidad…" },
    units: ["unidad", "placa", "metro", "m²", "rollo", "kg", "litro", "caja", "paquete"],
  },
  MANUALIDADES: {
    label: "Artesanías y manualidades",
    hint: "Velas, jabones, bijou, cerámica…",
    print: false,
    examples: { service: "Ej: Envío por correo", pack: "Ej: un bloque de 1 kg que usás por gramo → 1000", supply: "Ej: Cera de soja", category: "Ceras, Esencias…", product: "Ej: Vela aromática", packPrice: "9.500", usage: "g, ml, unidad…" },
    units: ["kg", "g", "litro", "ml", "unidad", "paquete", "metro", "caja"],
  },
  OTRO: {
    label: "Otro rubro",
    hint: "Cualquier cosa que produzcas",
    print: true,
    examples: { service: "Ej: Envío", pack: "Ej: un pack de 100 → 100", supply: "Ej: Material principal", category: "Opcional", product: "Ej: Mi producto", packPrice: "10.000", usage: "unidad, metro, kg…" },
    units: ["unidad", "paquete", "caja", "kg", "g", "litro", "ml", "metro", "rollo"],
  },
};

export function isIndustry(value: unknown): value is Industry {
  return typeof value === "string" && (industries as readonly string[]).includes(value);
}

/** Cómo se muestra el rubro: el nombre que escribió si eligió "Otro". */
export function industryLabel(industry: Industry, name?: string | null): string {
  if (industry === "OTRO") return name?.trim() || "Costos y precios";
  return INDUSTRIES[industry].label;
}
