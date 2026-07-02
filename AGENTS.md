# Operation COMEBACK Gamified Console (POC)

Gamified web POC of the HQ Dashboard / Operation COMEBACK scoreboard system —
T2 league standings for the 18 Northeast communities plus a New Jersey pastor
console (8 tabs: overview, finance, attendance, people, blessing, quests,
outreach, trophies) with XP/ranks/achievements/easter eggs.

## Where it lives

| | |
|---|---|
| Local repo | `/Users/justinokamoto/code/apps/comeback-console` |
| Stack | TanStack Start + React 19 + Tailwind v4 + motion (Lovable-generated base) |
| VPS deploy | `/app/SecondBrain/comeback-console/current` (`comeback-console.service`, port **8794**) |
| Public URL | https://comeback.pwasecondbrain.uk — **open, no login** (Cloudflare Access gate removed 2026-06-10; it is a test POC). Re-gate by re-running `tools/cloudflare-tunnel/expose.js comeback 8794 <emails...>`. |
| Action Queue sheet | `13cvqK1hM2-jfb70Lizk8vZ4DLttjxH3_ZwpslvuwYrw` (quest/guest/outreach requests, office review) |
| Testing doc | https://docs.google.com/document/d/1eGp3LzffXWiSaV70-UNcMhprUcHl8iB5rpfcekFOZv8/edit |

## Data + writes

- Reads/writes the live **2026 New Jersey** workbooks via the Workspace OAuth
  credential at `~/.google_workspace_mcp/credentials/okamotomiak@gmail.com.json`
  (server-side only — `src/lib/server/sheets.ts`; the VPS copy of that file is
  kept fresh by `workspace-mcp.service`).
- **Direct writes** (unprotected tabs): Sunday Service + Event Attendance
  check-ins, new Sunday/event columns.
- **Queued writes** (owner-protected tabs): LES quests, guest capture, and all
  outreach actions append to the Action Queue sheet — review-only.
- Regional scoreboard + most console stats are a code snapshot
  (`src/lib/comebackData.ts`, `src/lib/njData.ts`, dated 2026-06-09).
- Campaign scoring rule: points = growth % over baseline × 10. Activity rule:
  Active = 3+ attendances in the last 3 months (91-day window).

## Awards Console (configurable recognition engine)

- Award definitions, runs, prize inventory/issuances, trophy events, and the
  audit trail live in **SQLite** (better-sqlite3; VPS is Node 20). DB file:
  `COMEBACK_DB_PATH` env — VPS `/app/SecondBrain/comeback-console/data/comeback.db`
  (outside `current/`, survives rsync deploys); local default `./data/comeback.db`.
- Admin UI at **/awards/admin**, gated by the `ADMIN_PASSCODE` env var
  (checked server-side on every admin server fn; unset = admin disabled).
  Dev launch config uses `test1234`.
- Engine code: `src/lib/awards-engine/` (metric catalog + evaluators, unit
  tested); repo layer `src/lib/server/awardsRepo.ts`; the 11 seed awards
  reproduce the legacy `weeklyAwards.ts` categories (parity-tested).
- The ceremony (`fetchLiveAwards`) merges finalized engine runs over the
  legacy live-computed awards; the DB starting empty means zero behavior
  change until an admin finalizes runs.
- Server-only modules live under `src/lib/server/` — TanStack import
  protection denies them from client-reachable code; only import them
  dynamically inside server fn handlers.

## Dev / deploy

```bash
npm run dev -- --port 5175       # port 8080 is taken by the WhatsApp bridge
npm run build                    # vite build → dist/server (fetch handler) + dist/client
# deploy: rsync dist deploy/vps-server.mjs package*.json → VPS current/, then
ssh root@74.208.40.108 "cd /app/SecondBrain/comeback-console/current && npm ci --omit=dev --legacy-peer-deps && systemctl restart comeback-console"
```

`deploy/vps-server.mjs` is a zero-dependency node:http wrapper around the
built fetch handler (binds 127.0.0.1 only; reachable via the tunnel).

## Constraints / lessons

- DESIGN_BRIEF.md defines the visual language for new routes — follow it.
- Load-bearing content must never wait on animations: no `whileInView` on data
  lists, no `AnimatePresence mode="wait"` gating queues (rAF freezes in
  background tabs; thresholds never fire on tall lists).
- User-facing copy uses natural language ("3 months", not "91 days").
- POC only: no auth beyond Cloudflare Access, no rate limiting, NJ-only console.
