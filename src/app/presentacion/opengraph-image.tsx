import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/** La imagen que se ve al compartir el link (WhatsApp, Instagram, Facebook). */
export const alt = "Calculadora de Insumos · ¿Sabés cuánto te cuesta lo que vendés?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const fonts = path.join(process.cwd(), "src/assets/fonts");
  const [display, text] = await Promise.all([
    readFile(path.join(fonts, "LondrinaSolid-Regular.ttf")),
    readFile(path.join(fonts, "Karla-700.ttf")),
  ]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#7F2350", color: "#F6E7D4", fontFamily: "Karla" }}>
        <div style={{ fontSize: 30, color: "#F4A9CB", letterSpacing: 2 }}>CALCULADORA DE INSUMOS · ALAS DE ÁNGEL</div>
        <div style={{ fontFamily: "Londrina", fontSize: 104, lineHeight: 1, marginTop: 24, textTransform: "uppercase" }}>
          ¿Sabés cuánto te cuesta lo que vendés?
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 34 }}>
          <span style={{ background: "#B9D53B", color: "#0B5E41", padding: "12px 28px", borderRadius: 16 }}>Creá tu cuenta gratis</span>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Londrina", data: display }, { name: "Karla", data: text, weight: 700 }] },
  );
}
