# Food page: devil's advocate and scope (staff PM)

**My position:** meals get decided in the Trip day, not on Food. Food keeps three jobs: **Book**, **This stop** and a **Library** for Pedro the guide. Restaurants become short rows. Today is 18 Oct and booking windows open 1 Nov, so Book ships first.

## 1. Diagnosis

1. **The first screen has nothing to act on.** In `tokyo-top.png` and `book-by-top.png`: about 330 px of prose, then 18 chips (3½ visible), then a 290 px cover. No date, no booking, no "tonight".
2. **The cards are too big.** Tokyo is 48,366 px tall. Each of its 57 Tabelog cards runs about 600 px.
3. **There are two restaurant systems.** The DB has 56 `places` and the JSON deep guide has 128. Only 2 names overlap. Each system has its own card on the same tab. One says "Six of us", the other "Seven of us", for a family of seven. Deep places have no id, so they can't be hearted, commented on, booked or put on a day.
4. **The page ignores the date.** `dec_jan` is prose ("Closed Wednesdays, so not 23 Dec") that the reader has to cross-check. The 1 Nov deadline is buried in a 9,932 px essay.
5. **Food is in the wrong places.** `AreaView` "Eat" repeats the intro and 4 `FoodCard`s. Meanwhile the Trip day sheet (`PictureScroll` `DayItems`) shows dinners as notes only ("An easy dinner near the hotel"), with no options.

## 2. Principles

- **Our dates first.** Show what is true on the day we're there.
- **Decide in the day, tell the story in the library.**
- **Rows, not cards.** The detail opens in a sheet.
- **One id per restaurant.** Anything bookable can also be hearted and commented on.

## 3. Proposal

```
/food
┌ Book · 4 to do · next 1 Nov: Torishiki (phone) ┐
├ This stop · Tokyo 20–24 Dec                    │
│  must-eat chips · tonight: booked / open       │
├ Route: Tokyo · Yudanaka · Kanazawa · Kyoto ·   │
│        Kawaguchiko  (cover tiles)              │
├ How to eat: Depachika · Station · Konbini ·    │
│             Manners · Fernanda · Ryokan        │
└ Not on our route ▸ Takayama, Hakone, Hiroshima ┘
```

- **`/food/[city]`.** A sticky segment control: **Eat · Try · Story · Markets**. Eat is a list of 72 px rows: name and kanji, genre and area, Tabelog score, price, a Fernanda dot and a book/queue badge. Places open on our dates sort first. A tap opens the existing `PictureScroll` sheet.
- **`/food/book`.** About 10 places plus the dated items from `calendar.json`. Each has its method (online, phone, Sat 9:00), opening date and status.
- **Trip day sheet: "Eat today".** The meal booked for that date, 2–3 hearted places open that day, "Move day → ekiben" and "1 Jan → depachika/konbini". Dinners that are only a note get a "pick" link.
- **Story card.** A full-screen, swipeable dish card for the table.
- **Cut:**
  - The header prose.
  - The duplicate "Eat" section in `AreaView`, which becomes a link.
  - The "Our Tokyo list" tab, which becomes a fold on Tokyo.
  - The three cities off the route, which get folded away.

## 4. Effort, and what I'd refuse

| Idea | Effort | Why |
|---|---|---|
| **Smallest fix**: landing, rows and sheet | **M** (~4 days) | Presentation only, over `DeepGuide.tsx` |
| Booking tracker v0 | **S** | Load the booking items into `deadlines` and reuse `setDeadlineDone` |
| Booking tracker v1 | **M** | `trip.bookings` (idea/held/booked/paid) **exists, unused**. It needs date, time, party size and confirmation columns, plus an action and the UI |
| Ids, hearts and comments on deep places | **S** | `reactions` and `comments` take a free-form `target_type`, so use `food:<city>/<slug>` |
| "Open on our date" | **S** code + **S–M** data | Pull the closed weekdays and New Year closure out of `dec_jan` into fields, validated in `checkDeep()` |
| Open **now** (to the minute) | **L** | None of the 128 deep places has hours |
| Near me | **M** | Geocode the 128 places by `query` through `google/places.ts`, then geolocation. "Near today's plan" by area is **S** |
| Per-day food plans | **S** derived / **L** curated | Day items need `places.id`, and the deep places aren't in that table |
| Story cards | **S** | From `history[]`, `meibutsu`, `name_ja` |
| Offline | **M**, risky | There's no manifest or service worker yet, and the cookie gate in `proxy.ts` complicates caching. Serwist per the Next 16 docs; the PRD sets it for 7 Dec |
| Portuguese toggle | **L** | About 250k characters of JSON and no i18n setup |

**Order:** Book v0 and the landing by **28 Oct**. Rows, the sheet and ids by **8 Nov**. "Open on our date" and "Eat today" by **22 Nov**. Bookings v1, story cards and offline by **10 Dec**, then freeze.

**I'd refuse:**
- **The Portuguese toggle.** Pedro translates; at most, the Fernanda card gets a PT line.
- **Open-now to the minute.**
- **A map of every pin.** Google Maps does this.
- **An AI "what should we eat?"**
- **Moving the 128 places into `places` before the trip.**
- **Anything the other six must operate.**

## 5. Data needs and risks

- **Missing data:**
  - Structured closures and coordinates for the deep places
  - The date each booking window opens ("not captured", per `calendar.json`)
  - A Fernanda enum on places (only dishes have one)
  - Group size as a field rather than prose
  - Photos
- **Content work:** Japanese phone scripts for about 8 phone-only places (Torishiki books on the first working day of the month) and longer dish stories. This is writing, not engineering.
- **Risks:**
  - A stale service-worker cache in Japan, so offline ships behind a kill switch.
  - A backfill that marks a closed place open. Every "open" shows its source line.
