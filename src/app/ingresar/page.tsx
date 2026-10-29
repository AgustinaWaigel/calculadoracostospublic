import { AuthLink, AuthScreen } from "@/components/auth/auth-screen";
import { LoginForm } from "@/components/auth/login-form";
import { authConfigured } from "@/lib/auth/config";

export const metadata = { title: "Ingresar" };

const REASONS: Record<string, string> = {
  config: "El ingreso todavía no está configurado en el servidor.",
  link: "El link venció o ya se usó. Ingresá, o pedí uno nuevo desde “Me olvidé la contraseña”.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; motivo?: string }>;
}) {
  const { volver, motivo } = await searchParams;

  return (
    <AuthScreen
      title="Ingresar"
      intro="Entrá con tu cuenta para ver tus insumos, productos y presupuestos."
      notice={motivo && REASONS[motivo]}
      footer={
        <p>
          ¿No tenés cuenta? <AuthLink href="/registro">Creá una gratis</AuthLink>
        </p>
      }
    >
      {authConfigured ? (
        <LoginForm back={volver} />
      ) : (
        <p className="text-sm">
          Falta cargar <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
      )}
    </AuthScreen>
  );
}
