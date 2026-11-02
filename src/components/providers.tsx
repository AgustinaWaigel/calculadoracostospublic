"use client";

import { createContext, useContext } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import type { DolarRates } from "@/lib/dolar";
import type { Access } from "@/lib/billing";

const DolarContext = createContext<DolarRates>({});

export function useDolarRates() {
  return useContext(DolarContext);
}

const AccessContext = createContext<Access | null>(null);

/** Plan de quien está usando la app (null sin sesión). */
export function useAccess() {
  return useContext(AccessContext);
}

export function Providers({
  children,
  rates,
  access,
}: {
  children: React.ReactNode;
  rates: DolarRates;
  access: Access | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AccessContext.Provider value={access}>
        <DolarContext.Provider value={rates}>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster richColors position="top-center" />
          </TooltipProvider>
        </DolarContext.Provider>
      </AccessContext.Provider>
    </ThemeProvider>
  );
}
