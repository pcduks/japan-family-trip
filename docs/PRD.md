# PRD: Japan trip planner

> **This is the product definition for the rebuild and the single source of truth.** The code on `main` before this PR ("Seis pelo Japão") is the previous attempt. Treat it as a reference to borrow from (Appendix D), not as a spec. Where anything in the repo disagrees with this document about what the product is, this document wins. For facts about Japan and her pregnancy, the research in `docs/research/` wins (§7).

**Owner:** pc.duks@gmail.com
**Status:** v2, 12 Oct 2026. Replaces every earlier PRD.
**Trip:** 20 Dec 2026 to 9 Jan 2027, 20 nights, 6 travellers plus possibly a 7th
**Data:** `data/research/trip-data.v2.json` (schema v2), plus the catalog already in `data/` (`experiences.json`: 158 cards; `bases.json`: 55 bases with hospital minutes; `transit.json`: 113 door-to-door legs; `tokyo-foodlist.json`). `trip-data.v2.json` It holds the place library (109 places, 26 regions), 6 trip versions, the pace model, calendar rules, booking deadlines, the 4 legacy routes and the family's own Tokyo food list.
**Research source:** the shared doc "Japan for Six (or Seven): the plan and the reasoning" (https://claude.ai/code/artifact/8af68e4b-aa1e-42c9-ad88-2a4dbdc396f7). Its tabs are the plan, why each stay is this long, what we're missing, and one tab per region. Its full text, tab by tab, is in `docs/research/plan-doc/`. It is summarised in `docs/research/10-plan-doc-2026-10-12.md`, along with where it conflicts with `docs/research/00-synthesis.md`.

---

## 1. Summary

A private web app for one family to agree on, plan and then travel a three-week winter trip in Japan.

It does three things that the documents cannot:

- **Answer "where, how long and why"** for any version of the trip. It uses one shared library of researched places, a pace setting, and calendar rules that flag problems as you edit.
- **Let all seven people take part.** Each person can build and save their own version, vote, comment, and drop recommendations such as Instagram screenshots or pasted text. Everyone else sees them.
- **Stay current.** Claude can push updated research into it (for example, re-checked New Year hours in December), and every fact shows where it came from and when it was last checked.

## 2. What changed since Draft 1

| Draft 1 | Draft 2 |
|---|---|
| A viewer for 4 fixed routes, then voting | A planning engine: place library + trip versions + pace + rules |
| Nights per stop hard-coded | Nights suggested from the pace model, with a plain-language reason |
| Media (photos, videos) was the main feature | Media stays, but alignment comes first: pace votes, must-dos, version comparison |
| Only the planner edits | Personal versions for everyone; one protected plan; suggestions flow to the planners |
| No way to add finds | Drops: screenshots, text or links become places, visible to all |
| Static seed data | Claude can update the data through an import API; every record carries its source and a checked date |

The old routes A to D are kept as `legacy_routes` for reference. They break the two-night minimum and the peak-travel-day rule.

## 3. Users and roles

| Role | Who | Can do |
|---|---|---|
| Planner | Pedro and his wife | Everything. Edit the plan, accept suggestions, manage bookings, run imports |
| Member | Brother, sister-in-law, parents, sister | Browse, vote, comment, drop recommendations, make and share their own versions, suggest changes to the plan |
| Claude | A Claude session with an API token | Import research updates, add places and notes. Cannot change the plan or votes |

**Who the design has to work for:**

- **Pregnant traveller (29 to 32 weeks).** Every place shows its effort for her (stairs, ice, walking, raw food), and the app warns when a day plan includes something flagged for her.
- **Parents.** They are very fit (10 km a day is easy, per 00-synthesis) but use phones only and prefer large text. They get a simple "today" view and a photo-first browse mode. The pace limits come from her, not from them.
- **First-timers.** They need photos, videos and a one-line "why go" for every place.

## 4. Core concepts

1. **Place library.** Every region and place we've researched, each with:
   - its size: a *main outing* (half a day), a *short visit* (1 to 2 hours), a *day trip*, an *evening* or a *meal*;
   - opening hours, closure dates and closed weekdays;
   - effort for her;
   - price and booking notes;
   - food details (who recommends it, group of 6, pregnancy note);
   - links: source, Google Maps, photos, Instagram, YouTube.
2. **Trip version.** An ordered list of stays (region, from, to, lodging type, note) that point into the library. A version has a pace and an owner.
3. **Pace.** Gentle, Balanced or Full, defined in `trip-data.json` → `pace`:
   - **Gentle:** one main outing a day.
   - **Balanced:** one main outing plus one short visit, with a 2 to 4 pm rest.
   - **Full:** two main outings a day.

   The rule is: nights = arrival day + the full days needed for the main outings at this pace + rest days.
4. **Rules.** Checks that run on every edit (section 7).
5. **Day plan.** Each day of a version holds a main outing, a short visit, a rest window and a dinner. Every item is tagged *everyone*, *early crew* or *easy crew*, so planned splits are visible.
6. **Drop.** A recommendation someone adds from their phone: a screenshot, pasted text or a link. It is turned into one or more library places (section 6).

## 5. Versions and who can edit what

This answers "can the family edit versions?".

- **There is exactly one plan.** It is the version marked `status: plan`. Only planners can edit it. It is what bookings, the day planner and the Travel phase use.
- **Everyone can make their own versions.** Any member can copy any version (the plan, Gentle, Full, a swap, or another person's version) and edit their copy freely. The copy is saved under their name, for example "Mum's version". Nobody else can change it.
- **Versions are visible to everyone.** All versions appear on the comparison board with the same summary: the timeline chart, moves, travel hours, rest days, rule warnings, what you gain and what you give up.
- **Suggesting a change to the plan.** A member can press "Suggest to the plan" on their version or on a single stay. Planners see the difference (for example "Kanazawa 4 → 3 nights, add Yudanaka 23–25 Dec"), the rules check result and a comment, then accept or decline. Accepting applies the change to the plan and records who suggested it.
- **History.** Every change to the plan is logged with who, when and what changed, and can be reverted.
- **Comments.** Anyone can comment on any version, stay, day, place or drop. Mentions notify the person.

## 6. Drops: recommendations from screenshots, text and links

The goal: anyone sees a restaurant on someone's Instagram, a reel, a friend's message or a blog. In two taps it is in the trip, visible to everyone, pinned on the map, and checked against our dates and her needs.

### Input

- **Upload screenshots** (one or several images) from the phone.
- **Paste text**, for example a WhatsApp message listing three restaurants.
- **Paste a link**: an Instagram post, Google Maps, Tabelog, a blog or a TikTok.
  - The app stores the link and its title.
  - It does not scrape Instagram or other sites that forbid it.
  - For Instagram, the user adds a screenshot or caption text.
- **Share sheet on Android.** The app is a PWA with the Web Share Target API, so "Share → Japan trip" works from Instagram.
- **On iPhone**, PWAs can't receive shares, so drops come in through upload or paste. A share shortcut is a later option.
- **A caption field**, for example "Gabriela's friend says best ramen in Kyoto".

### Processing

1. The server sends the images and text to the Anthropic API (a vision-capable Claude model set in `ANTHROPIC_MODEL`). It extracts every place mentioned, with:
   - name, and Japanese name if shown;
   - city or area and type (ramen, bar, cafe, sight…);
   - dishes mentioned;
   - price hints;
   - a short why;
   - the original account handle, if visible, for credit.
2. Each extracted place is matched with Google Places Text Search, biased to the nearest base on the plan. The match stores `place_id`, coordinates, rating and opening hours.
3. Confidence:
   - **High confidence:** the match is saved automatically.
   - **Low confidence or several matches:** the dropper confirms with one tap from up to three candidates.
   - **No match:** the place is saved as a text-only place with a map search link.
4. Automatic checks on each place:
   - **Nearest stay:** which stay it is closest to, and the distance from that base.
   - **Opening hours:** whether it is open on the dates we are in that region. This uses Places hours plus our New Year closure window.
   - **Raw food:** a flag if the menu is mostly raw (sushi, kaisendon, raw horse and so on), as a note for her.
   - **Duplicates:** if the place is already in the library, the drop attaches to it ("Mum also dropped this").

### Output

- **The drop feed.** A shared feed of drop cards, newest first. Each card shows:
  - the original screenshot or text, kept private to the app;
  - who dropped it and when;
  - the extracted places, each with a map pin, its nearest stay and an open-on-our-dates badge;
  - hearts and comments.
- **Actions** on each place: "Add to library", "Add to a day" (picker shows days at the nearest stay), "Not for us".
- **Map layer.** Dropped places appear on the map with the dropper's initial.
- **Notification.** A digest to other members, in-app with optional email: "3 new drops near Kanazawa".

### Acceptance criteria

- A three-image Instagram screenshot drop becomes matched places in under 30 seconds.
- At least 80% of clearly named places match the right `place_id` without manual help.
- The original image is never shown outside the app.

## 7. Rules check

Rules run on every edit of any version and on every day plan. They are defined in `trip-data.json` → `calendar.rules`.

Where `trip-data.v2.json` and `docs/research/00-synthesis.md` disagree on a fact (peak days, closures, her limits), use 00-synthesis. The six versions in `trip-data.v2.json` were written before these rules were reconciled. The plan version, for example, moves on 28 and 30 Dec and spends New Year's Eve in Gero. The rules engine should flag them, and the plan must be revised (see doc 10).

| Rule | Severity | Check |
|---|---|---|
| Stays cover the trip | Error | Stays run 20 Dec to 9 Jan with no gaps or overlaps (20 nights) |
| Two-night minimum | Warn | Any stay under 2 nights |
| Peak-day moves | Warn | Any intercity move on the worst train days, **27–30 Dec and 2–4 Jan** (JR data, 00-synthesis). 31 Dec and 1 Jan are calm. Short local hops (under 1 h) are allowed with a note |
| New Year city | Warn | The nights of 29 Dec – 3 Jan should be in a city with a perinatal or university hospital, not a rural onsen town (08-pregnancy rule 8) |
| Hospital distance | Warn | Every base is within about 30 min of a 24-hour obstetrics hospital (`bases.json` hospital minutes) |
| Her travel day | Warn | Over 4 h door to door, more than one rail leg over 2 h, or no rest day after a travel day of 3 h or more |
| Last night | Error | The night of 8 Jan is within 60–90 min of the departure airport. No intercity move on 9 Jan |
| Closures | Warn | An activity planned on a date in its place's `closures` or on a `closed_weekdays` day |
| New Year's Eve dinner | Info | 31 Dec is not at a ryokan with dinner included |
| Pregnancy flags | Info | A day includes an item with `effort_for_her: high` or `status: avoid_for_her` |
| Pace overload | Warn | A day has more main outings than the version's pace allows, or no rest window at Gentle or Balanced |

Each warning says why in one sentence and links to the source.

**Nights suggestion.** For any stay, the app shows "suggested nights at this pace" from the library. It counts the region's main outings and short visits, applies the pace, then adds the arrival day and rest days. It explains the result, for example: "4 nights: 3 main outings at Balanced, arrival day, museums closed Mon 28 Dec". `regions[].suggested_nights` holds the researched answers to test against.

## 8. Claude updates and data provenance

- **Import API (planner token or Claude token).** `POST /api/import` accepts a `trip-data.json` (schema v2) or a partial file.
  - It upserts by `id`, so it is idempotent.
  - It never deletes anything unless the payload flags it, and it never touches the plan, votes, drops or comments.
  - It returns a change report: places added, fields changed, closures updated.
- **Claude connector API (token-scoped).** A small REST API that a Claude session (Claude Code, or a custom connector) can call:
  - read versions, days and places;
  - add places;
  - add notes to places or days;
  - post a drop on someone's behalf.
  - It cannot edit the plan or bookings.

  This keeps "app takes updates" simple: Claude researches, then calls the API.
- **Provenance on every record.** Each record has:
  - `source` (URL);
  - `checked_at` (date);
  - `updated_by` (person or `claude`);
  - `verified` (true when a person or an official source confirmed it).

  The UI shows "checked 12 Oct" next to hours, and "unverified" where the research said so.
- **December re-check (optional).** A scheduled Claude task in late November re-checks the 2026–27 New Year hours, illumination dates and event dates for every place in the plan, then posts the changes through the import API.

## 9. Features by phase

### Phase 1: Align

The route decision and the New Year lodging can't wait for the rebuild: they are being made now, through the doc and the current app (vote by 15 Oct, bookings locked around 20 Oct). In the rebuild, Align still matters, because it is how changes get proposed and agreed until departure.

| ID | Feature | Acceptance |
|---|---|---|
| A1 | Version board | All versions side by side: a timeline chart in the same style as the doc (same colour = same place, New Year band shaded), moves, travel hours, shortest stay, rest days, New Year's Eve, Fuji, gains and gives-up, rule warnings |
| A2 | Pace vote and must-dos | Each person picks a pace and names two must-dos from the library. A dashboard shows agreement, disagreement and who hasn't answered |
| A3 | Version ranking | Each person ranks the versions. Totals are hidden until everyone has voted (open question 2) |
| A4 | My versions | Copy, edit (drag stays, change dates and nights), rules check live, save, share, suggest to the plan |
| A5 | Place pages | Photos (Places API), rating and reviews, embedded YouTube, "why go", hours and closures with source and checked date, effort for her, food details |
| A6 | Map | Google Map with the selected version's route, stays, planned places, drops, and candidate regions coloured by fit |
| A7 | "What we're missing" | Candidate regions with their fit verdict, and one tap to "make a version with this swap" |

### Phase 2: Plan (target: 15 Nov 2026)

| ID | Feature | Acceptance |
|---|---|---|
| P1 | Drops | Section 6 in full |
| P2 | Day planner | Days built from library items, with rest windows and crew tags. Closures and pace overload flagged |
| P3 | Bookings | Per stay and per activity: name, link, price, cancel-by date, status (idea, held, booked, paid), who booked |
| P4 | Deadlines | The `deadlines` list plus anything added. Reminders 7 days and 1 day before |
| P5 | Budget | Per-person and group totals by category, using the pace and lodging choices. Room sharing for the 7th traveller. Yen with an editable SGD rate (as in the existing calculator) |
| P6 | Import and connector APIs | Section 8 |

### Phase 3: Travel (target: 15 Dec 2026)

| ID | Feature | Acceptance |
|---|---|---|
| T1 | Today view | Today's plan with large text and the next leg. Hotel address in Japanese for taxis. Weather. "Open now" badges |
| T2 | Offline | PWA caches the plan, places, addresses and booking confirmations |
| T3 | Documents | Fit-to-fly letter, insurance and passports, private to the planners |
| T4 | Live notes | Anyone can add a note or photo to a place during the trip ("great, go back"), and these feed the family's own list for next time |

## 10. Data model

```
travellers(id, email, name, role: planner|member, notes)
regions(id, name, lat, lng, status, summary, fit, suggested_nights jsonb, sources text[], instagram_official, hashtags text[], videos text[], checked_at, updated_by)
places(id, region_id, name, kind, size: main|short|evening|day_trip|meal, why, hours, closed_weekdays text[], effort_for_her, effort_note, status, price, booking,
       links jsonb, food jsonb, google_place_id, lat, lng, source, checked_at, verified bool, updated_by, created_from_drop_id)
closures(id, place_id, start, end, note, source)
versions(id, name, owner_id, pace, status: plan|alternative|personal|legacy, parent_version_id, gains, gives_up, created_at)
stays(id, version_id, region_id, start_date, end_date, lodging_type, note, sort)
days(id, version_id, date, title)
day_items(id, day_id, place_id, slot: early|morning|afternoon|evening, crew: everyone|early|easy, note)
suggestions(id, from_version_id, author_id, diff jsonb, comment, status: open|accepted|declined, decided_by, decided_at)
plan_history(id, version_id, actor_id, change jsonb, at)
votes(traveller_id, kind: pace|rank|mustdo, value jsonb)
drops(id, author_id, caption, image_paths text[], text, url, created_at, processing_status)
drop_places(id, drop_id, place_id, extracted jsonb, match_confidence, confirmed_by)
reactions(id, traveller_id, target_type, target_id, kind: heart|not_for_us)
comments(id, author_id, target_type, target_id, body, created_at)
bookings(id, target_type, target_id, name, url, price_jpy, cancel_by, status, booked_by, notes)
deadlines(id, date, item, source, done bool)
imports(id, actor, payload_hash, report jsonb, at)
```

Row-level security:
- Members can write their own versions, votes, drops, comments and reactions.
- Only planners can write to the plan version, bookings and documents.
- The Claude token can write places, regions, closures, notes and drops, and nothing else.

## 11. Technical approach

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript, Tailwind, Radix UI |
| Map | `@vis.gl/react-google-maps`, Maps JS API with light and dark Map IDs |
| Places | Places API (New): Text Search, Place Details, Place Photos. `place_id` stored, details cached within Google's terms |
| Video | YouTube IFrame player. The planner curates videos per place with YouTube Data API search |
| Drop extraction | Anthropic API with a vision-capable Claude model (`ANTHROPIC_MODEL` env). Server-side only. Returns structured JSON (tool use / JSON schema) |
| Data and auth | Supabase: Postgres, RLS, magic-link auth for the 7 emails, Realtime for votes and the drop feed, Storage (private bucket) for screenshots and documents |
| Hosting | Vercel |
| PWA | Serwist or next-pwa, Web Share Target for Android drops, offline cache for Travel |
| Jobs | Supabase Edge Functions or Vercel cron for deadline reminders and drop processing |

## 12. Compliance and privacy

- **Google:** attribution on maps, photos (author name and link) and reviews. Store `place_id` and refetch; don't keep review text beyond the cache terms.
- **YouTube:** only embeddable videos, in the standard player.
- **Instagram and other social content:**
  - Screenshots are uploaded by the family for private use. They are stored in a private bucket and shown only to the seven signed-in users.
  - The app does not scrape Instagram or download media from links.
  - Credit the original account when the extraction finds a handle.
- **Personal documents** sit in a planner-only bucket.
- **No public pages.** Sign-in is restricted to the invited emails.

## 13. Cost and quotas

- **Google Maps Platform:** per-SKU free monthly allowances (since March 2025). Place Photos and review-bearing Details are the expensive SKUs, so cache details and lazy-load photos. Set a budget alert at USD 10.
- **YouTube Data API:** 10,000 units a day by default; a search costs 100. Only the planners' curation screen searches.
- **Anthropic API:** one call per drop, a few images each. Expect well under USD 10 for the whole trip at family volumes. Set a monthly spend limit.
- **Supabase and Vercel:** the free tiers are enough. Storage for a few hundred screenshots is small.

## 14. Success measures

- The rebuild is live for the family by 2 Nov 2026, with the chosen plan and its bookings carried over.
- At least 20 drops from at least 4 different people before departure.
- No booked activity on a date its place is closed. No intercity move on a peak day without an explicit override.
- During the trip, the parents use the Today view without help.

## 15. Open questions

1. Are vote totals hidden until everyone has voted, or shown live?
2. Can members see each other's personal versions while they are drafts, or only once shared?
3. Is a drop auto-added to the library, or does it wait for a planner's OK? (Draft default: auto-added, marked "dropped by X".)
4. Do we need an email-in address for drops ("send to trip@…") in Phase 2, or are upload and paste enough?
5. Does the Routes API return transit routes in Japan? If not, keep curated travel times in the data (they are already there) plus Google Maps transit links.
6. Supabase, or everything in Google (Firebase, Google sign-in)?

## 16. Milestones

| Week of | Milestone |
|---|---|
| 12–20 Oct | Outside the rebuild: the family agrees the route and the New Year lodging is held (doc and current app) |
| 19 Oct | Rebuild spike: keys, Places details and photos for 3 places, a YouTube embed, an Anthropic vision call on one Instagram screenshot, a Routes API transit test. Data import from `trip-data.v2.json` and `data/*.json` |
| 26 Oct | Version board, my versions and suggestions, place pages, map, the rules engine |
| 2 Nov | Drops live; the family moves to the rebuild |
| 9 Nov | Day planner, bookings, deadlines, budget |
| 16 Nov | Import and Claude connector APIs |
| Late Nov | Claude re-check of New Year hours imported |
| 7 Dec | Phase 3: Today view, offline, documents |

---

## Appendix A: kickoff prompt for Claude Code

Paste this into a new Claude Code session on this repo:

```
Read docs/PRD.md (the spec), data/research/trip-data.v2.json, data/*.json and
docs/research/00-synthesis.md, 07-lodging.md, 08-pregnancy.md, 10-plan-doc-2026-10-12.md
and docs/research/plan-doc/ (the itinerary options, why each stay is this long, and the region guides).
The code on main is the previous attempt: read Appendix D before deciding what to reuse.
Work on a new branch `rebuild`. Build the app in the PRD, Phase 1 first.

1. Run the §16 spike:
   - scaffold Next.js + TypeScript + Tailwind with @vis.gl/react-google-maps;
   - prove Places API (New) details and photos for Kenroku-en, Takayama Jinya and Kyoto National Museum;
   - prove a YouTube IFrame embed;
   - send one sample screenshot to the Anthropic API (model from ANTHROPIC_MODEL) and get structured place JSON back;
   - test whether the Routes API returns TRANSIT between Tokyo Station and Kanazawa Station.
   Report the spike results before continuing.
2. Set up Supabase with the §10 data model and RLS:
   - only the invited emails can sign in;
   - planners vs members;
   - a scoped Claude token.
   Write an idempotent seed/import from trip-data.json (upsert by id) that also resolves google_place_id with Text Search, biased to each region's lat/lng.
3. Build Phase 1 (A1–A7):
   - mobile first at 375 px, large-text mode, light and dark themes;
   - the version board timeline: one lane per version, same colour = same region, New Year window shaded;
   - the rules engine from §7 runs on every version edit;
   - the nights suggestion from the pace model, with a plain-language reason.
4. Keep all keys in .env.local and add .env.example with:
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_GOOGLE_MAP_ID, GOOGLE_PLACES_API_KEY, YOUTUBE_API_KEY,
   ANTHROPIC_API_KEY, ANTHROPIC_MODEL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY, CLAUDE_CONNECTOR_TOKEN.
5. Follow §12 for attribution and privacy. Write a short README with setup and Vercel deploy steps.

Ask me before deciding anything listed in §15.
```

## Appendix B: keys and accounts needed

1. A Google Cloud project with billing. Enable Maps JavaScript API, Places API (New), Routes API and YouTube Data API v3. Create a browser key (restricted by referrer) and a server key (restricted by API). Create light and dark Map IDs.
2. An Anthropic API key with a monthly spend limit.
3. A Supabase project: URL, anon key, service role key, and a private storage bucket.
4. A Vercel account linked to the GitHub repo.
5. The seven travellers' emails.

## Appendix C: `trip-data.json` v2 at a glance

| Key | Contents |
|---|---|
| `trip` | Dates, nights, travellers and roles |
| `pace` | Rule text, the three levels (main and short per day, travel-day capacity, rest), activity sizes |
| `calendar` | New Year closure window, peak travel days, rules, facts (Kyoto tax, sumo dates) |
| `deadlines` | Booking and ticket dates |
| `regions` | 26 regions: in plan, candidate (fits, maybe), day trip, not this trip, with fit text and suggested nights per pace |
| `places` | 109 places: sights, museums, gardens, markets, experiences, events, restaurants, with hours, closures, effort for her, links, food |
| `versions` | The plan (Balanced), Gentle, Full, Plan + snow monkeys, Art instead of Fuji, Crab and onsen instead of Fuji |
| `legacy_routes` | Old routes A to D, for reference only |
| `tokyo_personal_food_list` | The 58 places from the family's own Google Maps list |
| `related_docs` | Links to the plan doc, the Tokyo and Kyoto guides, and the route explorer |

## Appendix D: the previous app on `main`, and what to carry over

The previous app grew feature by feature on top of the four-route idea. These parts are worth keeping, or worth deciding on explicitly, rather than rebuilding from nothing:

| Keep or reuse | Why |
|---|---|
| Sign-in "Quem é você?": tap your name, get a 6-digit email code; emails never reach the browser | Simple for the parents; already works with Supabase |
| The Supabase project, RLS patterns, `travellers` and "Ver como" (planner acts as someone) | Proven setup |
| Research and catalog: `docs/research/01–10`, `data/experiences.json`, `bases.json` (hospital minutes), `transit.json` (door-to-door legs), `tokyo-foodlist.json` | The deepest research the family has. The rebuild's place library merges these with `trip-data.v2.json` |
| Offline write outbox (Anotar) and the service worker | Needed for Travel |
| Contas (shared expenses by couple), Mala (packing), Socorro (119/110, maternity hospitals near each base, phrases) | Self-contained and useful during the trip |
| Google Places, photo and video proxies that keep keys server-side | Same compliance needs |
| The eki-stamp visual identity and Portuguese UI | Pedro to decide: keep, or restart the design |

| Decide before reusing | Question |
|---|---|
| Desejos → Retrato → generated routes (wish cards, hidden answers, the builder) | Does the family still need the wish deck, or do versions plus pace votes (§5, §9) replace it? The builder's skeleton rules (`src/lib/builder/`) are useful as the rules engine either way |
| The four fixed routes A–D and route pages | Superseded by versions; keep only as `legacy_routes` |
| Passaporte stamps | Nice to have, so Phase 3 or later |
