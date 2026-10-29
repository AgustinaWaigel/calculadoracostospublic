import { z } from "zod";
import { Decimal, parseMoneyInput } from "@/lib/money";

interface DecimalOpts {
  min?: number;
  /** Si es true, el mínimo es exclusivo (> min). */
  gt?: boolean;
  max?: number;
  label?: string;
}

/**
 * Número decimal tipeado por el usuario ("28.949", "0,25", 12.5).
 * Sale normalizado como string ("28949", "0.25") para no perder precisión.
 */
export function decimalField(opts: DecimalOpts = {}) {
  const label = opts.label ?? "Este campo";
  return z.union([z.string(), z.number()]).transform((value, ctx) => {
    const d =
      typeof value === "number"
        ? Number.isFinite(value)
          ? new Decimal(value)
          : null
        : parseMoneyInput(value);
    if (!d) {
      ctx.addIssue({ code: "custom", message: `${label}: ingresá un número válido` });
      return z.NEVER;
    }
    if (opts.min !== undefined && (opts.gt ? d.lte(opts.min) : d.lt(opts.min))) {
      ctx.addIssue({
        code: "custom",
        message: `${label} tiene que ser ${opts.gt ? "mayor a" : "mayor o igual a"} ${opts.min}`,
      });
      return z.NEVER;
    }
    if (opts.max !== undefined && d.gt(opts.max)) {
      ctx.addIssue({ code: "custom", message: `${label} no puede superar ${opts.max}` });
      return z.NEVER;
    }
    return d.toString();
  });
}

/** Igual que decimalField pero acepta vacío → null. */
export function optionalDecimalField(opts: DecimalOpts = {}) {
  return z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : v))
    .pipe(z.union([z.null(), decimalField(opts)]));
}

/** Texto opcional: "" → null. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const requiredText = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} es obligatorio`).max(max, `Máximo ${max} caracteres`);

/**
 * El logo solo puede ser una imagen embebida (data URL PNG/JPEG/WebP). Nunca una dirección:
 * el PDF la carga desde el servidor y una URL lo haría pedir lo que el usuario quiera.
 */
export function isSafeLogo(value: string): boolean {
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

export const optionalUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "Ingresá un link válido (https://...)");

export const percentField = (label = "El porcentaje", max = 100) =>
  decimalField({ min: 0, max, label });

export const idField = z.string().min(1);
