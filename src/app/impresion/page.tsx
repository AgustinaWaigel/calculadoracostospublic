import { PageHeader } from "@/components/shared/ui-bits";
import { PrintCalculator } from "@/components/print/print-calculator";
import { userDb } from "@/lib/db";
import { supplyUnitCost } from "@/lib/calc/supply";
import type { InkChannel } from "@/lib/calc/print";

export const metadata = { title: "Calculadora de impresión" };

export default async function ImpresionPage() {
  const db = await userDb();
  const [inks, supplies] = await Promise.all([
    db.printInk.findMany({ orderBy: { sortOrder: "asc" } }),
    db.supply.findMany({ where: { kind: "MATERIAL" }, orderBy: { name: "asc" } }),
  ]);
  // Primero los que parecen papel (se usan por hoja o se llaman "papel").
  const papers = supplies
    .map((s) => ({ id: s.id, name: s.name, unitCost: supplyUnitCost(s).toString(), usageUnit: s.usageUnit }))
    .sort((a, b) => Number(isPaper(b)) - Number(isPaper(a)));

  return (
    <>
      <PageHeader
        title="Calculadora de impresión"
      />
      <PrintCalculator
        papers={papers}
        savedInks={inks.map((i) => ({
          name: i.name,
          channel: i.channel as InkChannel,
          color: i.color,
          bottlePrice: i.bottlePrice.toString(),
          yieldPages: i.yieldPages,
        }))}
      />
    </>
  );
}

function isPaper(s: { name: string; usageUnit: string }) {
  return /hoja/i.test(s.usageUnit) || /papel|cartulina|opalina|ilustraci/i.test(s.name);
}
