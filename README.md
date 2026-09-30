# Seis pelo Japão

A private trip-planning web app for six travellers (20 Dec 2026 – 9 Jan 2027), formerly "Six Across Japan". The UI is in Portuguese; place names, the food list and Google reviews stay in English.

**Design: the eki-stamp passport.** Washi paper, five inks (indigo, pine, plum, vermilion, amber), Instrument Serif headings and Klee One handwriting. Japanese station-style stamps (`src/components/EkiStamp.tsx`) mark places, days and milestones, and they get "inked" as things happen.

**Family screens** (bottom nav: Início · Hoje · + · Viagem · Passaporte):
- **Início:** a countdown. Before the vote closes, it shows who has voted and the four routes; after that, the chosen route's chapters.
- **Votar:** majority vote. Each person picks a favourite, and an optional 2nd choice only breaks ties.
- **Hoje:** a personal to-do list before the trip, and each day's move, bed, weather and plan during it.
- **+ Anotar:** the family notebook. It works offline through a write outbox and syncs when the signal returns.
- **Passaporte:** milestone stamps, plus one stamp per base.
- **Viagem:** the hub for the other screens:
  - Comida: want/been marks, ratings, a random picker, and "add from a Google Maps link".
  - Mala: a packing list per person, built from presets.
  - Contas: shared expenses in ¥, split per couple, with "who pays whom".
  - Socorro: 119/110, the English hotline, maternity hospitals near each base, and phrases.
  - Also the guides, Documentos, and the planner's "Mesa do Pedro".

**Sign-in: "Quem é você?"** Tap your name and you get an email with a 6-digit code (plus a link as a fallback). The server looks up the email by traveller id, so emails never reach the browser (`src/app/auth/code/route.ts`).

**Earlier phases (still there):**

- **Decide:** a live route map, place sheets with Google photos, reviews and YouTube videos, a compare view, voting and hearts, a calendar strip, and media curation for the planner.
- **Plan:** a route builder that enforces 20 nights and checks every edit against the rules (peak days, long legs, stairs, New Year closures). Also a day planner with a "who's going" split and one-tap import from the Tokyo and Kyoto guides, bookings with a deadline dashboard and shinkansen reminders, and a per-person budget in yen and SGD.
- **Travel:** a Today screen with the hotel address in Japanese for taxi drivers, the next move, today's plan and the weather. The app works offline as a PWA after one online visit, and private documents are limited to the owner and partner.
- **Extras:** the Tokyo food list and a tips inbox (paste Instagram links), plus the "Tokyo for Six" and "Kyoto for Six" guides.

Stack: Next.js 16 (App Router), TypeScript, Tailwind 4, Radix UI, `@vis.gl/react-google-maps`, Supabase (Postgres, RLS, magic links, Realtime), Vercel.

## Demo mode (no keys needed)

```bash
npm install
npm run dev   # http://localhost:3000
```

With no Supabase keys the app runs in **demo mode**:
- There's no sign-in. Pick “I am…” under Settings.
- Votes, hearts, pinned media, plans, days, bookings and tips are kept in this browser only.
- Everyone is treated as the planner, and Documents is switched off.
- A sketch map stands in for Google Maps.
- Photos and reviews stay empty until `GOOGLE_PLACES_API_KEY` is set.

Demo mode is disabled in production builds unless `DEMO_MODE=1`, so a deploy without Supabase never exposes the Google proxies.

## Setup

1. **Google Cloud** (PRD Appendix B): enable Maps JavaScript API, Places API (New), Routes API and YouTube Data API v3.
   - Create a *browser key* limited to Maps JavaScript API with HTTP-referrer restrictions (`localhost:3000/*` and your Vercel domain).
   - Create a *server key* limited to Places, Routes and YouTube.
   - Create a Map ID with a muted style. Optionally create a second one for dark mode. Set a USD 10 billing budget alert.
2. **Supabase**: create a project, then run `supabase/migrations/0001_init.sql`, `0002_plan_travel.sql` and `0003_family.sql` in the SQL editor, in order (or use `supabase db push`). Both are safe to re-run. `0002` also creates the private `documents` storage bucket, and `0003` adds couples, notes, packing, expenses and food marks. Then:
   - Auth → Providers → Email: turn **off** “Allow new users to sign up”.
   - Auth → Hooks: optionally add *Before User Created* → `public.hook_before_user_created` as a second guard.
   - Auth → Email: set the OTP length to 6. To put the code in the email you need custom SMTP (Resend, or Gmail with an app password); then paste `supabase/email/magic-link.html` into the Magic Link template. Without SMTP the email carries only the link, and signing in still works.
   - Auth → URL configuration: set the Site URL and add `http://localhost:3000/auth/confirm` and `https://<your-domain>/auth/confirm` as redirect URLs.
