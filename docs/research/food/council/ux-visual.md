# Food page: visual and interaction (phone-first)

## 1. Diagnosis

1. **No food above the fold.** In `tokyo-top.png`, every tab opens with the same 250 px paragraph, then the chips, then a 290 px cover. The first dish only appears at y≈720.
2. **The cards read like forms.** Each one stacks 5–7 label rows plus a critic box, at 550–900 px per card. That's where Tokyo's 48k px comes from.
3. **Colour has lost its meaning.** Every Fernanda note is warn-orange, even "All cooked: easy for Fernanda". The Tabelog score is a grey chip that weighs the same as `¥¥`.
4. **The Japanese names don't help.** They're set in 14 px muted sans, too small and faint to match against the noren (the shop's entrance curtain).
5. **Nothing to scan by, and nothing in reach.** Below the cover come 57 identical cream cards. The 18 chips and the 13 px "show/hide" toggles sit in the top third of the screen.

## 2. Principles

- **Verdict first, story on tap.** Every row answers four questions: is it good, can Fernanda eat it, do seven fit, and is it open on our dates.
- **Colour is a promise.** Region colour means *where*. Green, amber and red mean *Fernanda* and nothing else. Vermilion means *act now* or *exceptional*.
- **Ink, not photos.** Stamps and line drawings stand in for the photos we don't have, and they work offline.
- **Read at the top, act at the bottom.** All controls sit in the bottom 40 % of the screen.
- **One restaurant row, everywhere:** Food, Trip days and place pages.

## 3. Proposal

```
FOOD · Kanazawa, 28 Dec
[Tonight near us: 3 rows]   ← open, fits 7
Cities: cover tiles 120×150 →
Guides: (stamp)(stamp)(stamp)(stamp)
Book by ▸ 2 due this week
dock 48px: [Tokyo ▾][Fine for F][Fits 7]
```
**Guide stamps.** 84 px `EkiStamp`s, shown as ghosts (`inked={false}`) until opened, then they play `stamp-in`.

**City page.** The cover shrinks to 160 px and carries vertical `.emaki-kanji`. Below it, a `.seg` switches between **Eat · Where · Walk · Story**, each a short list of its own.

**Restaurant row.** 84 px tall, so about 8 fit on a screen (today it's 1).
```
(stamp) Mikawa Zezankyo     ┌────┐
        みかわ 是山居        │4.10│
        Tempura · Monzen-naka│食べログ│
        ● Fine ⑦ room ◎W ◎L └────┘
```
- **Spacing and type.**
  - Padding is 12/16 px, with an 8 px gap between rows.
  - The name is Figtree 600 at 17 px.
  - `name_ja` is Shippori 500 at 14 px in `--ink-2`, with `lang="ja"`.
  - The meta line is 13 px. Nothing goes below 12 px.
  - On press, the row scales to 0.98 and takes a 6 % region wash.
- **Genre stamp.** 48 px, using `MotifPath`, in region ink (mixed 70 % with `--ink` in dark mode).
- **Tabelog tile.** 48×48, with the score in Fraunces 20 px, tabular figures. Four tiers:
  - **≥ 4.00:** vermilion fill.
  - **3.70–3.99:** vermilion outline.
  - **3.50–3.69:** ink outline.
  - **Below 3.50:** muted text only.

  Awards go in a 14 px corner seal: gold, silver or bronze (`.emaki-gold`), or an ink 「百」 for 百名店.
- **Critics.** 22 px indigo monograms, overlapping, at most 3 then "+n". They appear only when a source link exists.
- **Fernanda mark.** Shape, colour and label, so it reads without colour:
  - **Fine:** a quiet ● in `--ok`.
  - **Ask:** ◆ in `--warn`.
  - **Skip:** ⊘ in `--danger`.
- **Fits seven.** ⑦ followed by room, table, 4+3 or ?.

**Restaurant sheet.**
- **Detents.** A peek at 45 dvh and full at 92 dvh.
- **Content order.** Order this → Fernanda (with the Japanese ask phrase) → Seven of us → Our dates (closed days struck through) → Critic quotes → Why → Sources.
- **Action bar.** Pinned at the bottom, with 52 px buttons: **Map · Save · Share · Book/Call**.
- **Save** stamps a 「食」 seal onto the row.
- **Share.** `?p=slug` makes the sheet shareable in the family chat, and Back closes it.
- **Show to staff.** The Japanese name at 40 px Shippori 700, with 「妊娠中です。生もの抜きでお願いします。」.

**Dish tile.** A 2-column grid of 168×188 px tiles.
- **Art.** A 64 px line illustration on a 12 % region-colour wash.
- **Names.** Fraunces 18 px, with the Japanese in Shippori 15 px.
- **Must-try.** A vermilion hanko 「必」, rotated −6°.
- **Tap.** Opens Story mode: the art at 160 px, the history in 19 px Fraunces, and tappable "where" rows.

**Booking card.** Leads with a 56 px date block.
- **States.**
  - **Open now or overdue:** vermilion fill.
  - **Due within 14 days:** outline.
  - **Booked:** a green 「予約済」 stamp.
- **Method.** A chip (Online / Phone / Walk-in), with a primary button that uses `tel:` or a link.

**Topic row.** 64 px: motif, name, Japanese name, price and the Fernanda mark. Empty fields are not rendered.

**Motion.**
- **Sheets.** Keep `sheet-in` at 320 ms.
- **Segments.** A 150 ms crossfade.
- **Stamps.** `stamp-in` is reserved for saving and booking.
- **Never.** No parallax. Honour reduced motion.

**Cut.**
- **Intro:** down to one line.
- **Guide links:** into the sheet's Sources.
- **Our Tokyo list:** becomes a filter, shown with a grey Google ★ rather than a tile.
- **Ryokan meals:** move to Trip.

## 4. Data needs and risks

**Missing data:**
- **Fernanda level.** Places have a pregnancy note but no level, so the mark can't be drawn.
- **Group size** as an enum.
- **Closures.** Deep places have no structured closed days.
- **lat/lng.** Deep places don't have coordinates, which blocks "near me".
- **Awards.** Need to be parsed into tier, years and 百名店.
- **Booking items.** Need `deadline`, `method`, `tel` and `status` fields.
- **Motifs.** A genre-and-dish map to motifs.

**Expensive to build:**
- About 35 hand-drawn motifs.
- Drag detents (Radix has none).
- Caching Shippori offline.
- Merging `FoodCard` with the deep cards.
