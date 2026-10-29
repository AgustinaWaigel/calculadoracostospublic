import type { Metadata, Viewport } from "next";
import { Karla, Londrina_Solid } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { getDolarRates } from "@/lib/dolar";
import { getBusiness } from "@/server/costing";
import { sessionUser } from "@/lib/auth/server";

// Todo sale de la base de datos: nada se prerenderiza en el build.
export const dynamic = "force-dynamic";

// Las letras de la marca: Karla para la interfaz, Londrina Solid para títulos.
const karla = Karla({ variable: "--font-karla", subsets: ["latin"] });
const londrina = Londrina_Solid({ variable: "--font-londrina", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Calculadora de Costos", template: "%s · Calculadora de Costos" },
  description: "Calculá costos de producción y precios de venta para tu emprendimiento.",
  applicationName: "Calculadora de Costos",
  appleWebApp: { capable: true, title: "Costos", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b5e41" },
    { media: "(prefers-color-scheme: dark)", color: "#071a14" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Sin sesión (ingresar, registrarse) no hay emprendimiento que mostrar.
  const [rates, user] = await Promise.all([getDolarRates(), sessionUser()]);
  const business = user ? await getBusiness() : null;
  return (
    <html lang="es-AR" suppressHydrationWarning className={`${karla.variable} ${londrina.variable}`}>
      <body className="antialiased">
        <Providers rates={rates}>
          <AppShell businessName={business?.name ?? "Calculadora de Costos"} logoUrl={business?.logoUrl ?? null} userEmail={user?.email ?? null}>{children}</AppShell>
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
