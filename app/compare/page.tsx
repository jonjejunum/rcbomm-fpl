import type { Metadata } from "next";
import { Suspense } from "react";
import {
  POSITIONS, SOURCES, SOURCE_LABELS, colorOf, currentSquad, gws, history, managers, positionTotals,
  sourceTotals, standings, summary,
} from "@/lib/data";
import CompareClient, { type Bundle } from "./CompareClient";

export const metadata: Metadata = { title: "Head to head" };

export default function ComparePage() {
  const bundles: Bundle[] = managers.map((m) => {
    const s = summary(m.id);
    const src = sourceTotals(m.id);
    const pos = positionTotals(m.id);
    return {
      id: m.id, first: m.first, team: m.team, color: colorOf(m.id),
      pts: history(m.id).map((r) => r.pts),
      totals: history(m.id).map((r) => r.total),
      total: s.total, rank: s.rank, bench: s.bench, luck: s.luck, best: s.best?.pts ?? 0, value: s.value,
      sources: SOURCES.map((k) => src[k]),
      positions: POSITIONS.map((p) => pos[p]),
      squad: currentSquad(m.id).map((p) => ({
        el: p.el, name: p.player.name, pos: p.player.pos, club: p.player.club, slot: p.slot, forTeam: p.forTeam, season: p.player.pts,
      })),
    };
  });
  const order = standings.map((s) => s.m);
  return (
    <main className="wrap">
      <section className="hero">
        <span className="eyebrow">Head to head</span>
        <h1>Compare two teams</h1>
      </section>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <CompareClient
          bundles={bundles} gws={gws} defaultA={order[0]} defaultB={order[1] ?? order[0]}
          sourceLabels={SOURCES.map((k) => SOURCE_LABELS[k])} positions={POSITIONS}
        />
      </Suspense>
    </main>
  );
}
