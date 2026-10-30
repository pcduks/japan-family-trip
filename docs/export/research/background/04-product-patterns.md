# 04 — Product patterns: how trip planners turn wishes into routes, and how groups decide

Research date: 2026-10-01. Sources are product pages, reviews, teardown articles and papers from 2024–2026 (links at the end). Purpose: inform a "wishes → the app builds the route" flow for a six-person family trip to Japan (20 nights over New Year, fixed dates, one pregnant traveller, two older parents, Portuguese UI).

## 1. Product-by-product findings

### Mindtrip (chat + quiz, Fast Company "most innovative" 2025)
- **Preference capture**: free-form chat, or a short "travel style" quiz; can also paste a TikTok/Instagram/YouTube link, a screenshot or a Google Maps list and it turns it into an itinerary/collection.
- **Constraints**: dates and destination through chat; no explicit pace/mobility fields surfaced in reviews. Budget is implicit.
- **Generation**: LLM over a grounded place index (Google Places, Tripadvisor, Viator, Priceline); every item carries photo, rating, review count and sits on a map, so hallucinated venues are rarer than in a bare chatbot.
- **Explanation of trade-offs**: none structured; you ask the chat.
- **Groups**: invite others to a trip, group chat (free tier: up to 5 people), live collaboration, event feed. Collaboration = co-editing + chat, no voting or weighting.
- **Praise**: structured, editable, mapped output rather than a wall of text; 4.7 on App Store (748 ratings).
- **Fails**: "plans from a prompt" so picks are what it would give anyone (Plotline review); some features still in development; no booking-lead-time awareness.

### Layla (chat-first, Trustpilot 4.2/71 reviews)
- **Capture**: conversational; some form-like prompts (dates, budget). Books flights/hotels via Skyscanner, Booking.com, GetYourGuide; "PriceLock" watches fares.
- **Generation**: LLM, fast "glossy" starter itineraries. Reviewers (SearchSpot 2026) say it "produces output before the planning logic is solid"; weak on comparing neighbourhoods, validating route logic and pressure-testing a plan against budget/friction, especially for multi-person trips.
- **Groups**: minimal; one comparison called it "the only tool that felt like a real planner" for a multi-city group test, but it has no voting or per-person modelling.
- **Fails**: forgets instructions in long chats, incorrect facts, hard to get a usable final plan.

### Wanderlog (collaborative doc + "Auto-fill day" AI, Pro)
- **Capture**: none structured — it is "Google Docs for travel". People pin places on a shared map and drag them into days.
- **Constraints**: manual times; route optimisation (Pro, needs 3+ places) reorders a day geographically.
- **Generation**: AI assistant is "pretty basic" (5 messages/trip free); "Auto-fill day" populates one day; no full-trip generation.
- **Groups**: real-time co-editing, invite by link. No voting, no comments/version history, no roles — "with five people editing at once the itinerary becomes a mess of conflicting ideas"; groups still coordinate on WhatsApp.
- **Praise**: best map UI for groups, free collaboration, 4.9 stars.
- **Fails**: AI depth, paywall, no decision mechanism — planning falls to the dominant voice.

### Google (Search AI Mode / AI Overviews, Gemini Gems, Maps)
- **Capture**: natural-language query ("itinerary for Costa Rica focused on nature"); Gemini Canvas gives an editable day-by-day side panel; Maps recognises places in screenshots in the camera roll and saves them to lists.
- **Constraints**: dates, price tracking for flights and hotels (global), but no pace/mobility modelling.
- **Generation**: LLM with live web/Places data; strongest for current prices and hours, but still ~9 % factual hallucination in 2026 benchmarks; third-party "check your Gemini itinerary" services exist (Tripnostic) because of invented venue names, outdated hours, public-holiday closures, reservation-only stops.
- **Groups**: none beyond sharing a Maps list.

### TripIt
- Not a planner: ingests confirmation emails into one timeline (on-device AI now links unfiled items). No activity suggestions, no itinerary builder, no budget. Useful as the *post-decision* "source of truth" for a family (shared trip, flight alerts), and shows the value of one canonical, bookings-first timeline.

