"use client";

import { useEffect, useRef } from "react";

/** Clave pública de Cloudflare Turnstile. Sin ella no se muestra captcha. */
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;

function loadScript() {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("No se pudo cargar el captcha"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * "No soy un robot" de Cloudflare. Deja el token en un campo oculto `captcha` del formulario;
 * Supabase lo verifica con su clave secreta (Authentication → Attack Protection).
 * `resetKey` cambia después de cada intento: un token sirve una sola vez.
 */
export function Captcha({ resetKey }: { resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CAPTCHA_SITE_KEY || !box.current) return;
    let id: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        id = window.turnstile.render(box.current, {
          sitekey: CAPTCHA_SITE_KEY,
          "response-field-name": "captcha",
          language: "es",
          theme: "light",
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [resetKey]);

  if (!CAPTCHA_SITE_KEY) return null;
  return <div ref={box} className="min-h-[65px]" />;
}
