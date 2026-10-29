import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_KEY, AUTH_URL, LOGIN_PATH, authConfigured } from "./config";

/** Cliente de Supabase con la sesión de quien está usando la calculadora. */
export async function authClient() {
  const store = await cookies();
  return createServerClient(AUTH_URL, AUTH_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Desde un componente de servidor no se pueden escribir cookies; las renueva el middleware.
        }
      },
    },
  });
}

/** Cuenta que inició sesión (id y mail), o null. Una sola consulta por pedido. */
export const sessionUser = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  if (!authConfigured) return null;
  const { data } = await (await authClient()).auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: String(claims.sub), email: claims.email ? String(claims.email) : null };
});

/** Id de la cuenta; sin sesión, manda a ingresar. */
export async function requireUserId(): Promise<string> {
  const user = await sessionUser();
  if (!user) redirect(LOGIN_PATH);
  return user.id;
}
