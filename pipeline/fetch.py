"""Pull a Premier League Draft league from the public API and write data/league.json.

Run:  python pipeline/fetch.py            (league id from LEAGUE_ID env var, default below)

Everything the site shows is precomputed here, so the frontend stays a dumb renderer
and the FPL API is hit once per refresh rather than once per page view.
"""

from __future__ import annotations

import json
import math
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests

LEAGUE_ID = int(os.environ.get("LEAGUE_ID", "23779"))
DRAFT = "https://draft.premierleague.com/api/"
CLASSIC = "https://fantasy.premierleague.com/api/"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "league.json"
VALUE_HISTORY = ROOT / "data" / "value_history.json"

POS = {1: "GKP", 2: "DEF", 3: "MID", 4: "FWD"}

# Point-source buckets shown on the site. Keys are the stat names used in the live "explain" payload.
SOURCES = {
    "minutes": "appearance",
    "goals_scored": "goals",
    "assists": "assists",
    "clean_sheets": "clean_sheets",
    "defensive_contribution": "defcon",
    "bonus": "bonus",
    "saves": "saves",
    "penalties_saved": "saves",
    "goals_conceded": "negative",
    "yellow_cards": "negative",
    "red_cards": "negative",
    "own_goals": "negative",
    "penalties_missed": "negative",
}

session = requests.Session()
session.headers["User-Agent"] = "rcbomm-fpl (github.com/jonjejunum)"


def get(url: str) -> dict:
    for attempt in range(4):
        try:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            return r.json()
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def fnum(x) -> float:
    try:
        return float(x or 0)
    except (TypeError, ValueError):
        return 0.0


