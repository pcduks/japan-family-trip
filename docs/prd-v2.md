# PRD v2: additions to Seis pelo Japão

**Owner:** Pedro (pc.duks@gmail.com)
**Status:** Draft, 12 Oct 2026
**Builds on:** the app as it stands on `main` (README.md), `docs/research/00-synthesis.md` and the plan doc summarised in `docs/research/10-plan-doc-2026-10-12.md`.
**Data:** `data/research/trip-data.v2.json`

This is not a rebuild. Decide, Plan, Travel, Desejos/Retrato, generated plans, the ballot, Comida, Anotar, Contas and Família all exist. v2 adds five things the family asked for, using the existing tables wherever possible.

---

## 1. Personal versions and suggestions to the plan

**Problem.** Only the planner edits plans today. The family wants to try their own versions without touching the plan.

**Rules**
- Exactly one plan is chosen (`plans.is_chosen`, already unique). Only the planner edits it.
- Any traveller can create **personal versions**:
  - copy the chosen plan, any ballot plan, or anyone's version;
  - edit stays and nights in their copy, with the existing rules engine running live (`src/lib/plan.ts`, `src/lib/validate.ts`);
  - save it under their name.
- All versions are visible to everyone in Compare, using the same summary (timeline, moves, travel hours, rest days, rule warnings, what each version gains and gives up).
- **"Sugerir ao plano"** works on a whole version or on one stay. It creates a suggestion with a computed diff and a comment. In Mesa do Pedro the planner sees the diff and the rules result, then accepts or declines. Accepting applies the diff to the chosen plan and credits the author.
- Every change to the chosen plan is logged and can be reverted.

**Schema** (migration `0006_versions.sql`)
- `plans`: add `owner_id uuid references travellers`, `kind text check (kind in ('ballot','personal','chosen'))`, and `shared boolean default false`.
- RLS on `plans`:
  - a traveller can insert, update and delete rows where `owner_id = me and kind = 'personal'`;
  - the planner can do everything;
  - all signed-in travellers can read rows that are shared, ballot or chosen.
- New table `plan_suggestions(id, plan_id, from_plan_id, author_id, diff jsonb, comment, status open|accepted|declined, decided_by, decided_at, created_at)`.
- New table `plan_history(id, plan_id, actor_id, change jsonb, at)`. Written by an RPC used for every update to the chosen plan.

**UI**
- Viagem → "Minhas versões".
- In Compare, a lane for each shared version.
- In Mesa do Pedro, a "Sugestões" inbox showing a count badge.
- Labels are in Portuguese, like the rest of the app.

**Acceptance**
- A member can copy the chosen plan, change Kanazawa from 4 to 3 nights, see the warnings, share it, and suggest it to the plan in under a minute.
- The planner can accept the suggestion in one tap.
- History shows who changed what.

## 2. Drops: recommendations from screenshots, text and links (upgrade of `tips`)

**Problem.** Tips today are paste-a-link only. The family sees places in Instagram stories, reels and WhatsApp messages and wants to drop a screenshot or some text and have it become a real place everyone can see.

**Input** (Comida and + Anotar, as "+ Dica")
- One or more screenshots.
- Pasted text.
- A URL (still stored as today; no scraping, as already decided).
- A caption.
- Android: add the Web Share Target API to `src/app/manifest.ts`, so "Share → Seis pelo Japão" from Instagram works.
- iPhone PWAs cannot receive shares, so iPhone users upload or paste.

**Processing** (`POST /api/drops`)
1. Store the images in a new private bucket `drops`.
2. Send the images and text to the Anthropic API.
   - Use `ANTHROPIC_API_KEY`, which already exists for the narrator, and `ANTHROPIC_MODEL`.
   - Use structured output: a list of places with name, Japanese name, city/area, type, dishes, price hints, a short why, and the credited handle.
3. For each place, run a Google Text Search biased to the nearest base of the chosen plan. The IDs-only tier is enough; details load on demand through the existing `/api/places`.
   - High confidence: link it automatically.
   - Otherwise: the person who dropped it picks from up to three candidates.
4. Run these checks:
   - which stay it is nearest to, and how far;
   - whether it is open on our dates there (Places hours plus the 29 Dec – 3 Jan window from the catalog);
   - a raw-food flag, using the rules in 08-pregnancy (raw egg, rare meat, raw shellfish, and so on);
   - duplicates against `places`, `tokyo-foodlist`, earlier tips and catalog cards.

**Output**
- Drop cards show at the top of Comida, newest first. Each card has:
  - the screenshot or text, visible to the seven travellers only;
  - who dropped it;
  - the matched places, each with a map pin, nearest-stay and open-on-our-dates badges, and the raw-food flag when it applies;
  - hearts and comments (use `notes` or a new `comments` table).
- Actions on a matched place:
  - "Quero" (the existing food mark);
  - "Pôr num dia", which creates an activity on a day at the nearest stay;
  - "Não é pra nós".
- Dropped places also appear on the map with the dropper's initial.

**Schema** (`0007_drops.sql`)
- `tips`: add `images text[]`, `extracted jsonb`, `status text (pending|matched|needs_pick|failed)`, `matches jsonb`.
- New storage bucket `drops`, readable by travellers only. Keep the existing `tips` RLS.

