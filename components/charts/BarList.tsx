"use client";
import { useState } from "react";
import { type Format, formatters } from "./useWidth";

export interface BarRow { id: string | number; label: string; sub?: string; color: string; value: number; detail?: string }

interface Props {
  rows: BarRow[];
  format?: Format;
  swatches?: boolean; // show an identity swatch beside the label (when colour means "manager")
}

/** Horizontal bars from a shared zero baseline; negative values grow left. Value labels sit at the bar tip. */
export default function BarList({ rows, format: f = "num", swatches = false }: Props) {
  const format = formatters[f];
  const [hover, setHover] = useState<string | number | null>(null);
  const min = Math.min(0, ...rows.map((r) => r.value));
  const max = Math.max(0, ...rows.map((r) => r.value));
  const span = max - min || 1;
  // leave room at both ends for the value labels
  const padL = min < 0 ? 14 : 0, padR = max > 0 ? 14 : 0;
  const pos = (v: number) => padL + ((v - min) / span) * (100 - padL - padR);
  const zero = pos(0);

  return (
    <div className="bars">
      {rows.map((r) => {
        const left = Math.min(pos(r.value), zero);
        const width = Math.max(Math.abs(pos(r.value) - zero), r.value === 0 ? 0 : 0.6);
        const neg = r.value < 0;
        const radius = neg ? "4px 0 0 4px" : "0 4px 4px 0";
        return (
          <div key={r.id} className="bar-row">
            <div className="bar-label">
              {swatches && <span className="swatch" style={{ background: r.color }} />}
              <span className="t">{r.label}</span>
              {r.sub && <span className="muted t" style={{ fontSize: 12 }}>{r.sub}</span>}
            </div>
            <div className="bar-track">
              {min < 0 && <span className="bar-zero" style={{ left: `${zero}%` }} />}
              <span
                className="bar-fill" tabIndex={0} role="img"
                aria-label={`${r.label}: ${format(r.value)}${r.detail ? `, ${r.detail}` : ""}`}
                style={{ left: `${left}%`, width: `${width}%`, background: r.color, borderRadius: radius }}
                onPointerEnter={() => setHover(r.id)} onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(r.id)} onBlur={() => setHover(null)}
              />
              <span
                className="bar-val"
                style={neg ? { right: `${100 - left + 1}%` } : { left: `${left + width + 1}%` }}
              >
                {format(r.value)}
              </span>
              {hover === r.id && r.detail && (
                <div className="tooltip" style={{ left: `${left + width / 2}%`, top: 0 }}>
                  <div className="tooltip-title">{r.label}</div>
                  <div className="tooltip-row"><strong>{format(r.value)}</strong></div>
                  <div className="ink2" style={{ fontSize: 12 }}>{r.detail}</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
