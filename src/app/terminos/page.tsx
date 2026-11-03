import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { APP_NAME, CONTACTS, DEVELOPER, OWNER } from "@/lib/brand";
import { FREE_PLAN, PLAN, TRIAL_DAYS } from "@/lib/billing";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Términos y condiciones" };

export default function TerminosPage() {
  const mail = <a href={CONTACTS.email.href}>{CONTACTS.email.label}</a>;
  return (
    <LegalPage title="Términos y condiciones">
      <p>
        Estos términos regulan el uso de {APP_NAME} (la “Calculadora”), una herramienta de {OWNER} desarrollada y administrada por{" "}
        {DEVELOPER} (“nosotros”). Al crear una cuenta o usar la Calculadora aceptás estos términos y la{" "}
        <Link href="/privacidad">Política de privacidad</Link>. Si no estás de acuerdo, no la uses.
      </p>

      <h2>1. Qué es la Calculadora</h2>
      <p>
        Es una aplicación web para que emprendedores calculen el costo de sus productos, sugieran precios de venta y lleven sus
        presupuestos, ventas e inversiones. Los resultados son <strong>estimaciones</strong> basadas en los datos que cargás vos: no son
        asesoramiento contable, impositivo ni financiero. Las decisiones de precio, la facturación y el cumplimiento de tus obligaciones
        fiscales son tu responsabilidad.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Tenés que ser mayor de 18 años y dar un mail válido.</li>
        <li>Sos responsable de cuidar tu contraseña y de lo que se haga con tu cuenta.</li>
        <li>Los datos que cargás son tuyos. Nosotros los guardamos para que la Calculadora funcione, como dice la Política de privacidad.</li>
        <li>No podés usar la Calculadora para algo ilegal, intentar acceder a datos de otras cuentas ni sobrecargar o atacar el servicio.</li>
      </ul>

      <h2>3. Planes y precios</h2>
      <ul>
        <li>
          <strong>Prueba:</strong> las cuentas nuevas tienen {TRIAL_DAYS} días con todas las funciones, sin cargo y sin tarjeta.
        </li>
        <li>
          <strong>{FREE_PLAN.name}:</strong> sin costo y sin vencimiento; incluye insumos y productos con su costo de materiales y precio sugerido.
        </li>
        <li>
          <strong>{PLAN.name}:</strong> {formatMoney(PLAN.price, "ARS", 0)} por mes (precio final en pesos argentinos), con todas las
          funciones.
        </li>
        <li>
          Podemos cambiar los precios o lo que incluye cada plan. Si cambia el precio de tu suscripción, te avisamos por mail con al menos
          30 días de anticipación, y podés cancelarla antes de que se aplique.
        </li>
      </ul>

      <h2>4. Pago, renovación y cancelación</h2>
      <ul>
        <li>
          El plan completo se paga por Mercado Pago con <strong>débito automático mensual</strong>: se renueva solo cada mes hasta que lo
          canceles. Mercado Pago procesa el pago; nosotros no vemos ni guardamos los datos de tu tarjeta.
        </li>
        <li>
          Podés <strong>cancelar cuando quieras</strong>, sin penalidad, desde <Link href="/plan">Mi plan</Link> dentro de la Calculadora,
          desde tu cuenta de Mercado Pago o escribiéndonos a {mail}. Seguís con el plan completo hasta el final del mes que ya pagaste y
          después pasás al plan gratis, sin perder tus datos.
        </li>
        <li>
          <strong>Arrepentimiento:</strong> tenés 10 días corridos desde que te suscribiste para revocar la contratación sin costo y sin
          dar motivos (Ley 24.240 y Resolución 424/2020). Se hace desde el <Link href="/arrepentimiento">Botón de arrepentimiento</Link> y
          te devolvemos lo que hayas pagado por el mismo medio.
        </li>
      </ul>

      <h2>5. Disponibilidad</h2>
      <p>
        Hacemos lo posible para que la Calculadora funcione siempre y para resguardar tus datos con copias de seguridad, pero puede haber
        interrupciones por mantenimiento o fallas de los proveedores. Te recomendamos bajar cada tanto tu backup desde Ajustes.
      </p>

      <h2>6. Responsabilidad</h2>
      <p>
        La Calculadora se ofrece “tal como está”. En la medida que la ley lo permita, no respondemos por pérdidas o decisiones comerciales
        tomadas a partir de sus cálculos, ni por errores en los datos que cargues. Esto no limita los derechos que te da la Ley de Defensa
        del Consumidor.
      </p>

      <h2>7. Baja de la cuenta</h2>
      <p>
        Podés pedir que borremos tu cuenta y todos tus datos escribiéndonos a {mail}. Podemos suspender una cuenta que no cumpla estos
        términos, avisándote antes salvo que sea urgente.
      </p>

      <h2>8. Cambios en estos términos</h2>
      <p>
        Si cambiamos algo importante, te avisamos por mail o dentro de la Calculadora antes de que rija. Si seguís usándola después, se
        entiende que aceptás los cambios.
      </p>

      <h2>9. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Ante cualquier conflicto, son competentes los tribunales del
        domicilio del usuario consumidor. Para cualquier consulta o reclamo, escribinos a {mail} o por WhatsApp al{" "}
        <a href={CONTACTS.whatsapp.href}>{CONTACTS.whatsapp.label}</a>.
      </p>
    </LegalPage>
  );
}
