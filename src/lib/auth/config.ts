/**
 * El ingreso usa Supabase Auth del mismo proyecto que la base (DATABASE_URL).
 * URL y clave publicable (anon): Project Settings → API Keys.
 */
export const AUTH_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const AUTH_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const authConfigured = Boolean(AUTH_URL && AUTH_KEY);

/** Pantallas que se ven sin sesión. */
export const PUBLIC_PATHS = ["/ingresar", "/registro", "/recuperar"];
export const LOGIN_PATH = "/ingresar";
