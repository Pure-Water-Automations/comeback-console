# T2 League Standings — Feedback Review
**Recorded 13 July 2026 · 5:37 · Justin narrating a screen-recorded walkthrough of comeback.pwasecondbrain.uk/scoreboard**

## Overview

Justin reviewed the live scoreboard console (Standings, Rulebook, My Console for New Jersey) and dictated bugs, data mismatches, and feature requests. This doc is grounded to exact timestamps in the source recording (`T2 League Standings - Operation COMEBACK - 13 July 2026.mp4`) — every claim below was confirmed against an actual frame, not inferred.

## Feedback, grounded to timestamps

| Time | What's on screen | Feedback/issue |
|---|---|---|
| 0:00–0:09 | Standings tab, top-of-page dashboard (Attendance Trend / Points Leaderboard / Target Progress by Division / Full Standings) | Opens narrating "several things I see here in the standings" |
| 0:09–0:28 | Scrolls through: Podium (#1 Mid-Hudson +1,193 gold, #2 NY KEA +809 silver, #3 Bronx +583 bronze) → Full Standings list → "This Week's Awards" cards (Biggest Weekly Jump, Full House, Treasury Titans, Gatherers of People, Blessing Pipeline, KLM Champion, Small Champion, Family Group Champion, The David Award, League Champion — all badges currently attributed to Elizabeth except a couple) | Several communities are **missing or wrong avatars**: Mid-Hudson → should show Nadia's avatar. Bronx → showing the old pastor's avatar, should be **Clementino**. |
| 0:29–0:40 | Full Standings list, Connecticut row | Pastor for Connecticut is now **"Denthue"** (phonetic — verify exact spelling) — avatar/name needs updating |
| 0:40–0:44 | Full Standings list, Albany row | "Maybe that's okay actually" — lower confidence, worth a quick check but not flagged as broken |
| 0:44–0:47 | Full Standings list, Manhattan row | New pastor's name is **Francis** — needs to be adjusted |
| 0:50–1:13 | Attendance Trend widget (currently: 2-point line, Wk1/Wk2, region-wide) | **Feature request:** show the trend across the full current trimester (T2 = May/June/July), not just the current month |
| 1:13–1:27 | Points Leaderboard widget (Top 10 by total points: NY KEA, Connecticut, Boston, Worcester, New Hampshire...) | Some communities are **missing from the leaderboard** entirely |
| 1:27–1:41 | Target Progress by Division widget — hovering the "Extra Large" bar | **Bug, confirmed twice on screen:** the hover tooltip renders black text on a black background box — completely unreadable |
| 1:49–1:54 | Full Standings table (sortable-looking column headers: Community, Size, Income/Members/Blessing/Total Pts) | **Feature request:** clicking a column header should sort the table by that column |
| 2:12 | Full Standings, "Actuals" tab (raw $ income / member counts / blessing counts per community) | "That's all good" — no changes needed here |
| 2:38–3:07 | "03 · STRATCOM BATTLE — Challenge team race": Northeast Stratcom +859 (current lead, 4 communities), Midwest +561 (4), South +333 (1), Southeast +120 (2), West −477 (4), **Canaan Team −1,852 (3 communities)** | **Data mismatch:** switches to the Google Sheet "T2 Score Summary" tab (Stratcom Teams: Pacific Rim Pirates, The Gold Rush, Lakeway Navigators, Bonfire, A Team, Fantastic Three) to compare — none of those names match the console's Stratcom labels. **"Canaan Team" has no corresponding entry anywhere in the sheet** — an orphaned label with real point data (−1,852) but no defined team behind it |
| 2:46–2:50 | Briefly opens `sources.pwasecondbrain.uk`, then the Google Sheet's "FINANCE" tab (Average Monthly Income / Average Weekly Attendance by community) | Cross-checking data sources while trying to reconcile the mismatch above |
| 3:20–3:39 | Scrolls back to Full Standings + Stratcom Battle section | Concludes the whole Stratcom Battle section **isn't relevant** for this console's audience — "this console right now, it's made for the region lane leaders" — suggests just pulling numbers from the main standings instead of showing Stratcom at all |
| 3:42–3:58 | (transition to Rulebook tab) | "Instead of showing this, I would show just pulling the numbers from here, although there are things that are messed up here" — reiterates the Stratcom section should be replaced with clean pulled numbers |
| 3:58–4:26 | Rulebook tab ("04 Main Score Categories: Providential Development", "04 Bonus Development: Fresh Momentum" — pixel-art mascot pages) | "Fine for now" — but **wants Ira to review and trim it to ~6–7 pages** of the most useful content (currently longer) |
| 4:26–4:31 | My Console → New Jersey. Stat cards: Income $73.4k/$67.7k target (+192, 108%), Active Members 396/587 target (−190, 67%), Blessing Journey 128/164 target (+16, 78%) | Tab transition — "Got my console" |
| 4:31–4:53 | Weekly Attendance Signal chart (4-week line: W1–W4, current avg 230 vs. target 238, baseline 217; hover shows W2 Attendance: 231) | **Feature request:** add a T1 / T2 / year-end selector so the chart can show the full trimester or year instead of a fixed 4-week window |
| 4:53–5:18 | Quest Log ("LES Field Orders": Launch Young-Adult Leadership Cohort — target Jun 15, 2026; Sanctuary Refresh: Paint + Lighting — target Jul 1, 2026) → Badge Grid (Triple Header locked, Treasury Keeper earned, Gatherer of People locked, Blessing Guide locked, Quest Complete locked, Faithful Scribe earned) | "These are fine" — no changes requested |
| 5:18–5:36 | "Coach's Corner — Next Best Moves": two tip cards (Active Members definition/guidance; Blessing Points guidance) | **Question, not yet answered:** are these tips hard-coded, or generated from something actually useful/dynamic? Needs an answer either way — if hard-coded, decide whether that's acceptable or worth making dynamic |

## Action items

| Item | Context |
|---|---|
| Fix Mid-Hudson avatar → Nadia | Podium/standings avatar wrong or missing |
| Fix Bronx avatar/pastor → Clementino (remove old pastor) | Standings avatar wrong |
| Update Connecticut pastor name/avatar → "Denthue" (confirm spelling with Justin) | Standings data update |
| Update Manhattan pastor name/avatar → Francis | Standings data update |
| Spot-check Albany's avatar/pastor | Lower-confidence flag, verify only |
| Extend Attendance Trend widget to show the full T2 trimester, not just the current month | Standings tab |
| Investigate why some communities are missing from the Points Leaderboard | Standings tab |
| Fix black-on-black tooltip text on Target Progress by Division (hover state) | Confirmed UI bug, reproduced twice |
| Make Full Standings table columns sortable on click | Standings tab |
| Reconcile Stratcom Battle team names against the actual scoreboard sheet; resolve or remove the orphaned "Canaan Team" (−1,852 pts, no defined roster) | Data integrity |
| Consider removing/replacing the Stratcom Battle section entirely — not relevant to this console's audience (regional lane leaders); pull clean numbers from the main standings instead | Scope/relevance call, Justin's stated preference |
| Have Ira review and trim the Rulebook to ~6–7 pages | Delegated to Ira, not code |
| Add a T1 / T2 / year-end range selector to the Weekly Attendance Signal chart (My Console) | My Console tab |
| Determine whether "Next Best Moves" (Coach's Corner) tips are hard-coded or dynamic, and report back / fix if they should be dynamic | My Console tab |

## Notable visuals

- The Standings page auto-plays/scrolls through a Podium reveal and "This Week's Awards" card section before settling on the persistent dashboard — worth confirming this intro sequence is intentional and not distracting on repeat views.
- Stratcom Battle bars are color-coded by seed (gold/cyan/red for negative) — visually clear, the issue is purely the underlying data/naming, not the presentation.
- The RPG pixel-art mascots and starfield background theme are consistent across Rulebook and My Console — no complaints raised about the visual style itself, only content/data issues.

---
*Generated from a transcript-guided review of the source recording — every "What's on screen" cell was confirmed against an actual video frame, not inferred from narration alone.*
