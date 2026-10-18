# Food page: content and the six who aren't Pedro

## 1. Diagnosis

1. **It's Pedro's research notebook, served to everyone.** The food data holds **44,000 words** (~3.7 h of reading). Tokyo alone is 12,600 words. The median restaurant card is 86 words in 7 rows (`tokyo-full.png`). The first screen is 88 words explaining the tabs (`*-top.png`). Carlos and Nadir won't read any of it.
2. **Jargon nobody glosses.** 百名店 appears 131 times, Tabelog 96, @handles 87 ("@jwang815… according to his City Foodsters visit log"), "Award Bronze" 17. Evidence for Pedro, noise for everyone else.
3. **Fernanda can't get a yes or no at a glance.** Every place's Fernanda line is warning-orange, even "Easy for Fernanda" (`DeepGuide.tsx` uses `text-warn`). At least 64 of the 128 notes actually say "fine", but none of the 128 places has a structured flag. Her name appears 229 times, mostly in alarm colour. Her best tool, 「妊娠中です。生もの抜きでお願いします。」, is grey footnote text (`for-fernanda-full.png`).
4. **The top layer contradicts the deep one.** `food-guide.json` (the intros and "How we eat" that people read first) says "tables for six", "2 rooms × 3", a Gero ryokan, Kanazawa 24–28 Dec and Kyoto from 1 Jan. The plan says seven people, Kanazawa 27–30 and Kyoto from 30 Dec. The UI also labels one row "Six of us" (`Food.tsx`) and another "Seven of us". One wrong date and the parents stop trusting it.
5. **The stories are great but buried.** "The Maeda were too rich to be trusted with an army, so they spent it on tea, lacquer and dinner." "Gold leaf tastes of nothing." Both are buried in a folded block.

## 2. Principles

1. **Three layers per card.** *Glance*: one line, for all seven. *Table*: 30 seconds, read aloud. *Deep*: Pedro's evidence, folded.
2. **Say it the family's way.** Gloss every term, use real names instead of @handles, and say "locals' top 100", not 百名店.
3. **Colour means "act".** "Fine" stays quiet. Amber means "ask for it cooked". Red means "skip". The same words everywhere.
4. **Japanese is for showing, not reading.** Make it big and tappable to full screen.
5. **Trust beats volume.** A computed "open on our date" chip beats a 97-word paragraph.

## 3. Proposal

**Top level:** **Tonight** (current stop, by plan date) → **This stop** (dishes, places, story) → **Show staff** (always one tap away) → **Book by** (Pedro and Fernanda only, until 1 Dec). Depachika, ekiben and konbini become cards inside the stops where they apply, not separate tabs.

**A. Tonight's dish (30 s)**: built from the 81 dishes, which all have `name_ja`. Swiping through a city's dishes gives a **picture-first, point-at-this menu**. We have no real menus.
```
┌ photo ───────────────────────────┐
│ 治部煮  JIBUNI                    │
│ Duck simmered in a thick broth.  │
│ ● Fine for everyone              │
│ ▸ The story   ▸ Show staff       │
└──────────────────────────────────┘
```

**B. Story card (Pedro reads aloud)**: 60–90 words, one per city and one per must-try dish. It opens with a hook and ends with "so tonight, try…". It's a rewrite of `history[]`.

**C. Show staff**: full screen and offline. Every phrase already exists in `etiquette.json`, `konbini.json` and the place notes. Fernanda's phrases come first, then the parents' (chairs, table for seven, the bill).
```
┌──────────────────────────────────┐
│  妊娠中です。生もの抜きで          │
│  お願いします。                   │
│  I'm pregnant; nothing raw.      │
│  Estou grávida; nada cru.        │
└──────────────────────────────────┘
 ‹ よく焼き · 生卵なし · 椅子席 · 7人 · お会計 ›
```

**D. Restaurant card, four lines**: "More" opens the existing rows (order, booking, critics, sources).
```
Narutomi 成冨 · Soba · ¥
Hand-cut buckwheat soba, simple and precise.
★ Locals' top 100 · Mark Wiens loved it
● Fine (no raw-egg topping) · Fits 7 · Open Mon 21 ✓
```

**E. Fernanda's card**: pinned; Fine / Ask cooked / Skip; her Japanese note on top as a button.

**Interactions:**
- A "Fine for Fernanda" filter, on by default for dinner suggestions.
- Long-press any Japanese term to see its gloss.
- Show-staff and story cards are cached offline.
- Share any card to the family chat as an image.

**Portuguese: yes, but narrow.** Translating all 44k words means two copies that drift apart, and Pedro will tell the stories in Portuguese anyway. Translate only what the parents read alone: glance lines, Fernanda's lists, show-staff subtitles and tonight's dinner. That's about 2–3k words in `pt` fields, checked by Pedro. **Ask: pt-BR or pt-PT? And how good is their English?**

**Cut or move:**
- The intro shrinks to one line.
- @handles and visit logs move to Deep, under real names.
- Sources become one link per city.
- "Our dates" prose becomes a chip.
- History becomes one story card; the rest goes to Deep.
- Restaurant detail goes to the place page.
- Tonight's dinner also appears in the Trip day view.

## 4. Data needs and risks

- **Fix first:** rewrite `food-guide.json` for seven people and the current route. Cheap and urgent.
- **New fields:**
  - places: `pregnancy` (ok | ask | skip), missing on all 128
  - dishes: `glance` (≤12 words) and `hook`
  - cities: `story`
  - the short layer in Portuguese: `pt`
  - `seating` (chairs | tatami | counter), now buried in prose
  - a glossary of about 40 terms
  - a structured `closed` list, so the date chips can be computed
- **Photos:** dishes and deep places have none. Sourcing about 25 must-try dishes (Wikimedia, or the family's own photos during the trip) is the real cost.
- **Risks:**
  - The short layer could drift from the deep one. Keep them in one record with three fields, updated by one import.
  - "Fine" must be right. Pedro and Fernanda should sign off on every flag once.
