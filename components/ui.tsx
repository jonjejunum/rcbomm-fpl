import Link from "next/link";
import type { ReactNode } from "react";
import { colorOf, manager } from "@/lib/data";

export function Card({ title, sub, children, table, className }: {
  title: string; sub?: ReactNode; children: ReactNode; table?: ReactNode; className?: string;
}) {
  return (
    <section className={`card ${className ?? ""}`}>
      <div className="card-head">
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children}
      {table && (
        <details className="table-view">
          <summary>Show as table</summary>
          <div className="table-scroll">{table}</div>
        </details>
      )}
    </section>
  );
}

export function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {sub && <span className="tile-sub">{sub}</span>}
    </div>
  );
}

export function ManagerChip({ id, team = true, link = true }: { id: number; team?: boolean; link?: boolean }) {
  const m = manager(id);
  if (!m) return <span className="muted">—</span>;
  const inner = (
    <>
      <span className="swatch" style={{ background: colorOf(id) }} />
      <span style={{ display: "grid", minWidth: 0, lineHeight: 1.25 }}>
        <span className="chip-name">{m.first}</span>
        {team && <span className="chip-team">{m.team}</span>}
      </span>
    </>
  );
  return link ? <Link href={`/managers/${id}`} className="chip">{inner}</Link> : <span className="chip">{inner}</span>;
}

export function RankMove({ rank, last }: { rank: number; last: number }) {
  if (!last || rank === last) return <span className="move muted" aria-label="no change">–</span>;
  const up = rank < last;
  return (
    <span className={`move ${up ? "good" : "bad"}`} aria-label={up ? `up ${last - rank}` : `down ${rank - last}`}>
      {up ? "▲" : "▼"}{Math.abs(last - rank)}
    </span>
  );
}

export function Signed({ n }: { n: number }) {
  const cls = n > 0 ? "good" : n < 0 ? "bad" : "muted";
  return <span className={`num ${cls}`}>{n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0"}</span>;
}

/** Sequential single-hue heat table: shading mixes the accent into the surface by value. */
export function HeatTable({ rows, cols, colLabel, highlightMax = "col", scale = "all", format = (v: number) => String(v) }: {
  rows: { key: string | number; head: ReactNode; values: number[] }[];
  cols: (string | number)[];
  colLabel?: (c: string | number) => string;
  highlightMax?: "col" | "none";
  scale?: "all" | "col"; // "col" shades each column against itself (columns on different scales)
  format?: (v: number) => string;
}) {
  const all = rows.flatMap((r) => r.values);
  const colMax = cols.map((_, j) => Math.max(...rows.map((r) => r.values[j])));
  const colMin = cols.map((_, j) => Math.min(...rows.map((r) => r.values[j])));
  const range = (j: number) => (scale === "col" ? [colMin[j], colMax[j]] : [Math.min(...all), Math.max(...all)]);
  return (
    <div className="table-scroll">
      <table className="heat">
        <thead>
          <tr>
            <th />
            {cols.map((c) => <th key={c} className="c">{colLabel ? colLabel(c) : c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td style={{ minWidth: 120 }}>{r.head}</td>
              {r.values.map((v, j) => {
                const [lo, hi] = range(j);
                const t = hi === lo ? 0.5 : (v - lo) / (hi - lo);
                const pct = Math.round(8 + t * 82);
                const top = highlightMax === "col" && v === colMax[j];
                return (
                  <td
                    key={j}
                    className={`cell${t > 0.55 ? " hot" : ""}${top ? " top" : ""}`}
                    style={{ background: `color-mix(in oklab, var(--seq) ${pct}%, var(--surface))` }}
                    title={`${colLabel ? colLabel(cols[j]) : cols[j]}: ${format(v)}`}
                  >
                    {format(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatusFlag({ status, news }: { status: string; news: string }) {
  if (status === "a" || !status) return null;
  const label = { d: "Doubtful", i: "Injured", s: "Suspended", u: "Unavailable", n: "Not in squad" }[status] ?? "Flag";
  return <span className="flag" title={news || label}>⚠ {label}</span>;
}
