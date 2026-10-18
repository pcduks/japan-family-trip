# Critic deep-dive brief (shared by the per-critic agents)

The user follows these critics and trusts their taste. Goal: for each critic, understand who they are and what they recommend, then extract every Japan recommendation and tip they've made public, so a "foodie council" agent can channel them and the family's Japan trip (20 Dec 2026 – 9 Jan 2027; six people, one pregnant) can use their picks. Read `docs/research/food/BRIEF.md` for the trip context and the source rules.

## Where to look (Instagram itself needs a login and is off-limits; do not use third-party Instagram mirrors)
- YouTube: channel search works through WebFetch/curl, for example `https://www.youtube.com/@MarkWiens/search?query=japan`. Video titles and descriptions often list restaurant names and addresses. Fetch the watch pages (`https://www.youtube.com/watch?v=ID`) for descriptions; `"shortDescription"` in the page JSON holds the full text.
- Their own sites, blogs, newsletters (Substack, Beehiiv), books and columns (NYT, Serious Eats, Guardian, FT, Folha, O Globo…), podcasts with show notes, interviews, and Google-indexed Instagram captions (search `"<handle>" <restaurant>`, `site:instagram.com <handle> Tokyo`, which sometimes shows caption snippets).
- Threads pages render without post text, so skip them. X/Twitter mirrors sometimes work through search snippets.
- Search in each critic's language (Portuguese, Cantonese/Chinese, Japanese, English).

## What to deliver, per critic
1. **Who**: identity, base, background, reach, with evidence links. (Earlier profiles: `docs/research/food/10-critics-brazil.md`, `11-critics-international.md`. Build on them; don't redo them.)
2. **Their palate in their own words**: 5–10 short quotes or close paraphrases with links, showing how they judge (value, technique, hype, authenticity, texture…).
3. **Their recommendation list, everywhere**: a table of the places they've championed most (any country), with the source. This shows their taste pattern.
4. **Japan: everything**: every restaurant, shop, market, bar, dish or experience in Japan they've posted, filmed, written about or recommended. Columns: name (with the Japanese name if you can find it) · city/area · what they ate or said · verdict (loved / liked / mixed / panned) · source link · date. Also include their Japanese-food picks outside Japan when those reveal what they'd look for in Japan.
5. **Japan tips**: their advice on ordering, booking, queues, etiquette, budget, convenience stores, depachika, what tourists get wrong. Quote with links.
6. **Tabelog cross-check**: for each Japan restaurant in item 4, fetch the Tabelog page (EN pages like https://tabelog.com/en/tokyo/... load) and record the score and URL. Flag places with weak local scores (the critic liked it, Japanese diners don't) and places that have closed.
7. **Persona card** (≤150 words): how to channel this critic as a judge: what they'd ask of a restaurant, what they'd veto, a sample verdict sentence in their voice, and what they'd say to a family with a pregnant member and two older parents.
8. **Confidence**: what is verified vs unverified. Never invent a quote, a visit or a score.

Write the result to the file path you were given. Reply with a ≤200-word summary that includes the count of Japan places found.
