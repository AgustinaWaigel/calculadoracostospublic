"use client";

import { useEffect, useRef } from "react";

/**
 * Hace aparecer su contenido cuando entra en pantalla (los estilos están en globals.css:
 * [data-reveal]). `delay` escalona varios elementos seguidos.
 */
export function Reveal({
  children,
  delay = 0,
  zoom = false,
  as: Tag = "div",
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  zoom?: boolean;
  as?: "div" | "li" | "section";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-visible", "");
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-reveal={zoom ? "zoom" : ""}
      className={className}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
