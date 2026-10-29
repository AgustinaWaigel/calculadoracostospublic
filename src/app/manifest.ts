import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calculadora de Insumos · Alas de Ángel",
    short_name: "Insumos",
    description: "Costos, precios y presupuestos para emprendedores. Una herramienta de Alas de Ángel.",
    lang: "es-AR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#15803d",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Calculadora rápida", url: "/calculadora" },
      { name: "Nuevo presupuesto", url: "/presupuestos/nuevo" },
      { name: "Insumos", url: "/insumos" },
    ],
  };
}
