import Link from "next/link";

export const LEGAL_LINKS = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/arrepentimiento", label: "Botón de arrepentimiento" },
];

/** Links a las páginas legales (pie de la presentación, del ingreso y de la ayuda). */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Legales" className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs ${className}`}>
      {LEGAL_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="underline-offset-4 hover:underline">
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
