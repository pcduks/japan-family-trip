# Japan trip planner (v2)

The private planning app from `PRD.md` (Draft 2, 12 Oct 2026) for the family's winter trip, 20 Dec 2026 – 9 Jan 2027. The data is `trip-data.json` (schema v2) at the repository root: 117 places, 31 regions, 7 versions, the pace model, calendar rules and deadlines. The route's Fuji stop is Kawaguchiko (5–7 Jan, a lake hotel); Hakone is the alternative "Hakone instead of the lake" (version id `fuji-lake`, kept from when that id meant the lake, because the seed cannot delete versions).

This folder is a separate Next.js app. The earlier app ("Seis pelo Japão") stays at the repository root, untouched, until you decide what to keep.

**Phase 1 (Align) is built:**

| | Screen | What it does |
|---|---|---|
| A1 | **Board** `/` | Every version side by side: a timeline lane per version (same colour = same region, New Year window shaded), moves, travel hours, shortest stay, rest days, New Year's Eve, Fuji, gains and gives-up, rule warnings |
| A2 | **Vote** `/vote` | Each person picks a pace and two must-dos from the library; the dashboard shows agreement and who hasn't answered |
| A3 | **Vote** `/vote` | Ranking of the versions. Totals (Borda count) stay hidden, in the database too, until everyone has ranked or a planner reveals them |
| A4 | **Versions** `/versions` | Copy any version, drag stays, change nights and lodging, rules check live, save, share, "Suggest to the plan". Planners accept or decline suggestions; every change to the plan is logged and can be reverted |
| A5 | **Places** `/places` | The library with filters, photo-first browsing, and a page per place: Google photos, rating and reviews, YouTube embed, why go, hours, closures with source and checked date, effort for her, food details, hearts and comments |
| A6 | **Map** `/map` | Google Map with the selected version's route, numbered stays, library places and candidate regions coloured by fit; a sketch map without a key |
| A7 | **What we're missing** `/missing` | Candidate regions with the fit verdict and "Make a version with this swap" |

The look: Fraunces for titles, Figtree for text, snow-paper light theme and night-sky dark theme, one colour per region everywhere, and the woodblock illustrations made for the earlier app as postcards for each region (home, version pages, candidates, the pace vote and the login screen); Google photos stay on the place pages. Station-stamp icons (`EkiStamp`) mark the home tiles. Large-text mode scales the whole UI.

Reading before voting: **How this works** (`/guide`) explains the app to the family; **The report** (`/plan`) renders the whole plan doc (`docs/research/plan-doc/*.md`, copied in at build time) tab by tab; **Food** (`/food`) lists every researched restaurant with who recommends it, the source link, the table-for-six and pregnancy notes, plus the family's own Tokyo list. The plan's day by day (`data/plan-days.json`, from the plan doc) is seeded once into `trip.days`, shown on the plan page, and every place says whether and when it is in the plan.

**Editing is drag and drop.** On any version page the stops are cards: drag the handle to reorder, tap the name to swap the place from a sheet of regions, +/− for nights, lodging chips, “Add a stop”, “Fit to 20”, undo. The timeline, the rules check and the budget move live and every change saves on its own (planners on the plan, with a history line; owners on their versions). Anyone else who changes something gets their own copy on the spot and a “Suggest this to the plan” button. Ranking on the Vote page is drag and drop too. Built with `motion` (Reorder) and Radix.

**Three tabs now: Explore, Route, Food.** **Explore** (`/`) is step one, the research: an illustrated map of Japan (`JapanMap`, prefecture outlines from `@svg-maps/japan`) with a stamp for every area we looked at, filter chips (snow, onsen, food, museums, Fuji, the classics, gentle), and carousels by verdict. Every area, in the route or not, has its own page (`/areas/[id]`): what it is known for, what it is like in our window, the catalogue cards from the research reports (`scripts/build-catalog.mjs` parses the card tables in `docs/research/05-*.md` and `06-*.md` into `src/data/catalog.json`), getting there, what we would do (must do, nice to do, nice to have, at the chosen pace), where we eat and sleep, what it means for Fernanda, our verdict with the reasons, and a way to draw the alternative that uses it or try it in the route. The editorial per area lives in `data/areas.json`. **Route** (`/route`) is step two, the route and why. It opens on the **journey map** (`JourneyMap`): the real lines each move follows (station and road waypoints traced from OpenStreetMap, in `data/journey.json`), drawn as shinkansen ties, rail lines or bus dashes on a printed base shared by every map (`MapInk`: seigaiha sea, land off register, snow country, the Alps, Fuji); "Play the journey" flies the camera stop to stop with a train on the line, and picking an alternative redraws the route over the plan. Then **the 21 days** as a picture scroll (`PictureScroll`): a painted chapter per stop and a panel per day with its plan, daylight (`src/lib/sun.ts`), snow, clear-Fuji mornings, hours outside and how hard the day is for her; tap a day for the detail. In "Stop by stop" a pinned copy of the map follows the stop you are reading, close on each stop and pulling back to show each leg as you scroll to the next. Around them: the three facts that chose it, what it feels like, every stop with its reason, who it works for, the alternatives (tap to draw one on the map), the budget per couple, and the stops to drag, swap and re-count. Votes, the board and versions are still there under More.

