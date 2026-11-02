"use client";

import { createContext, useContext } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import type { DolarRates } from "@/lib/dolar";
import type { Access } from "@/lib/billing";
import type { Industry } from "@/lib/industries";

const DolarContext = createContext<DolarRates>({});

export function useDolarRates() {
  return useContext(DolarContext);
}

const AccessContext = createContext<Access | null>(null);

/** Plan de quien está usando la app (null sin sesión). */
export function useAccess() {
  return useContext(AccessContext);
}

const IndustryContext = createContext<Industry>("OTRO");
const LaborIsOwnContext = createContext(true);

/** Ajuste de la cuenta: el trabajo lo hace el dueño (ganancia) o se le paga a alguien (costo). */
export function useLaborIsOwn() {
  return useContext(LaborIsOwnContext);
}

/** Rubro de la cuenta (cambia ejemplos y secciones). */
export function useIndustry() {
  return useContext(IndustryContext);
}

export function Providers({
  children,
  rates,
  access,
  industry,
  laborIsOwn,
}: {
  children: React.ReactNode;
  rates: DolarRates;
  access: Access | null;
  industry: Industry;
  laborIsOwn: boolean;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AccessContext.Provider value={access}>
        <IndustryContext.Provider value={industry}>
          <LaborIsOwnContext.Provider value={laborIsOwn}>
            <DolarContext.Provider value={rates}>
              <TooltipProvider delayDuration={200}>
                {children}
                <Toaster richColors position="top-center" />
              </TooltipProvider>
            </DolarContext.Provider>
          </LaborIsOwnContext.Provider>
        </IndustryContext.Provider>
      </AccessContext.Provider>
    </ThemeProvider>
  );
}
