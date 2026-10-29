import { AuthLink, AuthScreen } from "@/components/auth/auth-screen";
import { ResetForm } from "@/components/auth/login-form";

export const metadata = { title: "Recuperar contraseña" };

export default function ResetPage() {
  return (
    <AuthScreen
      title="Recuperar contraseña"
      intro="Poné el mail de tu cuenta y te mandamos un link para elegir una contraseña nueva."
      footer={<AuthLink href="/ingresar">Volver a ingresar</AuthLink>}
    >
      <ResetForm />
    </AuthScreen>
  );
}