### Roadtrippers Autopilot
- Trip wizard that proposes stops along a corridor from 38 M real trips; "Remix" regenerates. Pattern worth copying: **generate-from-population-data + regenerate button**, and gas/time budget shown per leg. Complaint: AI replaced a tool users liked; free tier caps stops.

### Kayak AI Mode / Expedia Trip Matching
- Kayak (Oct 2025): ChatGPT front-end over live fares/hotels; conversational search, results update live. Strength: real prices. No itinerary pacing, no groups.
- Expedia Trip Matching: share an Instagram Reel with @Expedia, get an itinerary back. Strength: content-to-booking; in tests deep links defaulted to generic US pages. No groups.

### Airbnb wishlists (2024 Summer Release)
- Shared wishlist by link/contacts; members add listings, leave notes and **vote** per listing; group messaging; invite co-travellers to a reservation. 80 % of trips are multi-person. Simple approve-vote, no weighting, no constraints — but it is the one mainstream mass-market example of **async voting on a shortlist**, and it works because the decision space is tiny (a handful of homes).

### Swipe-to-choose apps (SwipeSights, Roameo)
- **SwipeSights**: create trip, share link, each person swipes real attractions independently (right = visit, left = skip, up = must-see), ~5–8 minutes per person, votes hidden until the end ("eliminates groupthink"); engine then builds day-by-day walking routes that cluster nearby spots, respect opening hours and balance the day. No booking, no offline, no explicit conflict resolution.
- **Roameo** (PhocusWire startup stage): swipe deck, "Group Verdict" facepile showing how each member voted, per-member stats, AI builds a route-optimised multi-day plan "tailored to the group's tempo"; imports from Instagram/TikTok/Xiaohongshu.
- Pattern lessons: short, private, picture-first elicitation works for mixed tech comfort; a three-way signal (no / yes / must) carries more than a binary swipe; show each person's votes afterwards for transparency.

### Japan-specific tools
- **japan-guide.com**: curated sample itineraries (Best of Japan 14 days, regional) with realistic transfer times and visit durations — effectively **templates + pacing norms**; no personalisation but the best source of "what fits in a day".
- **Japan Travel by NAVITIME** (AI planner, Sept 2024): for 3–10-day trips you pick preferences from a list and it proposes spots, hotels and restaurants drawn from what other users frequently selected; editable. Underlying app has door-to-door transit routing; "AI Reply" annotates community itineraries. Limited to major hubs.
- **Jorudan Japan Transit Planner / NAVITIME transit**: timetable-exact routing (the layer every Japan itinerary needs to be validated against).
- **Odigo**: community-curated spots (6,000+), interest categories, multi-traveller editing, PDF export; dormant since ~2017 but the "categories + co-editing" pattern.
- **japanactivity.com Booking Deadline Planner**: works backwards from each visit date with release rules (Ghibli Museum tickets on the 10th at 10:00 JST for next month; Nintendo Museum 3-month lottery; Shibuya Sky web tickets 00:00 JST 14 days before; Tokyo Disney 2 months ahead at 14:00 JST; JR reserved seats 10:00 JST one month before; Pokémon/Kirby cafés; sumo). Four phases from 3+ months to 2 weeks out. This is the only tool found that treats **"needs booking months ahead" as a first-class constraint**.
- **New Year reality** (Dec 29–Jan 3/4): most museums, gardens, department stores, small restaurants and high-end sushi closed; convenience stores, big chains, shrines (hatsumode crowds) and transit open; Tabelog has an "open during New Year" filter; hotels and Shinkansen for the period sell out early. General AI planners routinely schedule closed venues on these days.

