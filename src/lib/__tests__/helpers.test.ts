import { describe, expect, it } from "vitest";
import { formatMoney, parseMoneyInput, arsToUsd } from "@/lib/money";
import { normalizeArPhone, whatsappUrl } from "@/lib/whatsapp";

describe("money", () => {
  it("formatea en es-AR", () => {
    expect(formatMoney("1189.49")).toMatch(/^\$\s?1\.189,49$/);
    expect(formatMoney("28949", "ARS", 0)).toMatch(/28\.949$/);
    expect(formatMoney("1.5", "USD")).toMatch(/1,50/);
  });
  it("interpreta lo que tipea el usuario", () => {
    expect(parseMoneyInput("28.949")?.toString()).toBe("28949");
    expect(parseMoneyInput("289,49")?.toString()).toBe("289.49");
    expect(parseMoneyInput("$ 1.189,49")?.toString()).toBe("1189.49");
    expect(parseMoneyInput("12.5")?.toString()).toBe("12.5");
    expect(parseMoneyInput("1.000.000")?.toString()).toBe("1000000");
    expect(parseMoneyInput("abc")).toBeNull();
  });
  it("convierte a USD", () => {
    expect(arsToUsd(150000, 1500).toString()).toBe("100");
    expect(arsToUsd(1, 0).toString()).toBe("0");
  });
});

describe("whatsapp", () => {
  it("normaliza celulares argentinos", () => {
    expect(normalizeArPhone("011 15-1234-5678")).toBe("5491112345678");
    expect(normalizeArPhone("+54 9 351 555-1234")).toBe("5493515551234");
    expect(normalizeArPhone("11 1234 5678")).toBe("5491112345678");
    expect(normalizeArPhone("123")).toBeNull();
  });
  it("arma el link wa.me", () => {
    expect(whatsappUrl("Hola $", "1112345678")).toBe("https://wa.me/5491112345678?text=Hola%20%24");
  });
});
