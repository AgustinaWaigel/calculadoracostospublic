import { LegalPage } from "@/components/legal/legal-page";
import { Button } from "@/components/ui/button";
import { CONTACTS } from "@/lib/brand";

export const metadata = { title: "Botón de arrepentimiento" };

const SUBJECT = "Calculadora de Insumos · Botón de arrepentimiento";
const BODY = [
  "Quiero revocar la contratación de mi suscripción (Ley 24.240 y Resolución 424/2020).",
  "",
  "Mail de mi cuenta en la Calculadora: ",
  "Fecha en que me suscribí: ",
  "Nombre y apellido: ",
].join("\n");

/** Exigido por la Resolución 424/2020: revocar la contratación online dentro de los 10 días. */
export default function ArrepentimientoPage() {
  const href = `${CONTACTS.email.href}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;
  return (
    <LegalPage title="Botón de arrepentimiento">
      <p>
        Si te suscribiste al plan completo hace <strong>10 días corridos o menos</strong>, podés revocar la contratación sin costo y sin
        dar motivos (Ley 24.240 de Defensa del Consumidor, art. 34, y Resolución 424/2020).
      </p>
      <h2>Cómo hacerlo</h2>
      <ol className="grid gap-2 [&>li]:ml-5 [&>li]:list-decimal">
        <li>Tocá el botón de abajo: se abre un mail con el pedido ya escrito.</li>
        <li>Completá el mail de tu cuenta, la fecha en que te suscribiste y tu nombre, y mandalo.</li>
        <li>
          Dentro de las 24 horas te respondemos con un <strong>código de identificación</strong> de tu pedido. Cancelamos la suscripción
          y te devolvemos lo pagado por el mismo medio (Mercado Pago).
        </li>
      </ol>
      <Button asChild size="lg" className="justify-self-start">
        <a href={href}>Quiero arrepentirme de mi suscripción</a>
      </Button>
      <p className="text-sm text-muted-foreground">
        ¿No se abre el mail? Escribinos a <a href={CONTACTS.email.href}>{CONTACTS.email.label}</a> con el asunto “Botón de
        arrepentimiento”. Si pasaron más de 10 días, igual podés cancelar cuando quieras desde Mi plan: seguís hasta el final del mes
        pagado y después pasás al plan gratis.
      </p>
    </LegalPage>
  );
}
