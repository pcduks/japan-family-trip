# Kickoff prompt: Foodie Council as its own app

Paste everything below the line into a new Claude Code session. Attach `pcduks/japan-family-trip` read-only for the source material, and attach an empty repository for the new app (for example `pcduks/foodie-council`).

---

I want to build **Foodie Council**: a personal app that finds great food anywhere in the world the way my favourite critics would, validated by the sources locals trust, never by Google stars or tourist listicles. It started as part of my family's Japan trip app; now it gets its own repository and its own product.

## What it does (my words, refine them with me)
- I name a place and a context ("Seoul, 4 days in March, two of us", "Lisbon dinner tonight near Chiado", "is Sushi X in Osaka worth it?") and it researches like a team. **Scouts** search in the local language and prove every place with that country's trusted local platform: Tabelog and 百名店 in Japan, Dianping and Black Pearl in China, OpenRice in Hong Kong, Blue Ribbon and Naver in Korea, Wongnai in Thailand, Gambero Rosso and Osterie d'Italia in Italy, Le Fooding in France, Veja Comer & Beber and Paladar in Brazil, and so on.
- A **critic panel** then judges the candidates in the voices of the people I trust: what each would look for, veto, and say. A critic is only ever said to have *been* somewhere when there's a link to prove it, and disagreements between critics are shown, not averaged away.
- Every place gets a **0–100 confidence score** (local validator adjusted for genre, local awards, local critics, trusted-foodie trace, group fit, dietary fit, open on my dates), real numbers with links, and "unverified" where it couldn't check. **Never invent a score, quote, visit, price or opening hour.**
- The output is a shortlist and, for trips, a day-by-day food plan with booking deadlines, plus "what to try here and why" (dish history, markets, convenience-store and station food) when I ask for it.

## My critics (the panel)
@laerciomunechika, @ocritico.antigourmet (Ian Oliver), @eduardo.takemi, @hitode47 (chef Hideto Tashiro, Suzutashiki), @little_meg_siu_meg (Margaret Lam, Kyoto), @migrationology (Mark Wiens), @pete_wells, @jwang815 (Jason Wang, Caviar co-founder, logs his meals at cityfoodsters.com; *not* the Xi'an Famous Foods CEO), @we.are.hungry.tourists (Dudi Califa's tour company), @fuchsiadunlop, @sucrilhos (Danilo Nakamura), @kenjilopezalt. The list must be editable: add a critic, re-research them, retire one.

## What already exists: read it all before proposing anything
In `pcduks/japan-family-trip`:
- `.claude/skills/foodie-council/SKILL.md` and `references/`:
  - `critics.md`: the 12 personas, built from evidence
  - `local-validators.md`: which sources count in each country
  - `scoring.md`: the confidence rubric
  - `output-format.md`
- `.claude/agents/foodie-scout.md` and `.claude/agents/foodie-critic-panel.md`: the two agent roles.
- `docs/research/food/`: the Japan pilot.
  - `10`–`18`: per-critic deep dives with their full Japan lists (for example Mark Wiens' ~150 Japan stops, Jason Wang's 671 logged Japan meals with Tabelog checks).
  - `12`: the Japanese-source method and scoring.
  - `20`–`24`: Tabelog-validated regional research.
  - `30`–`32`: depachika, ekiben, konbini.
  - `00`: the synthesis.
  - `BRIEF.md` and `CRITIC-DIVE-BRIEF.md`: the research rules.
- `v2/data/food-deep/` (English) and `data/food-guide/` (Portuguese): the structured Japan dataset, which can seed the new app's database.
- `v2/README.md`: the trip app's `/api/import` and `/api/connector/*` endpoints (token-scoped). Foodie Council should be able to push a shortlist into a trip there.

## Lessons from the pilot (design around them)
- **Instagram** can't be read without a login, and scraping breaks its terms. Use public traces (their sites, YouTube, newsletters, books, Wayback copies, Google-indexed captions) and let me upload my **Instagram data export** (Saved and Likes, as JSON) as a first-class input.
- What worked as a source:
  - **Tabelog**: English pages load; some Japanese pages are blocked.
  - **YouTube**: video descriptions are readable through the page's `next` data.
  - **NYT**: readable through Wayback snapshots.
  - **cityfoodsters.com**: Jason Wang's meal log.
- **Search budgets run out.** Prefer fetching known pages over broad web search, and cache everything with a fetched-on date.
- **Identities are easy to get wrong.** Three of my twelve handles weren't who we first assumed. Verify identity with evidence before building a persona.
- **Dates matter as much as quality:** holiday closures, booking windows that open on the 1st, party size at small counters, and dietary limits (the pilot handled a pregnancy).

## How I want you to work
1. Read the material above, then come back with a **short PRD and architecture proposal** before writing code. Cover:
   - who uses it (me first, maybe friends later)
   - the core flows: new search, trip plan, "is X worth it?", critic management, Instagram-export import
   - web app versus something else
   - how the research agents run: the Claude API with tools, background jobs, the Claude Agent SDK; pick and justify)
   - where data lives
   - cost per research run
   - how a research run stays honest (citations stored, nothing unverified shown as fact)
   - how it pushes to the trip app
2. Mobile-first: I'll use it on the street. Show the evidence (links and scores) one tap away, not as a wall of text. Lead with "where should I eat"; the research report is secondary.
3. Use the latest Claude models and read the claude-api skill before writing any LLM code. Keep secrets server-side.
4. Start with Japan, seeded from the pilot dataset, then prove it generalises with one non-Japan city end to end.
5. Ask me before choosing names, hosting or anything that costs money.
