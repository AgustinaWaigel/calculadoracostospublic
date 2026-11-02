import { describe, expect, it } from "vitest";
import { accessFor, canWrite, planFromAmount, sectionLocked, statusFromMp, type BillingFields } from "@/lib/billing";

const now = new Date("2026-11-02T12:00:00Z");
const day = (n: number) => new Date(now.getTime() + n * 86_400_000);
const base: BillingFields = { plan: "NONE", subscriptionStatus: "NONE", trialEndsAt: null, currentPeriodEnd: null };

describe("acceso según el plan", () => {
  it("fundadora: Completo gratis para siempre", () => {
    expect(accessFor({ ...base, plan: "FOUNDER" }, now)).toMatchObject({ kind: "founder", tier: "COMPLETE" });
  });
  it("prueba: Completo hasta que termina, después solo lectura", () => {
    expect(accessFor({ ...base, trialEndsAt: day(3) }, now)).toMatchObject({ kind: "trial", tier: "COMPLETE", daysLeft: 3 });
    expect(accessFor({ ...base, trialEndsAt: day(-1) }, now)).toMatchObject({ kind: "expired", tier: "NONE" });
  });
  it("suscripción activa: el plan que paga", () => {
    expect(accessFor({ ...base, plan: "SIMPLE", subscriptionStatus: "AUTHORIZED" }, now)).toMatchObject({ kind: "active", tier: "SIMPLE" });
    expect(accessFor({ ...base, plan: "COMPLETE", subscriptionStatus: "AUTHORIZED" }, now)).toMatchObject({ tier: "COMPLETE" });
  });
  it("cancelada: conserva lo pagado hasta que vence", () => {
    const cancelled = { ...base, plan: "SIMPLE" as const, subscriptionStatus: "CANCELLED" as const };
    expect(accessFor({ ...cancelled, currentPeriodEnd: day(10) }, now)).toMatchObject({ kind: "active", tier: "SIMPLE", ending: true, daysLeft: 10 });
    expect(accessFor({ ...cancelled, currentPeriodEnd: day(-1) }, now)).toMatchObject({ kind: "expired", tier: "NONE" });
  });
  it("pago pendiente no da acceso (salvo que siga en prueba)", () => {
    expect(accessFor({ ...base, plan: "COMPLETE", subscriptionStatus: "PENDING" }, now).tier).toBe("NONE");
    expect(accessFor({ ...base, plan: "SIMPLE", subscriptionStatus: "PENDING", trialEndsAt: day(2) }, now).tier).toBe("COMPLETE");
  });
});

describe("qué puede hacer cada plan", () => {
  it("Simple: costos y productos, no presupuestos, ventas ni inversiones", () => {
    expect(canWrite("SIMPLE", "Supply")).toBe(true);
    expect(canWrite("SIMPLE", "Product")).toBe(true);
    for (const m of ["Quote", "QuoteItem", "Sale", "SaleItem", "InvestmentMovement"]) expect(canWrite("SIMPLE", m)).toBe(false);
    expect(sectionLocked("SIMPLE", "/presupuestos/nuevo")).toBe(true);
    expect(sectionLocked("SIMPLE", "/productos")).toBe(false);
  });
  it("sin plan: solo mirar (no se bloquea ninguna sección)", () => {
    expect(canWrite("NONE", "Supply")).toBe(false);
    expect(sectionLocked("NONE", "/ventas")).toBe(false);
  });
});

describe("Mercado Pago", () => {
  it("el monto define el plan y los estados se traducen", () => {
    expect(planFromAmount(15000)).toBe("SIMPLE");
    expect(planFromAmount(20000)).toBe("COMPLETE");
    expect(planFromAmount(999)).toBeNull();
    expect(statusFromMp("authorized")).toBe("AUTHORIZED");
    expect(statusFromMp("cancelled")).toBe("CANCELLED");
  });
});
