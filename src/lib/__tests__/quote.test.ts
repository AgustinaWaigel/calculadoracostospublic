import { describe, expect, it } from "vitest";
import { quoteBreakdown, quoteMaterials, quoteTotals, volumePrice } from "@/lib/calc/quote";
import { buildQuoteMessage } from "@/lib/quote-text";

describe("presupuestos", () => {
  const items = [
    { description: "Foto plastificada A4", quantity: "10", unitPrice: "1890" },
    { description: "Tarjetas x 100", quantity: "2", unitPrice: "12500.5" },
  ];

  it("totales con descuento", () => {
    const t = quoteTotals(items, 10);
    expect(t.subtotal.toString()).toBe("43901");
    expect(t.discount.toString()).toBe("4390.1");
    expect(t.total.toString()).toBe("39510.9");
  });

  it("mensaje de WhatsApp", () => {
    const msg = buildQuoteMessage(
      {
        number: 7,
        clientName: "Lucía Pérez",
        validUntil: new Date("2026-10-27T00:00:00Z"),
        discountPercent: 10,
        notes: "Seña del 50%.",
        items,
      },
      "Mi Emprendimiento",
    );
    expect(msg).toContain("¡Hola, Lucía!");
    expect(msg).toContain("*Presupuesto #0007*");
    expect(msg).toContain("• 10 × Foto plastificada A4");
    expect(msg).toMatch(/\$\s?1\.890,00 c\/u → \$\s?18\.900,00/);
    expect(msg).toMatch(/\*Total: \$\s?39\.510,90\*/);
    expect(msg).toContain("martes, 27 de octubre");
    expect(msg).toContain("Seña del 50%.");
  });

  const tiers = [
    { minQuantity: 1, discountPercent: "0" },
    { minQuantity: 10, discountPercent: "5" },
    { minQuantity: 100, discountPercent: "15" },
    { minQuantity: 200, discountPercent: "20" },
  ];

  it("precio por cantidad: tramo aplicado y el siguiente", () => {
    const pocas = volumePrice("1000", 5, tiers);
    expect(pocas.discountPercent.toString()).toBe("0");
    expect(pocas.tierMin).toBeNull();
    expect(pocas.next).toEqual({ minQuantity: 10, discountPercent: expect.anything() });

    const cien = volumePrice("329.41", 100, tiers);
    expect(cien.discountPercent.toString()).toBe("15");
    expect(cien.tierMin).toBe(100);
    expect(cien.unitPrice.toString()).toBe("280"); // 329,41 × 0,85 = 279,9985 → 280,00
    expect(cien.next?.minQuantity).toBe(200);

    expect(volumePrice("100", 500, tiers).next).toBeNull();
  });

  it("desglose: lista, descuento por cantidad y descuento extra", () => {
    const b = quoteBreakdown(
      [
        { quantity: "100", unitPrice: "280", listPrice: "329.41" }, // con descuento por cantidad
        { quantity: "1", unitPrice: "6000" }, // precio a mano
      ],
      10,
    );
    expect(b.subtotal.toString()).toBe("34000");
    expect(b.volumeDiscount.toString()).toBe("4941");
    expect(b.atList.toString()).toBe("38941");
    expect(b.discount.toString()).toBe("3400");
    expect(b.total.toString()).toBe("30600");
  });

  it("materiales del pedido, sumando insumos repetidos", () => {
    const hoja = { id: "hoja", name: "Hoja A4", usageUnit: "hoja", purchaseUnit: "resma", packQuantity: "100", packPrice: "5000" };
    const film = { id: "film", name: "Film", usageUnit: "hoja", purchaseUnit: "caja", packQuantity: "50", packPrice: "10000" };
    const m = quoteMaterials([
      { quantity: "10", batchYield: "4", supplies: [{ ...hoja, quantity: "1" }] },
      { quantity: "3", batchYield: "1", supplies: [{ ...hoja, quantity: "1" }, { ...film, quantity: "2" }] },
    ]);
    expect(m.map((x) => x.name)).toEqual(["Film", "Hoja A4"]);
    const [f, h] = m;
    expect(h.needed.toString()).toBe("5.5");
    expect(h.packs).toBe(1);
    expect(h.cost.toString()).toBe("275");
    expect(f.needed.toString()).toBe("6");
    expect(f.cost.toString()).toBe("1200");
  });

  it("materiales con merma", () => {
    const hoja = { id: "hoja", name: "Hoja A4", usageUnit: "hoja", purchaseUnit: "resma", packQuantity: "100", packPrice: "5000" };
    const [h] = quoteMaterials([{ quantity: "8", batchYield: "4", wastePercent: "10", supplies: [{ ...hoja, quantity: "1" }] }]);
    expect(h.needed.toString()).toBe("2.2");
    expect(h.cost.toString()).toBe("110");
  });
});
