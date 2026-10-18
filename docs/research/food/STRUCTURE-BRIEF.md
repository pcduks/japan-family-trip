# Structuring the food guide for the redesign

The Food tab redesign (proposal: docs/research/food/council/) shows every restaurant as a short row with four marks, and needs facts as **fields, not prose**. You add fields to the English guide files in `v2/data/food-deep/<city>.json`. **Change nothing else** (keep every existing key and value; don't reorder). Validate with `python3 -m json.tool` after editing. Never invent a fact: if the existing text (and the research files in `docs/research/food/`) don't say it, leave the field out.

Trip context: seven people (Pedro books everything, no family voting), Fernanda 29–32 weeks pregnant. Route: Tokyo 20–24 Dec, Yudanaka 24–27, Kanazawa 27–30, Kyoto 30 Dec–5 Jan, Kawaguchiko 5–7 Jan, Tokyo 7–9 Jan.

## Fields to add on each `places[]` entry
- `pregnancy`: `"ok"` (fine as normally ordered, or trivially avoidable like "skip the egg"), `"careful"` (needs asking/swaps: raw-fish omakase, rare meat, raw shellfish in courses), `"avoid"` (the point of the place is unsafe: raw-only bowls, basashi, raw oysters). Read `pregnancy_note`, `order`, `genre`. When the note says fine/all cooked → ok.
- `seven`: `"yes"` (tables for 7+ or source says seven fit), `"room"` (a private room that fits 7, or 6–8 seat room where the note says 7 fits), `"counter"` (book 7 of an 8+ seat counter / whole counter), `"split"` (must split e.g. 4+3), `"ask"` (unclear, e.g. room for 6), `"no"`. From `group`.
- `closed_weekdays`: array of `"Mon"…"Sun"` from `dec_jan`/hours text ("closed Wednesdays" → ["Wed"]).
- `closed_dates`: ISO dates between 2026-12-20 and 2027-01-09 the text says it's closed (e.g. "closed 31 Dec–3 Jan" → each date). Only explicit ones.
- `meals`: `["lunch"]`, `["dinner"]` or `["lunch","dinner"]` when stated or obvious from hours (e.g. 7:00–15:00 → lunch).
- `booking_channel`: `"online"`, `"phone"`, `"walk-in"`, `"hotel"` (concierge), `"queue"` (walk-in with a known queue). From `booking`.
- `booking_opens`: short text when the source says when bookings open (e.g. "2 months ahead", "1st of the month", "18 Nov 17:00 JST").
- `website`: the official site or official Instagram URL, **only if it appears in the research files** (grep docs/research/food for the name) — otherwise omit. Do not search the web.
- `glance`: ≤ 12 words, plain English, why go (e.g. "Kanazawa's benchmark sushi; winter crab and yellowtail.").

## Fields to add on each `meibutsu[]` entry
- `glance`: ≤ 12 words for someone new to Japan ("Duck simmered in a thick, gentle broth.").
- `story` (only for `must: true` dishes, and at most 8 per city): 50–80 words Pedro can read aloud at the table. A hook (history, a person, a surprising fact), what it is, how to eat it. Built ONLY from the city's `history`, the dish's `what`, and the research files; no new facts.

## Fields on each `areas[]` entry
- `glance`: ≤ 12 words.

Reply with a ≤ 80-word summary: counts per field, and any place whose `pregnancy` you set to `avoid`.
