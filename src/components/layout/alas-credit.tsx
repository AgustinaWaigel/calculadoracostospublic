import { GlobeIcon, AtSignIcon, MessageCircleIcon } from "lucide-react";
import { CONTACTS, OWNER } from "@/lib/brand";
import { cn } from "@/lib/utils";

const LINKS = [
  { ...CONTACTS.whatsapp, icon: MessageCircleIcon, name: "WhatsApp" },
  { ...CONTACTS.instagram, icon: AtSignIcon, name: "Instagram" },
  { ...CONTACTS.web, icon: GlobeIcon, name: "Web" },
];

/** "Una herramienta de Alas de Ángel" con sus contactos (menú y pantallas de ingreso). */
export function AlasCredit({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  return (
    <div className={cn("grid gap-1.5 text-xs", className)}>
      <p>
        Una herramienta de <span className="font-semibold">{OWNER}</span>.
      </p>
      <ul className="grid gap-1">
        {LINKS.map(({ href, label, icon: Icon, name }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${name}: ${label}`}
              className={cn("inline-flex items-center gap-1.5 underline-offset-4 hover:underline", linkClassName)}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
