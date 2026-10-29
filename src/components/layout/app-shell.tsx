"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalculatorIcon, LogOutIcon, MenuIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";
import { PUBLIC_PATHS } from "@/lib/auth/config";
import { NAV_ITEMS, isActive } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { CurrencySwitcher } from "./currency-switcher";
import { AlasCredit } from "./alas-credit";
import { APP_NAME, CONTACTS, DEVELOPER, OWNER } from "@/lib/brand";

const AUTH_SCREENS = [...PUBLIC_PATHS, "/nueva-clave"];

function BrandMark({ logoUrl, className }: { logoUrl: string | null; className?: string }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- el logo es un data URL guardado en la base
    <img src={logoUrl} alt="" className={cn("rounded-lg object-cover", className)} />
  ) : (
    <span className={cn("grid place-items-center rounded-lg bg-amanecer text-nube", className)}>
      <CalculatorIcon className="size-1/2" />
    </span>
  );
}

function Brand({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <Link href="/" className="flex items-center gap-3 rounded-lg outline-sidebar-ring">
      <BrandMark logoUrl={logoUrl} className="size-11 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate font-display text-xl leading-none tracking-wide uppercase">{name}</span>
        <span className="mt-1 block text-xs text-sidebar-foreground/70">Costos y precios</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-0.5" aria-label="Secciones">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-sidebar-ring transition-colors duration-150",
              active
                ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Quién está adentro y cómo salir (al pie del menú). */
function Account({ email }: { email: string | null }) {
  if (!email) return null;
  return (
    <form action={logout} className="flex items-center gap-2 border-t border-sidebar-border px-3 pt-3">
      <span className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/70" title={email}>
        {email}
      </span>
      <button
        type="submit"
        className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-sidebar-foreground/90 outline-sidebar-ring transition-colors duration-150 hover:bg-sidebar-accent"
      >
        <LogOutIcon className="size-3.5" /> Salir
      </button>
    </form>
  );
}

export function AppShell({
  children,
  businessName,
  logoUrl,
  userEmail,
}: {
  children: React.ReactNode;
  businessName: string;
  logoUrl: string | null;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Las pantallas de la cuenta (ingresar, registrarse, contraseña) van solas, sin menú.
  if (AUTH_SCREENS.includes(pathname)) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-background">
      {/* Riel verde en escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-7 overflow-y-auto bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
        <Brand name={businessName} logoUrl={logoUrl} />
        <NavLinks />
        <div className="mt-auto grid gap-4">
          <p className="px-3 font-display text-base leading-tight text-sidebar-primary">Para escribir, soñar y volar.</p>
          <AlasCredit className="px-3 text-sidebar-foreground/75" linkClassName="hover:text-sidebar-foreground" />
          <Account email={userEmail} />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur supports-backdrop-filter:bg-background/75">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Abrir menú">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto border-none bg-sidebar p-4 text-sidebar-foreground">
              <SheetHeader className="mb-4 p-0">
                <SheetTitle className="sr-only">Menú</SheetTitle>
                <Brand name={businessName} logoUrl={logoUrl} />
              </SheetHeader>
              <NavLinks onNavigate={() => setOpen(false)} />
              <div className="mt-auto grid gap-4">
                <AlasCredit className="px-3 text-sidebar-foreground/75" linkClassName="hover:text-sidebar-foreground" />
                <Account email={userEmail} />
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex min-w-0 items-center gap-2 lg:hidden">
            <BrandMark logoUrl={logoUrl} className="size-7 shrink-0" />
            <span className="truncate font-display text-lg leading-none tracking-wide uppercase">{businessName}</span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <CurrencySwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 pt-10 pb-28 text-center text-xs text-muted-foreground sm:px-6 lg:px-8 lg:pb-8">
          {APP_NAME} de{" "}
          <a href={CONTACTS.web.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline-offset-4 hover:underline">
            {OWNER}
          </a>{" "}
          · Desarrollado por {DEVELOPER}
        </footer>
      </div>

      {/* Barra inferior en el celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navegación principal"
      >
        {NAV_ITEMS.filter((i) => i.mobile).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 text-[11px]",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-12 place-items-center rounded-full transition-colors duration-150",
                  active && "bg-halo text-[#0b3b29]",
                )}
              >
                <item.icon className="size-5" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
