import LineChart from "@/components/charts/LineChart";
import { Card, HeatTable, ManagerChip, RankMove, Signed, Tile } from "@/components/ui";
import {
  colorOf, gwWinners, gws, history, manager, managers, meta, standings, summary,
} from "@/lib/data";

export default function Home() {
  const leader = standings[0];
  const second = standings[1];
  const winners = gwWinners();
  const latest = winners[winners.length - 1];

  // points behind the leader after each GW - lines converge less than raw totals, so gaps read clearly
  const race = gws.map((_, i) => Math.max(...managers.map((m) => history(m.id)[i]?.total ?? 0)));
  const raceSeries = standings.map((s) => ({
    id: s.m,
    label: manager(s.m).first,
    color: colorOf(s.m),
    values: history(s.m).map((r, i) => r.total - race[i]),
  }));

  const allGw = managers.flatMap((m) => history(m.id).map((r) => ({ ...r, m: m.id })));
  const bestGw = allGw.reduce((a, b) => (b.pts > a.pts ? b : a), allGw[0]);
  const benchKing = managers.map((m) => ({ id: m.id, ...summary(m.id) })).sort((a, b) => b.bench - a.bench)[0];
  const luckiest = managers.map((m) => ({ id: m.id, ...summary(m.id) })).sort((a, b) => b.luck - a.luck)[0];

  return (
    <main className="wrap">
      <section className="hero">
        <span className="eyebrow">{meta.name} · after gameweek {meta.current_gw}</span>
        <div className="spread">
          <div className="stack" style={{ gap: 4 }}>
            <h1>{manager(leader.m).first} leads the way</h1>
            <p className="ink2">
              {manager(leader.m).team}
              {second && <> · {leader.total - second.total} pts clear of {manager(second.m).first}</>}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="hero-figure">{leader.total}</div>
            <span className="muted">points</span>
          </div>
        </div>
      </section>

      <div className="tiles">
        {latest && (
          <Tile
            label={`GW${latest.gw} top score`}
            value={latest.pts}
            sub={latest.ids.map((id) => manager(id).first).join(" & ")}
          />
        )}
        {bestGw && <Tile label="Season-best gameweek" value={bestGw.pts} sub={`${manager(bestGw.m).first} · GW${bestGw.gw}`} />}
        {benchKing && <Tile label="Most points left on bench" value={benchKing.bench} sub={manager(benchKing.id).first} />}
        {luckiest && <Tile label="Luckiest vs expected" value={<Signed n={luckiest.luck} />} sub={manager(luckiest.id).first} />}
      </div>

      <Card title="League table" sub="Classic scoring. The arrow shows movement since last gameweek.">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="c">#</th>
                <th>Manager</th>
                <th className="r">GW{meta.current_gw}</th>
                <th className="r hide-sm">Last 3</th>
                <th className="r hide-sm">GW wins</th>
                <th className="r hide-sm">Bench</th>
                <th className="r">Total</th>
                <th className="r hide-sm">Gap</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => {
                const sm = summary(s.m);
                return (
                  <tr key={s.m}>
                    <td className="c">
                      <div className="rank">{s.rank}</div>
                      <RankMove rank={s.rank} last={s.last_rank} />
                    </td>
                    <td><ManagerChip id={s.m} /></td>
                    <td className="r">{s.gw}</td>
                    <td className="r hide-sm">{sm.form}</td>
                    <td className="r hide-sm">{sm.gwWins}</td>
                    <td className="r hide-sm">{sm.bench}</td>
                    <td className="r"><strong>{s.total}</strong></td>
                    <td className="r hide-sm muted">{s.total === leader.total ? "—" : `−${leader.total - s.total}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="The title race"
        sub="Points behind the leader after each gameweek. 0 means top of the table. Hover or use the arrow keys to read a week."
        table={
          <table>
            <thead><tr><th>Manager</th>{gws.map((g) => <th key={g} className="r">GW{g}</th>)}</tr></thead>
            <tbody>
              {raceSeries.map((s) => (
                <tr key={s.id}><td>{s.label}</td>{s.values.map((v, i) => <td key={i} className="r">{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        }
      >
        <LineChart x={gws} series={raceSeries} height={300} ariaLabel="Points behind the leader by gameweek" />
      </Card>

      <Card title="Gameweek by gameweek" sub="Points each week. Darker means more; the week's top score is in bold.">
        <HeatTable
          cols={gws}
          colLabel={(g) => `GW${g}`}
          rows={standings.map((s) => ({
            key: s.m,
            head: <ManagerChip id={s.m} team={false} />,
            values: history(s.m).map((r) => r.pts),
          }))}
        />
      </Card>
    </main>
  );
}
