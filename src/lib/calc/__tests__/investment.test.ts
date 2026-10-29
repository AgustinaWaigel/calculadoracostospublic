import { describe, expect, it } from "vitest";
import { investmentSummary, monthsToRecover } from "@/lib/calc/investment";

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("recupero de la inversión", () => {
  it("suma lo invertido y lo recuperado, y calcula lo que falta", () => {
    const s = investmentSummary(
      [
        { kind: "INVESTMENT", amount: 300000, date: day("2026-01-01") },
        { kind: "INVESTMENT", amount: 100000, date: day("2026-02-01") },
        { kind: "RECOVERY", amount: 100000, date: day("2026-03-01") },
      ],
      day("2026-05-01"),
    );
    expect(s.invested.toString()).toBe("400000");
    expect(s.recovered.toString()).toBe("100000");
    expect(s.remaining.toString()).toBe("300000");
    expect(s.progressPercent.toString()).toBe("25");
    expect(s.startedAt).toEqual(day("2026-01-01"));
  });

  it("proyecta con el ritmo promedio desde la primera inversión", () => {
    // 4 meses y 100.000 recuperados → ~25.000/mes → faltan 12 meses para 300.000.
    const s = investmentSummary(
      [
        { kind: "INVESTMENT", amount: 400000, date: day("2026-01-01") },
        { kind: "RECOVERY", amount: 100000, date: day("2026-04-01") },
      ],
      day("2026-05-01"),
    );
    expect(s.monthlyPace?.round().toString()).toBe("25367");
    expect(s.monthsLeft).toBe(12);
    expect(s.recoveryDate).not.toBeNull();
  });

  it("sin recuperos no hay ritmo; el primer mes cuenta como uno entero", () => {
    expect(investmentSummary([{ kind: "INVESTMENT", amount: 1000, date: day("2026-05-01") }]).monthsLeft).toBeNull();
    const s = investmentSummary(
      [
        { kind: "INVESTMENT", amount: 1000, date: day("2026-05-01") },
        { kind: "RECOVERY", amount: 500, date: day("2026-05-05") },
      ],
      day("2026-05-10"),
    );
    expect(s.monthlyPace?.toString()).toBe("500");
    expect(s.monthsLeft).toBe(1);
  });

  it("si ya recuperaste todo, no falta nada y muestra la ganancia extra", () => {
    const s = investmentSummary([
      { kind: "INVESTMENT", amount: 1000, date: day("2026-01-01") },
      { kind: "RECOVERY", amount: 1500, date: day("2026-02-01") },
    ]);
    expect(s.remaining.toString()).toBe("0");
    expect(s.progressPercent.toString()).toBe("100");
    expect(s.surplus.toString()).toBe("500");
    expect(s.monthsLeft).toBe(0);
    expect(s.recoveryDate).toBeNull();
  });

  it("meses para recuperar con un monto por mes", () => {
    expect(monthsToRecover(300000, 40000)).toBe(8);
    expect(monthsToRecover(0, 40000)).toBe(0);
    expect(monthsToRecover(1000, 0)).toBeNull();
  });
});
