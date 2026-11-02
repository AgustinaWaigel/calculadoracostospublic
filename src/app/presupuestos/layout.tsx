import { LockedSection } from "@/components/billing/locked-section";
import { currentAccess } from "@/lib/db";

/** Sección del plan Completo: con el Simple se muestra el aviso para cambiar de plan. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const { tier } = await currentAccess();
  return tier === "SIMPLE" ? <LockedSection title="Presupuestos" /> : children;
}
