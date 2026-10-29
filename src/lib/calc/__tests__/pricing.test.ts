import { describe, expect, it } from "vitest";
import {
  channelPrice,
  marginOf,
  marginToMarkup,
  markupToMargin,
  priceFromCost,
  volumeTable,
} from "@/lib/calc/pricing";
import { breakEven } from "@/lib/calc/break-even";

describe("margen vs markup", () => {
  it("50% de margen duplica, 50% de markup suma la mitad", () => {
    expect(priceFromCost(100, 50, "MARGIN").toString()).toBe("200");
    expect(priceFromCost(100, 50, "MARKUP").toString()).toBe("150");
    expect(() => priceFromCost(100, 100, "MARGIN")).toThrow();
  });
  it("conversiones", () => {
    expect(marginToMarkup(50).toString()).toBe("100");
    expect(markupToMargin(100).toString()).toBe("50");
    expect(marginOf(200, 100).toString()).toBe("50");
  });
});

describe("precio por canal", () => {
  it("venta directa monotributo = costo + ganancia", () => {
    const r = channelPrice({
      unitCost: 1000,
      targetProfit: 500,
      channel: { name: "Directa" },
      taxCondition: "MONOTRIBUTO",
    });
    expect(r.price.toString()).toBe("1500");
    expect(r.netProfit.toString()).toBe("500");
  });

  it("una plataforma con comisión mantiene la ganancia neta después de la comisión", () => {
    const r = channelPrice({
      unitCost: 1000,
      targetProfit: 500,
      channel: { name: "Tienda online", commissionPercent: 14, fixedFee: 1000, shippingCost: 0 },
      taxCondition: "MONOTRIBUTO",
    });
    // (1000 + 500 + 1000) / 0.86
    expect(r.price.toDecimalPlaces(2).toString()).toBe("2906.98");
    expect(r.netProfit.toDecimalPlaces(8).toString()).toBe("500");
  });

  it("Responsable Inscripto: suma IVA y la comisión se calcula sobre el final", () => {
    const r = channelPrice({
      unitCost: 1000,
      targetProfit: 500,
      channel: { name: "Plataforma", commissionPercent: 10 },
      taxCondition: "RESPONSABLE_INSCRIPTO",
      ivaPercent: 21,
    });
    expect(r.netProfit.toDecimalPlaces(8).toString()).toBe("500");
    expect(r.vat.div(r.netOfVat).toDecimalPlaces(8).toString()).toBe("0.21");
    expect(r.commission.div(r.price).toString()).toBe("0.1");
  });

  it("mayorista con descuento y redondeo", () => {
    const r = channelPrice({
      unitCost: 1000,
      targetProfit: 1000,
      channel: { name: "Mayorista", priceAdjustPercent: -20 },
      taxCondition: "MONOTRIBUTO",
      roundTo: 100,
    });
    expect(r.price.toString()).toBe("1600");
    expect(r.netProfit.toString()).toBe("600");
  });

  it("marca pérdida y rechaza comisiones imposibles", () => {
    const loss = channelPrice({
      unitCost: 1000,
      targetProfit: 0,
      channel: { name: "Liquidación", priceAdjustPercent: -50 },
      taxCondition: "MONOTRIBUTO",
    });
    expect(loss.isLoss).toBe(true);
    expect(() =>
      channelPrice({
        unitCost: 1,
        targetProfit: 1,
        channel: { name: "X", commissionPercent: 100 },
        taxCondition: "MONOTRIBUTO",
      }),
    ).toThrow();
  });
});

describe("descuentos por volumen", () => {
  it("aplica el tramo más alto alcanzado", () => {
    const rows = volumeTable(
      1000,
      600,
      [
        { minQuantity: 1, discountPercent: 0 },
        { minQuantity: 10, discountPercent: 5 },
        { minQuantity: 50, discountPercent: 10 },
        { minQuantity: 100, discountPercent: 15 },
      ],
      [1, 10, 25, 100],
    );
    expect(rows.map((r) => r.unitPrice.toString())).toEqual(["1000", "950", "950", "850"]);
    expect(rows[3].total.toString()).toBe("85000");
    expect(rows[3].unitProfit.toString()).toBe("250");
  });
});

describe("punto de equilibrio", () => {
  it("unidades necesarias por mes", () => {
    const r = breakEven({ monthlyFixedCosts: 100000, unitNetRevenue: 1500, unitVariableCost: 1189.49 });
    expect(r?.units).toBe(323); // 100000 / 310,51 = 322,05 → 323
    expect(breakEven({ monthlyFixedCosts: 1, unitNetRevenue: 10, unitVariableCost: 10 })).toBeNull();
  });
});
