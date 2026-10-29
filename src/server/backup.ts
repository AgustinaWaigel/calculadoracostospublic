import "server-only";
import { userDb } from "@/lib/db";
import { plain } from "@/lib/plain";

export const BACKUP_VERSION = 1;

/** Todas las tablas de la cuenta. */
export async function exportAll() {
  const db = await userDb();
  const [
    business,
    supplies,
    supplyPriceHistory,
    laborProfiles,
    marketRates,
    fixedCosts,
    machines,
    products,
    productSupplies,
    productLabor,
    productMachines,
    salesChannels,
    volumeTiers,
    quotes,
    quoteItems,
    printInks,
    investmentMovements,
    sales,
    saleItems,
  ] = await Promise.all([
    db.business.findMany(),
    db.supply.findMany(),
    db.supplyPriceHistory.findMany(),
    db.laborProfile.findMany(),
    db.marketRate.findMany(),
    db.fixedCost.findMany(),
    db.machine.findMany(),
    db.product.findMany(),
    db.productSupply.findMany(),
    db.productLabor.findMany(),
    db.productMachine.findMany(),
    db.salesChannel.findMany(),
    db.volumeTier.findMany(),
    db.quote.findMany(),
    db.quoteItem.findMany(),
    db.printInk.findMany(),
    db.investmentMovement.findMany(),
    db.sale.findMany(),
    db.saleItem.findMany(),
  ]);
  return plain({
    app: "calculadora-costos",
    version: BACKUP_VERSION,
    exportedAt: new Date(),
    data: {
      business,
      supplies,
      supplyPriceHistory,
      laborProfiles,
      marketRates,
      fixedCosts,
      machines,
      products,
      productSupplies,
      productLabor,
      productMachines,
      salesChannels,
      volumeTiers,
      quotes,
      quoteItems,
      printInks,
      investmentMovements,
      sales,
      saleItems,
    },
  });
}

export type Backup = Awaited<ReturnType<typeof exportAll>>;