def expected_blocks(lam: float, size: int, kmax: int = 15) -> float:
    """E[floor(G / size)] for G ~ Poisson(lam)."""
    p, total = math.exp(-lam), 0.0
    for k in range(kmax + 1):
        total += (k // size) * p
        p *= lam / (k + 1)
    return total


def expected_points(stats: dict, explain_pts: dict, pos: str, scoring: dict) -> float:
    """Swap the luck-driven parts of a score (goals, assists, clean sheets, goals conceded)
    for their expected-value equivalents; keep everything else as actually scored."""
    luck_stats = ("goals_scored", "assists", "clean_sheets", "goals_conceded")
    base = sum(v for k, v in explain_pts.items() if k not in luck_stats)
    xg, xa, xgc = fnum(stats.get("expected_goals")), fnum(stats.get("expected_assists")), fnum(stats.get("expected_goals_conceded"))
    mins = stats.get("minutes", 0)
    exp = xg * scoring[f"goals_scored_{pos}"] + xa * scoring["assists"]
    if mins >= scoring["long_play_limit"]:
        exp += math.exp(-xgc) * scoring[f"clean_sheets_{pos}"]
    # the deduction is per *completed* block of goals, so take E[floor(G / limit)] under Poisson(xGC)
    exp += expected_blocks(xgc, scoring["concede_limit"]) * scoring[f"goals_conceded_{pos}"]
    return round(base + exp, 2)


def main() -> None:
    boot = get(DRAFT + "bootstrap-static")
    scoring = boot["settings"]["scoring"]
    teams = {t["id"]: t["short_name"] for t in boot["teams"]}
    events = boot["events"]["data"]
    game = get(DRAFT + "game")
    current = game["current_event"] or 0

    classic = {e["code"]: e for e in get(CLASSIC + "bootstrap-static/")["elements"]}

    details = get(DRAFT + f"league/{LEAGUE_ID}/details")
    league = details["league"]
    owners = {s["element"]: s["owner"] for s in get(DRAFT + f"league/{LEAGUE_ID}/element-status")["element_status"]}

    # --- managers -----------------------------------------------------------------
    entries = sorted(details["league_entries"], key=lambda e: e["id"])
    managers = []
    by_entry = {}  # entry_id (team id) -> league_entry id
    for i, e in enumerate(entries):
        managers.append({
            "id": e["id"],
            "entry_id": e["entry_id"],
            "first": e["player_first_name"],
            "last": e["player_last_name"],
            "team": e["entry_name"],
            "color": i,  # fixed categorical slot: colour follows the manager everywhere
        })
        by_entry[e["entry_id"]] = e["id"]

    # --- players ------------------------------------------------------------------
    players = {}
    for p in boot["elements"]:
        c = classic.get(p["code"], {})
        players[p["id"]] = {
            "id": p["id"],
            "name": p["web_name"],
            "full": f'{p["first_name"]} {p["second_name"]}',
            "club": teams.get(p["team"], "?"),
            "pos": POS[p["element_type"]],
            "cost": c.get("now_cost", 0) / 10 if c else None,
            "pts": p["total_points"],
            "form": fnum(p["form"]),
            "mins": p["minutes"],
            "xg": fnum(p["expected_goals"]),
            "xa": fnum(p["expected_assists"]),
            "status": p["status"],
            "news": p["news"],
            "owner": by_entry.get(owners.get(p["id"])),
        }

    # --- per-gameweek live stats and picks ------------------------------------------
    gws = [ev["id"] for ev in events if ev["id"] <= current]
    player_gw = defaultdict(dict)  # element -> gw -> {pts, src, xpts, ...}
    for gw in gws:
        live = get(DRAFT + f"event/{gw}/live")["elements"]
        for sid, el in live.items():
            eid = int(sid)
            if eid not in players:
                continue
            src = defaultdict(int)
            raw = defaultdict(int)
            for fixture_explain, _fixture in el.get("explain", []):
                for item in fixture_explain:
                    raw[item["stat"]] += item["points"]
                    src[SOURCES.get(item["stat"], "other")] += item["points"]
            st = el["stats"]
            player_gw[eid][gw] = {
                "pts": st["total_points"],
                "min": st["minutes"],
                "src": {k: v for k, v in src.items() if v},
                "xg": fnum(st.get("expected_goals")),
                "xa": fnum(st.get("expected_assists")),
                "xpts": expected_points(st, raw, players[eid]["pos"], scoring),
            }
        time.sleep(0.2)

    picks = []  # one row per manager/gw/squad slot
    history = {m["id"]: [] for m in managers}
    for m in managers:
        hist = {h["event"]: h for h in get(DRAFT + f"entry/{m['entry_id']}/history")["history"]}
        for gw in gws:
            ev = get(DRAFT + f"entry/{m['entry_id']}/event/{gw}")
            subs_in = {s["element_in"] for s in ev.get("subs", [])}
            subs_out = {s["element_out"] for s in ev.get("subs", [])}
            gw_pts = gw_bench = 0
            gw_x = 0.0
            for pk in ev["picks"]:
                eid = pk["element"]
                slot = pk["position"]
                counted = (slot <= 11 and eid not in subs_out) or eid in subs_in
                s = player_gw.get(eid, {}).get(gw, {"pts": 0, "min": 0, "src": {}, "xg": 0, "xa": 0, "xpts": 0})
                picks.append({
                    "m": m["id"], "gw": gw, "el": eid, "slot": slot, "xi": counted,
                    "pts": s["pts"], "min": s["min"], "src": s["src"], "xpts": s["xpts"],
                })
                if counted:
                    gw_pts += s["pts"]
                    gw_x += s["xpts"]
                else:
                    gw_bench += s["pts"]
            h = hist.get(gw, {})
            history[m["id"]].append({
                "gw": gw,
                # the official number wins; our recomputation is the fallback for an in-progress GW
                "pts": h.get("points", gw_pts),
                "bench": gw_bench,
                "xpts": round(gw_x, 1),
            })
            time.sleep(0.1)

    # cumulative totals and GW rank
    for m in managers:
        run = 0
        for row in history[m["id"]]:
            run += row["pts"]
            row["total"] = run
    for i, gw in enumerate(gws):
        order = sorted(managers, key=lambda m: -history[m["id"]][i]["total"])
        for rank, m in enumerate(order, 1):
            history[m["id"]][i]["rank"] = rank

    # --- standings ----------------------------------------------------------------
    standings = [{
        "m": s["league_entry"], "rank": s["rank"], "last_rank": s["last_rank"],
        "total": s["total"], "gw": s["event_total"],
    } for s in details.get("standings", [])]

    # --- draft ------------------------------------------------------------------------
    counted_pts = defaultdict(int)  # (manager, element) -> points that counted for them
    for p in picks:
        if p["xi"]:
            counted_pts[(p["m"], p["el"])] += p["pts"]

    choices = get(DRAFT + f"draft/{LEAGUE_ID}/choices")["choices"]
    draft = [{
        "m": by_entry.get(c["entry"]), "round": c["round"], "pick": c["pick"], "el": c["element"],
        "for_team": counted_pts[(by_entry.get(c["entry"]), c["element"])],
        "season": players.get(c["element"], {}).get("pts", 0),
        "auto": c["was_auto"],
    } for c in choices if c["element"]]

    # --- transactions (waivers / free agents) & trades ------------------------------
    def pts_from(eid: int, gw: int) -> int:
        return sum(v["pts"] for g, v in player_gw.get(eid, {}).items() if g >= gw)

    def counted_from(mid: int, eid: int, gw: int) -> int:
        return sum(p["pts"] for p in picks if p["m"] == mid and p["el"] == eid and p["gw"] >= gw and p["xi"])

    transactions = []
    for t in get(DRAFT + f"draft/league/{LEAGUE_ID}/transactions")["transactions"]:
        if t["result"] != "a":
            continue
        mid = by_entry.get(t["entry"])
        transactions.append({
            "m": mid, "gw": t["event"], "kind": {"w": "waiver", "f": "free agent"}.get(t["kind"], t["kind"]),
            "in": t["element_in"], "out": t["element_out"],
            "in_pts": pts_from(t["element_in"], t["event"]),
            "out_pts": pts_from(t["element_out"], t["event"]),
            "in_counted": counted_from(mid, t["element_in"], t["event"]),
            "date": t["added"],
        })

    trades = []
    for t in get(DRAFT + f"draft/league/{LEAGUE_ID}/trades").get("trades", []):
        if t.get("state") not in ("p", "a"):  # processed / accepted
            continue
        gw = t.get("event") or current
        trades.append({
            "gw": gw,
            "from": by_entry.get(t["offered_entry"]), "to": by_entry.get(t["received_entry"]),
            "items": [{"out": it["element_out"], "in": it["element_in"],
                       "out_pts": pts_from(it["element_out"], gw), "in_pts": pts_from(it["element_in"], gw)}
                      for it in t["tradeitem_set"]],
            "date": t.get("response_time") or t.get("offer_time"),
        })

    # --- squad value snapshots (the draft API has no prices, so we record our own trend) ---
    latest_gw = gws[-1] if gws else 0
    squad_value = {}
    for m in managers:
        els = [p["el"] for p in picks if p["m"] == m["id"] and p["gw"] == latest_gw]
        squad_value[m["id"]] = round(sum(players[e]["cost"] or 0 for e in els), 1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    vh = json.loads(VALUE_HISTORY.read_text(encoding="utf-8")) if VALUE_HISTORY.exists() else {}
    if latest_gw:
        vh[str(latest_gw)] = squad_value
    VALUE_HISTORY.write_text(json.dumps(vh, indent=1), encoding="utf-8")

    # keep the player table to the ones the site can reference, plus top free agents
    referenced = {p["el"] for p in picks} | {d["el"] for d in draft}
    for t in transactions:
        referenced |= {t["in"], t["out"]}
    for t in trades:
        for it in t["items"]:
            referenced |= {it["in"], it["out"]}
    free_agents = sorted((p for p in players.values() if p["owner"] is None), key=lambda p: -p["pts"])[:25]
    referenced |= {p["id"] for p in free_agents}
    for eid in referenced:
        if eid in players:
            players[eid]["gw"] = {g: v["pts"] for g, v in player_gw.get(eid, {}).items()}

    out = {
        "meta": {
            "league_id": LEAGUE_ID,
            "name": league["name"],
            "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "current_gw": current,
            "current_gw_finished": game["current_event_finished"],
            "gws": gws,
            "draft_date": league.get("draft_dt"),
        },
        "managers": managers,
        "standings": standings,
        "history": history,
        "picks": picks,
        "players": {eid: players[eid] for eid in sorted(referenced) if eid in players},
        "free_agents": [p["id"] for p in free_agents],
        "draft": draft,
        "transactions": transactions,
        "trades": trades,
        "squad_value": squad_value,
        "value_history": vh,
    }
    # keep the old timestamp when nothing else changed, so scheduled runs don't create empty commits/deploys
    if OUT.exists():
        prev = json.loads(OUT.read_text(encoding="utf-8"))
        prev_updated = prev["meta"].pop("updated", None)
        now_updated = out["meta"].pop("updated")
        same = prev == json.loads(json.dumps(out))  # round-trip so int keys compare as strings
        out["meta"]["updated"] = prev_updated if same else now_updated
    OUT.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT} - {len(managers)} managers, GW1-{current}, {len(picks)} picks, "
          f"{OUT.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
