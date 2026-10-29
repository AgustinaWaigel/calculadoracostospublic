import { AuthLink, AuthScreen } from "@/components/auth/auth-screen";
import { SignupForm } from "@/components/auth/login-form";

export const metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <AuthScreen
      title="Crear cuenta"
      intro="Tus datos son solo tuyos: nadie más ve tus costos ni tus presupuestos."
      footer={
        <p>
          ¿Ya tenés cuenta? <AuthLink href="/ingresar">Ingresá</AuthLink>
        </p>
      }
    >
      <SignupForm />
    </AuthScreen>
  );
}
