# Six Across Japan

A private trip-planning web app for six travellers (20 Dec 2026 – 9 Jan 2027). **Phase 1 (“Decide”)** from the PRD is built here: a live route map, place sheets with Google photos, reviews and YouTube videos, a compare view, voting and hearts, a calendar strip, media curation for the planner, and the group's Tokyo food list.

Stack: Next.js 16 (App Router), TypeScript, Tailwind 4, Radix UI, `@vis.gl/react-google-maps`, Supabase (Postgres, RLS, magic links, Realtime), Vercel.

## Demo mode (no keys needed)

```bash
npm install
npm run dev   # http://localhost:3000
```

With no Supabase keys the app runs in **demo mode**:
- There's no sign-in. Pick “I am…” under Settings.
- Votes, hearts and pinned media are kept in this browser only.
- A sketch map stands in for Google Maps.
- Photos and reviews stay empty until `GOOGLE_PLACES_API_KEY` is set.

Demo mode is disabled in production builds unless `DEMO_MODE=1`, so a deploy without Supabase never exposes the Google proxies.

## Setup

1. **Google Cloud** (PRD Appendix B): enable Maps JavaScript API, Places API (New), Routes API and YouTube Data API v3.
   - Create a *browser key* limited to Maps JavaScript API with HTTP-referrer restrictions (`localhost:3000/*` and your Vercel domain).
   - Create a *server key* limited to Places, Routes and YouTube.
   - Create a Map ID with a muted style. Optionally create a second one for dark mode. Set a USD 10 billing budget alert.
2. **Supabase**: create a project, then run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`). Then:
   - Auth → Providers → Email: turn **off** “Allow new users to sign up”.
   - Auth → Hooks: optionally add *Before User Created* → `public.hook_before_user_created` as a second guard.
   - Auth → URL configuration: set the Site URL and add `http://localhost:3000/auth/confirm` and `https://<your-domain>/auth/confirm` as redirect URLs.
3. `cp .env.example .env.local` and fill in the keys.
4. `cp data/travellers.example.json data/travellers.json` and enter the six names and emails. Make one of them `"planner"`. This file is git-ignored.
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

Decisions on the PRD's open questions:
- Supabase for data and sign-in.
- Vote totals are visible live from the start.
- Parents get a “Just show me the photos” toggle (Settings) as well as large text.
- Rail transit data: pending the spike result.

Compliance (PRD §8):
- Photos show author attribution and reviews link to the author and Google Maps.
- Only `place_id` is stored. Details are cached for `PLACES_CACHE_SECONDS` (default 1 h); check Google's terms before raising it.
- YouTube videos use the standard IFrame player, and results are filtered to `status.embeddable`.

## Scripts

`npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run seed` · `npm run spike`