### Academic / industry writing on group recommendation and group travel decisions
- **Aggregation strategies** (surveys 2024–2026): average/additive, least misery, most pleasure, Borda count, multiplicative, Spearman footrule, hybrids (average + least misery; relevance + disagreement). Empirical finding: users value fairness and low misery; multiplicative often wins on satisfaction; pure average lets a majority steamroll.
- **Fairness definitions**: proportional/"envy-free" top-N (Sacharidis), *sequential* fairness — balance satisfaction across a sequence of recommendations/days rather than per item (Stratigi et al.), which maps directly to a 20-day trip.
- **GroupTravelBench (2026)**: models users with must / reject / prefer / avoid tiers, global constraints (budget, transport, activity intensity) plus city-level preferences; group fairness = min utility / max utility. All LLM agents scored < 55 % fairness, collapsing from 75 % (2 people) to 35 % (6 people); 67 % of tasks got zero negotiated compromises; the dominant structural error was missing intra-city transport. Lesson: an unguided LLM will favour the vocal majority and skip negotiation — the aggregation rule must be explicit in code.
- **"Who chooses how preferences are aggregated?" (2026)**: when an LLM is just asked to "recommend for the group" it silently picks a rule 93–98 % of the time; additive and least-misery give different answers on the same ratings. Recommendation: separate (a) computing the rule, (b) which rule, (c) who has authority to choose it — surface it to the family.
- **LLM-facilitated group decisions (2025)**: a GPT-4o facilitator raised the *minimum* participation level (quiet members contributed more) without hurting satisfaction, but did not improve decision quality by itself.
- **Tourism research**: in 29–39 % of vacation decisions one relative dominates or decides alone; six implicit roles (authoritarian, influencer, follower …). Design implication: private, parallel elicitation before any group discussion.
- **Error studies**: 356-trip/2,735-day telemetry study: 43 % of AI-planned days have a verifiable fault (22.7 % venue closed at scheduled hour, 16.6 % visit runs past closing, 9.5 % backtracking, 5.1 % duplicate places — duplicates rise to 56 % on trips ≥ 15 days; Monday closures = 53 % of timing errors). Grounded planners cut invented venues from 15–20 % to 3–5 %.
- **Accessibility/pace**: Trip.com "Elderly-friendly" style; GetOutTrip accessible planner takes operational terms (step-free, max walking distance, rest interval). General advice: AI ignores recovery time and walking intensity unless given numbers.

## 2. Cross-cutting patterns

| Dimension | What works | What fails |
|---|---|---|
| Capture | Short quiz or swipe deck (5–8 min), pictures over text, private answers, paste-a-link import | Open chat for non-technical users; long chats that forget constraints |
| Constraints | Explicit fields: dates, budget tier, walking km/day, rest intervals, must/avoid tiers | Pace/mobility inferred from prose; "elderly" as a vague tag |
| Generation | LLM for selection + deterministic engine for geography, hours, transit, duplicates; templates for pacing norms | Pure LLM day plans: closed venues, Monday/holiday closures, over-packed days, backtracking, duplicates on long trips |
| Trade-offs | Per-member "verdict" views, cost/time per leg (Roadtrippers), budget tiers that change the plan (MonkeyTravel) | "Trust me" single plan with no alternatives |
| Group decision | Private votes, then reveal; shortlist voting (Airbnb) | Co-editing free-for-all (Wanderlog); LLM silently averaging |
| Lead-time bookings | Deadline planner working backwards from visit date | Every general planner ignores it |

## 3. Proposal for the six-person Japan trip

### 3.1 Preference capture (≤ 10 min each, Portuguese, mixed tech comfort)
Use a **private, picture-first "deck" per person**, sent as a link on WhatsApp, no account. Three screens: (a) 6 quick facts — walking tolerance (km/day slider with pictures), stairs/standing OK?, need for a midday rest, food limits (raw fish, alcohol, allergies), early-bird or night-owl, three "non-negotiables" in free text; (b) ~30 cards of real Japan experiences (onsen town, Fushimi Inari at dawn, teamLab, Ghibli, kaiseki, snow monkeys, department-store food hall, New-Year shrine visit …) with a **three-way answer: no / gosto / tem que acontecer**; cap "tem que acontecer" at 3; (c) one card "quem decide por mim?" so a parent can delegate to a child. Votes are hidden until everyone is done; results show a facepile per card (Roameo pattern). The pregnant traveller's medical limits are entered once as hard constraints, not preferences.

