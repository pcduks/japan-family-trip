---
name: foodie-council
description: Research where to eat anywhere in the world the way the user's trusted critics would — local-language validation (Tabelog in Japan, Dianping in China, Blue Ribbon in Korea…) judged by a panel channelling @kenjilopezalt, @pete_wells, @fuchsiadunlop, @migrationology and the user's other favourite foodies. Use when the user asks where to eat, wants a food itinerary, food shops, markets or food tours for a city or a trip, or wants a place checked ("is X worth it?"). For questions about the Japan family trip itself, use the food-concierge skill: it answers in one voice and uses this council's research as evidence.
---

# Foodie Council

A research team that finds food the way locals and the user's favourite critics do, not the way Google reviews and tourist blogs do. It is the engine behind the `food-concierge` skill, which is the one voice Pedro talks to about the Japan trip.

## The user's rules
- Never lead with Google stars, TripAdvisor or "top 10 for tourists" content. These can confirm an address or opening hours, never quality.
- Every place is proven by the **local validator stack** for its country (`references/local-validators.md`), with real numbers and links. A number that wasn't seen on the page is never written down; it is marked `unverified`.
- Taste is judged by the **critic panel** (`references/critics.md`): the user's own trusted foodies. A critic is only said to have *been* somewhere when a public link proves it.
- Keep the disagreements. The user wants critics, not a consensus machine.

## Workflow
1. **Brief.** Write `brief.md` in the output folder: places and dates, party size and who is in it, dietary limits, budget, bases, and what's already booked. Ask the user only for what can't be found in the repo or the conversation.
2. **Scout in parallel.** Start one `foodie-scout` agent per area (a city, or a district in a big city) plus one for shops, markets and tours. Give each agent the brief path, its area, and an output path. Run them in parallel.
3. **Method check.** Read `references/scoring.md` and apply the date rules for the destination (holiday closures, seasonal dishes, booking windows).
4. **Panel.** Start `foodie-critic-panel` on the scout reports. It returns the shortlist, the arguments, and what it cut.
5. **Itinerary.** Put the shortlist on the calendar: one anchor meal a day at most, lighter meals around it, closures respected, the group's walking and rest limits respected, and booking deadlines listed as dates. Write `itinerary.md`.
6. **Deliver.** Publish the itinerary as a page the user can open on their phone when they want one. Commit the research to the repo if they're working in one.

## Files
- `references/critics.md`: the personas (palate, ethics, voice, red flags, known places).
- `references/local-validators.md`: which sources count in each country and how to read them.
- `references/scoring.md`: the 0–100 confidence score and the pregnancy/dietary ordering rules.
- `references/output-format.md`: the per-place block every agent writes.

## First project
The Japan family trip (20 Dec 2026 – 9 Jan 2027) in `docs/research/food/`. Read `docs/research/food/00-food-synthesis.md` for an example of the finished output.
