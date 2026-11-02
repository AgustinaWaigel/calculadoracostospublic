import "server-only";
import type { UserDb } from "@/lib/db";
import { TRIAL_DAYS } from "@/lib/billing";

/**
 * Primera vez que entra una cuenta: crea su emprendimiento con lo básico para que los precios
 * salgan de una (canales de venta y descuentos por cantidad) y su prueba gratis del plan Completo. Si dos pedidos llegan juntos,
 * solo uno lo arma.
 */
export async function setUpAccount(db: UserDb) {
  const userId = db.$userId;
  await db.$transaction(async (tx) => {
    const { count } = await tx.business.createMany({
      data: [{ id: userId, name: "Mi Emprendimiento", trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000) }],
      skipDuplicates: true,
    });
    if (count === 0) return;
    await tx.salesChannel.createMany({
      data: [
        { userId, name: "Venta directa", type: "DIRECT", sortOrder: 0 },
        { userId, name: "Mayorista", type: "WHOLESALE", priceAdjustPercent: -20, sortOrder: 1 },
      ],
    });
    await tx.volumeTier.createMany({
      data: [
        { userId, minQuantity: 1, discountPercent: 0 },
        { userId, minQuantity: 10, discountPercent: 5 },
        { userId, minQuantity: 50, discountPercent: 10 },
      ],
    });
  });
  return db.business.findUniqueOrThrow({ where: { id: userId } });
}
