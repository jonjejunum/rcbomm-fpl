import type { Metadata } from "next";
import BarList from "@/components/charts/BarList";
import { Card, ManagerChip, Signed, Tile } from "@/components/ui";
import { colorOf, draft, manager, managers, player, trades, transactions } from "@/lib/data";

export const metadata: Metadata = { title: "Draft & moves" };

export default function DraftPage() {
  // draft board: columns in round-1 pick order, rows = rounds
  const order = draft.filter((d) => d.round === 1).sort((a, b) => a.pick - b.pick).map((d) => d.m);
  const rounds = [...new Set(draft.map((d) => d.round))].sort((a, b) => a - b);
  const cell = (m: number, r: number) => draft.find((d) => d.m === m && d.round === r);
  const maxFor = Math.max(1, ...draft.map((d) => d.for_team));

  const draftTotals = managers
    .map((m) => ({ id: m.id, pts: draft.filter((d) => d.m === m.id).reduce((s, d) => s + d.for_team, 0) }))
    .sort((a, b) => b.pts - a.pts);
  const steals = draft.filter((d) => d.round >= 6).sort((a, b) => b.for_team - a.for_team).slice(0, 5);
  const busts = draft.filter((d) => d.round <= 3).sort((a, b) => a.for_team - b.for_team).slice(0, 5);

  const moves = transactions.map((t) => ({ ...t, net: t.in_pts - t.out_pts }));
  const best = [...moves].sort((a, b) => b.net - a.net)[0];
  const worst = [...moves].sort((a, b) => a.net - b.net)[0];
  const active = managers
    .map((m) => ({ id: m.id, n: moves.filter((t) => t.m === m.id).length, net: moves.filter((t) => t.m === m.id).reduce((s, t) => s + t.net, 0) }))
    .sort((a, b) => b.net - a.net);

  return (
    <main className="wrap">
      <section className="hero">
        <span className="eyebrow">Draft &amp; moves</span>
        <h1>Who drafted well, and who worked the wire</h1>
      </section>

      <Card title="Draft board" sub="Each cell shows the pick and the points they've scored for the team that drafted them. Darker means more.">
        <div className="table-scroll">
          <table className="heat">
            <thead>
              <tr><th className="r">Rd</th>{order.map((m) => <th key={m}><ManagerChip id={m} team={false} /></th>)}</tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r}>
                  <td className="r muted">{r}</td>
                  {order.map((m) => {
                    const d = cell(m, r);
                    if (!d) return <td key={m} />;
                    const p = player(d.el);
                    const t = d.for_team / maxFor;
                    return (
                      <td
                        key={m}
                        className={`cell${t > 0.55 ? " hot" : ""}`}
                        style={{ background: `color-mix(in oklab, var(--seq) ${Math.round(6 + t * 84)}%, var(--surface))`, textAlign: "left", minWidth: 120 }}
                        title={`Pick ${d.pick}: ${p.full}. ${d.for_team} for team, ${d.season} season`}
                      >
                        <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, opacity: 0.8 }}>{p.pos} · {d.for_team} pts</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid-3">
        <Card title="Draft haul" sub="Points from drafted players while on the drafting team.">
          <BarList swatches rows={draftTotals.map((d) => ({ id: d.id, label: manager(d.id).first, color: colorOf(d.id), value: d.pts }))} />
        </Card>
        <Card title="Steals" sub="The best picks from round 6 onwards.">
          <PickTable rows={steals} />
        </Card>
        <Card title="Busts" sub="The weakest returns from rounds 1 to 3.">
          <PickTable rows={busts} />
        </Card>
      </div>

      <div className="tiles">
        <Tile label="Moves made" value={moves.length} sub="Accepted waivers and free-agent pickups" />
        {best && <Tile label="Best move" value={<Signed n={best.net} />} sub={`${manager(best.m).first}: ${player(best.in).name} for ${player(best.out).name}`} />}
        {worst && <Tile label="Worst move" value={<Signed n={worst.net} />} sub={`${manager(worst.m).first}: ${player(worst.in).name} for ${player(worst.out).name}`} />}
        <Tile label="Trades" value={trades.length} />
      </div>

      <div className="grid-2">
        <Card title="Net points from moves" sub="Points the player brought in has scored since the move, minus what the player dropped has scored.">
          <BarList
            swatches format="signed"
            rows={active.map((a) => ({ id: a.id, label: manager(a.id).first, color: colorOf(a.id), value: a.net, detail: `${a.n} moves` }))}
          />
        </Card>
        <Card title="Every move">
          <div className="table-scroll" style={{ maxHeight: 420, overflowY: "auto" }}>
            <table>
              <thead><tr><th className="r">GW</th><th>Team</th><th>In</th><th>Out</th><th className="r">Net</th></tr></thead>
              <tbody>
                {[...moves].sort((a, b) => b.gw - a.gw || b.net - a.net).map((t, i) => (
                  <tr key={i}>
                    <td className="r muted">{t.gw}</td>
                    <td><ManagerChip id={t.m} team={false} /></td>
                    <td>{player(t.in).name} <span className="muted num">{t.in_pts}</span></td>
                    <td>{player(t.out).name} <span className="muted num">{t.out_pts}</span></td>
                    <td className="r"><Signed n={t.net} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {trades.length > 0 && (
        <Card title="Trades">
          <div className="table-scroll">
            <table>
              <thead><tr><th className="r">GW</th><th>From</th><th>To</th><th>Players</th></tr></thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={i}>
                    <td className="r muted">{t.gw}</td>
                    <td><ManagerChip id={t.from} team={false} /></td>
                    <td><ManagerChip id={t.to} team={false} /></td>
                    <td>{t.items.map((it, j) => (
                      <div key={j}>{player(it.out).name} ({it.out_pts}) ⇄ {player(it.in).name} ({it.in_pts})</div>
                    ))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
}

function PickTable({ rows }: { rows: typeof draft }) {
  return (
    <div className="table-scroll">
      <table>
        <tbody>
          {rows.map((d) => {
            const p = player(d.el);
            return (
              <tr key={d.pick}>
                <td className="muted r">R{d.round}</td>
                <td>{p.name}<div className="muted" style={{ fontSize: 12 }}>{manager(d.m)?.first}</div></td>
                <td className="r"><strong>{d.for_team}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
