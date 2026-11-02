import Link from "next/link";
import {
  ArrowRightIcon,
  CalculatorIcon,
  CheckCircle2Icon,
  CircleIcon,
  FileTextIcon,
  HelpCircleIcon,
  PackageIcon,
  PrinterIcon,
  ShapesIcon,
  ShoppingBagIcon,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/money";
import { ACCENTS, type Accent } from "@/components/layout/nav-items";
import { getAllProductsWithPricing, getBusiness } from "@/server/costing";
import { getSales } from "@/server/sales";
import { userDb } from "@/lib/db";
import { daysSince, isPriceStale } from "@/lib/calc/supply";
import { sum } from "@/lib/money";
import { cn } from "@/lib/utils";
import { INDUSTRIES } from "@/lib/industries";

export const metadata = { title: "Inicio" };

interface Action {
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
  accent: Accent;
  print?: boolean;
}

/** Lo que la gente viene a hacer, dicho como lo diría ella. */
const ACTIONS: Action[] = [
  { href: "/productos/nuevo", title: "Calcular el precio de un producto", text: "Cargás qué lleva y te dice cuánto cobrar.", icon: ShapesIcon, accent: "lavanda" },
  { href: "/presupuestos/nuevo", title: "Pasarle un presupuesto a un cliente", text: "En PDF o por WhatsApp, con tus precios.", icon: FileTextIcon, accent: "amanecer" },
  { href: "/ventas/nueva", title: "Anotar una venta", text: "Para saber cuánto vendiste y ganaste en el mes.", icon: ShoppingBagIcon, accent: "menta" },
  { href: "/insumos", title: "Actualizar el precio de un insumo", text: "Si subió el papel, tus productos se recalculan solos.", icon: PackageIcon, accent: "menta" },
  { href: "/impresion", title: "Saber cuánto me sale imprimir", text: "La tinta por hoja según tus botellas.", icon: PrinterIcon, accent: "menta", print: true },
  { href: "/calculadora", title: "Hacer una cuenta rápida", text: "Un precio al toque, sin guardar nada.", icon: CalculatorIcon, accent: "halo" },
];

export default async function InicioPage() {
  const db = await userDb();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [business, { items }, supplies, profiles, fixedCosts, quotes, monthSales] = await Promise.all([
    getBusiness(),
    getAllProductsWithPricing(),
    db.supply.findMany({ select: { id: true, name: true, priceUpdatedAt: true }, orderBy: { priceUpdatedAt: "asc" } }),
    db.laborProfile.count(),
    db.fixedCost.count(),
    db.quote.count(),
    getSales({ date: { gte: monthStart } }),
  ]);

  const prints = INDUSTRIES[business.industry].print;
  const steps = [
    {
      // El nombre arranca como "Mi Emprendimiento": si lo cambió (o cargó contacto o logo), ya lo completó.
      done: business.name !== "Mi Emprendimiento" || Boolean(business.phone || business.logoUrl),
      href: "/ajustes",
      title: "Completá los datos de tu emprendimiento",
      text: "Nombre, logo, WhatsApp y si sos monotributista: salen en tus presupuestos y en el PDF.",
    },
    { done: supplies.length > 0, href: "/insumos/nuevo", title: "Cargá tus insumos", text: "Lo que comprás para producir: papel, tinta, pouch, anillos… con lo que pagaste y cuánto trae." },
    { done: profiles > 0, href: "/mano-de-obra", title: "Poné cuánto vale tu hora", text: "Tu tiempo también es un costo. La app te ayuda a calcularlo." },
    { done: fixedCosts > 0, href: "/costos-fijos", title: "Sumá tus gastos fijos", text: "Alquiler, luz, internet, monotributo: se reparten entre lo que producís." },
    { done: items.length > 0, href: "/productos/nuevo", title: "Armá tu primer producto", text: "Elegís los insumos y los minutos de trabajo, y te sugiere el precio." },
    { done: quotes > 0, href: "/presupuestos/nuevo", title: "Mandá tu primer presupuesto", text: "Con tus precios, en PDF o directo por WhatsApp." },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  const stale = supplies.filter((s) => isPriceStale(s.priceUpdatedAt));
  const best = items
    .filter((i) => i.pricing?.reference)
    .sort((a, b) => b.pricing!.takeHome.comparedTo(a.pricing!.takeHome))
    .slice(0, 3);
  const sold = sum(monthSales.map((s) => s.total));
  const earned = sum(monthSales.map((s) => s.profit));
  const monthName = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(new Date());

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-3xl leading-none tracking-wide uppercase sm:text-4xl">Hola, {business.name}</h1>
        <p className="mt-2 text-muted-foreground">¿Qué querés hacer hoy?</p>
      </header>

      {/* Lo que vino a hacer */}
      <nav className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="¿Qué querés hacer?">
        {ACTIONS.filter((a) => prints || !a.print).map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={cn(
              "group flex items-start gap-3 rounded-xl border bg-card p-4 transition-[transform,background-color] duration-150 ease-out hover:-translate-y-0.5 hover:bg-muted/50",
              ACCENTS[a.accent].border,
            )}
          >
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", ACCENTS[a.accent].solid)}>
              <a.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">{a.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{a.text}</span>
            </span>
          </Link>
        ))}
      </nav>

      {/* Primeros pasos, hasta que estén todos */}
      {doneCount < steps.length && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-baseline justify-between gap-2">
              <span>Primeros pasos</span>
              <span className="text-sm font-normal text-muted-foreground">
                {doneCount} de {steps.length} listos
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Hacelos en este orden y vas a tener el precio real de lo que vendés.
            </p>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-1">
              {steps.map((s, i) => (
                <li key={s.href}>
                  <Link href={s.href} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50">
                    {s.done ? (
                      <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-label="Listo" />
                    ) : (
                      <CircleIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Pendiente" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={cn("block font-medium", s.done && "text-muted-foreground line-through")}>
                        {i + 1}. {s.title}
                      </span>
                      {!s.done && <span className="block text-sm text-muted-foreground">{s.text}</span>}
                    </span>
                    {!s.done && <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* El mes, en una frase */}
        {monthSales.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tu {monthName}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-lg leading-relaxed">
                Hiciste <strong>{monthSales.length} {monthSales.length === 1 ? "venta" : "ventas"}</strong> por{" "}
                <strong><Money value={sold.toString()} /></strong> y te quedaron{" "}
                <strong className="text-primary"><Money value={earned.toString()} /></strong> de ganancia.
              </p>
              <Button asChild variant="outline" className="justify-self-start">
                <Link href="/ventas">Ver tus ventas</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Lo que más le deja, dicho en criollo */}
        {best.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Lo que más te deja</CardTitle>
              <p className="text-sm text-muted-foreground">Vendiéndolo al precio sugerido, en venta directa.</p>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {best.map((i) => (
                  <li key={i.product.id}>
                    <Link href={`/productos/${i.product.id}/precio`} className="block rounded-lg p-2 hover:bg-muted/50">
                      <span className="block font-medium">{i.product.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        Lo vendés a <Money value={i.pricing!.reference!.price.toString()} /> y te quedan{" "}
                        <Money value={i.pricing!.takeHome.toString()} className="font-semibold text-primary" /> por unidad
                        {i.pricing!.ownLabor.gt(0) && " (tu trabajo + ganancia)"}.
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Precios viejos, con el porqué */}
        {stale.length > 0 && (
          <Card className="border-halo/70">
            <CardHeader>
              <CardTitle>Revisá estos precios</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hace más de un mes que no los actualizás. Si subieron, tus productos te están saliendo más caros de lo que la app cree.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1">
                {stale.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link href={`/insumos/${s.id}`} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/50">
                      <span className="min-w-0 truncate">{s.name}</span>
                      <span className="shrink-0 text-sm text-muted-foreground">hace {daysSince(s.priceUpdatedAt)} días</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {stale.length > 5 && <p className="mt-2 text-sm text-muted-foreground">y {stale.length - 5} más en Insumos.</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ayuda */}
      <Link href="/ayuda" className="flex items-center gap-3 rounded-xl border border-dashed p-4 hover:bg-muted/50">
        <HelpCircleIcon className="size-6 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">¿Primera vez? Mirá cómo se usa</span>
          <span className="block text-sm text-muted-foreground">El paso a paso y las dudas más comunes, explicado simple.</span>
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}

