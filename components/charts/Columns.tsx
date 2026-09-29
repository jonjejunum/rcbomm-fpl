"use client";
import { useState } from "react";
import { fmt, niceTicks, useWidth } from "./useWidth";

interface Props {
  x: number[];
  values: number[];
  reference?: number[]; // e.g. league average, drawn as a tick across each column band
  referenceLabel?: string;
  color: string;
  label: string;
  height?: number;
  details?: string[];
}

/** One series of columns with an optional reference tick per column. */
export default function Columns({ x, values, reference, referenceLabel = "League average", color, label, height = 240, details }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { top: 18, right: 8, bottom: 26, left: 34 };
  const w = width - m.left - m.right;
  const h = height - m.top - m.bottom;
  const ticks = niceTicks(0, Math.max(1, ...values, ...(reference ?? [])), 4);
  const top = ticks[ticks.length - 1];
  const band = w / Math.max(1, x.length);
  const bw = Math.min(24, band - 2); // thin columns; the band's leftover is air
  const sy = (v: number) => h - (Math.max(0, v) / top) * h;
  const best = values.indexOf(Math.max(...values));

  return (
    <div className="stack">
      <div className="legend" aria-hidden>
        <span className="legend-item"><span className="swatch" style={{ background: color }} />{label}</span>
        {reference && <span className="legend-item"><span className="legend-line" style={{ background: "var(--ink-2)" }} />{referenceLabel}</span>}
      </div>
      <div ref={ref} className="chart">
        <svg
          viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`${label} by gameweek`}>
          <g transform={`translate(${m.left},${m.top})`}>
            {ticks.map((t) => (
              <g key={t} transform={`translate(0,${sy(t)})`}>
                <line x2={w} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} />
                <text x={-8} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="num">{fmt(t)}</text>
              </g>
            ))}
            {values.map((v, i) => {
              const cx = band * i + band / 2;
              const y = sy(v);
              const r = Math.min(4, (h - y) / 2);
              const showX = x.length <= 20 || i % 2 === 0;
              return (
                <g key={x[i]}>
                  <path
                    d={`M${cx - bw / 2},${h} V${y + r} Q${cx - bw / 2},${y} ${cx - bw / 2 + r},${y} H${cx + bw / 2 - r} Q${cx + bw / 2},${y} ${cx + bw / 2},${y + r} V${h} Z`}
                    fill={color} opacity={hover === null || hover === i ? 1 : 0.55}
                  />
                  {reference && (
                    <line x1={cx - bw / 2 - 3} x2={cx + bw / 2 + 3} y1={sy(reference[i])} y2={sy(reference[i])} stroke="var(--ink-2)" strokeWidth={2} strokeLinecap="round" />
                  )}
                  {i === best && (
                    <text x={cx} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--ink)" className="num">{v}</text>
                  )}
                  {showX && <text x={cx} y={h + 17} textAnchor="middle" fontSize={11} fill="var(--muted)">{x[i]}</text>}
                  <rect
                    x={band * i} width={band} height={h} fill="transparent" tabIndex={0}
                    aria-label={`GW${x[i]}: ${v}`}
                    onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  />
                </g>
              );
            })}
          </g>
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{ left: Math.min(Math.max(m.left + band * hover + band / 2, 80), width - 80), top: m.top + sy(values[hover]) }}>
            <div className="tooltip-title">Gameweek {x[hover]}</div>
            <div className="tooltip-row"><span className="tooltip-key">{label}</span><strong>{values[hover]}</strong></div>
            {reference && <div className="tooltip-row"><span className="tooltip-key">{referenceLabel}</span><strong>{fmt(reference[hover])}</strong></div>}
            {details?.[hover] && <div className="ink2" style={{ fontSize: 12, marginTop: 2 }}>{details[hover]}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
