import { describe, expect, it } from "vitest";
import { accessFor, canWrite, sectionLocked, statusFromMp, type BillingFields } from "@/lib/billing";

const now = new Date("2026-11-02T12:00:00Z");
const day = (n: number) => new Date(now.getTime() + n * 86_400_000);
const base: BillingFields = { plan: "NONE", subscriptionStatus: "NONE", trialEndsAt: null, currentPeriodEnd: null };

describe("acceso según el plan", () => {
  it("fundadora: Completo gratis para siempre", () => {
    expect(accessFor({ ...base, plan: "FOUNDER" }, now)).toMatchObject({ kind: "founder", tier: "COMPLETE" });
  });
  it("prueba: todo hasta que termina, después el plan gratis", () => {
    expect(accessFor({ ...base, trialEndsAt: day(3) }, now)).toMatchObject({ kind: "trial", tier: "COMPLETE", daysLeft: 3 });
    expect(accessFor({ ...base, trialEndsAt: day(-1) }, now)).toMatchObject({ kind: "free", tier: "FREE" });
  });
  it("suscripción activa: todo (también las del plan Simple que existió antes)", () => {
    expect(accessFor({ ...base, plan: "COMPLETE", subscriptionStatus: "AUTHORIZED" }, now)).toMatchObject({ kind: "active", tier: "COMPLETE" });
    expect(accessFor({ ...base, plan: "SIMPLE", subscriptionStatus: "AUTHORIZED" }, now)).toMatchObject({ tier: "COMPLETE" });
  });
  it("cancelada: conserva lo pagado hasta que vence", () => {
    const cancelled = { ...base, plan: "SIMPLE" as const, subscriptionStatus: "CANCELLED" as const };
    expect(accessFor({ ...cancelled, currentPeriodEnd: day(10) }, now)).toMatchObject({ kind: "active", tier: "COMPLETE", ending: true, daysLeft: 10 });
    expect(accessFor({ ...cancelled, currentPeriodEnd: day(-1) }, now)).toMatchObject({ kind: "free", tier: "FREE" });
  });
  it("pago pendiente no da acceso (salvo que siga en prueba)", () => {
    expect(accessFor({ ...base, plan: "COMPLETE", subscriptionStatus: "PENDING" }, now).tier).toBe("FREE");
    expect(accessFor({ ...base, plan: "SIMPLE", subscriptionStatus: "PENDING", trialEndsAt: day(2) }, now).tier).toBe("COMPLETE");
  });
});

describe("plan gratis", () => {
  it("solo insumos y productos (y Ajustes)", () => {
    for (const m of ["Supply", "SupplyPriceHistory", "Product", "ProductSupply", "Business"]) expect(canWrite("FREE", m)).toBe(true);
    for (const m of ["LaborProfile", "FixedCost", "Machine", "Quote", "Sale", "InvestmentMovement", "PrintInk"]) expect(canWrite("FREE", m)).toBe(false);
    expect(sectionLocked("FREE", "/costos-fijos")).toBe(true);
    expect(sectionLocked("FREE", "/presupuestos/nuevo")).toBe(true);
    expect(sectionLocked("FREE", "/productos/nuevo")).toBe(false);
    expect(sectionLocked("COMPLETE", "/ventas")).toBe(false);
  });
});

describe("Mercado Pago", () => {
  it("traduce los estados de la suscripción", () => {
    expect(statusFromMp("authorized")).toBe("AUTHORIZED");
    expect(statusFromMp("cancelled")).toBe("CANCELLED");
    expect(statusFromMp("raro")).toBe("NONE");
  });
});

describe("rubros", async () => {
  const { INDUSTRIES, industries, isIndustry } = await import("@/lib/industries");
  it("solo papelería (y otro) ven la impresión", () => {
    expect(industries.filter((i) => INDUSTRIES[i].print)).toEqual(["PAPELERIA", "OTRO"]);
    expect(isIndustry("GASTRONOMIA")).toBe(true);
    expect(isIndustry("MECANICA")).toBe(false);
  });
});
