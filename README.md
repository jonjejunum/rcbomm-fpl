# rcbomm-fpl

Stats site for the RCBOMM Premier League Draft league (league 5443).

## Pages

- **Table**: standings, points behind the leader by gameweek, and points per gameweek
- **Compare**: two managers side by side
- **Managers**: one page per team, covering squad, top scorers, points by source and position, draft picks and waiver moves
- **Insights**: actual vs expected points, bench points, top player/team pairings, best unowned players, squad value
- **Draft & moves**: draft board and waiver/free-agent moves

## How it works

- `pipeline/fetch.py` pulls data from the draft API (`draft.premierleague.com/api`) and writes `data/league.json`.
  Player prices come from the classic FPL API, matched on player `code`.
- A GitHub Action (`.github/workflows/refresh-data.yml`) runs the script on Sundays at 21:00 UTC and Mondays at
  23:00 UTC. It commits only if the data changed.
- The site is a Next.js app that reads `data/league.json` at build time. It's deployed on Vercel, which rebuilds on each push.
- Expected points swap goals, assists, clean sheets and goals conceded for their expected values (xG, xA, xGC).
- The API only returns the current draft's picks, so each draft is saved to `data/drafts/` when seen. The August
  draft was missed and is rebuilt from GW1 squads, so it has no pick order.

## Running locally

```bash
pip install -r pipeline/requirements.txt
python pipeline/fetch.py          # set LEAGUE_ID to use a different league

npm install
npm run dev
```
