import { StatusFlag } from "@/components/ui";
import { currentSquad } from "@/lib/data";

export function Squad({ id }: { id: number }) {
  const squad = currentSquad(id);
  const xi = squad.filter((p) => p.slot <= 11);
  const bench = squad.filter((p) => p.slot > 11);
  const row = (p: (typeof squad)[number]) => (
    <div key={p.el} className={`squad-row${p.slot > 11 ? " bench" : ""}`}>
      <span className="pill">{p.player.pos}</span>
      <span style={{ minWidth: 0, display: "grid" }}>
        <span className="name">{p.player.name}</span>
        <span className="muted" style={{ fontSize: 12 }}>
          {p.player.club} · {p.player.pts} season <StatusFlag status={p.player.status} news={p.player.news} />
        </span>
      </span>
      <span className="muted num" style={{ fontSize: 12 }} title="Points last gameweek">GW {p.pts}</span>
      <strong className="num" style={{ minWidth: 28, textAlign: "right" }} title="Points scored for this team">{p.forTeam}</strong>
    </div>
  );
  return (
    <div className="squad-group">
      <div className="section-label">Starting XI</div>
      {xi.map(row)}
      <div className="section-label">Bench</div>
      {bench.map(row)}
    </div>
  );
}
