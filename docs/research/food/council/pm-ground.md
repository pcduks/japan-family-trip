# Food page: the on-the-ground view (PM)

Picture 22 Dec in Asakusa, cold, with seven of us. Pedro needs a table that is open, close by, fits 7 and is safe for Fernanda, and he needs it within 10 seconds, one-handed, maybe offline. Today that takes ten minutes of reading. Google Maps and Citymapper start from "now, here" and Tabelog from filters; we start from an essay.

## 1. Diagnosis

1. **A library, not a tool.** The Tokyo tab is 48,366 px tall (`tokyo-full.png`). Its 57 places follow no order of area or date, and nothing can be sorted or filtered.
2. **Answers are written as prose.** "Our dates", "Seven of us" and "Fernanda" are full sentences, about 12 lines per card. The two card types disagree: DB cards say "Six of us" and deep cards say "Seven of us".
3. **The page doesn't know when or where we are.** On every tab, a nine-line blurb takes 40% of the first screen. On `kanazawa-top.png` the active chip has scrolled out of view. There are 18 chips and no "today".
4. **Two restaurant systems.** DB cards show "On the route: Wed 23 Dec", but the 128 deep places show nothing like it. Neither kind appears in the Trip day.
5. **Stories sit far from the table.** The tempura story is 10 screens from the Mikawa card, and nothing links them.

## 2. Principles

1. **Now, here, us.** On the trip, the page opens on today, this city and the next meal, sorted by distance. Before the trip, it opens on "Book".
2. **Verdicts, not prose.** Every place shows the same four badges: 🕒 open on our date · 👥 fits 7 / split / ask · 🤰 easy / ask / avoid · 📞 walk-in / online / phone. A badge can say "unknown". It must never show a false green.
3. **One place, one card,** the same card in Food, Trip and the place pages.
4. **The dish is the hub,** with a story short enough to tell at the table.
5. **Offline and one-thumb.** Filters live in a bottom sheet, and each place has a Japanese card to show staff.

## 3. Proposal

**Top level:** a three-way switch, `Eat now · Book · Know`, plus a city pill in the region's colour. The pill defaults to where we are. Topics stop being tabs and become filters, fallbacks and reference sheets.

**A. Eat now** (the default from 20 Dec)
```
Tue 22 Dec · Tokyo ▾        Dinner ▾
[Booked] Isehiro Kyobashi 19:00 →
Fits 7 · Easy for F · Walk-in · ≤15 min
──────────────────────────────
Kanda Matsuya · soba       6 min
🕒open 👥4+3 🤰easy 🚶walk-in
Ōtafuku · oden             9 min
🕒confirm 👥room 🤰easy 📞
──────────────────────────────
Plan B: depachika 4 min · 7-Eleven 1 min
```
"Near" uses GPS when available. Otherwise it falls back to the hotel or the day's stops, which also works offline. The Plan B strip comes from the depachika, konbini and ekiben topics. On ryokan nights the screen just says "Dinner at the ryokan, 18:30".

**B. Place sheet** (a bottom sheet)
- The name in Latin and Japanese, then the badges.
- "Order this", with dish chips that open screen D.
- The Fernanda line.
- **Show staff:** a full-screen card in Japanese saying "party of 7", plus the pregnancy sentence that already exists in the calendar topic.
- Buttons: Map · Call · Tabelog · ♥ · **Propose for tonight**, which posts to the family thread.

**C. Book** (the default until 19 Dec)
A timeline of booking deadlines. Each one has a state (to book → requested → confirmed / skipped), an owner, a countdown ("opens in 13 days") and a phone script. Confirmed bookings show up in Eat now and in the Trip day.

**D. At the table** (dish cards)
A full screen in large type: romaji and kanji, a 60-word story, how to eat it, the Fernanda verdict, and "also on our route". You swipe through the city's meibutsu. Pedro reads it aloud or passes the phone round.

**E. Know: the city guide**
History in one paragraph, a meibutsu carousel, area cards, then "All places" (the list from screen A). Sources go behind one link.

**F. Trip day**
Each day gets an "Eat" row: the booked meal plus three suggestions near that day's stops.

**What to cut, merge or move:**
- The header blurb becomes one line.
- "How we eat" becomes a five-point card you can dismiss.
- "For Fernanda" becomes a filter plus one reference sheet.
- Ryokan meals move into the Trip days.
- "Our Tokyo list" is merged into the city list with an "ours" badge.
- Hakone, Hiroshima, Takayama and Nara go under "Not on our plan".

## 4. Data needs and risks

| Need | Today | Cost |
|---|---|---|
| Coordinates for the 128 deep places | only a `query` string | Low: geocode once through the Places proxy, which also gives photos |
| Open or closed on each of our dates | `dec_jan` is prose | **Medium, and the most valuable.** Extract with an LLM, review by hand, redo after the New Year notices in early December |
| `fits7`, Fernanda verdict, meal slot, booking type | prose (`group`, `pregnancy_note`) | Medium. Only meibutsu have a pregnancy enum today |
| Booking state per family | none | A small Supabase table |
| Links between dishes and places, table-length stories | `order` and `meibutsu.what` are close | Medium. No Portuguese for Carlos and Nadir: is that wanted? |
| One key per place, shared by the DB and deep data | they overlap (Isehiro, Matsuya) | Low to medium |

**Risks**
- The PWA offline cache isn't built yet (PRD T2, Phase 3, 7 Dec). Food data must be precached.
- Over New Year, "open now" will mostly read "unknown", so the design has to make that state useful.
- Offline maps are expensive. Show distances in the list and link out to Google Maps instead.
- Location prompts in an iPhone PWA are flaky; the hotel fallback is essential.
