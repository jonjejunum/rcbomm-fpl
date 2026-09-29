"use client";
import { useLayoutEffect, useRef, useState } from "react";

/** Track an element's rendered width so SVG text stays 1:1 instead of scaling with a viewBox. */
export function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // measure before first paint so the SVG never renders at the placeholder width
    setWidth(Math.max(260, Math.round(el.getBoundingClientRect().width)));
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) { max = min + 1; }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export const fmt = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: 1 });

/** Named formats, so server components can choose one without passing a function across the client boundary. */
export type Format = "num" | "signed" | "money";
export const formatters: Record<Format, (n: number) => string> = {
  num: fmt,
  signed: (n) => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(Math.abs(n))}` : "0"),
  money: (n) => `£${n.toFixed(1)}m`,
};
