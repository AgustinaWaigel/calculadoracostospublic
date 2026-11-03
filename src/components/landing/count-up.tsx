"use client";

import { useEffect, useState } from "react";

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** Un número que cuenta desde 0 hasta `to` al cargar la página. */
export function CountUp({ to, prefix = "", duration = 1600, delay = 0 }: { to: number; prefix?: string; duration?: number; delay?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let frame = 0;
    const timer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [to, duration, delay]);

  return (
    <span className="tabular-nums">
      {prefix}
      {fmt.format(value)}
    </span>
  );
}
