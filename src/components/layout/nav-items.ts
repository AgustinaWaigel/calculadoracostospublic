import {
  CalculatorIcon,
  ClockIcon,
  FileTextIcon,
  HomeIcon,
  PackageIcon,
  PiggyBankIcon,
  PrinterIcon,
  ReceiptIcon,
  SettingsIcon,
  ShapesIcon,
  ShoppingBagIcon,
  type LucideIcon,
} from "lucide-react";

export type Accent = "tinta" | "menta" | "halo" | "kraft" | "lavanda" | "amanecer" | "cielo" | "neutro";

/**
 * Colores de sección, siempre de la paleta de la marca y en sus parejas (fondo + texto legible).
 * Clases completas: Tailwind solo genera las que aparecen literalmente en el código.
 */
export const ACCENTS: Record<Accent, { text: string; bg: string; solid: string; border: string }> = {
  tinta: {
    text: "text-tinta dark:text-menta",
    bg: "bg-tinta/10 dark:bg-menta/12",
    solid: "bg-tinta text-nube dark:bg-menta dark:text-[#0b3b29]",
    border: "border-tinta/25 dark:border-menta/30",
  },
  menta: {
    text: "text-tinta dark:text-menta",
    bg: "bg-menta/22 dark:bg-menta/12",
    solid: "bg-menta text-[#0b3b29]",
    border: "border-menta/50 dark:border-menta/30",
  },
  halo: {
    text: "text-tinta dark:text-halo",
    bg: "bg-halo/25 dark:bg-halo/12",
    solid: "bg-halo text-[#0b3b29]",
    border: "border-halo/60 dark:border-halo/30",
  },
  kraft: {
    text: "text-[#7a5532] dark:text-[#e7c79f]",
    bg: "bg-kraft/22 dark:bg-kraft/14",
    solid: "bg-kraft text-[#3d2a17]",
    border: "border-kraft/50 dark:border-kraft/30",
  },
  lavanda: {
    text: "text-amanecer dark:text-lavanda",
    bg: "bg-lavanda/30 dark:bg-lavanda/12",
    solid: "bg-lavanda text-amanecer-fuerte",
    border: "border-lavanda/70 dark:border-lavanda/30",
  },
  amanecer: {
    text: "text-amanecer dark:text-lavanda",
    bg: "bg-amanecer/10 dark:bg-lavanda/10",
    solid: "bg-amanecer text-nube",
    border: "border-amanecer/25 dark:border-lavanda/30",
  },
  cielo: {
    text: "text-amanecer dark:text-cielo",
    bg: "bg-cielo/70 dark:bg-cielo/10",
    solid: "bg-cielo text-amanecer-fuerte",
    border: "border-lavanda/50 dark:border-cielo/25",
  },
  neutro: {
    text: "text-tinta-suave dark:text-nube/80",
    bg: "bg-tinta/6 dark:bg-nube/8",
    solid: "bg-tinta-suave text-nube dark:bg-nube/15",
    border: "border-tinta/15 dark:border-nube/15",
  },
};

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: Accent;
  /** Aparece en la barra inferior del celular. */
  mobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: HomeIcon, accent: "tinta", mobile: true },
  { href: "/insumos", label: "Insumos", icon: PackageIcon, accent: "menta", mobile: true },
  { href: "/mano-de-obra", label: "Mano de obra", icon: ClockIcon, accent: "kraft" },
  { href: "/costos-fijos", label: "Costos fijos", icon: ReceiptIcon, accent: "cielo" },
  { href: "/productos", label: "Productos", icon: ShapesIcon, accent: "lavanda", mobile: true },
  { href: "/presupuestos", label: "Presupuestos", icon: FileTextIcon, accent: "amanecer", mobile: true },
  { href: "/ventas", label: "Ventas", icon: ShoppingBagIcon, accent: "menta" },
  { href: "/inversiones", label: "Inversiones", icon: PiggyBankIcon, accent: "kraft" },
  { href: "/impresion", label: "Impresión", icon: PrinterIcon, accent: "menta" },
  { href: "/calculadora", label: "Calculadora rápida", icon: CalculatorIcon, accent: "halo" },
  { href: "/ajustes", label: "Ajustes", icon: SettingsIcon, accent: "neutro" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function navItemFor(pathname: string): NavItem | undefined {
  return [...NAV_ITEMS].reverse().find((i) => isActive(pathname, i.href));
}
