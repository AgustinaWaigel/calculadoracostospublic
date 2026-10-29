/**
 * El ingreso usa Supabase Auth del mismo proyecto que la base (DATABASE_URL).
 * URL y clave publicable (anon): Project Settings → API Keys.
 */
export const AUTH_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");

/**
 * Deja solo `https://REF.supabase.co`. Es fácil pegar la URL con `/rest/v1/` al final o la del
 * panel (`supabase.com/dashboard/project/REF`), y con eso Supabase responde 404.
 */
export function normalizeSupabaseUrl(raw: string): string {
  const value = raw.trim().replace(/^["']|["']$/g, "");
  if (!value) return "";
  const dashboard = value.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboard) return `https://${dashboard[1]}.supabase.co`;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).origin;
  } catch {
    return value;
  }
}
export const AUTH_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim().replace(/^["']|["']$/g, "");

export const authConfigured = Boolean(AUTH_URL && AUTH_KEY);

/** Pantallas que se ven sin sesión. */
export const PUBLIC_PATHS = ["/ingresar", "/registro", "/recuperar"];
export const LOGIN_PATH = "/ingresar";
