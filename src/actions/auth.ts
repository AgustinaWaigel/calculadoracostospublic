"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authClient } from "@/lib/auth/server";
import { LOGIN_PATH, authConfigured } from "@/lib/auth/config";

export type AuthState = { error?: string; notice?: string; email?: string } | undefined;

const NOT_CONFIGURED = "Falta configurar el ingreso (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).";
const emailField = z.string().trim().toLowerCase().email("Revisá el mail");
const passwordField = z.string().min(8, "La contraseña tiene que tener al menos 8 caracteres").max(72, "Máximo 72 caracteres");

/** Token del captcha (si está activado en Supabase, sin él no deja entrar ni registrarse). */
function captchaToken(form: FormData) {
  const token = String(form.get("captcha") ?? "");
  return token ? { captchaToken: token } : {};
}

function isCaptchaError(error: { code?: string; message?: string }) {
  return error.code === "captcha_failed" || /captcha/i.test(error.message ?? "");
}

const CAPTCHA_FAILED = "No pudimos comprobar que no sos un robot. Esperá un momento y probá de nuevo.";

/** Solo rutas de esta app: nada de mandar a otro sitio después de ingresar. */
function safeBack(value: FormDataEntryValue | null) {
  const path = String(value ?? "");
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : "/";
}

/** URL pública de la app, para los links de los mails. */
async function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  if (!authConfigured) return { email, error: NOT_CONFIGURED };

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: String(form.get("clave") ?? ""),
    options: captchaToken(form),
  });
  if (error) {
    if (isCaptchaError(error)) return { email, error: CAPTCHA_FAILED };
    if (error.code === "over_request_rate_limit") return { email, error: "Demasiados intentos. Esperá unos minutos." };
    if (error.code === "email_not_confirmed") {
      return { email, error: "Todavía no confirmaste tu mail. Buscá el correo que te mandamos (fijate en spam)." };
    }
    return { email, error: "El mail o la contraseña no coinciden." };
  }
  redirect(safeBack(form.get("volver")));
}

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const rawEmail = String(form.get("email") ?? "").trim();
  if (!authConfigured) return { email: rawEmail, error: NOT_CONFIGURED };

  const email = emailField.safeParse(rawEmail);
  if (!email.success) return { email: rawEmail, error: email.error.issues[0].message };
  const password = passwordField.safeParse(String(form.get("clave") ?? ""));
  if (!password.success) return { email: rawEmail, error: password.error.issues[0].message };
  if (form.get("clave") !== form.get("clave2")) return { email: rawEmail, error: "Las contraseñas no coinciden." };

  const supabase = await authClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { emailRedirectTo: `${await appUrl()}/auth/confirmar`, ...captchaToken(form) },
  });
  if (error) {
    if (isCaptchaError(error)) return { email: rawEmail, error: CAPTCHA_FAILED };
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      return { email: rawEmail, error: "Hubo muchos registros seguidos. Probá de nuevo en un rato." };
    }
    if (error.code === "user_already_exists") return { email: rawEmail, error: "Ya hay una cuenta con ese mail. Probá ingresar." };
    if (error.code === "weak_password") return { email: rawEmail, error: "Esa contraseña es muy fácil de adivinar. Probá otra." };
    if (error.code === "email_address_not_authorized") {
      // El mail de prueba de Supabase solo escribe a los miembros del proyecto: falta un SMTP propio.
      return { email: rawEmail, error: "Todavía no podemos mandar mails de confirmación a ese correo. Avisanos por WhatsApp." };
    }
    if (error.code === "email_address_invalid") return { email: rawEmail, error: "Ese mail no es válido. Revisalo." };
    if (error.code === "signup_disabled") return { email: rawEmail, error: "El registro está cerrado por ahora." };
    // Queda en los logs (Vercel → Logs) para ver el motivo; al usuario, el código para poder avisarlo.
    console.error("[registro]", error.code, error.status, error.message);
    return { email: rawEmail, error: `No se pudo crear la cuenta (${error.code ?? error.status ?? "error"}). Probá de nuevo en un rato.` };
  }
  // Con la confirmación por mail activada (lo normal) todavía no hay sesión.
  if (!data.session) {
    return { email: rawEmail, notice: `Listo. Te mandamos un mail a ${email.data} para confirmar la cuenta.` };
  }
  redirect("/");
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const rawEmail = String(form.get("email") ?? "").trim();
  if (!authConfigured) return { email: rawEmail, error: NOT_CONFIGURED };
  const email = emailField.safeParse(rawEmail);
  if (!email.success) return { email: rawEmail, error: email.error.issues[0].message };

  const supabase = await authClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await appUrl()}/auth/confirmar?siguiente=/nueva-clave`,
    ...captchaToken(form),
  });
  if (error && isCaptchaError(error)) return { email: rawEmail, error: CAPTCHA_FAILED };
  // Mismo mensaje exista o no la cuenta: no revelamos qué mails están registrados.
  return { email: rawEmail, notice: "Si hay una cuenta con ese mail, te llega un link para elegir otra contraseña." };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  if (!authConfigured) return { error: NOT_CONFIGURED };
  const password = passwordField.safeParse(String(form.get("clave") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message };
  if (form.get("clave") !== form.get("clave2")) return { error: "Las contraseñas no coinciden." };

  const supabase = await authClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    if (error.code === "same_password") return { error: "Es la misma contraseña que tenías. Elegí otra." };
    return { error: "No se pudo cambiar la contraseña. Pedí un link nuevo y probá otra vez." };
  }
  redirect("/");
}

export async function logout() {
  if (authConfigured) await (await authClient()).auth.signOut();
  redirect(LOGIN_PATH);
}
