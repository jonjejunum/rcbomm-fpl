"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Butterfly from "@/components/charts/Butterfly";
import LineChart from "@/components/charts/LineChart";

export interface Bundle {
  id: number; first: string; team: string; color: string;
  pts: number[]; totals: number[];
  total: number; rank: number; bench: number; luck: number; best: number; value: number | null;
  sources: number[]; positions: number[];
  squad: { el: number; name: string; pos: string; club: string; slot: number; forTeam: number; season: number }[];
}

interface Props {
  bundles: Bundle[]; gws: number[]; defaultA: number; defaultB: number;
  sourceLabels: string[]; positions: string[];
}

export default function CompareClient({ bundles, gws, defaultA, defaultB, sourceLabels, positions }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const find = (v: string | null, fb: number) => bundles.find((b) => b.id === Number(v)) ?? bundles.find((b) => b.id === fb)!;
  const a = find(params.get("a"), defaultA);
  const b = find(params.get("b"), defaultB);

  const set = (key: "a" | "b", id: string) => {
    const q = new URLSearchParams(params.toString());
    q.set(key, id);
    router.replace(`${path}?${q.toString()}`, { scroll: false });
  };

  let aw = 0, bw = 0, d = 0;
  a.pts.forEach((p, i) => { if (p > b.pts[i]) aw++; else if (p < b.pts[i]) bw++; else d++; });
  const diff = a.totals.map((t, i) => t - b.totals[i]);

  const picker = (key: "a" | "b", cur: Bundle) => (
    <label className="row" style={{ gap: 8 }}>
      <span className="swatch" style={{ background: cur.color }} />
      <select value={cur.id} onChange={(e) => set(key, e.target.value)} aria-label={`Team ${key.toUpperCase()}`}>
        {bundles.map((x) => <option key={x.id} value={x.id}>{x.first} · {x.team}</option>)}
      </select>
    </label>
  );

  const rows: [string, (x: Bundle) => string | number, boolean][] = [
    ["League position", (x) => x.rank, false],
    ["Total points", (x) => x.total, true],
    ["Best gameweek", (x) => x.best, true],
    ["Points on bench", (x) => x.bench, false],
    ["Luck vs expected", (x) => (x.luck > 0 ? `+${x.luck}` : x.luck), true],
    ["Squad value", (x) => (x.value === null ? "–" : `£${x.value.toFixed(1)}m`), true],
  ];

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="row" style={{ gap: 14 }}>
        {picker("a", a)}
        <span className="vs">vs</span>
        {picker("b", b)}
      </div>

      <section className="card">
        <div className="spread" style={{ alignItems: "center" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div className="hero-figure">{aw}</div>
            <span className="ink2">{a.first} wins</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="tile-value muted">{d}</div>
            <span className="muted">draws</span>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div className="hero-figure">{bw}</div>
            <span className="ink2">{b.first} wins</span>
          </div>
        </div>
        <p className="muted" style={{ textAlign: "center", fontSize: 13 }}>
          Weekly head-to-head record: who scored more each gameweek
        </p>
        <div className="table-scroll">
          <table>
            <thead><tr><th className="r">{a.first}</th><th className="c" /><th>{b.first}</th></tr></thead>
            <tbody>
              {rows.map(([label, get]) => (
                <tr key={label}>
                  <td className="r"><strong>{get(a)}</strong></td>
                  <td className="c muted" style={{ fontSize: 13 }}>{label}</td>
                  <td><strong>{get(b)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Points each gameweek</h2>
          </div>
          <LineChart
            x={gws} endLabels={false} height={240} ariaLabel="Points each gameweek for both teams"
            series={a.id === b.id ? [{ id: a.id, label: a.first, color: a.color, values: a.pts }] : [
              { id: a.id, label: a.first, color: a.color, values: a.pts },
              { id: b.id, label: b.first, color: b.color, values: b.pts },
            ]}
          />
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Running gap</h2>
            <p>{a.first}&apos;s total minus {b.first}&apos;s. Above zero means {a.first} is ahead.</p>
          </div>
          <LineChart
            x={gws} endLabels={false} height={240} ariaLabel="Cumulative points difference"
            series={[{ id: "gap", label: `${a.first} − ${b.first}`, color: a.color, values: diff }]}
          />
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>Where the points come from</h2><p>Starting XI only, auto-subs included.</p></div>
          <Butterfly categories={sourceLabels} a={{ label: a.first, color: a.color, values: a.sources }} b={{ label: b.first, color: b.color, values: b.sources }} />
        </section>
        <section className="card">
          <div className="card-head"><h2>Points by position</h2></div>
          <Butterfly categories={positions} a={{ label: a.first, color: a.color, values: a.positions }} b={{ label: b.first, color: b.color, values: b.positions }} />
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>Squads side by side</h2><p>Current line-ups by position. The number is points scored for that team.</p></div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th className="r">Pts</th><th className="r">{a.first}</th><th className="c">Pos</th><th>{b.first}</th><th>Pts</th></tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const la = a.squad.filter((s) => s.pos === p).sort((x, y) => x.slot - y.slot);
                const lb = b.squad.filter((s) => s.pos === p).sort((x, y) => x.slot - y.slot);
                return Array.from({ length: Math.max(la.length, lb.length) }, (_, i) => (
                  <tr key={`${p}${i}`}>
                    <td className="r"><strong>{la[i]?.forTeam ?? ""}</strong></td>
                    <td className="r" style={{ opacity: la[i] && la[i].slot > 11 ? 0.6 : 1 }}>
                      {la[i] && <>{la[i].name} <span className="muted" style={{ fontSize: 12 }}>{la[i].club}</span></>}
                    </td>
                    <td className="c">{i === 0 && <span className="pill">{p}</span>}</td>
                    <td style={{ opacity: lb[i] && lb[i].slot > 11 ? 0.6 : 1 }}>
                      {lb[i] && <>{lb[i].name} <span className="muted" style={{ fontSize: 12 }}>{lb[i].club}</span></>}
                    </td>
                    <td><strong>{lb[i]?.forTeam ?? ""}</strong></td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12.5 }}>Faded rows are on the bench.</p>
      </section>
    </div>
  );
}
