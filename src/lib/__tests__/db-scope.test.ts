import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/server", () => ({ requireUserId: async () => "sin-uso" }));

/**
 * Separación entre cuentas contra una base real (Postgres con las migraciones aplicadas):
 *   TEST_DATABASE_URL=postgresql://… npm test
 * Sin esa variable se saltea. Usa cuentas de prueba propias y las borra al terminar.
 */
const url = process.env.TEST_DATABASE_URL;
const A = "test-cuenta-a";
const B = "test-cuenta-b";

describe.skipIf(!url)("cada cuenta ve solo lo suyo", () => {
  let mod: typeof import("@/lib/db");
  let a: ReturnType<typeof mod.scopedDb>;
  let b: ReturnType<typeof mod.scopedDb>;

  async function wipe() {
    const raw = mod.rawDb;
    const where = { userId: { in: [A, B] } };
    await raw.quote.deleteMany({ where });
    await raw.product.deleteMany({ where });
    await raw.supply.deleteMany({ where });
    await raw.salesChannel.deleteMany({ where });
    await raw.volumeTier.deleteMany({ where });
    await raw.investmentMovement.deleteMany({ where });
    await raw.business.deleteMany({ where: { id: { in: [A, B] } } });
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    mod = await import("@/lib/db");
    const { setUpAccount } = await import("@/server/onboarding");
    a = mod.scopedDb(A);
    b = mod.scopedDb(B);
    await wipe();
    // Dos pedidos a la vez: el emprendimiento y los canales se crean una sola vez.
    await Promise.all([setUpAccount(a), setUpAccount(a), setUpAccount(b)]);
  });

  afterAll(async () => {
    if (!mod) return;
    await wipe();
    await mod.rawDb.$disconnect();
  });

  const supplyData = (userId: string, name = "Papel") => ({
    userId,
    name,
    purchaseUnit: "resma",
    packQuantity: 500,
    packPrice: 9000,
    priceHistory: { create: { packPrice: 9000, packQuantity: 500 } },
  });

  it("arma la cuenta nueva una sola vez", async () => {
    expect(await a.salesChannel.count()).toBe(2);
    expect(await b.salesChannel.count()).toBe(2);
  });

  it("no deja leer, cambiar ni borrar filas de otra cuenta", async () => {
    const s = await a.supply.create({ data: supplyData(A) });
    expect(await b.supply.findUnique({ where: { id: s.id } })).toBeNull();
    expect(await b.supply.count()).toBe(0);
    expect(await b.supplyPriceHistory.count()).toBe(0);
    await expect(b.supply.update({ where: { id: s.id }, data: { name: "x" } })).rejects.toThrow();
    await expect(b.supply.delete({ where: { id: s.id } })).rejects.toThrow();
    expect((await b.supply.deleteMany({ where: { id: s.id } })).count).toBe(0);
    expect((await a.supply.findUnique({ where: { id: s.id } }))?.name).toBe("Papel");
  });

  it("pisa el userId que mande el código", async () => {
    const s = await b.supply.create({ data: supplyData(A, "Tinta") });
    expect(s.userId).toBe(B);
    const moved = await b.supply.update({ where: { id: s.id }, data: { userId: A } as never });
    expect(moved.userId).toBe(B);
  });

  it("no deja usar insumos ni productos de otra cuenta", async () => {
    const ajeno = await a.supply.create({ data: supplyData(A, "Pouch") });
    await expect(
      b.product.create({ data: { userId: B, name: "x", supplies: { create: [{ supplyId: ajeno.id, quantity: 1 }] } } }),
    ).rejects.toThrow(mod.ForbiddenRefError);

    const productoAjeno = await a.product.create({ data: { userId: A, name: "Foto" } });
    await expect(
      b.quote.create({
        data: {
          userId: B,
          number: 99,
          clientName: "C",
          validUntil: new Date(),
          items: { create: [{ description: "x", quantity: 1, unitPrice: 1, productId: productoAjeno.id }] },
        },
      }),
    ).rejects.toThrow(mod.ForbiddenRefError);
  });

  it("funciona en transacciones (en lote e interactivas)", async () => {
    const s = await b.supply.create({ data: supplyData(B, "Cartulina") });
    const p = await b.product.create({ data: { userId: B, name: "Tarjeta", supplies: { create: [{ supplyId: s.id, quantity: 1 }] } } });
    await b.$transaction([
      b.productSupply.deleteMany({ where: { productId: p.id } }),
      b.product.update({ where: { id: p.id }, data: { supplies: { create: [{ supplyId: s.id, quantity: 3 }] } } }),
    ]);
    const saved = await b.product.findUniqueOrThrow({ where: { id: p.id }, include: { supplies: true } });
    expect(saved.supplies.map((x) => x.quantity.toString())).toEqual(["3"]);

    // La numeración de presupuestos es por cuenta.
    const number = await b.$transaction(async (tx) => {
      const last = await tx.quote.aggregate({ _max: { number: true } });
      const q = await tx.quote.create({
        data: { userId: B, number: (last._max.number ?? 0) + 1, clientName: "C", validUntil: new Date() },
      });
      return q.number;
    });
    expect(number).toBe(1);
    expect(await a.quote.count()).toBe(0);
  });

  it("las inversiones son de cada cuenta", async () => {
    const m = await a.investmentMovement.create({
      data: { userId: A, kind: "INVESTMENT", description: "Plastificadora", amount: 120000, date: new Date() },
    });
    expect(await b.investmentMovement.count()).toBe(0);
    await expect(b.investmentMovement.delete({ where: { id: m.id } })).rejects.toThrow();
    expect(await a.investmentMovement.count()).toBe(1);
  });

  it("cada cuenta tiene su propio emprendimiento", async () => {
    expect((await b.business.findUnique({ where: { id: A } }))?.id).toBe(B);
  });
});
