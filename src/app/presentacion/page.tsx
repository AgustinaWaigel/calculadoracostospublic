import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CalculatorIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  PackageIcon,
  PiggyBankIcon,
  PrinterIcon,
  ReceiptIcon,
  ShapesIcon,
  ShoppingBagIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlasCredit } from "@/components/layout/alas-credit";
import { APP_NAME, OWNER } from "@/lib/brand";
import { FREE_PLAN, PLAN, TRIAL_DAYS } from "@/lib/billing";
import { INDUSTRIES, industries } from "@/lib/industries";
import { formatMoney } from "@/lib/money";

const DESCRIPTION =
  "Calculá cuánto te cuesta lo que vendés y cuánto cobrar. Insumos, productos, mano de obra, presupuestos por WhatsApp y ventas. Gratis para empezar.";

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME} · Sabé cuánto te cuesta lo que vendés` },
  description: DESCRIPTION,
  openGraph: { title: `${APP_NAME} · ${OWNER}`, description: DESCRIPTION, locale: "es_AR", type: "website" },
};

const STEPS = [
  { title: "Cargá tus insumos", text: "Lo que pagaste y cuánto trae el paquete. La app calcula cuánto te sale cada unidad." },
  { title: "Armá tus productos", text: "Como una receta: qué lleva y cuánto de cada cosa, más tu tiempo y tus gastos fijos." },
  { title: "Sabé cuánto cobrar", text: "Te sugiere el precio para cada canal de venta y te muestra cuánto te queda de verdad." },
];

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: PackageIcon, title: "Insumos con historial", text: "Ves cómo suben los precios y te avisa cuando hace mucho que no los actualizás." },
  { icon: ShapesIcon, title: "Productos con receta", text: "Si sube un insumo, todos los productos que lo usan se recalculan solos." },
  { icon: ClockIcon, title: "Tu tiempo cuenta", text: "Calcula cuánto vale tu hora y la suma al costo, aparte de tu ganancia." },
  { icon: ReceiptIcon, title: "Costos fijos", text: "Alquiler, luz, monotributo: se reparten entre lo que producís en el mes." },
  { icon: FileTextIcon, title: "Presupuestos en segundos", text: "En PDF con tu logo o por WhatsApp con el mensaje ya escrito." },
  { icon: ShoppingBagIcon, title: "Ventas del mes", text: "Cuánto vendiste y cuánto ganaste, mes a mes. Los presupuestos aceptados se anotan solos." },
  { icon: PiggyBankIcon, title: "Inversiones", text: "Cargá esa máquina que compraste y mirá cuánto llevás recuperado." },
  { icon: PrinterIcon, title: "Herramientas de tu rubro", text: "Como la tinta por hoja para papelería: lo que cuesta cada impresión." },
];

const FAQ = [
  { q: "¿Tengo que saber de números?", a: "No. Cargás lo que pagaste por tus materiales y cuánto tiempo te lleva hacer cada cosa; las cuentas las hace la app." },
  { q: "¿Sirve para mi rubro?", a: `Sí, si fabricás o armás lo que vendés: ${industries.filter((i) => i !== "OTRO").map((i) => INDUSTRIES[i].label.toLowerCase()).join(", ")} y cualquier otro emprendimiento.` },
  { q: "¿Mis datos los ve alguien?", a: "No. Cada cuenta ve solo lo suyo, y podés bajarte un backup cuando quieras." },
  { q: "¿Funciona en el celular?", a: "Sí, está pensada para usarla desde el celular. También la podés instalar como una app." },
  { q: "¿Cómo pago y cómo cancelo?", a: "Con Mercado Pago, débito automático mensual. Se cancela cuando quieras desde la app y seguís con el plan gratis." },
];

function Shot({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[2rem] border-[6px] border-tinta bg-card shadow-xl ${className}`}>
      <Image src={src} alt={alt} width={600} height={1298} className="h-auto w-full" />
    </div>
  );
}

function SignupButton({ children = "Creá tu cuenta gratis" }: { children?: React.ReactNode }) {
  return (
    <Button asChild size="lg" className="bg-halo text-tinta hover:bg-halo/90">
      <Link href="/registro">{children}</Link>
    </Button>
  );
}

