# Food brain: handoff

Snapshot taken 27 Oct 2026. Use it to pick up the Japan food work in a new session. It lists the rules, personas, sources, data, decisions and open items, and it says where each one lives.

Not exported: my private reasoning and the chat transcript. The conclusions from that reasoning are in the files named here. Subagent transcripts are not kept; their findings are copied into the files below.

## 1. What the system is

Three parts, one voice:

1. **Food concierge** (`.claude/skills/food-concierge/SKILL.md`): the one voice Pedro talks to. It decides, it does not survey. It is the only part that answers "where should I eat".
2. **Foodie council** (`.claude/skills/foodie-council/`): the research engine behind the concierge. Its personas are in `references/critics.md`. Its method is in `local-validators.md`, `scoring.md` and `output-format.md`.
3. **Guide and tabs** (a published dashboard): https://claude.ai/artifact/LUhXNNa2DhFRJ6jCy9sjJN. It has the day-by-day trip guide, places, deadlines, dishes, neighbourhoods, shops and know-how, plus a "Solo week · 26–30 Oct" tab. It is private until Pedro shares it.

Two agents exist in `.claude/agents/`: `foodie-scout` (finds and checks places on Tabelog, one area per call) and `foodie-critic-panel` (argues shortlists in the critics' voices).

## 2. Where everything lives

| What | Where |
|---|---|
| Concierge rules | `.claude/skills/food-concierge/SKILL.md` |
| Council method and personas | `.claude/skills/foodie-council/` |
| Agents | `.claude/agents/foodie-scout.md`, `.claude/agents/foodie-critic-panel.md` |
| Research (critic deep dives, Japan picks) | `docs/research/food/` (`00`–`32` files, plus `BRIEF.md`, `CRITIC-DIVE-BRIEF.md`) |
| Trip data (places, days, dates, rules) | `v2/data/food-deep/*.json`, `v2/data/food-guide.json`, `v2/data/food-deadlines.json`, `v2/data/plan-days.json` |
| Guide build and page source | `docs/handoff/food-brain/tools/` (copies of the scratch-space scripts) |
| Open PR with all of the above | https://github.com/pcduks/japan-family-trip/pull/47 (draft, branch `claude/laercio-critic-evidence`, nothing merged) |
| Guide dashboard | https://claude.ai/artifact/LUhXNNa2DhFRJ6jCy9sjJN |

The scratch-space copies of the build tools expect the original scratch folder (`/tmp/claude-0/-home-user-japan-family-trip/e34b5d0a-646d-57b0-84f9-185e40f9f4c1/scratchpad`). Change the `SCRATCH` and `OUT` constants in the scripts to match the new session.

## 3. The rules the system enforces

**Quality (primary validator is Tabelog)**
- Tabelog first. Use the English pages (`tabelog.com/en/...`), since the Japanese pages returned 403 to our fetch tool.
- Score bars by genre (from `scoring.md`): 3.50+ excellent, 3.70+ elite, 4.0+ rare. Ramen, soba and udon run lower, so 3.6+ there is very strong. Awards count: Tabelog Award (Gold/Silver/Bronze) and 百名店 (Hyakumeiten).
- Google stars, TripAdvisor and tourist top-10 lists never prove quality. They may confirm an address or hours.
- A number not seen on a page this session is `unverified`. Never invent a score, date, phone number, quote or visit.
- Scoring (0–100) has seven parts: local validator (35), awards (15), local critics (15), trusted-foodie trace (10), group fit (10), dietary fit (10), date availability (5). Bands: 85+ book now; 70–84 book or hold; 55–69 known compromise; below 55 drop.

**Critics**
- A critic counts as having been somewhere only when a public link proves it.
- Critics are channelled as judges, never as people. Never invent a quote, and quote only what the record holds.
- Critics are cited as evidence in one line, never role-played. Fuller profiles are in `critics.md`.

**Fernanda (29–32 weeks pregnant)**
- Hard lines (food-guide `for_her`): raw egg, rare or raw meat (including chicken), raw shellfish, cold-smoked salmon and cured ham, unpasteurised soft cheese, liver, alcohol (including sake-lees dishes). Limit big predatory fish (bluefin, bigeye, swordfish, kinmedai).
- Treat half-raw egg (ajitama, onsen tamago, tsukimi, soft omurice, oyakodon) as raw egg. (Pedro's call on 19 Oct; not in the original rules.)
- Vinegar- or salt-cured fish (saba-zushi, kakinoha-zushi) is her call, and must be said so. (Open rule; see section 7.)
- Every flagged place comes with her safe order, not just a warning.
- Japanese obstetric advice does not ban fresh sushi at a good counter. We still keep to cooked food on this trip.

**Booking and the group**
- Seven people, one pregnant, two older parents (chairs, short walks, no floor seating), two new to Japan, everyone reads English.
- Always say "seven", never "a group". Say "one guest is pregnant" (no name) when booking.
- Default split: 4+3. Counters under eight seats, ramen and udon counters, standing bars and markets split.
- Realism tiers: Easy for seven; Doable with effort; Split the group; Walk-in or queue; Don't bother. Each answer names one.
- "Don't bother" (19 Oct data): Sushi Saito (regulars or a hotel connection only, can't take seven); Sugita (connection only); Suzutashiki (a cancellation at best); Sawada (random online drops, small counter, only if two or three want to gamble); Soba Fujioka for seven (one table of six).
- "Very hard, try once": Kataori, Ogata, Den, Sazenka.

**Dates and outward actions**
- Compare every date with today's date. Flag deadlines that have passed.
- Never book, call, email or message a restaurant without Pedro's OK.
- Never edit the app data or push to `main`. Propose changes as a list.
- Commits go on a branch. Do not commit to `main`.

**Currency**
- The only rate we have is indicative: 1 USD = 157.87 JPY, dated 2 Oct 2026 (exchange-rates.org). Check the day's rate before spending. Pedro's caps: $100 per person, later changed to $120 total for the solo dinner.

## 4. Personas (in `critics.md`) and how much weight each can bear

| Critic | Role for us | Evidence depth |
|---|---|---|
| Mark Wiens (@migrationology) | Local queues, casual Japan, lunch sets | Strong: dated best-of lists, linked videos |
| Kenji López-Alt | Technique, everyday food, yudōfu | Strong on Japan; mid on worldwide picks (press and search summaries) |
| Pete Wells | Value and hype; NYC Japanese reviews | Strong: dated, linked NYT reviews; no Japan reviews |
| Fuchsia Dunlop | Regional Chinese food, texture | Strong palate (her books); lists mid (press and search snippets) |
| Little Meg (Margaret Lam) | Kyoto regular, seasonality | Thin to mid: Instagram not opened; search snippets, OpenRice |
| Hideto Tashiro (hitode47) | The chef's eye, fire and fish | Thin: his own restaurant, few quotes |
| Ian Oliver (@ocritico) | Technique first, hype last | Strong: his own scored site, prices paid |
| The Hungry Tourist | Trophy counters | A tour company's sales pages, not a palate |
| Jason Wang (@jwang815) | Return visits, visit counts | Strong on counts, thin on words; log links go to an index page, so per-place visits are unverified |
| Danilo Nakamura (@sucrilhos) | Drinks, São Paulo, izakaya | Strong on drinks and Brazil; no Japan trip found |
| Eduardo Takemi (@eduardo.takemi) | Return-visit test | Thin: one Japan piece |
| Laercio Munechika (@laerciomunechika) | Tiebreaker only, for now | Screenshots only (Nov 2025 Japan lists, Apr 2026 Europe lists). No public links yet, so no visit counts |

The Laercio entry records his lists as evidence without links, and he has no visits proven yet. His Japan top five is not known; ask for the post. Note that Mark Wiens, Kenji, Wells and Dunlop have the most evidence behind them.

## 5. Sources used

Quality and the Japanese scene
- Tabelog (English pages; Japanese pages 403 to our fetch tool). Each place's Tabelog URL is in the data.
- 百名店 list for Shibuya, a personal blog listing 21 of the 23 Shibuya entries (koki08.hatenablog.com/entry/sibuya-hyakumeiten). Its body lists 21, not 23, and it shows no scores.
- Michelin Guide Tokyo 2026 (guide.michelin.com, Bib Gourmand page). It has no Shibuya-specific list.
- Guides: Retty (theme pages for Shibuya dinner and yakitori, 2026), Navitime (Shibuya solo-friendly guide), aumo, ikyu, hitosara, Ozmall, Gurunavi, Foodle, Tokyo Lucci.

Critic evidence
- Each critic's public links are in `critics.md` and in the research files (`docs/research/food/10`–`18`): YouTube videos, migrationology.com, NYT reviews, cityfoodsters.com (index pages only), LeFigado, the Hungry Tourist tour pages, OpenRice, Cathay, the Guardian.

Pregnancy
- MHLW (mercury in fish; listeria), NHS foods-to-avoid, and Japanese OB-doctor articles (listed in `food-guide.json`, `for_her.sources`).

Currency
- exchange-rates.org (USD/JPY, 2 Oct 2026).

## 6. Data state (27 Oct 2026)

- Trip places: 128 from the city files, plus 11 checked on Tabelog on 19 Oct (Maisen Aoyama, Tsunahachi, Unafuji, Ukihashi, Hoto Fudou, Kamameshi Shizuka, Akadama, Omen, Inoda, two standing sushi bars). The guide shows 139.
- Shops 56, dishes 81, deadlines 18.
- Solo week (26–30 Oct): 98 options across 16 scouted Shibuya-area places plus the Tokyo list; 20 ranked picks.
- Deadlines dated 18 Oct have passed (Tokyo big night, Akasaka Kikunoi, Sazenka, Kanazawa dinners, the Sakamoto email). Check they were booked. Otome Zushi's online window opened 28 Oct.
- Errors found in `food-deadlines.json` and corrected in the guide (not in the source data):
  - Ginza Hachigo: the 21 Dec date is a closed Monday.
  - Sazenka: the 20 Dec date is a closed Sunday.
  - Kanazawa dinners: Kabuna and Oden Miyuki are closed Sundays, so 27 Dec is out.
  - Kiji-tei and Miyuki: the deadlines say phone; the place data says online.
  - Soba Fujioka: the deadline asks about seven; the data says it can't.
- Fernanda levels that should read `careful`, not `ok` (not yet changed in the source data): Kabuna, Oden Miyuki, Kishidaya (raw shellfish), Yakiniku Jumbo (rare wagyu unless asked for well done).

## 7. Open items and decisions for Pedro

1. Kiji-tei (Kawaguchiko): works only on 7 Jan at lunch, which clashes with the morning train. Move the train or drop it.
2. Ikiiki-tei (Ōmichō) is closed on Tuesday 29 Dec. The guide uses market stalls that morning instead.
3. Chairs: Iwamoto Sobaya and Otome Zushi's private room are tatami. Ask about chairs for the parents.
4. Shirakawa-go lunch: no restaurant there has been checked on Tabelog.
5. Tsunahachi Sohonten: its Tabelog listing is on hold (掲載保留) for a rebuild. The temporary annex scores 3.04 from 26 reviews. Out of the plan.
6. Maisen Aoyama (23 Dec lunch): 3.43, a fine lunch but not a destination.
7. Tamawarai (Jingūmae soba): closes for buckwheat harvest in October and November on dates not published. Check before going.
8. Rules to decide: whether half-raw egg counts as raw egg (proposed yes), and how to treat vinegar- and salt-cured fish (proposed: her call, said so).
9. Laercio: post links for his claims, and which five places are his Japan top five.
10. Per-place critic links: Jason Wang's visits point to an index page. Replace with per-place links or mark the visits unverified.

## 8. Known limits

- No live availability was checked anywhere except one Tabelog seat for Sushi Yuu Tsubasa on 24 Oct (one seat on 26 Oct at 20:00, month not stated on the page).
- Tabelog scores are as seen on 18–24 Oct 2026.
- Distances from Shibuya are estimated from the map, not timed.
- Walk-in policies are unconfirmed for most places. Sumibi Yaki Yuji's walk-in is unverified too (its Tabelog page says bookings need two).
- The guide dashboard and the solo tab have not been rendered in a browser. Their layout is unchecked.
- Japanese text in the data was checked only where a source showed it.

## 9. How to resume

1. Read this file, then `.claude/skills/food-concierge/SKILL.md`, then `critics.md`.
2. Check the day's date. Mark any deadline that has passed.
3. To rebuild the guide data: change the scratch paths in `tools/build_guide.py`, then run it. It reads `v2/data/` and writes the datasets.
4. To rebuild the solo week: run `tools/build_solo.py`, then `tools/build_xlsx.py <solo.json> <out.xlsx>`. The scout inputs are in `tools/validated.json` and `tools/solo_shibuya.json`.
5. Publish the datasets and page to the existing artifact (`LUhXNNa2DhFRJ6jCy9sjJN`), not a new one.
6. Commit on the existing branch and push. Do not push to `main`.