3. `cp .env.example .env.local` and fill in the keys.
4. `cp data/travellers.example.json data/travellers.json` and enter the six names, emails and `couple` keys (the two people in a couple share a key). Make one of them `"planner"`, and set `"docs_access": true` for the owner and partner. This file is git-ignored.
5. `npm run seed`. It is idempotent: it upserts travellers (and pre-creates their auth users), places, routes, stays and add-ons, and resolves each place's `google_place_id` with an IDs-only Text Search, which is billed at the cheapest Text Search tier.
   - `--reset-routes` rewrites the stays of routes A–D.
   - `--no-resolve` skips the Google lookups.
6. `npm run spike` runs the §12 spike: Places details and photos for three places, a YouTube search, and whether the **Routes API returns TRANSIT** from Tokyo Station to Kyoto Station.

## Deploy to Vercel

1. Import the GitHub repo into Vercel (framework preset: Next.js).
2. Add every variable from `.env.example` under Project → Settings → Environment Variables.
3. Deploy. Add the production URL to the Maps key's referrer list and to Supabase's redirect URLs.

## How it's put together

| Path | What |
|---|---|
| `data/trip-data.json` | 33 places, 4 routes, 5 add-ons (from the Route Explorer prototype) |
| `data/tokyo-foodlist.json` | 56 bars and restaurants from the group's saved Google Maps list |
| `data/route-notes.json` | Curated compare fields: snow, pregnancy comfort, budget ranges |
| `supabase/migrations/` | Schema (PRD §7) + RLS: only listed emails can read; only the planner edits trip data; each traveller writes only their own votes and hearts |
| `src/proxy.ts` | Refreshes the Supabase session; signed-out visitors go to `/login` |
| `src/app/api/places/[slug]` | Place Details (New): rating, ≤5 reviews, photo refs. Resolves and stores `place_id` on first use |
| `src/app/api/photo/[...name]` | Redirects to Google's short-lived photo URL, so the Places key stays server-side |
| `src/app/api/videos/search` | Planner-only YouTube search (embeddable, medium + long; ~201 quota units) |
| `src/components/providers.tsx` | Client store for votes, hearts and media with Supabase Realtime (or localStorage in demo mode), plus theme, large-text and “just photos” preferences |
| `data/city-guides.json`, `data/route-board.json` | Tokyo and Kyoto day plans, nights out and neighbourhoods, plus per-stop highlights, imported from the "Tokyo for Six", "Kyoto for Six" and "Six Across Japan" artifacts (F1a) |
| `src/lib/plan.ts` | Plans, rules engine (P2.2), legs, rail reminders, deadlines, budget. Unit-tested in `plan.test.ts` |
| `src/lib/tables.ts` | Generic table store for plans, activities, bookings, tips and settings. It follows Realtime updates, keeps a localStorage snapshot for offline use, and writes optimistically |
| `src/app/api/legs` | Planner-only Routes API lookup (drive or transit) for a leg's duration; when Google has no route, the curated time stays |
| `public/sw.js` | Service worker. Static assets are cache-first; pages and place details are network-first with a cache fallback. Key pages are pre-saved after sign-in, and everything is cleared on sign-out |

Decisions on the PRD's open questions:
- Supabase for data and sign-in.
- Vote totals are visible live from the start.
- Parents get a “Just show me the photos” toggle (Settings) as well as large text.
- Rail transit data: curated leg times plus Google Maps transit links. The planner's "Ask Google" button tries the Routes API; if it has no transit data for Japan, the curated time stays.
- Instagram tips: scraping Instagram breaks its terms, so tips arrive through a paste-a-link inbox (Food page and each place sheet).

Who can do what:
- Everyone can read everything, vote, heart places, add activities to days, and add tips.
- Only the planner edits plans, bookings, budget settings and media.
- Documents are limited to travellers with `docs_access`, enforced by RLS on the storage bucket.

Compliance (PRD §8):
- Photos show author attribution and reviews link to the author and Google Maps.
- Only `place_id` is stored. Details are cached for `PLACES_CACHE_SECONDS` (default 1 h); check Google's terms before raising it.
- YouTube videos use the standard IFrame player, and results are filtered to `status.embeddable`.

## Scripts

`npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run seed` · `npm run spike`
