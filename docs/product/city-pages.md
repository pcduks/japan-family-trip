# City pages: "Our Tokyo", then every stop

*Product note, 30 Oct 2026. Lives next to the code so the rationale travels with it.*

## The problem

The family's knowledge of a city is scattered: the plan's day-by-day holds the big commitments, the food guide holds the researched restaurants, the Neighborhood Guide walks hold the strolls, Pedro's Google Maps list holds 56 saved places, and Instagram holds the rest. Nothing says *where a tip fits* or *when it goes*, and nobody but Pedro can see the whole picture.

## Who it is for, and what each needs in the first five seconds

| Person | Opens the page to… | Must see at once |
|---|---|---|
| Pedro (planner, knows Tokyo) | drop a tip and see it land: which neighbourhood, which day, next to what | the + button, the tip on the map, a "fits Tue 22, near Senso-ji" chip |
| A relative who doesn't know Tokyo | understand what the city is for us and what each day holds; say "I want this" | the postcard, our days, photos, a heart |
| Anyone opening it for the first time | get the gist without reading | one headline, one map, one obvious tap |

## One vocabulary: the pin

Every place on the page is a pin with the same card: photo, name, a type glyph, a layer badge, the neighbourhood, where it fits, when it goes, who saved it, notes. Four layers, four colours:

- **Plan**: places on our days, from the plan's own day-by-day (region colour).
- **Walks**: the Neighborhood Guide's walks (shrine red).
- **Food guide**: the researched restaurants, shops and markets (amber).
- **Ours**: the family's tips: the Google Maps list, plus drops (purple).

Where it fits and when it goes are computed, not typed: nearest neighbourhood, the walks through it, the plan days with something within walking distance, and a time of day from the type and the opening hours. People can override with one tap ("put it on Tuesday").

## The flows

1. **Look.** Hero postcard with the stop number and dates. A strip of our days there. The map with layer chips. The list under a lens: Days, Areas or Types. Tap anything for the card.
2. **Drop a tip.** The + button opens one sheet with three ways in: paste (a Google Maps link, an Instagram link, a name, a paragraph), a screenshot (Claude reads the places out of it), or an exported list (Google Takeout CSV: Title, Note, URL, Comment). Everything resolves to real places with a photo before it is saved; the person confirms, picks a type if the guess is wrong, adds a line, optionally a day.
3. **Decide.** Hearts and notes are shared. A tip put on a day appears under that day next to the plan's own items and the pinned walk.

## What stays out, on purpose

- No second itinerary editor: the plan's day items stay the plan's. Tips sit beside them.
- No Instagram API (Meta closed it); the share-sheet apps all fall back to screenshots or pasted links, so we do too.
- No new tables: tips use the `drops` and `drop_places` tables from PRD §6, hearts and notes use reactions and comments.

## What was built (30 Oct 2026)

- `/city` lists the route's stops as postcards; `/city/[region]` is the page. Tokyo has all four layers (15 plan places, 367 walk spots, 82 food-guide places, 56 saved places plus tips); Kyoto three; the rest two.
- All layers start on. The same place in two layers is one pin, kept by the layer that matters most (Ours, Plan, Food guide, Walks) with the others named on its card.
- "Fits this day" is the page's answer to *when it goes*: anything within 1.2 km of what is already on a day, nearest first. A tip put on a day joins that day's things, so fits grow around it.
- Areas come from the walk neighbourhoods, the stay areas and `v2/data/city-areas.json`; anything further than 1.6 km from a named area is "Further out".
- The + Tip sheet: Paste, Screenshot, Saved list. Everything is confirmed as a real Google place with a photo before it is saved; the type is guessed from Google's type and can be changed; a line and a day are optional.
- Tested on a phone as three people: the planner dropping a Maps link and a name and seeing them land on Tue 22 near Senso-ji; a relative opening Kyoto and reading it by area; a first visit, which gets a one-line hint that goes away once read.

## The phone layout, after three reviews (30 Oct 2026)

Three reviews of the first version (UX, visual design, engineering; run on a 390×844 viewport) agreed on the cause of "not easy to navigate on a phone": a pinned 40% map plus the bottom nav and a floating button left half a screen for the list, the map swallowed the first swipe, five rows of controls sat between the postcard and anything useful, and 300 pins drew as one blob. The page now works like a map app on a phone:

- The postcard is a 21:9 strip; the map comes right after it at 46% of the screen and is not pinned. One finger scrolls past it, two fingers pan it; the ⤢ button opens it full screen (over the nav), with its controls inside it.
- The map owns its controls: the four layer toggles in its top corner (filled when on, hollow when off), where-am-I, the status pill, and the red + Tip button. Nothing floats over the list.
- One sticky bar under the map: Our days · Areas · Types, and "Map ↑" to get back to it. The type filters sit with the list they filter.
- Tapping a day card scrolls to that day and fits the map to it; a deep link to a day lands on the day.
- Above 120 pins the map draws one bubble per area with a count, in the ink of the layer that dominates there; tapping a bubble opens that area. Pins are 26px, 36px when selected.
- Tiles in "Nearby that day" are two per row with the distance line; areas and types keep three.
- The family's layer is the shrine red, the walks a pine green, so the primary action matches the brand in both themes.
- Under the hood: the page recomputes only when the slices it reads change (a vote no longer rebuilds it), pins are asked for one batch at a time with the current view first, misses are remembered, and the resolve API takes pin ids rather than free text.

## Meals (30 Oct 2026)

The food guide joins the days without becoming part of the plan. Each day has a Lunch and a Dinner slot beside the plan's items. Empty, the slot suggests the three nearest guide places that are open that day, serve that meal and can seat seven, nearest first, walk-in places first among equals. Tap one, tap "Lunch · 22 Dec" on its card, and it becomes the day's lunch: on the day card, on the Trip page's day, with its booking deadline. Picks are shared and one tap to change. The plan's own items stay the planners'.

## How it generalises

The page is `/city/[region]` for every stop on the route. Layers are data: a city with no walks simply has no Walks layer; the food guide covers ten cities; tips carry a city. Tokyo is first because it has all four layers and the most tips.
