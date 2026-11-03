import { LegalPage } from "@/components/legal/legal-page";
import { APP_NAME, CONTACTS, DEVELOPER } from "@/lib/brand";

export const metadata = { title: "Política de privacidad" };

export default function PrivacidadPage() {
  const mail = <a href={CONTACTS.email.href}>{CONTACTS.email.label}</a>;
  return (
    <LegalPage title="Política de privacidad">
      <p>
        En {APP_NAME} cuidamos tus datos. Esta política explica qué datos guardamos, para qué y qué derechos tenés, de acuerdo con la Ley
        25.326 de Protección de los Datos Personales. El responsable de los datos es {DEVELOPER}; podés escribirnos a {mail}.
      </p>

      <h2>1. Qué datos guardamos</h2>
      <ul>
        <li>
          <strong>Tu cuenta:</strong> mail y contraseña (guardada encriptada; nadie puede verla), fecha de alta y de último ingreso.
        </li>
        <li>
          <strong>Tu emprendimiento:</strong> lo que cargás vos: nombre, logo, rubro, datos de contacto, insumos, productos, costos,
          presupuestos (incluidos los datos de tus clientes que pongas en ellos), ventas e inversiones.
        </li>
        <li>
          <strong>Tu suscripción:</strong> el estado y las fechas de tu suscripción en Mercado Pago. Los datos de tu tarjeta los maneja
          Mercado Pago; nosotros no los vemos ni los guardamos.
        </li>
        <li>Datos técnicos mínimos para que el servicio funcione y sea seguro (por ejemplo, registros de errores).</li>
      </ul>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Para que la Calculadora funcione: guardar tus datos y hacer los cálculos.</li>
        <li>Para manejar tu cuenta y tu suscripción, y mandarte mails necesarios (confirmar tu cuenta, recuperar la contraseña, avisos del plan).</li>
        <li>Para mejorar el servicio con estadísticas generales (por ejemplo, cuántas cuentas cargaron un producto), sin mirar el contenido de tus datos.</li>
      </ul>
      <p>
        <strong>No vendemos ni compartimos tus datos con terceros con fines comerciales.</strong> Cada cuenta ve solo sus propios datos.
      </p>

      <h2>3. Con quién se comparten</h2>
      <p>Solo con los servicios que necesitamos para que la Calculadora funcione, que los tratan por cuenta nuestra:</p>
      <ul>
        <li>Supabase (base de datos y cuentas) y Vercel (alojamiento de la aplicación).</li>
        <li>Mercado Pago (cobro de la suscripción).</li>
        <li>Resend (envío de los mails de la cuenta).</li>
        <li>GitHub (copias de seguridad encriptadas, en un repositorio privado).</li>
      </ul>
      <p>
        Algunos de estos servicios guardan los datos fuera de Argentina (por ejemplo, en Estados Unidos o Brasil), con medidas de
        seguridad adecuadas. Al usar la Calculadora prestás tu consentimiento para esa transferencia.
      </p>

      <h2>4. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tengas tu cuenta. Si pedís darla de baja, borramos tus datos; las copias de seguridad se renuevan y en 30 días tampoco
        quedan ahí.
      </p>

      <h2>5. Tus derechos</h2>
      <p>
        Podés pedir en cualquier momento acceder a tus datos, corregirlos, actualizarlos o borrarlos escribiéndonos a {mail}. También podés
        bajarte todos tus datos desde Ajustes → Backup. Te respondemos dentro de los plazos de la ley (10 días corridos para el acceso y 5
        días hábiles para la corrección o el borrado).
      </p>
      <p className="rounded-lg bg-muted p-4 text-sm">
        El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no
        inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de
        la Ley Nº 25.326. La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la
        atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las
        normas vigentes en materia de protección de datos personales.
      </p>

      <h2>6. Seguridad</h2>
      <p>
        Usamos conexiones seguras (HTTPS), contraseñas encriptadas, separación de los datos de cada cuenta y copias de seguridad
        encriptadas. Ningún sistema es 100% infalible: si detectáramos un problema que afecte tus datos, te avisamos.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Usamos solo las cookies necesarias para mantener tu sesión iniciada. No usamos cookies de publicidad ni de seguimiento de terceros.
      </p>

      <h2>8. Cambios</h2>
      <p>Si cambiamos esta política en algo importante, te avisamos por mail o dentro de la Calculadora.</p>
    </LegalPage>
  );
}