export default function PresentacionPage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Barra */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-amanecer/95 text-nube backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <span className="font-display text-xl tracking-wide uppercase">{APP_NAME}</span>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <a href="#precios" className="hidden rounded-md px-3 py-1.5 hover:bg-white/10 sm:block">
              Precios
            </a>
            <Link href="/ingresar" className="rounded-md px-3 py-1.5 font-semibold hover:bg-white/10">
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      {/* Portada */}
      <section className="bg-amanecer text-nube">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-14 md:grid-cols-[1fr_300px] md:pt-16">
          <div className="grid gap-5">
            <p className="text-sm font-semibold tracking-wide text-lavanda uppercase">Para emprendedores que fabrican lo que venden</p>
            <h1 className="font-display text-4xl leading-[1.05] tracking-wide text-balance uppercase sm:text-5xl md:text-6xl">
              ¿Sabés cuánto te cuesta lo que vendés?
            </h1>
            <p className="max-w-xl text-lg text-pretty text-cielo">
              Cargá tus insumos y tus productos, y la calculadora te dice cuánto te sale cada uno, cuánto cobrar y cuánto te queda de verdad.
              Sin planillas, desde el celular.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <SignupButton />
              <span className="text-sm text-lavanda">Gratis para siempre con insumos y productos.</span>
            </div>
          </div>
          <Shot src="/presentacion/precio.webp" alt="Precio sugerido de una agenda: costo, margen y cuánto te queda" className="mx-auto w-64 md:w-full md:rotate-2" />
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-3xl tracking-wide uppercase sm:text-4xl">Así de simple</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border bg-card p-5">
              <span className="grid size-9 place-items-center rounded-full bg-halo font-display text-lg text-tinta">{i + 1}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Capturas */}
      <section className="bg-tinta py-14 text-nube">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl tracking-wide uppercase sm:text-4xl">Todo tu emprendimiento en un lugar</h2>
          <p className="mt-2 max-w-2xl text-menta">De lo que comprás a lo que vendés, con números claros.</p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {[
              { src: "/presentacion/insumos.webp", alt: "Lista de insumos con su costo y alertas de precios viejos", label: "Tus insumos" },
              { src: "/presentacion/precio.webp", alt: "Precio sugerido por canal de venta", label: "Tu precio" },
              { src: "/presentacion/presupuesto.webp", alt: "Presupuesto con botones para PDF y WhatsApp", label: "Tus presupuestos" },
              { src: "/presentacion/ventas.webp", alt: "Ventas y ganancia del mes con gráfico", label: "Tus ventas" },
            ].map((s) => (
              <figure key={s.src} className="grid gap-2">
                <Shot src={s.src} alt={s.alt} className="border-[4px] border-nube/90" />
                <figcaption className="text-center text-sm font-semibold text-halo">{s.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Qué incluye */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="font-display text-3xl tracking-wide uppercase sm:text-4xl">Qué podés hacer</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Para {industries.filter((i) => i !== "OTRO").map((i) => INDUSTRIES[i].label.toLowerCase()).join(", ")} y más: al crear la cuenta elegís tu rubro.
        </p>
      </section>

      {/* Quién la hizo */}
      <section className="bg-cielo/60 py-14 dark:bg-cielo/10">
        <div className="mx-auto grid max-w-3xl gap-4 px-4 text-center">
          <CalculatorIcon className="mx-auto size-8 text-amanecer dark:text-lavanda" />
          <h2 className="font-display text-3xl tracking-wide uppercase">La hice para mi emprendimiento</h2>
          <p className="text-lg text-pretty">
            Soy Agustina, estudiante de sistemas y dueña de {OWNER}. Entre el papel, la tinta, los insumos y las horas de trabajo, nunca sabía
            bien cuánto me costaba cada producto ni cuánto cobrar. Así que armé esta calculadora, y ahora la puede usar cualquiera.
          </p>
        </div>
      </section>

      {/* Precios */}
      <section id="precios" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14">
        <h2 className="font-display text-3xl tracking-wide uppercase sm:text-4xl">Precios</h2>
        <p className="mt-2 text-muted-foreground">Arrancás con {TRIAL_DAYS} días con todo, sin tarjeta. Después elegís.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="grid content-start gap-4 rounded-2xl border bg-card p-6">
            <div>
              <h3 className="text-xl font-semibold">{FREE_PLAN.name}</h3>
              <p className="mt-1 font-display text-4xl">$0</p>
              <p className="text-sm text-muted-foreground">Para siempre.</p>
            </div>
            <ul className="grid gap-2 text-sm">
              {FREE_PLAN.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="justify-self-start">
              <Link href="/registro">Empezar gratis</Link>
            </Button>
          </div>
          <div className="grid content-start gap-4 rounded-2xl border-2 border-primary bg-card p-6">
            <div>
              <h3 className="text-xl font-semibold">{PLAN.name}</h3>
              <p className="mt-1 font-display text-4xl">
                {formatMoney(PLAN.price, "ARS", 0)}
                <span className="font-sans text-base text-muted-foreground"> /mes</span>
              </p>
              <p className="text-sm text-muted-foreground">Todo lo del gratis, más:</p>
            </div>
            <ul className="grid gap-2 text-sm">
              {PLAN.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild className="justify-self-start">
              <Link href="/registro">Probarlo {TRIAL_DAYS} días gratis</Link>
            </Button>
            <p className="text-xs text-muted-foreground">Pagás con Mercado Pago y cancelás cuando quieras.</p>
          </div>
        </div>
      </section>

      {/* Preguntas */}
      <section className="mx-auto max-w-3xl px-4 pb-14">
        <h2 className="font-display text-3xl tracking-wide uppercase">Preguntas frecuentes</h2>
        <div className="mt-6 grid gap-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border bg-card px-4 py-3">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                <span className="mr-2 inline-block text-primary transition-transform group-open:rotate-90">›</span>
                {f.q}
              </summary>
              <p className="mt-2 pl-4 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section className="bg-amanecer py-14 text-center text-nube">
        <div className="mx-auto grid max-w-2xl justify-items-center gap-4 px-4">
          <h2 className="font-display text-3xl tracking-wide text-balance uppercase sm:text-4xl">Dejá de ponerle precio a ojo</h2>
          <p className="text-cielo">En un rato tenés el costo real de lo que vendés.</p>
          <SignupButton />
        </div>
      </section>

      <footer className="bg-tinta py-8 text-nube">
        <div className="mx-auto max-w-6xl px-4">
          <AlasCredit className="justify-items-center text-center text-nube/80" linkClassName="text-nube" />
        </div>
      </footer>
    </div>
  );
}
