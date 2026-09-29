import raw from "@/data/league.json";

export type Pos = "GKP" | "DEF" | "MID" | "FWD";
export type Source =
  | "appearance" | "goals" | "assists" | "clean_sheets" | "defcon" | "bonus" | "saves" | "negative";

export interface Manager { id: number; entry_id: number; first: string; last: string; team: string; color: number }
export interface Standing { m: number; rank: number; last_rank: number; total: number; gw: number }
export interface GwRow { gw: number; pts: number; bench: number; xpts: number; total: number; rank: number }
export interface Pick {
  m: number; gw: number; el: number; slot: number; xi: boolean;
  pts: number; min: number; src: Partial<Record<Source, number>>; xpts: number;
}
export interface Player {
  id: number; name: string; full: string; club: string; pos: Pos; cost: number | null;
  pts: number; form: number; mins: number; xg: number; xa: number;
  status: string; news: string; owner: number | null; gw?: Record<string, number>;
}
export interface DraftPick { m: number; round: number; pick: number; el: number; for_team: number; season: number; auto: boolean }
export interface Transaction {
  m: number; gw: number; kind: string; in: number; out: number;
  in_pts: number; out_pts: number; in_counted: number; date: string;
}
export interface Trade {
  gw: number; from: number; to: number; date: string;
  items: { out: number; in: number; out_pts: number; in_pts: number }[];
}

interface LeagueData {
  meta: {
    league_id: number; name: string; updated: string; current_gw: number;
    current_gw_finished: boolean; gws: number[]; draft_date: string | null;
  };
  managers: Manager[];
  standings: Standing[];
  history: Record<string, GwRow[]>;
  picks: Pick[];
  players: Record<string, Player>;
  free_agents: number[];
  draft: DraftPick[];
  transactions: Transaction[];
  trades: Trade[];
  squad_value: Record<string, number>;
  value_history: Record<string, Record<string, number>>;
}

export const data = raw as unknown as LeagueData;
export const meta = data.meta;
export const gws = meta.gws;
export const latestGw = gws[gws.length - 1] ?? 0;

export const SOURCE_LABELS: Record<Source, string> = {
  appearance: "Appearances",
  goals: "Goals",
  assists: "Assists",
  clean_sheets: "Clean sheets",
  defcon: "Defensive contrib.",
  bonus: "Bonus",
  saves: "Saves & pen saves",
  negative: "Deductions",
};
export const SOURCES = Object.keys(SOURCE_LABELS) as Source[];
export const POSITIONS: Pos[] = ["GKP", "DEF", "MID", "FWD"];

const managerById = new Map(data.managers.map((m) => [m.id, m]));
export const managers = data.managers;
export const manager = (id: number) => managerById.get(id)!;
export const colorOf = (id: number) => `var(--s${(manager(id)?.color ?? 0) % 8 + 1})`;

export const player = (id: number): Player =>
  data.players[String(id)] ?? {
    id, name: `#${id}`, full: `Unknown player ${id}`, club: "?", pos: "MID", cost: null,
    pts: 0, form: 0, mins: 0, xg: 0, xa: 0, status: "u", news: "", owner: null,
  };

export const history = (id: number): GwRow[] => data.history[String(id)] ?? [];

/** Standings sorted by rank; falls back to our own totals if the API returned none yet. */
export const standings: Standing[] = data.standings.length
  ? [...data.standings].sort((a, b) => a.rank - b.rank)
  : managers
      .map((m) => {
        const h = history(m.id);
        const last = h[h.length - 1];
        return { m: m.id, rank: last?.rank ?? 0, last_rank: h[h.length - 2]?.rank ?? 0, total: last?.total ?? 0, gw: last?.pts ?? 0 };
      })
      .sort((a, b) => a.rank - b.rank);

export const picksFor = (id: number) => data.picks.filter((p) => p.m === id);

export function currentSquad(id: number) {
  return picksFor(id)
    .filter((p) => p.gw === latestGw)
    .sort((a, b) => a.slot - b.slot)
    .map((p) => ({ ...p, player: player(p.el), forTeam: pointsForTeam(id, p.el) }));
}

export function pointsForTeam(mid: number, el: number) {
  return data.picks.reduce((s, p) => (p.m === mid && p.el === el && p.xi ? s + p.pts : s), 0);
}

export function sourceTotals(id: number): Record<Source, number> {
  const out = Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<Source, number>;
  for (const p of picksFor(id)) {
    if (!p.xi) continue;
    for (const [k, v] of Object.entries(p.src)) {
      const key = (k in out ? k : "appearance") as Source;
      out[key] += v ?? 0;
    }
  }
  return out;
}

export function positionTotals(id: number): Record<Pos, number> {
  const out: Record<Pos, number> = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of picksFor(id)) if (p.xi) out[player(p.el).pos] += p.pts;
  return out;
}

export function topContributors(id: number, n = 10) {
  const by = new Map<number, number>();
  for (const p of picksFor(id)) if (p.xi) by.set(p.el, (by.get(p.el) ?? 0) + p.pts);
  return [...by.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([el, pts]) => ({ player: player(el), pts }));
}

export function summary(id: number) {
  const h = history(id);
  const total = h.reduce((s, r) => s + r.pts, 0);
  const xpts = h.reduce((s, r) => s + r.xpts, 0);
  const bench = h.reduce((s, r) => s + r.bench, 0);
  const best = h.reduce<GwRow | null>((b, r) => (!b || r.pts > b.pts ? r : b), null);
  const worst = h.reduce<GwRow | null>((b, r) => (!b || r.pts < b.pts ? r : b), null);
  const st = standings.find((s) => s.m === id);
  const wins = gwWinners().filter((w) => w.ids.includes(id)).length;
  return {
    total, xpts: Math.round(xpts), luck: Math.round(total - xpts), bench, best, worst,
    avg: h.length ? total / h.length : 0, rank: st?.rank ?? 0, lastRank: st?.last_rank ?? 0,
    value: data.squad_value[String(id)] ?? null, gwWins: wins,
    form: h.slice(-3).reduce((s, r) => s + r.pts, 0),
  };
}

/** Top scorer(s) of each gameweek. */
export function gwWinners() {
  return gws.map((gw, i) => {
    const scores = managers.map((m) => ({ id: m.id, pts: history(m.id)[i]?.pts ?? 0 }));
    const top = Math.max(...scores.map((s) => s.pts));
    return { gw, pts: top, ids: scores.filter((s) => s.pts === top).map((s) => s.id) };
  });
}

export function leagueAverage() {
  return gws.map((_, i) => managers.reduce((s, m) => s + (history(m.id)[i]?.pts ?? 0), 0) / Math.max(managers.length, 1));
}

export function headToHead(a: number, b: number) {
  const ha = history(a), hb = history(b);
  let aw = 0, bw = 0, d = 0;
  ha.forEach((r, i) => {
    const o = hb[i]?.pts ?? 0;
    if (r.pts > o) aw++; else if (r.pts < o) bw++; else d++;
  });
  return { aw, bw, d };
}

export const draftFor = (id: number) => data.draft.filter((d) => d.m === id).sort((a, b) => a.round - b.round);
export const transactionsFor = (id: number) => data.transactions.filter((t) => t.m === id);
export const transactions = data.transactions;
export const trades = data.trades;
export const draft = data.draft;
export const freeAgents = data.free_agents.map(player);
export const valueHistory = data.value_history;
export const squadValue = (id: number) => data.squad_value[String(id)] ?? null;

export const fmtSigned = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
export const fullName = (m: Manager) => `${m.first} ${m.last}`.trim();
