import { describe, expect, it } from "vitest";
import { groupLines, lastMonths, percentChange, saleProfit, salesByMonth, salesTotals } from "@/lib/calc/sales";

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("ganancia de una venta", () => {
  const direct = { name: "Directo" };

  it("precio × cantidad menos el costo, con el descuento extra", () => {
    const r = saleProfit({
      items: [{ quantity: 10, unitPrice: 1000, unitCost: 600 }],
      discountPercent: 10,
      vatRate: 0,
      channel: direct,
    });
    // 10.000 − 10% = 9.000 cobrado, − 6.000 de costo.
    expect(r.total.toString()).toBe("9000");
    expect(r.profit.toString()).toBe("3000");
    expect(r.skippedItems).toBe(0);
  });

  it("descuenta IVA y comisiones; el envío va una sola vez", () => {
    const r = saleProfit({
      items: [{ quantity: 2, unitPrice: 1210, unitCost: 500 }],
      discountPercent: 0,
      vatRate: 0.21,
      channel: { name: "MP", paymentFeePercent: 5, shippingCost: 100 },
    });
    // 2.420 → 2.000 sin IVA − 121 de pasarela − 1.000 de costo − 100 de envío.
    expect(r.profit.toString()).toBe("779");
  });

  it("los ítems libres suman a lo vendido pero no a la ganancia", () => {
    const r = saleProfit({
      items: [
        { quantity: 1, unitPrice: 1000, unitCost: 400 },
        { quantity: 1, unitPrice: 5000, unitCost: null },
      ],
      discountPercent: 0,
      vatRate: 0,
      channel: null,
    });
    expect(r.total.toString()).toBe("6000");
    expect(r.profit.toString()).toBe("600");
    expect(r.countedRevenue.toString()).toBe("1000");
    expect(r.lines[1].profit).toBeNull();
    expect(r.skippedItems).toBe(1);
  });
});

describe("totales de ventas", () => {
  it("cantidad, total, ganancia, margen y ticket promedio", () => {
    const t = salesTotals([
      { total: 1000, profit: 300, countedRevenue: 1000 },
      { total: 3000, profit: 500, countedRevenue: 1000 },
    ]);
    expect(t.count).toBe(2);
    expect(t.total.toString()).toBe("4000");
    expect(t.profit.toString()).toBe("800");
    expect(t.margin?.toString()).toBe("40");
    expect(t.average?.toString()).toBe("2000");
    expect(salesTotals([]).average).toBeNull();
  });

  it("variación contra el mes anterior", () => {
    expect(percentChange(150, 100)?.toString()).toBe("50");
    expect(percentChange(50, 100)?.toString()).toBe("-50");
    expect(percentChange(50, 0)).toBeNull();
  });

  it("agrupa por mes, incluyendo los meses sin ventas", () => {
    const months = lastMonths("2026-02", 3);
    expect(months).toEqual(["2025-12", "2026-01", "2026-02"]);
    const rows = salesByMonth(
      [
        { date: day("2026-02-10"), total: 100, profit: 40, countedRevenue: 100 },
        { date: day("2026-02-20"), total: 50, profit: 10, countedRevenue: 50 },
        { date: day("2025-12-01"), total: 70, profit: 20, countedRevenue: 70 },
      ],
      months,
    );
    expect(rows.map((r) => r.total.toString())).toEqual(["70", "0", "150"]);
    expect(rows[2].count).toBe(2);
  });

  it("agrupa ítems por producto", () => {
    const rows = groupLines([
      { key: "a", label: "Taza", quantity: 2, revenue: 200, profit: 80 },
      { key: "b", label: "Libre", quantity: 1, revenue: 900, profit: null },
      { key: "a", label: "Taza", quantity: 3, revenue: 300, profit: 120 },
    ]);
    expect(rows[0]).toMatchObject({ key: "b", profit: null });
    expect(rows[1].quantity.toString()).toBe("5");
    expect(rows[1].profit?.toString()).toBe("200");
  });
});