**Acceptance**
- A three-screenshot Instagram drop shows matched places within 30 seconds.
- At least 80% of clearly named places match the right `place_id` without help.
- Images are never public.
- Cost stays under US$10 for the whole trip (set a spend limit).

## 3. Claude updates and provenance

**Problem.** Research keeps improving: the New Year hours for 2026–27 are published in late November, and new places get found. The app should take updates without a redeploy.

- **`POST /api/import`**
  - Accepts the planner's session or `CLAUDE_CONNECTOR_TOKEN` (a new env var).
  - Payload: a partial catalog in the shape of `data/experiences.json` and `data/bases.json`, or `trip-data.v2.json` places and regions.
  - Upserts by id, so re-running is safe. Never deletes unless asked. Never touches plans, votes, wishes, tips, bookings or expenses.
  - Returns a change report and writes a row to `imports`.
  - Today the catalog is static JSON regenerated by `scripts/import-catalog.ts`. The import route needs the catalog in a table, for example `catalog_items` seeded from the JSON with the JSON kept as a fallback in demo mode, or a settings row holding the overrides.
- **Connector API** (token-scoped, read and append only):
  - `GET /api/connector/plan`
  - `GET /api/connector/places?region=`
  - `POST /api/connector/notes`
  - `POST /api/connector/drops`

  This lets a Claude session read the trip and add notes or drops for the family. It cannot edit plans, votes or bookings.
- **Provenance:** catalog items and places get `source`, `checked_at`, `verified` and `updated_by`. Place sheets and cards show "verificado 12 out" next to hours, or "não verificado".
- **Late-November re-check:** a scheduled Claude task re-researches the 2026–27 New Year hours, illumination and event dates for everything in the chosen plan, then posts them through `/api/import`.

## 4. Pace and "why this many nights"

**Problem.** The family needs to see why each stay is as long as it is, so everyone has the same expectations.

- Add a pace answer to the Desejos quick facts: "Calmo / Equilibrado / Cheio". Her answer sets a ceiling for days she joins; split days carry the rest.
- Size every catalog card as `main` (half a day) or `short` (1–2 h).
  - `hours_needed` already exists: ≥3 h counts as main, otherwise short.
  - Map v2 `places[].size` when importing.
- In the builder output (`src/lib/builder/`), each stay shows a one-line reason built from the counts. For example: "4 noites: 3 passeios principais no ritmo Equilibrado, dia de chegada, museus fechados seg 28/12".
  - The narrator may rephrase the line but cannot change the numbers. It already rejects invented numbers.
- `trip-data.v2.json` has `pace.levels` and `regions[].suggested_nights` (Gentle, Balanced and Full) to test against.

## 5. Merge the plan doc's research into the catalog

- Add any place in `trip-data.v2.json` that is not already a catalog card or place to `scripts/catalog-overrides.json`, or to the import, in the existing card shape:
  - id;
  - name_pt and name_en;
  - region and base;
  - dates_valid and ny_status, from `closures` / `closed_weekdays`;
  - bump_ok, from `effort_for_her`;
  - cost and booking lead;
  - source.

  This matters most for Kanazawa, Takayama, Gero, Kyoto New Year and Hakone restaurants and museums.
- Add the candidate regions with no chapter yet (Yudanaka is in Alpes; Okayama and Naoshima are in Setouchi; Kinosaki, Shuzenji and Ginzan are new) as bases with hospital minutes. Use 08-pregnancy's method for the hospital minutes, and leave the field empty rather than guessing.
- Resolve the conflicts in `docs/research/10-plan-doc-2026-10-12.md` before the builder uses the v2 data. The most important ones:
  - the New Year city rule;
  - the 27–30 Dec train days.

## 6. `trip-data.v2.json` at a glance

| Key | Contents |
|---|---|
| `trip` | Dates, travellers, roles |
| `pace` | Rule text, three levels, activity sizes |
| `calendar` | New Year window, peak days (**use 00-synthesis's: 27–30 Dec and 2–4 Jan**), rules, facts |
| `deadlines` | Ticket and booking dates (compare with 00-synthesis's "ticket alarms") |
| `regions` | 26 regions, with status (in_plan, candidate_fits, candidate_maybe, day_trip, not_this_trip), fit text, suggested nights per pace, sources |
| `places` | 109 places: id, region, kind, size, why, hours, closures, closed_weekdays, effort_for_her, links (source, map, photos, instagram, video), food (type, price band, recommended_by, group_of_6, pregnancy_note) |
| `versions` | The plan, Gentle, Full, + snow monkeys, Art instead of Fuji, Kinosaki instead of Fuji |
| `legacy_routes` | Routes A–D |

## 7. Order of work

1. **Before the 15 Oct vote (planning, no code).** Pedro decides the conflicts in doc 10, above all where to spend New Year's Eve. The ballot plans should reflect that.
2. **Drops (§2).** This is the most useful addition right now, while the family is looking for places.
3. **Personal versions and suggestions (§1).**
4. **Merge the research into the catalog (§5) and add the pace reasons (§4).**
5. **Import and connector APIs plus provenance (§3).** Needed before the late-November re-check.

## 8. Open questions

1. Does a drop go straight into Comida, or wait for the planner?
2. Are personal versions visible while still drafts, or only once shared?
3. Do we need an email-in address for drops?
4. Should the catalog move from static JSON into Supabase now (needed for §3), or only for overrides?
