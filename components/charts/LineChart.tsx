"use client";
import { useMemo, useState } from "react";
import { type Format, formatters, niceTicks, useWidth } from "./useWidth";

export interface LineSeries { id: string | number; label: string; color: string; values: number[] }

interface Props {
  x: number[];
  series: LineSeries[];
  height?: number;
  xPrefix?: string;
  format?: Format;
  endLabels?: boolean;
  ariaLabel: string;
}

const LABEL_GAP = 15;

export default function LineChart({
  x, series, height = 280, xPrefix = "GW", format = "num", endLabels = true, ariaLabel,
}: Props) {
  const yFormat = formatters[format];
  const xLabel = (v: number) => `${xPrefix}${v}`;
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const m = { top: 12, right: endLabels ? 104 : 16, bottom: 28, left: 40 };
  const w = width - m.left - m.right;
  const h = height - m.top - m.bottom;

  const all = series.flatMap((s) => s.values);
  const ticks = niceTicks(Math.min(0, ...all), Math.max(1, ...all), 5);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const sx = (i: number) => (x.length <= 1 ? w / 2 : (i / (x.length - 1)) * w);
  const sy = (v: number) => h - ((v - y0) / (y1 - y0)) * h;

  const labels = useMemo(() => {
    if (!endLabels) return [];
    const last = x.length - 1;
    const items = series
      .map((s) => ({ s, y: sy(s.values[last] ?? 0), ly: sy(s.values[last] ?? 0) }))
      .sort((a, b) => a.y - b.y);
    // push overlapping labels apart; leader lines keep them attached to their line ends
    for (let i = 1; i < items.length; i++) {
      if (items[i].ly - items[i - 1].ly < LABEL_GAP) items[i].ly = items[i - 1].ly + LABEL_GAP;
    }
    const overflow = items.length ? items[items.length - 1].ly - h : 0;
    if (overflow > 0) {
      for (let i = items.length - 1; i >= 0; i--) {
        items[i].ly -= overflow;
        if (i > 0 && items[i].ly - items[i - 1].ly >= LABEL_GAP) break;
        if (i > 0) items[i - 1].ly = Math.min(items[i - 1].ly, items[i].ly - LABEL_GAP);
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, x.length, endLabels, h, y0, y1]);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    const i = x.length <= 1 ? 0 : Math.round((px / box.width) * (x.length - 1));
    setHover(Math.max(0, Math.min(x.length - 1, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setHover((v) => Math.min(x.length - 1, (v ?? -1) + 1));
    if (e.key === "ArrowLeft") setHover((v) => Math.max(0, (v ?? x.length) - 1));
    if (e.key === "Escape") setHover(null);
  };

  const hx = hover !== null ? m.left + sx(hover) : 0;

  return (
    <div className="stack">
      {series.length > 1 && (
        <div className="legend" aria-hidden>
          {series.map((s) => (
            <span key={s.id} className="legend-item">
              <span className="legend-line" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="chart">
        <svg
          viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={ariaLabel} tabIndex={0}
          onKeyDown={onKey} onBlur={() => setHover(null)}
        >
          <g transform={`translate(${m.left},${m.top})`}>
            {ticks.map((t) => (
              <g key={t} transform={`translate(0,${sy(t)})`}>
                <line x2={w} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={-8} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)" className="num">
                  {yFormat(t)}
                </text>
              </g>
            ))}
            {x.map((v, i) => {
              const every = Math.ceil(x.length / Math.max(2, Math.floor(w / 46)));
              if (i % every !== 0 && i !== x.length - 1) return null;
              return (
                <text key={v} x={sx(i)} y={h + 18} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  {xLabel(v)}
                </text>
              );
            })}

            {series.map((s) => (
              <polyline
                key={s.id}
                points={s.values.map((v, i) => `${sx(i)},${sy(v)}`).join(" ")}
                fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
              />
            ))}
            {series.map((s) => {
              const i = s.values.length - 1;
              return i >= 0 ? (
                <circle key={s.id} cx={sx(i)} cy={sy(s.values[i])} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ) : null;
            })}

            {labels.map(({ s, y, ly }) => (
              <g key={s.id}>
                {Math.abs(ly - y) > 2 && (
                  <line x1={w + 6} y1={y} x2={w + 14} y2={ly} stroke="var(--axis)" strokeWidth={1} />
                )}
                <text x={w + 17} y={ly} dy="0.32em" fontSize={12} fill="var(--ink-2)">
                  {s.label}{" "}
                  <tspan fill="var(--ink)" fontWeight={600} className="num">{yFormat(s.values[s.values.length - 1] ?? 0)}</tspan>
                </text>
              </g>
            ))}

            {hover !== null && (
              <g>
                <line x1={sx(hover)} x2={sx(hover)} y2={h} stroke="var(--axis)" strokeWidth={1} />
                {series.map((s) => (
                  <circle key={s.id} cx={sx(hover)} cy={sy(s.values[hover] ?? 0)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </g>
            )}
            <rect
              width={w} height={h} fill="transparent"
              onPointerMove={onMove} onPointerLeave={() => setHover(null)}
            />
          </g>
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{ left: Math.min(Math.max(hx, 80), width - 80), top: m.top + 4 }}>
            <div className="tooltip-title">{xLabel(x[hover])}</div>
            {[...series]
              .sort((a, b) => (b.values[hover] ?? 0) - (a.values[hover] ?? 0))
              .map((s) => (
                <div key={s.id} className="tooltip-row">
                  <span className="tooltip-key">
                    <span className="legend-line" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <strong>{yFormat(s.values[hover] ?? 0)}</strong>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
