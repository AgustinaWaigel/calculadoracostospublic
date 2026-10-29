import { describe, expect, it } from "vitest";
import { computeProductCost } from "@/lib/calc/product";
import { summarizeProductPricing } from "@/lib/calc/summary";

const cost = computeProductCost({
  supplies: [
    { packPrice: "28949", packQuantity: "100", quantity: 1 },
    { packPrice: "300", packQuantity: "1", quantity: 1 },
    { packPrice: "600", packQuantity: "1", quantity: 1 },
  ],
});

describe("summarizeProductPricing (Foto plastificada A4)", () => {
  const summary = summarizeProductPricing({
    cost,
    settings: {
      taxCondition: "MONOTRIBUTO",
      ivaPercent: 21,
      defaultMarginPercent: 40,
      pricingMode: "MARGIN",
      roundTo: 10,
    },
    channels: [
      { name: "Venta directa", type: "DIRECT" },
      { name: "Tienda online", type: "OTHER", commissionPercent: 14 },
      { name: "Imposible", commissionPercent: 100 },
    ],
    tiers: [
      { minQuantity: 1, discountPercent: 0 },
      { minQuantity: 10, discountPercent: 10 },
    ],
    monthlyFixedCosts: 100000,
  });

  it("precio base con 40% de margen", () => {
    // 1189,49 / 0,6 = 1982,4833...
    expect(summary.basePrice.toDecimalPlaces(2).toString()).toBe("1982.48");
  });

  it("redondea la venta directa a $10 y la tienda online mantiene la ganancia", () => {
    expect(summary.reference?.price.toString()).toBe("1990");
    const ml = summary.channels.find((c) => c.channelName === "Tienda online");
    expect(ml?.ok).toBe(true);
    if (ml?.ok) expect(ml.netProfit.gte(summary.targetProfit)).toBe(true);
  });

  it("informa el canal imposible sin romper el resto", () => {
    const bad = summary.channels.find((c) => c.channelName === "Imposible");
    expect(bad?.ok).toBe(false);
  });

  it("punto de equilibrio y volumen", () => {
    // contribución = 1990 − 1189,49 = 800,51 → 100000 / 800,51 = 124,9 → 125
    expect(summary.breakEven?.units).toBe(125);
    expect(summary.volume.map((v) => v.unitPrice.toString())).toEqual(["1990", "1791"]);
  });

  it("el producto puede pisar el margen con markup", () => {
    const s = summarizeProductPricing({
      cost,
      settings: { taxCondition: "MONOTRIBUTO", ivaPercent: 21, defaultMarginPercent: 40, pricingMode: "MARGIN" },
      product: { marginPercent: 100, pricingMode: "MARKUP" },
      channels: [{ name: "Directa", type: "DIRECT" }],
      tiers: [],
      monthlyFixedCosts: 0,
    });
    expect(s.basePrice.toString()).toBe("2378.98");
  });
});
