# Confidence score (0–100) and dietary ordering

The score answers one question: "how sure are we that this place is great by local standards AND works for this group on these dates?" It is not a taste score. Taste is the critics' verdict, which sits next to the score rather than inside it.

## Gates (fail one → "not plannable", list it for reference only)
- Permanently closed, members-only, or introduction-only.
- Confirmed closed on every date we're in that city.
- The core dish is off-limits for someone's diet and the kitchen won't substitute. It can still be suggested for the rest of the group, with a flag.

## Components
| | Max | Rule |
|---|---|---|
| A. Primary local validator, genre-adjusted | 35 | `35 × clamp((S + R − floor) / (top − floor), 0, 1) × N`. S is the score, R a regional bonus for places outside the big food cities, and N the review-count factor: <50 → 0.85, 50–199 → 0.95, 200+ → 1.0. Set floor/top per genre from that country's current rankings, so ramen and kaiseki aren't held to one bar. |
| B. Local awards | 15 | The country's strongest award (Tabelog Award Gold 15 / Silver 13 / Bronze 11; Black Pearl 3/2/1 diamonds; Blue Ribbon 3/2/1). Lists that only restate the score (百名店 9) score lower. |
| C. Local critic backing | 15 | Sum, capped at 15: local-edition Michelin star 7 / Bib 6; a respected local award (TRY, Repsol Sol, Gambero Rosso…) 6; a named local critic's article 5; a serious local food magazine feature 4; lighter local media 1 each (max 2). |
| D. Trusted-foodie trace | 10 | A visit by a critic in `critics.md`, with a link, 10; recommended by one without a visit 6; visited the chef's sister place 3. |
| E. Group fit | 10 | Private room or a table for the whole party confirmed 10; counter buyout 8; split in the same seating 6; separate seatings 4; can't take the group 0. |
| F. Dietary fit | 10 | Mostly safe, or substitutions confirmed 10; easy to steer à la carte 7; risky omakase with substitutions unconfirmed 3; core dish unsafe 0. |
| G. Date availability | 5 | Open on our date, confirmed 5; likely from the usual pattern 3; unknown 1. |

| Total | Action |
|---|---|
| 85–100 | Book now. |
| 70–84 | Book, or hold as the backup. |
| 55–69 | Good with a known compromise: lunch, or the half of the group it suits. |
| < 55 | Drop, or keep for a walk-in day. |

The Japan floors and tops, with the reasoning and a worked example, are in `docs/research/food/12-method-japanese-sources.md` §6. Japan tiers: high-end (sushi, kaiseki, tempura, French, wagyu yakiniku) 3.45–4.30; mid (yakitori, unagi, tonkatsu, sukiyaki, Chinese, izakaya) 3.40–4.10; casual (ramen, soba, udon, curry, okonomiyaki, kissaten, bread, sweets) 3.35–3.95. Regional bonus +0.05 outside Tokyo, Kyoto, Osaka, Kanagawa, Aichi, Hyogo and Fukuoka.

## Pregnancy ordering (the first project's rule set)
Hard lines: raw egg, rare or raw meat (including chicken), raw shellfish, cold-smoked salmon and cured ham, unpasteurised soft cheese, and alcohol (including sake-lees dishes). Limit large predatory fish (bluefin, swordfish, alfonsino). Japanese OBs allow fresh sushi.
For every flagged place, write the **safe order**, not just the warning. For the Japanese phrases and the swap for each winter dish, see `docs/research/food/12-method-japanese-sources.md` §5.
