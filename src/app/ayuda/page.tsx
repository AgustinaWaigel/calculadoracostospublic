import Link from "next/link";
import {
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/ui-bits";
import { ACCENTS, type Accent } from "@/components/layout/nav-items";
import { CONTACTS } from "@/lib/brand";
import { PLANS, TRIAL_DAYS } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata = { title: "Cómo se usa" };

interface Step {
  href: string;
  icon: LucideIcon;
  accent: Accent;
  title: string;
  body: string;
  example: string;
  section: string;
}

const STEPS: Step[] = [
  {
    href: "/insumos",
    section: "Insumos",
    icon: PackageIcon,
    accent: "menta",
    title: "Cargá tus insumos",
    body: "Todo lo que comprás para producir. Ponés cuánto pagaste el paquete y cuántas unidades trae, y la app calcula cuánto te sale cada una.",
    example: "Pouch A4: pagaste $28.949 el paquete de 100 → cada pouch te sale $289,49.",
  },
  {
    href: "/mano-de-obra",
    section: "Mano de obra",
    icon: ClockIcon,
    accent: "kraft",
    title: "Poné cuánto vale tu hora",
    body: "Tu tiempo es parte del costo. Decís cuánto querés ganar por mes y cuántas horas trabajás, y te da el valor de tu hora. Si le pagás a alguien, lo cargás aparte.",
    example: "Querés ganar $700.000 trabajando 30 horas por semana → tu hora vale unos $5.400.",
  },
  {
    href: "/costos-fijos",
    section: "Costos fijos",
    icon: ReceiptIcon,
    accent: "cielo",
    title: "Sumá tus gastos fijos",
    body: "Lo que pagás todos los meses vendas o no: alquiler, luz, internet, monotributo, suscripciones. Se reparte entre todo lo que producís en el mes.",
    example: "$272.000 de fijos y 300 productos por mes → cada uno carga con unos $900.",
  },
  {
    href: "/productos",
    section: "Productos",
    icon: ShapesIcon,
    accent: "lavanda",
    title: "Armá tus productos",
    body: "Como una receta: qué insumos lleva y cuánto de cada uno, y cuántos minutos de trabajo. La app suma todo y te sugiere el precio para cada canal de venta.",
    example: "Tarjeta: ¼ hoja + ¼ impresión + 1 sobre + 15 minutos → costo $2.500, precio sugerido $4.190.",
  },
  {
    href: "/presupuestos",
    section: "Presupuestos",
    icon: FileTextIcon,
    accent: "amanecer",
    title: "Mandá presupuestos",
    body: "Elegís los productos y las cantidades, y sale con tus precios (y los descuentos por cantidad). Lo descargás en PDF o lo mandás por WhatsApp con el mensaje armado.",
    example: "Cuando el cliente acepta, lo marcás como Aceptado y la venta se anota sola.",
  },
  {
    href: "/ventas",
    section: "Ventas",
    icon: ShoppingBagIcon,
    accent: "menta",
    title: "Anotá tus ventas",
    body: "Las que vienen de presupuestos se anotan solas; las demás (una feria, un mostrador) las cargás a mano. Ves cuánto vendiste y cuánto ganaste cada mes.",
    example: "Octubre: 21 ventas, $1.281.660 vendidos, $412.856 de ganancia.",
  },
  {
    href: "/inversiones",
    section: "Inversiones",
    icon: PiggyBankIcon,
    accent: "kraft",
    title: "Seguí tus inversiones",
    body: "Cargá lo que pusiste para crecer (una máquina, una compra grande) y la app te muestra cuánto ya recuperaste con tus ventas y cuánto falta.",
    example: "Plastificadora de $120.000 → con lo que ganás por mes, la recuperás en tres meses.",
  },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿Qué precio me sugiere y de dónde sale?",
    a: "Suma el costo (insumos + tu tiempo + la parte de los gastos fijos) y le agrega tu ganancia. Por defecto es un 40% de margen: de cada $100 que cobrás, $40 te quedan. Lo podés cambiar en Ajustes o para un producto en particular.",
  },
  {
    q: "¿Qué diferencia hay entre margen y markup?",
    a: "Margen es la ganancia sobre el precio de venta; markup, la ganancia sobre el costo. Con un costo de $100: 40% de margen = precio $166,67; 40% de markup = precio $140. Si no sabés cuál usar, dejá margen.",
  },
  {
    q: "¿Por qué el precio cambia según el canal?",
    a: "Porque algunos canales cobran comisión (una tienda online, una pasarela de pago) o tienen otro precio (mayorista). La app ajusta el precio para que te quede la misma ganancia. Los canales se editan en Ajustes.",
  },
  {
    q: "¿Mi tiempo es costo o ganancia?",
    a: "Las dos cosas: entra en el costo para que el precio lo cubra, pero esa plata es tuya. Por eso en cada producto ves aparte \"tu trabajo\" y \"el margen\". Si le pagás a otra persona, marcá ese perfil como \"se le paga a alguien\".",
  },
  {
    q: "¿Qué hago si sube un insumo?",
    a: "Actualizá el precio en Insumos y todos los productos que lo usan se recalculan solos. Los presupuestos ya enviados no cambian. Si un precio tiene más de un mes sin tocar, la app te avisa en el Inicio.",
  },
  {
    q: "¿Qué es el punto de equilibrio?",
    a: "Cuántas unidades tenés que vender por mes para cubrir tus gastos fijos. De ahí para arriba, es ganancia. Lo ves en la pestaña Precio de cada producto.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: (
      <>
        Las cuentas nuevas tienen {TRIAL_DAYS} días gratis con todo. Después: plan Simple ({formatMoney(PLANS.SIMPLE.price, "ARS", 0)}/mes:
        insumos, productos, mano de obra, costos fijos e impresión) o Completo ({formatMoney(PLANS.COMPLETE.price, "ARS", 0)}/mes: además
        presupuestos, ventas e inversiones). Se paga con Mercado Pago y se cancela cuando quieras desde{" "}
        <Link href="/plan" className="underline underline-offset-4">Mi plan</Link>.
      </>
    ),
  },
  {
    q: "¿Mis datos los ve alguien más?",
    a: "No. Cada cuenta ve solo lo suyo. Igual, cada tanto bajate un backup desde Ajustes: es un archivo con todos tus datos.",
  },
];