**The trip** (`/trip`, now redirecting to `/route`) was the plan's story: its theme, what it feels like, what it contemplates and why, each stay with why it is this long, the kind of place to book and named candidates with prices for six and booking links (`data/lodging.json`, from `docs/research/07-lodging.md`), the budget per couple against the S$15,000 target without flights (`data/budget.json` holds every rate; `src/lib/budget.ts` does the sums), and the alternatives with the same detail (`data/versions-guide.json`). **Food** is its own section: how we eat as six, what each base is about at the table, what she can eat, the ryokan meals, every researched restaurant with its source, and the family's own list (`data/food-guide.json`).

Plus: the §7 rules engine (`src/lib/rules.ts`) runs on every edit; the nights suggestion with a plain-language reason (`src/lib/nights.ts`); large-text mode; light and dark themes; getting in with one shared family code and a tap on your name (beta; `FAMILY_CODE`); the `/api/import` and `/api/connector/*` endpoints for Claude (PRD §8), token-scoped.

## Spike results (12 Oct 2026, `npm run spike`)

| Check | Result |
|---|---|
| Places API (New) details + photos for Kenroku-en, Takayama Jinya, Kyoto National Museum | ✓ all three resolve; ratings, 5 reviews, 10 photos and opening hours each |
| YouTube IFrame embed | ✓ embeddable video found; the standard player is used (`youtube-nocookie.com`) |
| Anthropic vision → structured JSON | code in `src/lib/anthropic/extract.ts` (structured output with a JSON schema); run `npm run spike` with `ANTHROPIC_API_KEY` set to see it on a screenshot at `scripts/spike-sample.png` or on sample text |
| Routes API TRANSIT, Tokyo Station → Kanazawa Station | ✗ returns no route (DRIVE works). So travel times stay curated in `src/lib/legs.ts`, and every move links to Google Maps transit directions (open question 5) |

## Run it without any keys (demo mode)

```bash
cd v2
npm install
npm run dev        # http://localhost:3000
```

