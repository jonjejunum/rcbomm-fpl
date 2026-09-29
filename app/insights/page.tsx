import type { Metadata } from "next";
import BarList from "@/components/charts/BarList";
import LineChart from "@/components/charts/LineChart";
import { Card, HeatTable, ManagerChip, Signed, StatusFlag, Tile } from "@/components/ui";
import {
  SOURCES, SOURCE_LABELS, colorOf, data, freeAgents, history, manager, managers, player, sourceTotals,
  standings, summary, valueHistory,
} from "@/lib/data";

export const metadata: Metadata = { title: "Insights" };

export default function Insights() {
  const sums = standings.map((s) => ({ id: s.m, ...summary(s.m) }));
  const byLuck = [...sums].sort((a, b) => b.luck - a.luck);
  const byBench = [...sums].sort((a, b) => b.bench - a.bench);
  const byValue = [...sums].filter((s) => s.value !== null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const allGw = managers.flatMap((m) => history(m.id).map((r) => ({ ...r, m: m.id })));
  const high = allGw.reduce((a, b) => (b.pts > a.pts ? b : a), allGw[0]);
  const low = allGw.reduce((a, b) => (b.pts < a.pts ? b : a), allGw[0]);
  const benchGw = allGw.reduce((a, b) => (b.bench > a.bench ? b : a), allGw[0]);

  // league MVPs: points that actually counted for their owner
  const mvp = new Map<string, { m: number; el: number; pts: number }>();
  for (const p of data.picks) {
    if (!p.xi) continue;
    const k = `${p.m}-${p.el}`;
    const cur = mvp.get(k) ?? { m: p.m, el: p.el, pts: 0 };
    cur.pts += p.pts;
    mvp.set(k, cur);
  }
  const mvps = [...mvp.values()].sort((a, b) => b.pts - a.pts).slice(0, 10);

  const vGws = Object.keys(valueHistory).map(Number).sort((a, b) => a - b);

  return (
    <main className="wrap">
      <section className="hero">
        <span className="eyebrow">Insights</span>
        <h1>Luck, bench points and the waiver wire</h1>
      </section>

      {high && (
        <div className="tiles">
          <Tile label="Highest gameweek" value={high.pts} sub={`${manager(high.m).first} · GW${high.gw}`} />
          <Tile label="Lowest gameweek" value={low.pts} sub={`${manager(low.m).first} · GW${low.gw}`} />
          <Tile label="Worst bench in one week" value={benchGw.bench} sub={`${manager(benchGw.m).first} · GW${benchGw.gw}`} />
        </div>
      )}

      <div className="grid-2">
        <Card
          title="Luck: actual vs expected"
          sub="Expected points use xG, xA and xGC in place of goals, assists, clean sheets and goals conceded. Everything else counts as scored. Positive means you've run hot."
          table={
            <table>
              <thead><tr><th>Manager</th><th className="r">Actual</th><th className="r">Expected</th><th className="r">Luck</th></tr></thead>
              <tbody>{byLuck.map((s) => (
                <tr key={s.id}><td>{manager(s.id).first}</td><td className="r">{s.total}</td><td className="r">{s.xpts}</td><td className="r"><Signed n={s.luck} /></td></tr>
              ))}</tbody>
            </table>
          }
        >
          <BarList
            swatches
            format="signed"
            rows={byLuck.map((s) => ({
              id: s.id, label: manager(s.id).first, color: colorOf(s.id), value: s.luck,
              detail: `${s.total} actual vs ${s.xpts} expected`,
            }))}
          />
        </Card>
        <Card title="Points left on the bench" sub="Points scored by players who didn't make the XI (after auto-subs).">
          <BarList swatches rows={byBench.map((s) => ({ id: s.id, label: manager(s.id).first, color: colorOf(s.id), value: s.bench }))} />
        </Card>
      </div>

      <Card title="Where each team's points come from" sub="Starting XI only. Each column is shaded against itself, so you can see who leans on goals, clean sheets or bonus.">
        <HeatTable
          scale="col"
          cols={SOURCES}
          colLabel={(k) => SOURCE_LABELS[k as keyof typeof SOURCE_LABELS]}
          rows={standings.map((s) => {
            const src = sourceTotals(s.m);
            return { key: s.m, head: <ManagerChip id={s.m} team={false} />, values: SOURCES.map((k) => src[k]) };
          })}
        />
      </Card>

      <div className="grid-2">
        <Card title="League MVPs" sub="The player-team pairings that have delivered the most points.">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Player</th><th>Team</th><th className="r">Pts</th></tr></thead>
              <tbody>
                {mvps.map((r) => {
                  const p = player(r.el);
                  return (
                    <tr key={`${r.m}-${r.el}`}>
                      <td>{p.name} <span className="muted" style={{ fontSize: 12 }}>{p.pos} · {p.club}</span></td>
                      <td><ManagerChip id={r.m} team={false} /></td>
                      <td className="r"><strong>{r.pts}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Waiver wire gems" sub="The best unowned players right now. Go get them.">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Player</th><th className="r">Form</th><th className="r">Pts</th></tr></thead>
              <tbody>
                {freeAgents.slice(0, 10).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name} <span className="muted" style={{ fontSize: 12 }}>{p.pos} · {p.club}</span> <StatusFlag status={p.status} news={p.news} /></td>
                    <td className="r muted">{p.form.toFixed(1)}</td>
                    <td className="r"><strong>{p.pts}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {byValue.length > 0 && (
        <Card
          title="Squad value"
          sub={vGws.length > 1
            ? "Current squads priced at FPL (classic) prices, tracked each gameweek."
            : "Current squads priced at FPL (classic) prices. The trend fills in as the season goes on."}
        >
          {vGws.length > 1 ? (
            <LineChart
              x={vGws} height={260} ariaLabel="Squad value by gameweek" format="money"
              series={byValue.map((s) => ({
                id: s.id, label: manager(s.id).first, color: colorOf(s.id),
                values: vGws.map((g) => valueHistory[String(g)]?.[String(s.id)] ?? 0),
              }))}
            />
          ) : (
            <BarList swatches format="money" rows={byValue.map((s) => ({ id: s.id, label: manager(s.id).first, color: colorOf(s.id), value: s.value ?? 0 }))} />
          )}
        </Card>
      )}
    </main>
  );
}