export default function AyudaPage() {
  return (
    <>
      <PageHeader title="Cómo se usa" description="En este orden, y en un rato tenés el precio real de lo que vendés." />
      <div className="grid gap-8">
        <ol className="grid gap-3">
          {STEPS.map((s, i) => (
            <li key={s.href}>
              <Card>
                <CardContent className="flex items-start gap-4">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", ACCENTS[s.accent].solid)}>
                    <s.icon className="size-5" />
                  </span>
                  <div className="grid min-w-0 gap-1.5">
                    <h2 className="font-semibold">
                      {i + 1}. {s.title}
                    </h2>
                    <p className="text-sm text-pretty">{s.body}</p>
                    <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Ejemplo: {s.example}</p>
                    <Link href={s.href} className="justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline">
                      Ir a {s.section} →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PrinterIcon className="size-5 text-primary" /> ¿Imprimís en tu casa?
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <p>
              En <Link href="/impresion" className="font-semibold text-primary underline-offset-4 hover:underline">Impresión</Link> cargás
              el precio de tus botellas de tinta y cuántas páginas rinden (está en la caja). Elegís cuánto se llena la hoja y te dice
              cuánto te sale cada impresión. Después lo guardás como insumo y lo usás en tus productos.
            </p>
          </CardContent>
        </Card>

        <section className="grid gap-3">
          <h2 className="font-display text-2xl tracking-wide uppercase">Preguntas frecuentes</h2>
          <div className="grid gap-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border bg-card px-4 py-3 open:pb-4">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="mr-2 inline-block text-primary transition-transform group-open:rotate-90">›</span>
                  {f.q}
                </summary>
                <div className="mt-2 pl-4 text-sm text-pretty text-muted-foreground">{f.a}</div>
              </details>
            ))}
          </div>
        </section>

        <Card>
          <CardContent className="text-sm">
            ¿Te quedó alguna duda o encontraste algo que no anda? Escribinos por WhatsApp al{" "}
            <a href={CONTACTS.whatsapp.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline-offset-4 hover:underline">
              {CONTACTS.whatsapp.label}
            </a>
            .
          </CardContent>
        </Card>
      </div>
    </>
  );
}
