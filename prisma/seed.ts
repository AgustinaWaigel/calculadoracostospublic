import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/**
 * Datos de ejemplo para UNA cuenta (la tuya, para probar): `SEED_USER_ID=<id de auth.users> npm run db:seed`.
 * El id está en Supabase → Authentication → Users. Borra antes los datos de esa cuenta.
 */
async function main() {
  const userId = process.env.SEED_USER_ID;
  if (!userId) {
    console.log("Sin SEED_USER_ID: no se cargan datos de ejemplo (cada cuenta arranca vacía).");
    return;
  }
  const mine = { userId };

  // Arrancamos de cero para que el seed sea reproducible (las hijas se borran en cascada).
  await prisma.$transaction([
    prisma.quote.deleteMany({ where: mine }),
    prisma.product.deleteMany({ where: mine }),
    prisma.supply.deleteMany({ where: mine }),
    prisma.laborProfile.deleteMany({ where: mine }),
    prisma.marketRate.deleteMany({ where: mine }),
    prisma.fixedCost.deleteMany({ where: mine }),
    prisma.machine.deleteMany({ where: mine }),
    prisma.salesChannel.deleteMany({ where: mine }),
    prisma.volumeTier.deleteMany({ where: mine }),
    prisma.printInk.deleteMany({ where: mine }),
    prisma.business.deleteMany({ where: { id: userId } }),
  ]);

  await prisma.business.create({
    data: {
      id: userId,
      name: "Mi Emprendimiento",
      phone: "11 1234-5678",
      email: "hola@miemprendimiento.com.ar",
      instagram: "@miemprendimiento",
      taxCondition: "MONOTRIBUTO",
      monthlyUnitsEstimate: 200,
      defaultMarginPercent: 40,
      pricingMode: "MARGIN",
      roundTo: 10,
    },
  });

  const pouch = await prisma.supply.create({
    data: {
      userId,
      name: "Pouch plastificado A4",
      kind: "MATERIAL",
      category: "Plastificado",
      purchaseUnit: "paquete",
      usageUnit: "pouch",
      packQuantity: 100,
      packPrice: 28949,
      supplier: "Librería mayorista",
      priceUpdatedAt: daysAgo(3),
      priceHistory: {
        create: [
          { packPrice: 23500, packQuantity: 100, recordedAt: daysAgo(120) },
          { packPrice: 25900, packQuantity: 100, recordedAt: daysAgo(75) },
          { packPrice: 27400, packQuantity: 100, recordedAt: daysAgo(35) },
          { packPrice: 28949, packQuantity: 100, recordedAt: daysAgo(3) },
        ],
      },
    },
  });

  const papel = await prisma.supply.create({
    data: {
      userId,
      name: "Papel fotográfico A4",
      kind: "MATERIAL",
      category: "Papel",
      purchaseUnit: "hoja",
      usageUnit: "hoja",
      packQuantity: 1,
      packPrice: 300,
      priceUpdatedAt: daysAgo(45), // dispara la alerta de "+30 días sin actualizar"
      priceHistory: {
        create: [
          { packPrice: 250, packQuantity: 1, recordedAt: daysAgo(100) },
          { packPrice: 300, packQuantity: 1, recordedAt: daysAgo(45) },
        ],
      },
    },
  });

  const impresion = await prisma.supply.create({
    data: {
      userId,
      name: "Impresión A4 color",
      kind: "SERVICE",
      category: "Servicios",
      purchaseUnit: "unidad",
      usageUnit: "impresión",
      packQuantity: 1,
      packPrice: 600,
      supplier: "Copiadora del barrio",
      priceUpdatedAt: daysAgo(10),
      priceHistory: { create: [{ packPrice: 600, packQuantity: 1, recordedAt: daysAgo(10) }] },
    },
  });

  await prisma.laborProfile.createMany({
    data: [
      { userId, name: "Diseño", hourlyRate: 8000, color: "#6366f1" },
      { userId, name: "Producción", hourlyRate: 6000, color: "#f59e0b" },
      { userId, name: "Armado", hourlyRate: 5000, color: "#10b981" },
    ],
  });

  await prisma.fixedCost.createMany({
    data: [
      { userId, name: "Alquiler del taller", category: "ALQUILER", monthlyAmount: 180000 },
      { userId, name: "Luz", category: "SERVICIOS", monthlyAmount: 25000 },
      { userId, name: "Internet", category: "INTERNET", monthlyAmount: 18000 },
      { userId, name: "Monotributo", category: "IMPUESTOS", monthlyAmount: 40000 },
      { userId, name: "Canva Pro", category: "SUSCRIPCIONES", monthlyAmount: 9000 },
    ],
  });

  await prisma.machine.create({
    data: { userId, name: "Plastificadora A4", price: 120000, usefulLife: 20000, lifeUnit: "UNITS" },
  });

  await prisma.salesChannel.createMany({
    data: [
      { userId, name: "Venta directa", type: "DIRECT", sortOrder: 0 },
      { userId, name: "Tienda online", type: "OTHER", commissionPercent: 10, sortOrder: 1 },
      { userId, name: "Mayorista", type: "WHOLESALE", priceAdjustPercent: -20, sortOrder: 2 },
    ],
  });

  await prisma.volumeTier.createMany({
    data: [
      { userId, minQuantity: 1, discountPercent: 0 },
      { userId, minQuantity: 10, discountPercent: 5 },
      { userId, minQuantity: 50, discountPercent: 10 },
      { userId, minQuantity: 100, discountPercent: 15 },
    ],
  });

  // Sistema continuo CMYK (precios de ejemplo: cargá los tuyos).
  await prisma.printInk.createMany({
    data: [
      { userId, name: "Negro", channel: "K", color: "#1f2937", bottlePrice: 12000, yieldPages: 7500, sortOrder: 0 },
      { userId, name: "Cian", channel: "C", color: "#06b6d4", bottlePrice: 12000, yieldPages: 6000, sortOrder: 1 },
      { userId, name: "Magenta", channel: "M", color: "#d946ef", bottlePrice: 12000, yieldPages: 6000, sortOrder: 2 },
      { userId, name: "Amarillo", channel: "Y", color: "#facc15", bottlePrice: 12000, yieldPages: 6000, sortOrder: 3 },
    ],
  });

  // Costo esperado: 289,49 + 300 + 600 = $1.189,49 (sin fijos ni mano de obra).
  await prisma.product.create({
    data: {
      userId,
      name: "Foto plastificada A4",
      description: "Foto impresa en papel fotográfico y plastificada. Ejemplo sin mano de obra ni fijos.",
      category: "Plastificados",
      includeFixedCosts: false,
      supplies: {
        create: [
          { supplyId: pouch.id, quantity: 1 },
          { supplyId: papel.id, quantity: 1 },
          { supplyId: impresion.id, quantity: 1 },
        ],
      },
    },
  });

  console.log("✔ Datos de ejemplo cargados");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