### 3.2 Aggregation rule
Reject plain sum of scores (GroupTravelBench: majority dominance, fairness 35 % at six people) and reject pure least-misery (it vetoes everything and produces a bland trip). Use a **layered rule**: (1) hard constraints from the pregnant traveller and the parents are filters, never scores — step-free, max walking, rest window, no raw fish, no onsen if contraindicated; (2) each person's "tem que acontecer" items are coverage targets: the plan must include at least 2 of 3 for everyone, or say why; (3) remaining slots scored by multiplicative aggregation (penalises any strong "no") with a **sequential fairness penalty** across days — if someone's satisfaction lags behind the group over the last three days, their picks get boosted; (4) one explicit **veto round** at the end on the 2–3 candidate routes, not on individual items. Show the chosen rule in plain words ("ninguém fica sem os seus 'tem que acontecer'").

### 3.3 Presenting 2–3 routes
Generate routes that differ on a real axis (e.g. "Base fixa em Tóquio/Quioto", "Neve e onsen no Norte", "Ritmo lento, mais descanso"), never three shuffles of the same plan. Each route card shows: per-person coverage bar ("Avó: 3/3 tem-que-acontecer"), km walked per day vs each person's limit, number of rest half-days, estimated cost, which days fall in the Dec 29–Jan 3 closure window and what is open, and a **"deadlines" strip** (Ghibli: 10 Nov 10:00 JST, Shinkansen: 1 month before, hotels: now). List the three things each route gives up and who loses them.

### 3.4 Pitfalls
Validate every venue against hours and New-Year closures and Jorudan transit times before showing; de-duplicate across 20 days; never put >2 anchor activities in a day for the parents; don't let the itinerary live in free chat; don't let one family member be the only one who sees the UI; treat booking windows as hard dates in a shared calendar; keep "regenerate" but preserve locked items.

## Sources
- Mindtrip: tooldirectory.ai/tools/mindtrip; getplotline.app/blog/mindtrip-review; aichief.com/ai-lifestyle-tools/mindtrip-ai; axios.com 2024-07-31
- Layla: trustpilot.com/review/layla.ai; searchspot.ai/blog/layla-ai-review-2026; monkeytravel.app/blog/best-ai-trip-planners-2026-compared
- Wanderlog: tripsil.com/wanderlog-vs-tripsil…; stardrift.ai/resources/wanderlog; tripstone.app/blog/wanderlog-review; swipesights.com/blog/best-group-trip-planner-apps
- Google: techcrunch.com 2025-03-27; tripnostic.com/check/gemini-itinerary; travelanywhere.blog chatgpt-vs-gemini-vs-claude 2026
- TripIt: pilotplans.com/blog/review-of-tripit; tripstone.app/blog/tripit-alternatives
- Roadtrippers: roadtrippers.com/autopilot; rv-pro.com; wandrly.app/reviews/roadtrippers
- Kayak/Expedia: skift.com 2025-10-15; techcrunch.com 2025-10-16; geekwire.com 2025 Expedia Trip Matching; venturebeat.com
- Airbnb: news.airbnb.com 2024 Summer Release; fastcompany.com/4009770; techcrunch.com 2024-05-01
- Swipe apps: swipesights.com; apps.apple.com Roameo id6748898199; phocuswire.com Roameo startup stage
- Japan: japan-guide.com/e/e2400.html; corporate.navitime.co.jp 2024-09-25; japanactivity.com/tools/japan-booking-deadline-planner; ghibli-museum.jp/en/tickets; japanmanners.com/rules/new-year-japan; journal.jpn.org oshogatsu guides; hypeandstuff.com Odigo
- Research: arxiv 2605.25200 (GroupTravelBench); arxiv 2608.23966 (aggregation-rule authority); arxiv 2508.08242 (LLM facilitation); Springer s10791-026-10582-3 (group travel RS survey); peerj cs-2589; Sacharidis SAC19; Stratigi SAC20; monkeyeatingmango.com 356-trip study; travelanywhere.blog 9 mistakes; getouttrip.com accessible planner; trip.com planner
