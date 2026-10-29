import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { authClient } from "@/lib/auth/server";
import { LOGIN_PATH } from "@/lib/auth/config";

/** Solo rutas de esta app. */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

/**
 * Destino de los links de los mails (confirmar la cuenta, recuperar la contraseña).
 * Acepta el flujo con `code` (PKCE, el de la plantilla por defecto) y el de `token_hash`.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("siguiente"));
  const supabase = await authClient();

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Link incompleto") };

  if (error) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("motivo", "link");
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL(type === "recovery" ? "/nueva-clave" : next, request.url));
}
