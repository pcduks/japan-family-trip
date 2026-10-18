# Council brief: redesign the Food page of the family trip app

## The ask (from Pedro, the planner)
"I see it now but this needs a full revamp of the UX. It reads like a complicated report scroll." He wants a council of PMs and UX designers to come back with a full new design proposal for the Food page. Earlier he said what he needs: "to be the food guide for my family and use the app for that": what's famous in each place, how to eat well in department stores (depachika) and which bentō are must-tries, when and what to eat at train stations, konbini, the history of food in each town, markets and neighbourhoods, plus restaurants validated on Tabelog and by the critics he trusts (not Google-review/tourist-led).

## The product
- Live app = `/home/user/japan-family-trip/v2` (Next.js 16 App Router, Tailwind 4, Supabase). Bottom nav: Trip · Japan · What if · Food. Look: Fraunces titles, Figtree text, "snow-paper" light theme and night-sky dark theme, one colour per region, woodblock illustrations per region (`RegionCover`), station-stamp icons (`EkiStamp`). Read `v2/README.md` and `v2/src/app/globals.css` for the system, and look at `v2/src/components/` (e.g. `Explore.tsx`, `PictureScroll.tsx`, `AreaView.tsx`, `Guide.tsx`) to see how other tabs feel. PRD: `/home/user/japan-family-trip/PRD.md`.
- Family of **seven**: Pedro (planner, the foodie, will guide everyone), Fernanda (his wife, 29–32 weeks pregnant: no raw egg, rare meat, raw shellfish, alcohol…), João and Carolina (30s), Carlos and Nadir (Pedro's parents, older, fit, Portuguese speakers, new to Japan), Tatiana (sister). UI is in English.
- Route (plan): Tokyo 20–24 Dec → Yudanaka/snow monkeys 24–27 → Kanazawa 27–30 → Kyoto 30 Dec–5 Jan (New Year shutdown: 1 Jan dead, many restaurants closed 31 Dec–3 Jan) → Kawaguchiko 5–7 → Tokyo 7–9 Jan.
- Two moments of use: (a) **now → December**: decide, shortlist, book (bookings open 1 Nov / 1 Dec; some need phone calls), (b) **on the ground**: phone in one hand, cold, hungry, seven people, "what do we eat now/tonight near here that's open and works for Fernanda and fits 7?"; also Pedro telling the family the story of a dish at the table. Offline matters (PWA).

## What exists now (the "report scroll")
- `v2/src/components/Food.tsx` (+ `v2/src/app/food/page.tsx`): a horizontal chip row of ~18 tabs (How we eat, Book by…, Tokyo, Yudanaka and Nagano, Kanazawa, Takayama and Gero, Kyoto and Nara, Kawaguchiko, Hakone, Hiroshima, Depachika, Station food, Konbini, Manners, For Fernanda, Ryokan meals, Our Tokyo list). Each city tab: region cover + intro + "For Fernanda"/"On our dates" + researched places from the DB (`FoodCard`) + extras + guides, then the deep guide (`v2/src/components/DeepGuide.tsx`): collapsible blocks "Why they eat like this", "What to try", "Markets and neighbourhoods", "Where to eat, checked on Tabelog" (Tokyo: 57 cards), "Shops, markets and tours", sources.
- Measured: Tokyo tab is **48,366 px tall** on a 390-px phone (~57 screens). Book by… 9,932 px; Kanazawa 12,080 px.
- Screenshots (phone 390×844), read them: `/tmp/claude-0/-home-user-japan-family-trip/8bb4f81b-9cee-54db-b4ed-7eadaf0e4cd5/scratchpad/council/*.png` (`*-top.png` first screen, `*-full.png` whole page).
- Data you can design on (don't invent data that doesn't exist; say what's missing):
  - `v2/data/food-guide.json` (how_we_eat, for_her fine/careful/avoid, ryokan_meals, per-region intro/dishes/dates/extras/guides)
  - `v2/data/food-deep/<city>.json` (history[], winter, meibutsu[] {name, name_ja, romaji, what, where, price, must, pregnancy ok|careful|avoid, pregnancy_note}, areas[] {name, kind, story, eat[], tips, dec_jan, query}, places[] {name, name_ja, area, genre, price, tabelog {score, reviews, url, awards}, critics[] {who, note, url}, why, order, pregnancy_note, group, booking, dec_jan, query}, shops[])
  - `v2/data/food-deep/topics/*.json` (calendar = booking deadlines + per-stop food calendar; depachika; ekiben; konbini; etiquette) as sections/items
  - The DB places library (`snapshot.places`, with `food` details, hours, closures, lat/lng, day-plan visits via `routeVisits`), hearts and comments, the plan's day-by-day (`data/plan-days.json`), versions/route with dates.
  - The family's own Tokyo list (Google ratings).
  - No photos for most deep places (only DB places have Google photos via Places API; there's a photo proxy).

## Your deliverable
Write a memo (≤ 900 words, Markdown) to the path you're given, from your role's point of view:
1. **Diagnosis**: the 3–5 biggest UX problems now (be specific, cite the screenshots).
2. **Principles**: 3–5 design principles for this page.
3. **Proposal**: information architecture (what the Food tab's top level is, how cities, dishes, restaurants, topics and bookings relate), the 4–6 key screens described concretely (what's on the first screen, in what order, what's tappable; an ASCII wireframe per key screen is welcome), key interactions (filters, "near me / open now", saving, sharing with family, offline), and what to cut, merge or move elsewhere in the app (e.g. into Trip day views or place pages).
4. **Data needs and risks**: what the design needs that the data doesn't have yet; what's expensive to build.
Be opinionated and concrete; the council will argue. Reply with a ≤120-word summary of your stance.
