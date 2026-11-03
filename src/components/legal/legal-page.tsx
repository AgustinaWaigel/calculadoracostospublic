import Link from "next/link";
import { AlasCredit } from "@/components/layout/alas-credit";
import { APP_NAME } from "@/lib/brand";

export const LEGAL_UPDATED = "3 de noviembre de 2026";

/** Marco de las páginas legales: se leen con o sin cuenta. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-amanecer text-nube">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="font-display text-xl tracking-wide uppercase">
            {APP_NAME}
          </Link>
          <Link href="/ingresar" className="ml-auto rounded-md px-3 py-1.5 text-sm font-semibold hover:bg-white/10">
            Ingresar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-3xl tracking-wide uppercase sm:text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última actualización: {LEGAL_UPDATED}</p>
        <div className="legal mt-8 grid gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_a:not([data-slot=button])]:font-semibold [&_a:not([data-slot=button])]:text-primary [&_a:not([data-slot=button])]:underline-offset-4 hover:[&_a:not([data-slot=button])]:underline">
          {children}
        </div>
      </main>
      <footer className="bg-tinta py-8 text-nube">
        <AlasCredit className="justify-items-center text-center text-nube/80" linkClassName="text-nube" />
      </footer>
    </div>
  );
}
