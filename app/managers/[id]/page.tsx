import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BarList from "@/components/charts/BarList";
import Columns from "@/components/charts/Columns";
import { Squad } from "@/components/Squad";
import { Card, Signed, Tile } from "@/components/ui";
import {
  POSITIONS, SOURCES, SOURCE_LABELS, colorOf, draftFor, fullName, gws, history, leagueAverage,
  manager, managers, player, positionTotals, sourceTotals, summary, topContributors, transactionsFor,
} from "@/lib/data";

export function generateStaticParams() {
  return managers.map((m) => ({ id: String(m.id) }));
}

export async function generateMetadata({ params }: PageProps<"/managers/[id]">): Promise<Metadata> {
  const { id } = await params;
  const m = manager(Number(id));
  return { title: m ? `${m.first} · ${m.team}` : "Manager" };
}

export default async function ManagerPage({ params }: PageProps<"/managers/[id]">) {
  const { id: raw } = await params;
  const id = Number(raw);
  const m = manager(id);
  if (!m) notFound();

  const s = summary(id);
  const h = history(id);
  const avg = leagueAverage();
  const color = colorOf(id);
  const src = sourceTotals(id);
  const pos = positionTotals(id);
  const top = topContributors(id, 10);
  const picks = draftFor(id);
  const moves = transactionsFor(id);

  return (
    <main className="wrap">
      <section className="hero">
        <span className="eyebrow row" style={{ gap: 8 }}>
          <span className="swatch" style={{ background: color }} /> {fullName(m)}
        </span>
        <div className="spread">
          <h1>{m.team}</h1>
          <div style={{ textAlign: "right" }}>
            <div className="hero-figure">{s.total}</div>
            <span className="muted">points · {ordinal(s.rank)} of {managers.length}</span>
          </div>
        </div>
      </section>

      <div className="tiles">
        <Tile label="Average per gameweek" value={s.avg.toFixed(1)} sub={`League ${(avg.reduce((a, b) => a + b, 0) / Math.max(avg.length, 1)).toFixed(1)}`} />
        {s.best && <Tile label="Best gameweek" value={s.best.pts} sub={`GW${s.best.gw}`} />}
        <Tile label="Gameweek wins" value={s.gwWins} sub={`of ${gws.length}`} />
        <Tile label="Points on bench" value={s.bench} />
        <Tile label="Luck vs expected" value={<Signed n={s.luck} />} sub={`${s.xpts} expected points`} />
        {s.value !== null && <Tile label="Squad value" value={`£${s.value.toFixed(1)}m`} sub="FPL prices, current squad" />}
      </div>

      <Card title="Points by gameweek" sub="Columns show this team's score; the tick marks the league average that week.">
        <Columns
          x={gws} values={h.map((r) => r.pts)} reference={avg} color={color} label={m.first}
          details={h.map((r) => `Rank after GW: ${r.rank} · bench ${r.bench}`)}
        />
      </Card>

      <div className="grid-2">
        <Card title="Current squad" sub={`Gameweek ${gws[gws.length - 1]} line-up. Points are what each player has scored for this team.`}>
          <Squad id={id} />
        </Card>
        <div className="stack" style={{ gap: 22 }}>
          <Card title="Top contributors" sub="Starting-XI points scored for this team (auto-subs included).">
            <BarList rows={top.map((t) => ({ id: t.player.id, label: t.player.name, sub: `${t.player.pos} · ${t.player.club}`, color, value: t.pts }))} />
          </Card>
          <Card
            title="Where the points come from"
            table={
              <table><tbody>{SOURCES.map((k) => <tr key={k}><td>{SOURCE_LABELS[k]}</td><td className="r">{src[k]}</td></tr>)}</tbody></table>
            }
          >
            <BarList rows={SOURCES.map((k) => ({ id: k, label: SOURCE_LABELS[k], color, value: src[k] }))} />
          </Card>
          <Card title="By position">
            <BarList rows={POSITIONS.map((p) => ({ id: p, label: p, color, value: pos[p] }))} />
          </Card>
        </div>
      </div>

      <div className="grid-2">
        <Card title="Draft picks" sub="Points scored for this team, compared with the player's season total.">
          <div className="table-scroll">
            <table>
              <thead><tr><th className="r">Rd</th><th>Player</th><th className="r">For team</th><th className="r">Season</th></tr></thead>
              <tbody>
                {picks.map((d) => {
                  const p = player(d.el);
                  return (
                    <tr key={d.pick}>
                      <td className="r muted">{d.round}</td>
                      <td>{p.name} <span className="muted" style={{ fontSize: 12 }}>{p.pos}</span>{p.owner !== id && <span className="pill" style={{ marginLeft: 6 }}>gone</span>}</td>
                      <td className="r"><strong>{d.for_team}</strong></td>
                      <td className="r muted">{d.season}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Waivers & free agents" sub="Points each player has scored since the move, whoever owned them.">
          {moves.length === 0 ? <p className="muted">No moves yet.</p> : (
            <div className="table-scroll">
              <table>
                <thead><tr><th className="r">GW</th><th>In</th><th>Out</th><th className="r">Net</th></tr></thead>
                <tbody>
                  {moves.map((t, i) => (
                    <tr key={i}>
                      <td className="r muted">{t.gw}</td>
                      <td>{player(t.in).name} <span className="muted num">{t.in_pts}</span></td>
                      <td>{player(t.out).name} <span className="muted num">{t.out_pts}</span></td>
                      <td className="r"><Signed n={t.in_pts - t.out_pts} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
