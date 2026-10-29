import { AuthScreen } from "@/components/auth/auth-screen";
import { NewPasswordForm } from "@/components/auth/login-form";

export const metadata = { title: "Nueva contraseña" };

export default function NewPasswordPage() {
  return (
    <AuthScreen title="Elegí una contraseña nueva">
      <NewPasswordForm />
    </AuthScreen>
  );
}