With no Supabase keys the app runs in demo mode: no sign-in, pick "I am…" under the name at the top right, and versions, votes, suggestions and comments stay in that browser. Google photos and reviews appear once `GOOGLE_PLACES_API_KEY` is set; the map once `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set. Demo mode is off in production builds unless `DEMO_MODE=1`.

## Setup

1. **Google Cloud** (PRD Appendix B): enable Maps JavaScript API, Places API (New), Routes API and YouTube Data API v3. Make a *browser key* limited to Maps JavaScript API with HTTP-referrer restrictions (`localhost:3000/*` and your Vercel domain), a *server key* limited to Places, Routes and YouTube, and a Map ID (optionally a dark one). Set a USD 10 budget alert.
2. **Anthropic**: an API key with a monthly spend limit. `ANTHROPIC_MODEL` picks the model for drop extraction.
3. **Supabase**: create a project (or reuse one), then apply `supabase/migrations/0100_trip_v2.sql` in the SQL editor, or
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_… SUPABASE_PROJECT_REF=… npm run db:push
   ```
   Everything lives in its own schema, `trip`, so it can share a project with the earlier app. The migration is safe to re-run. Then:
   - Settings → API → **Exposed schemas**: make sure `trip` is listed (the migration tries to add it; check).
   - No Auth setup: the beta gate is the family code (`FAMILY_CODE`), checked on the server; the browser never holds a database key.
4. `cp .env.example .env.local` and fill in the keys. `CLAUDE_CONNECTOR_TOKEN` is any long random string.
5. Travellers: the seed creates the seven slots with placeholder names (Brother, Dad, Mum…); each person types their own name the first time they pick their slot. `data/travellers.json` (git-ignored, see the example) still works if you want to set names up front. Planners can also rename or remove people under the name at the top right → **Family**.
6. `npm run seed`. It is idempotent: it upserts travellers (placeholder names unless `data/travellers.json` exists), imports `trip-data.json` by id, and resolves each place's `google_place_id` and coordinates with a Text Search biased to the region's centre. The plan version is created once and never overwritten by later imports, so a change to the plan's stays in `trip-data.json` reaches the database only through the app (a planner edits the plan; the change is logged and can be reverted). The plan's day by day does follow `data/plan-days.json`: each date that differs from the file is rewritten, because no screen edits days yet. `--no-resolve` skips Google; `--file=path` imports another schema-v2 file.

Without a machine at hand, the GitHub Actions workflow **Supabase setup (v2)** (`.github/workflows/supabase-setup.yml`) does steps 3 and 6 from repository secrets; see the comment at the top of the file.

## Deploy to Vercel

1. Import the GitHub repo. Set **Root Directory** to `v2` (keep "Include source files outside of the Root Directory" on: the build copies `../trip-data.json` in).
2. Add every variable from `.env.example` under Settings → Environment Variables.
3. Deploy. Add the production URL to the Maps key's referrer list and to Supabase's redirect URLs.

## Claude updates (PRD §8)

Both endpoints take `Authorization: Bearer $CLAUDE_CONNECTOR_TOKEN` (a planner session works too).

```bash
# Import a full or partial schema-v2 file; upserts by id, returns a change report
curl -X POST https://<app>/api/import -H "Authorization: Bearer $CLAUDE_CONNECTOR_TOKEN" \
  -H "Content-Type: application/json" --data @trip-data.json

# Read
curl -H "Authorization: Bearer $T" https://<app>/api/connector/versions
curl -H "Authorization: Bearer $T" "https://<app>/api/connector/places?region=kyoto"
# Write places, notes and drops (never the plan, votes or bookings)
curl -X POST -H "Authorization: Bearer $T" https://<app>/api/connector/notes \
  -d '{"target_type":"place","target_id":"ky-knm","body":"Re-checked: open 2–3 Jan."}'
```

Every record carries `source`, `checked_at`, `updated_by` and `verified`; the place page shows "checked 12 Oct by claude · unverified".

## Decisions taken (PRD §15)

1. Rank totals are hidden until everyone has voted; a planner can reveal them early. Pace and must-dos show live.
2. Personal versions are visible to everyone by default; "Visible to the family" can be switched off while drafting.
3. Drops: not yet built (Phase 2). Default stays "auto-added, marked dropped by X".
4. Email-in for drops: not planned; upload and paste are enough.
5. Routes API: no transit in Japan, so curated times plus Google Maps links.
6. Supabase.

## Scripts and layout

| | |
|---|---|
| `npm run dev` / `build` / `start` | the app (each copies `../trip-data.json` into `src/data/` first) |
| `npm run test` | vitest: rules engine, nights model, version helpers |
| `npm run typecheck` / `lint` | `next typegen && tsc`, eslint |
| `npm run spike` | the §16 spike |
| `npm run seed` | idempotent seed/import |
| `npm run db:push` | apply the migrations through the Supabase Management API |
| `src/lib/rules.ts` | §7 rules on stays and day items |
| `src/lib/nights.ts` | nights suggestion from the pace model |
| `src/lib/legs.ts` | curated travel times between regions |
| `src/lib/import.ts` | upsert-by-id import shared by the seed and `/api/import` |
| `src/lib/anthropic/extract.ts` | screenshot/text → structured places (Phase 2 drops) |
| `supabase/migrations/0100_trip_v2.sql` | the §10 model, RLS, auth hook, accept/revert functions |

## Compliance (PRD §12)

Google photos carry the author's name and link; reviews are shown with the author's link and "Reviews from Google"; only `place_id` is stored, details are cached for an hour. YouTube uses the standard embeddable player. No public pages: everything sits behind the family code, the browser never holds a database key (reads and writes go through `/api/state` and `/api/act` on the server), and the app sends `noindex`.
