import type { Metadata } from "next";
import BarList from "@/components/charts/BarList";
import { Card, ManagerChip, Signed, Tile } from "@/components/ui";
import {
  type DraftPick, type Pos, colorOf, draft, manager, managers, meta, player, standings, trades, transactions,
} from "@/lib/data";

export const metadata: Metadata = { title: "Draft & moves" };

const POS_SLOTS: [Pos, number][] = [["GKP", 2], ["DEF", 5], ["MID", 5], ["FWD", 3]];
const longDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function DraftPage() {
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

      {meta.drafts.map((d) => <DraftSection key={d.id} id={d.id} />)}
      {meta.upcoming_drafts.map((d) => (
        <p key={d.id} className="muted">
          Next draft: GW{d.gw}, {longDate(d.date)}. It will appear here, with full pick order, once it&apos;s done.
        </p>
      ))}

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

function DraftSection({ id }: { id: number }) {
  const info = meta.drafts.find((d) => d.id === id)!;
  const picks = draft.filter((d) => d.draft === id);
  const maxFor = Math.max(1, ...picks.map((d) => d.for_team));
  const title = meta.drafts.length > 1 ? `Draft ${meta.drafts.indexOf(info) + 1} · GW${info.gw}` : "Draft board";

  // ordered drafts: rows are rounds, columns in round-1 pick order.
  // reconstructed drafts (pick order unavailable): rows are squad slots by position, best first.
  let cols: number[];
  let rows: { key: string; head: string; cells: (DraftPick | undefined)[] }[];
  if (info.ordered) {
    cols = picks.filter((d) => d.round === 1).sort((a, b) => (a.pick ?? 0) - (b.pick ?? 0)).map((d) => d.m);
    const rounds = [...new Set(picks.map((d) => d.round ?? 0))].sort((a, b) => a - b);
    rows = rounds.map((r) => ({ key: `r${r}`, head: String(r), cells: cols.map((m) => picks.find((d) => d.m === m && d.round === r)) }));
  } else {
    cols = standings.map((s) => s.m);
    const byPos = (m: number, pos: Pos) =>
      picks.filter((d) => d.m === m && player(d.el).pos === pos).sort((a, b) => b.for_team - a.for_team);
    rows = POS_SLOTS.flatMap(([pos, n]) =>
      Array.from({ length: n }, (_, i) => ({ key: `${pos}${i}`, head: i === 0 ? pos : "", cells: cols.map((m) => byPos(m, pos)[i]) })));
  }

  const haul = managers
    .map((m) => ({ id: m.id, pts: picks.filter((d) => d.m === m.id).reduce((s, d) => s + d.for_team, 0) }))
    .sort((a, b) => b.pts - a.pts);
  const byFor = [...picks].sort((a, b) => b.for_team - a.for_team || b.season - a.season);
  const good = info.ordered ? byFor.filter((d) => (d.round ?? 0) >= 6).slice(0, 5) : byFor.slice(0, 5);
  const bad = info.ordered
    ? picks.filter((d) => (d.round ?? 99) <= 3).sort((a, b) => a.for_team - b.for_team).slice(0, 5)
    : [...byFor].reverse().filter((d) => player(d.el).pos !== "GKP").slice(0, 5);

  return (
    <>
      <Card
        title={title}
        sub={info.ordered
          ? `Drafted ${longDate(info.date)}. Each cell shows the pick and the points they've scored for the team that drafted them. Darker means more.`
          : `Drafted ${longDate(info.date)}. The draft API doesn't keep pick order once a draft is over, so each squad is shown by position, best first. Darker means more points for the team that drafted them.`}
      >
        <div className="table-scroll">
          <table className="heat">
            <thead>
              <tr><th className="r">{info.ordered ? "Rd" : ""}</th>{cols.map((m) => <th key={m}><ManagerChip id={m} team={false} /></th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="r muted" style={{ fontSize: 12 }}>{r.head}</td>
                  {r.cells.map((d, j) => {
                    if (!d) return <td key={j} />;
                    const p = player(d.el);
                    const t = d.for_team / maxFor;
                    return (
                      <td
                        key={j}
                        className={`cell${t > 0.55 ? " hot" : ""}`}
                        style={{ background: `color-mix(in oklab, var(--seq) ${Math.round(6 + t * 84)}%, var(--surface))`, textAlign: "left", minWidth: 116 }}
                        title={`${d.pick ? `Pick ${d.pick}: ` : ""}${p.full}. ${d.for_team} for team, ${d.season} season`}
                      >
                        <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, opacity: 0.8 }}>{info.ordered ? p.pos : p.club} · {d.for_team} pts</div>
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
          <BarList swatches rows={haul.map((d) => ({ id: d.id, label: manager(d.id).first, color: colorOf(d.id), value: d.pts }))} />
        </Card>
        <Card title={info.ordered ? "Steals" : "Best picks"} sub={info.ordered ? "The best picks from round 6 onwards." : "Most points delivered to the team that drafted them."}>
          <PickTable rows={good} />
        </Card>
        <Card title={info.ordered ? "Busts" : "Duds"} sub={info.ordered ? "The weakest returns from rounds 1 to 3." : "Outfield picks that have delivered the least."}>
          <PickTable rows={bad} />
        </Card>
      </div>
    </>
  );
}

function PickTable({ rows }: { rows: DraftPick[] }) {
  return (
    <div className="table-scroll">
      <table>
        <tbody>
          {rows.map((d) => {
            const p = player(d.el);
            return (
              <tr key={`${d.m}-${d.el}`}>
                <td className="muted r">{d.round ? `R${d.round}` : p.pos}</td>
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
