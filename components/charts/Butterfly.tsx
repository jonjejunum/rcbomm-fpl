"use client";
import { useState } from "react";

interface Side { label: string; color: string; values: number[] }
interface Props { categories: string[]; a: Side; b: Side }

/** Mirrored bars on a shared scale: A grows left, B grows right, category in the middle. */
export default function Butterfly({ categories, a, b }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...a.values.map(Math.abs), ...b.values.map(Math.abs));
  const pct = (v: number) => (Math.max(0, v) / max) * 82;

  return (
    <div className="stack">
      <div className="legend" aria-hidden style={{ justifyContent: "space-between" }}>
        <span className="legend-item"><span className="swatch" style={{ background: a.color }} />{a.label}</span>
        <span className="legend-item"><span className="swatch" style={{ background: b.color }} />{b.label}</span>
      </div>
      <div className="bars">
        {categories.map((c, i) => {
          const av = a.values[i], bv = b.values[i];
          const lead = av === bv ? "Level" : `${av > bv ? a.label : b.label} +${Math.abs(av - bv)}`;
          return (
            <div
              key={c} tabIndex={0}
              style={{ display: "grid", gridTemplateColumns: "1fr minmax(96px,auto) 1fr", alignItems: "center", gap: 8, position: "relative" }}
              onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              aria-label={`${c}: ${a.label} ${av}, ${b.label} ${bv}`}
            >
              <div className="bar-track">
                <span className="bar-fill" style={{ right: 0, width: `${pct(av)}%`, background: a.color, borderRadius: "4px 0 0 4px", opacity: hover === null || hover === i ? 1 : 0.55 }} />
                <span className="bar-val" style={{ right: `${pct(av) + 2}%` }}>{av}</span>
              </div>
              <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-2)" }}>{c}</div>
              <div className="bar-track">
                <span className="bar-fill" style={{ left: 0, width: `${pct(bv)}%`, background: b.color, borderRadius: "0 4px 4px 0", opacity: hover === null || hover === i ? 1 : 0.55 }} />
                <span className="bar-val" style={{ left: `${pct(bv) + 2}%` }}>{bv}</span>
              </div>
              {hover === i && (
                <div className="tooltip" style={{ left: "50%", top: 0 }}>
                  <div className="tooltip-title">{c}</div>
                  <strong>{lead}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
