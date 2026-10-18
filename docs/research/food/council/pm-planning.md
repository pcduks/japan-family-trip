# Food page: from "everything researched" to "our meals, booked"
*Senior PM, the planning lens (now → December). 18 Oct 2026.*

## 1. Diagnosis

1. **It's a library with no state.** None of the 240 places (128 Tabelog/critic, 56 DB, 56 family list) can be shortlisted, picked or booked. Tokyo is 57 cards over 48,366 px (`tokyo-full.png`), and nothing says how many dinners are still open.
2. **The deadlines are prose.** "Book by…" is 9,932 px, with the dates inside the titles ("Now ·", "Wed 18 Nov, 17:00–19:00 JST ·", `book-by-full.png`). **None of the 20 food deadlines is in `trip.deadlines`**, so What's next on Trip doesn't show them. Otome Zushi's window opens around 28 Oct, and Torishiki takes phone bookings only.
3. **Restaurants don't attach to days.** `day_items.slot` has no lunch or dinner, so dinner is free text ("An easy dinner near the hotel"). The deep places have no IDs, so `routeVisits` can't see them.
4. **The family is locked out.** Hearts and comments only work on DB places, and the 128 best places are plain JSON.
5. **The facts that block a booking are buried.** Whether seven fit, the channel, closing days and the window's opening date all sit in prose fields (`group`, `booking`, `dec_jan`), so they can't be filtered.

## 2. Principles

- **Every place has a state.** Researched → Shortlisted → Picked for a meal → Booked. The page shows that funnel, not the library.
- **A meal belongs to a day.** The unit is date × lunch or dinner, not a city tab.
- **Dates are data.** Each booking window becomes a deadline row with a channel, an owner and reminders 7 days and 1 day before (PRD P4).
- **Pedro decides; the family weighs in with hearts and votes**, and follows the outcomes.

## 3. Proposal

**IA.** The 18 chips go. Food becomes a three-way switch: **Our table** (the default until 19 Dec) · **Explore** (city → Dishes, Places, Areas) · **Guide** (depachika, ekiben, konbini, manners, ryokan meals). From 20 Dec the default becomes Tonight.

**S1 Our table (first screen; the counts are illustrative).**
```
┌ NEXT ~28 Oct Otome Zushi opens · online · 10d ┐
└ then 1 Nov Sazenka · 18 Nov Torishiki ☎      →┘
128 researched › 14 shortlisted › 3 booked · 9 open
TOKYO   Sun 20  Easy near hotel
        Mon 21  ○ Ishikawa ♥4 · Kikunoi ♥2  [vote]
        Tue 22  ✓ Sazenka · booked by Pedro
YUDANAKA 24–26  Ryokan (fixed)
KANAZAWA Sun 27 ⚠ Kabuna, Otome closed Sundays
KYOTO   Fri 1 Jan  Dead day: osechi ordered?
```
Tap a night → S2. Tap a funnel number → Explore, filtered.

**S2 Slot picker** ("Mon 28 Dec · dinner · Kanazawa"). It lists only places open that weekday, each on three lines:
- name and Tabelog score;
- **Seven** (yes / ask / split 4+3 / no), **Fernanda** (ok / careful), price and hearts;
- when the window opens and the channel.

Actions: **Shortlist** and **Pick**. Unverified New Year hours show as a warning.

**S3 Place sheet**, the same for deep and DB places. The booking block comes first:
- the channel, the date the window opens and the party maximum;
- a copy button for the Japanese pregnancy line (already in `calendar.json`) and "we are seven";
- a status stepper (idea → held → booked → paid), with the confirmation number, cancel-by date and who booked.

Below it, folded: why, what to order, critics, Tabelog, hearts and comments.

**S4 Book by.** One line per deadline, grouped into This week, November and December. Each row links to its place and slot and has a tick box. Phone-only rows show both time zones (Torishiki 17:00 JST = 16:00 SGT) and the script for a Japanese speaker or the concierge. It reads the same table as Trip's WhatsNext.

**S5 Family pick.** Pedro turns a shortlist into a vote ("One big night: Arai / Ishikawa / Kikunoi") using `reactions`, open until the deadline. Members are notified only about votes, bookings and mentions.

**S6 Explore city.** Three-line cards. Filters: Fits 7 · Easy for Fernanda · Bookable now · Open on our dates · Critic-backed · Hearted · Ours.

**Benchmarks.** We take Resy and OpenTable's saved lists and release alerts (they have no days and no group of seven), Wanderlog's places on days, and TripIt's bookings on a timeline. None of them treats booking windows as data.

**Cut, merge or move.**
- Trip day views show Lunch and Dinner from the same slot.
- For Fernanda becomes a badge and a filter instead of a tab.
- How we eat becomes one house-rules card in Guide.
- Our Tokyo list becomes the "Ours" filter.

**Offline:** cache Our table, the confirmations and the Japanese addresses.

## 4. Data needs and risks

- **Import the 128 deep places into `trip.places`** (kind `food`, the deep record in `food`, a stable slug). That unlocks hearts, comments, `routeVisits`, bookings and photos. Medium effort (`import.ts` exists); about 11 duplicates.
- **Structured booking fields:** `opens_on` (a date or a rule, e.g. "1st of the month, two months ahead"), `channel`, `seven` (yes / ask / split / no), and `closed_weekdays` parsed out of `dec_jan`. These need a human pass.
- **Meal slots:** add `lunch` and `dinner` to the `day_items.slot` check, and pre-fill the ryokan nights.
- **Deadlines:** add `target_id`, `time_jst` and `channel`, and seed the 20 food rows. **Do this this week, before any redesign** (Otome Zushi, around 28 Oct).
- **Bookings:** the table exists but has no UI. Build a status and a note, not integrations: there's no Tabelog or OMAKASE API, and it's about 12 bookings.
- **Reminders** are expensive: iOS push needs an installed PWA, so use email as well.
- **Risks:** New Year closures aren't known until early December, so show "unverified" honestly. Whether seven fit is only known by asking. And beware of overbuilding for one planner.
