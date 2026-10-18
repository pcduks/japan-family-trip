# Food: information architecture (UX, IA lens)

## 1. Diagnosis

1. **Five kinds of thing on one axis.** The 18 chips mix cities, a deadline list, how-to topics, a person (For Fernanda), a lodging question (Ryokan meals) and a saved list. A phone shows four of them ("…Yudanaka and", `tokyo-top.png`) and nothing says 14 more are hidden.
2. **No list/detail split.** Every fact on every card is shown inline: Tokyo is 48,366 px with 57 Tabelog cards, impossible to scan or compare. On every tab the 140-word header fills the first screen (`konbini-top.png`).
3. **Two restaurant libraries.** The DB `FoodCard`s (56 meals) sit above the deep guide's 128 Tabelog/critic places, with no shared id and only about 11 names in common.
4. **Time and people aren't navigable.** Deadlines are prose. Fernanda's limits and "fits 7" are free text, not filters. Trip drops meals entirely (`PictureScroll`: `size !== "meal"`).
5. **Food is cut off from the app.** In `AreaView` › Eat the dish chips go nowhere, and a deep place has no page to link to.

## 2. Principles

- **Lists answer, sheets explain.** A row is a single line with badges. Story, order, booking and sources go in a sheet.
- **Route-shaped, not atlas-shaped.** Six stops in date order. Places off the route belong to Japan and What if.
- **Constraints are filters.** Fernanda ✓, fits 7, open on a date and walk-in are toggles that stay set.
- **Every thing gets a canonical URL.** Each dish, eatery, area and guide has a deep link that works offline.
- **Open on the moment.** Before the trip, the top card is the next deadline. On the trip, it is "tonight near our base".

## 3. Proposal

**Model.** A stop holds Dishes, Eat, Streets & markets and Story. Guides (depachika, station, konbini, manners, Fernanda's card) apply to the whole trip. Bookings are dated items that point to eateries.

**Routes.** `/food` · `/food/[city]?v=dishes|eat|streets|story&f=her,fits7,open:2026-12-27` · `/food/[city]/eat/[slug]` and `/dish/[slug]` (sheets over the list, shareable) · `/food/guide/[topic]` · `/food/book` · `/food/tonight`. Old `?region=` links redirect.

**S1 Food home**
```
[ NEXT 1 Nov: Sushi Arai window · call ]  (pre-trip)
[ TONIGHT Kyoto: 4 open · fit 7 · F ✓ ]   (on trip)
Our stops (Tokyo 20–24)(Yudanaka)(Kanazawa)(Kyoto)…
How to eat [Depachika][Station][Konbini][Manners][F]
[ Search dishes, places, areas…        ]
How we eat as seven  ▸ (collapsed)
```

**S2 City** (`/food/kanazawa`): a 120-px cover with dates and tagline, then a segmented control. **Dishes** is the default, as a 2-column tile grid (name, kanji, must, Fernanda dot). **Eat** is a filtered list of rows:
```
F ✓  Fits 7  Open [27 Dec▾]  Walk-in  Genre▾
Mikawa Zezankyo  Tempura · Monzen-naka ¥¥¥¥
 Tabelog 4.10 · 2 critics · room 6+1? · book ♥
```
Sort order: ours (hearted or booked), then must, then Tabelog score. **Streets** shows the 44 `areas` as the same kind of rows. **Story** holds `history[]` and `winter`.

**S3 Eatery sheet.** Name, 日本語, genre, area and price. Then four fixed rows: *Fernanda*, *Seven of us*, *On our dates*, *Book* (with tap-to-call). Below them: why, what to order, critics, Tabelog, our day or "add to a day", map, ♥ and comments. **This replaces `/places/[id]` for meals.** Meal places in the DB redirect here. PlaceView stays the page for sights.

**S4 Dish sheet.** What it is, a story to tell at the table, kanji to show the waiter, the Fernanda status, and the eateries that serve it.

**S5 Tonight** (`/food/tonight`): today's base comes from the plan. Filters start at Fernanda ✓, fits 7 and open today. Groups: *Booked*, *Walk-in nearby* and *Plan B* (depachika, konbini, station). Sorted by distance if location is on, by area if not.

**S6 Book by**: a timeline (Now, 1 Nov, 1 Dec, on arrival). Each row has a status (to do / asked / booked / dropped) and opens S3. The next deadline also shows as a banner on Trip and in Inbox.

**Interactions.** Filters live in the URL. The Fernanda filter is on by default and remembered. ♥ means shortlisted. "Booked" can only be set by the planner and puts the meal on Trip. Share sends a deep link with one line for WhatsApp. All food JSON and the sheets are precached for offline. Maps open outside the app.

**Cut, merge, move.**
- Hakone, Hiroshima, Takayama/Gero and Nagano go under "Not on our route", and their food shows on `AreaView` (show Eat when `!inRoute` too).
- *Our Tokyo list* becomes a "from our own list" source filter.
- *For Fernanda* becomes the filter plus a full-screen card to show staff (妊娠中です…).
- *Ryokan meals* moves to the Yudanaka stop on Trip (its aside still says Gero and Hakone).
- *Trip day view* gets a lunch and dinner "Eat" row. When nothing is booked it says "pick one" and opens S5 for that date.
- *AreaView Eat* shows 4 dish tiles and 3 eatery rows.
- Sources become one footer link per sheet.

## 4. Data needs and risks

- **Stable slugs** for places, meibutsu, areas and shops. None exist today.
- **One eatery record** merged from the 56 DB meals and the 128 deep places. Hand work.
- **Fields that are prose today:** `closed_weekdays`, `ny_closed`, `max_party`, `private_room`, `booking {opens, method, phone}`, a place-level `pregnancy` (dishes have one, places don't), and a normalised `area`. Without them, Open, Fits 7 and the Fernanda filter are guesses. **This is the expensive part:** someone has to re-read 128 entries.
- **Coordinates.** Seed meals have no lat/lng and deep places only have a `query`. "Near me" needs geocoding.
- **Dish → eatery links and per-dish stories** are missing (`history[]` exists only per city).
- **New Year hours can't be trusted.** Label them "per Tabelog, re-check 年末年始".
- **Booking status** needs a shared table.
- **Risk:** S5 and the Trip "Eat" row are only as good as the plan's meal slots. Only 5 of the 56 planned items are meals.
