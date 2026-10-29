import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_KEY, AUTH_URL, LOGIN_PATH, PUBLIC_PATHS, authConfigured } from "@/lib/auth/config";

/**
 * La puerta de toda la app: hace falta haber iniciado sesión (cualquier cuenta registrada; cada
 * una ve solo sus datos). También renueva la sesión (las cookies vencen).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);
  // Los links de los mails (confirmar cuenta, recuperar clave) llegan sin sesión.
  if (pathname.startsWith("/auth/")) return NextResponse.next();

  if (!authConfigured) return isPublic ? NextResponse.next() : deny(request, "config");

  let response = NextResponse.next({ request });
  const supabase = createServerClient(AUTH_URL, AUTH_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return isPublic ? response : deny(request);

  // Con sesión no tiene sentido ver el ingreso ni el registro.
  if (isPublic) return NextResponse.redirect(new URL("/", request.url));
  return response;
}

function deny(request: NextRequest, reason?: "config") {
  // A las rutas de datos no se las redirige: responden 401 para que se vea el motivo.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });
  }
  const url = new URL(LOGIN_PATH, request.url);
  const back = request.nextUrl.pathname + request.nextUrl.search;
  if (back !== "/") url.searchParams.set("volver", back);
  if (reason) url.searchParams.set("motivo", reason);
  return NextResponse.redirect(url);
}

export const config = {
  // Todo menos los archivos estáticos que el navegador y la app instalada piden sin sesión.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons/|sw.js|offline.html|manifest.webmanifest).*)",
  ],
};
