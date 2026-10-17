# Route review: assessment, new main route and rule changes (17 Oct 2026)

**For:** the agents building and maintaining the trip app.

**From:** a review of the full research export of 17 Oct 2026. It covers:
- the 17 routes in the app
- `docs/research/00`–`09`
- the plan doc
- the route research files
- `BRIEF.md` and `expanded.md`

**Status:** Pedro asked for this. It is a proposal for the main route and for the route-making rules. It does **not** change any data file. Apply it to whatever schema the app uses today. Section 5 says what each rule means, so it can be mapped onto that schema.

**The trip:** 20 Dec 2026 – 9 Jan 2027, 20 nights, 7 travellers.
- Pedro and Fernanda are the planners. Fernanda is 29–32 weeks pregnant.
- Carlos and Nadir are Pedro's parents.
- João, Carolina and Tatiana come too.
- Pedro and Fernanda already know Tokyo, Kyoto, Osaka and Hakone, and have been to Kamakura and Nikko in summer.

---

## 1. Summary

1. **Pedro's complaint is correct.** The routes give too many nights to places with little to do:
   - 15 of the 17 routes give 3 or more nights to a small place. Most commonly that is Kanazawa at 4.
   - 8 of the 10 new routes end with 3–4 nights in Tokyo, padded with "free day" and "quiet evening".
   - All 10 new routes contain at least one day that is explicitly empty ("slow day", "easy day", "home day"), and 8 of them contain 2–5 such days.
2. **The latest recommendation, route F in `expanded.md`, contradicts all three of Pedro's notes.**
   - It gives Kanazawa 4 nights, where he said 3 already feels long.
   - It gives Kyoto 6 nights without a day-by-day justification.
   - It spends Nagano on a ski day Fernanda can't use.
3. **The cause is the rules, not the places.** A few rules, applied mechanically, force long blocks around New Year:
   - the no-move peak-day list
   - "rest days count as nights" wherever the calendar is frozen
   - the "ryokan dinner on 31 Dec" rule
   - the 2-night luggage lead over New Year
   - a 4-night Tokyo ending
4. **Proposed main route:** Tokyo 4 → Nagano (Yudanaka/Shibu) 2 → Kanazawa 2 → Takayama 2 (via Shirakawa-go) → Kyoto 6 (New Year's Eve in Higashiyama) → Kawaguchiko 2 → Tokyo 2.
   - No small place gets more than 2 nights.
   - Kyoto is the only long stay. It is a hub, and every one of its days has a named plan.
5. **Twelve rule changes** are listed in section 5. The most important:
   - Make the peak-day rule directional and distance-based, and fix the dates (31 Dec is a calm day; 27–28 Dec are not).
   - Cap nights by what a place can fill.
   - Ban unplanned days in small places.
   - Put rest days in hubs.
   - Shorten the Tokyo ending.
   - Turn the New Year's Eve rule into a family choice.

---

## 2. What Pedro has said (the brief the route must meet)

**What he asked for on 17 Oct:**
- "Too many nights in certain places, especially places that are not very well known for having a lot of stuff to do."
- Kanazawa already feels long at 3 nights; 4–6 is too much.
- Nagano: there must be a better way to spend the time there.
- Kyoto at 6 nights feels like a lot. Every day needs a plan, and day trips must be easy and worth it.
- New Year's Eve is undecided:
  - Gero is a quiet ryokan night with nothing on.
  - Kyoto is the event.
  - Shibu is charming but sold out for New Year and far from Kyoto.

**Earlier preferences that still stand:**
- He likes Kanazawa, Nagano and "even Gero".
- He wants regions new to him and Fernanda.
- He likes museums, gardens and nature.
- He wants options rather than one fixed answer.
- He likes snow and ski for the fit ones, and accepts that Fernanda can't ski.

**Constraints that hold (from `08-pregnancy`, `03-transport` and `07-lodging`):**
- **Travel days for Fernanda:**
  - At most 4 hours door to door.
  - At most one rail leg over 2 hours a day.
  - A rest or light afternoon after any 3-hour travel day.
  - Green Car for legs of 2 hours or more.
- **Hospitals:** every base within about 30 minutes of a 24-hour obstetric hospital. Nights from 29 Dec to 3 Jan near a perinatal centre.
- **Bookings:** every train leg booked at 10:00 JST exactly one month ahead. We are now **7**, not 6, for every booking.
- **Last night:** the night of 8 Jan within 60–90 minutes of Haneda. 9 Jan is a Saturday at the start of a three-day weekend.

---

## 3. Assessment of the routes as they stand

### 3.1 Long stays in small places

The "Small places at 3+ nights" column counts nights in places other than Tokyo, Kyoto and Osaka. "Padded days" counts days whose plan is explicitly "free / easy / slow / quiet / home / rest". The day-by-day plans exist only for the main route and the 10 designer routes.

| Route | Small places at 3+ nights | Padded days | Ending |
|---|---|---|---|
| Main (Gero New Year's Eve) | Kanazawa 4 | Gero 31 Dec is a rest day; Kanazawa 27 Dec is an "easy" day | Tokyo 2 |
| Gentle | Kanazawa 4, Takayama 4 | (no day plans) | Tokyo 3 |
| Full | Kanazawa 3 | (no day plans) | Tokyo 1 |
| Snow monkeys / Art / Kinosaki / Hakone variants | Kanazawa 3–4 | as main | Tokyo 2 |
| Golden Route in winter | none, but Osaka gets 5 | 5 | Tokyo 3 |
| Two cities, done slowly | none, but Kyoto gets 10 | 4 | Tokyo 4 |
| Kyoto, Kii coast and Nara | Shirahama 4, Nara 4 | 1 | Tokyo 4 |
| Deep snow country | Nagano 3, Takayama 3, Okuhida 3, Kanazawa 4 | 3 | Tokyo 4 |
| Western onsen trail | Kinosaki 4, Arima 4 | 3 | Tokyo 4 |
| Kyoto house and the sea | Kamakura 4, and Kyoto gets 12 | 1 | Kamakura 4 |
| Castles, Shrines, Inland Sea | Matsue 4, Okayama 4 | 4 | Tokyo 4 |
| Winter Food Trail | Kanazawa 3, Arima 3, Fukuoka 4 | 2 | Tokyo 2 |
| Fuji and the Pacific Shore | Kawaguchiko 3, Atami 3, Shuzenji 4, Ise-Shima 4 | 4 | Tokyo 4 |
| Snow, Samurai, Far North | South Tohoku 3, Morioka 4, North Tohoku 4 | 4 | Tokyo 4 |
| **F (latest recommendation)** | **Shibu 3, Kanazawa 4** | 31 Dec and 1 Jan slow | Tokyo 2 |

The pattern is consistent. Each route has:
- a 3–4-night block in a small onsen town or small city across 28 Dec – 1 Jan;
- a second 4-night block across 1–5 Jan;
- a 4-night Tokyo ending.

The New Year blocks are padded with "a slow day of baths and naps" or "easy day on the beach front". The Tokyo endings are padded with "free day: shopping, farewell dinner". Those are exactly the nights Pedro is objecting to.

### 3.2 The real capacity of the places in question

A **full day** here means one main outing and one short visit, at the Balanced pace.

| Place | What it really holds for this group in these dates | Full days | Nights it deserves |
|---|---|---|---|
| **Kanazawa** | Day 1: Kenroku-en, the castle park, the 21st Century Museum (open to 20:00 Fri–Sat, closed Mondays). Day 2: Higashi Chaya, Omicho market, D.T. Suzuki Museum, the Nagamachi lanes. The Nomura samurai house is closed 26–27 Dec, museums are closed Mondays and from 29 Dec. | 2 | **2**. 3 only if Shirakawa-go is a day trip, but it works better as a stop on the bus to Takayama. |
| **Nagano** (Yudanaka / Shibu / Zenko-ji / Obuse) | Zenko-ji on arrival. The snow monkeys (open daily) in the morning, then Obuse (Hokusai's ceiling painting, chestnut sweets) in the afternoon. Shibu's lantern lane in the evening. | 1.5 | **2**. 3 only for a ski day for the fit four. |
| **Takayama** | Old town, Sanmachi breweries, morning markets, the festival-float hall, Hida Folk Village. Takayama Jinya, the main museum, closes 29 Dec – 3 Jan. | 1–1.5 | **2** |
| **Gero** | Footbaths, Gassho Village, the ryokan. No New Year's Eve event, and no bell for visitors confirmed (`expanded.md` §1). | 0.5 | **0–1**. A rest stop, not a destination. |
| **Kyoto** (and day trips) | 3–4 days in the city for the four first-timers. Easy day trips: Nara (35–45 min), Uji (20–30 min), Ohara (40–60 min bus), Osaka (30 min), Himeji (50 min). New Year rites 31 Dec – 3 Jan. | 6+ | **4–6**, provided every day is planned (§4.3). |
| **Kawaguchiko** | Ropeway and lake, two dawns for Fuji. | 1 | **2** |
| **Tokyo, at the end** | Museums that were closed in December, a single act of kabuki, shopping, the airport buffer. | 1 | **1–2** |

### 3.3 Why the routes come out this way: seven root causes

1. **The peak-day list is too broad and isn't directional.**
   - `trip-data.json` → `calendar.peak_travel_days` lists 29, 30 and 31 Dec and 2, 3 and 4 Jan.
   - `03-transport` (rule R1 and §1) says the worst days are **27–30 Dec, leaving Tokyo, Osaka and Nagoya**, and **2–4 Jan, returning to them**.
   - It also says **"31 Dec and 1 Jan are calm travel days"**.
   - Short regional hops and trains running against the crowds were never the problem.
   - So the list wrongly blocks 31 Dec, and it misses 27–28 Dec for long moves out of Tokyo.
   - Blocking six days as "no move" freezes the middle of the trip. The route designers then fill the frozen stretch with one long stay.
   - *(This list came from the v2 data package; it is corrected here.)*
2. **Nights = arrival + full days + rest days, and rest days go wherever the calendar is frozen.**
   - That is how Kanazawa got its fourth night: the stop note calls it "the mid-trip reset".
   - Rest days in a small town are dead days. In a hub, a rest morning still has options.
3. **The "31 Dec at a ryokan with dinner" rule.** It pushes every route to an onsen town for New Year. Those towns are sold out, rural, have nothing on, and are where Fernanda can enjoy the baths least.
4. **The 2-night luggage lead over New Year** (`03-transport` R6). It quietly enforces long stays. It is solvable: send the big cases once, and travel the middle of the trip with cabin bags (§5, rule 7).
5. **The 4-night Tokyo ending.** It comes from "fly from Haneda on Saturday 9 Jan and be near the airport on 8 Jan". That needs one night, two for a buffer. It doesn't need four.
6. **No check on whether a place can fill its nights.** `regions[].suggested_nights` exists, but routes can exceed it silently. Day plans can say "free day" in a small town without any warning.
7. **No credit for what the planners already know.** Pedro and Fernanda know Tokyo, Kyoto, Osaka and Hakone. Long stays there need to be justified by the first-timers' needs, not assumed.

### 3.4 Errors to fix wherever they appear

From `expanded.md` §4, still open:
- The Gero → Kyoto direct train takes about **3 hours**, not 1.5. Via Nagoya it is 2¼–2½ hours.
- **No bell for visitors at Onsen-ji in Gero** has been found. Remove it, or mark it "ask the ryokan".
- The Okera fire is on the **evening of 31 Dec** (rite at 19:00, the fire from about 19:30 to 05:00), not 17:00 on 1 Jan.
- Nagano → Gero takes 4.5–5 hours, and Shibu → Kyoto about 5 hours. Both break the 4-hour rule.
- Kyoto → Kawaguchiko takes 4 h 15, which breaks the 4-hour rule. It is in the current main route.
- Lodging is sized for 6 in `07-lodging`. **We are 7.**
- Some Hida trains were cancelled after a carriage shortage (crash, Oct 2025). Check before relying on the Hida line.

---

## 4. The new proposal

### 4.1 Main route: "New places before Christmas, Kyoto for New Year"

| # | Base | Dates | Nights | Why this long |
|---|---|---|---|---|
| 1 | Tokyo | Sun 20 – Thu 24 Dec | 4 | Arrival plus 3 full days for the four first-timers, in Christmas-lights week. Mon 21 is a museum closing day, so it is the markets-and-gardens day. |
| 2 | Nagano: Yudanaka / Shibu Onsen | Thu 24 – Sat 26 Dec | 2 | Zenko-ji, the snow monkeys, Obuse, Shibu's lantern lane, a ryokan on Christmas Eve. |
| 3 | Kanazawa | Sat 26 – Mon 28 Dec | 2 | Two full days: gardens and museums, then Higashi Chaya and the market. Leaving on Monday the 28th uses the museum closing day as the travel day. |
| 4 | Takayama, via Shirakawa-go | Mon 28 – Wed 30 Dec | 2 | Shirakawa-go on the way in, the old town at dusk, then one full Takayama day. |
| 5 | Kyoto, Higashiyama for New Year's Eve | Wed 30 Dec – Tue 5 Jan | 6 | The New Year event, then four day-trip and museum days while the rest of Japan travels home. A hub: every day has a named plan (§4.3). |
| 6 | Kawaguchiko (or Hakone, §4.6) | Tue 5 – Thu 7 Jan | 2 | One full day and two dawns for Fuji. January is Fuji's clearest month. |
| 7 | Tokyo | Thu 7 – Sat 9 Jan | 2 | The museums closed in December, a single act of kabuki, shopping, near Haneda for the flight. |

**Totals:**
- 4 + 2 + 2 + 2 + 6 + 2 + 2 = 20 nights.
- 7 bases, 6 moves.
- No small place over 2 nights.
- 4 of the 7 bases are new to Pedro and Fernanda.

### 4.2 Moves, and when to book them

| Date | From → To | How | Door to door | Peak? | Book |
|---|---|---|---|---|---|
| Thu 24 Dec | Tokyo → Yudanaka | Hokuriku shinkansen to Nagano (~1 h 20), Zenko-ji, then the Nagaden express to Yudanaka (~45 min) | ~3 h, with a stop | No | 24 Nov, 10:00 JST |
| Sat 26 Dec | Yudanaka → Kanazawa | Nagaden to Nagano, then Kagayaki (~65 min) | ~2.5–3 h | No (26 Dec is Saturday, the start of outbound traffic from Tokyo; this train runs Nagano to Kanazawa, not out of Tokyo) | 26 Nov |
| Mon 28 Dec | Kanazawa → Shirakawa-go → Takayama | Nohi bus 8:40 → 10:05, about 3 h in the village, then a bus to Takayama (~50 min) | ~5 h including the village visit; ~2 h of riding | Regional bus; reserve | ~28 Nov (bus sales one month ahead) |
| Wed 30 Dec | Takayama → Kyoto | Hida to Nagoya (~2 h 20), then Nozomi to Kyoto (~35 min) | ~3.5 h | 30 Dec is a peak day. The Hida leg runs *away* from the homecoming flow; the Nozomi is all-reserved. Our reading, not confirmed. | **30 Nov, 10:00 JST**, Green Car |
| Tue 5 Jan | Kyoto → Kawaguchiko | Shinkansen to Mishima, then bus; or to Shin-Fuji | ~4 h 15 | No | 5 Dec |
| Thu 7 Jan | Kawaguchiko → Tokyo | Fuji Excursion (~2 h) | ~2.5 h | No | 7 Dec |

**Luggage, using the "travel light" pattern (rule 7):**
- **23 Dec:** forward the big cases from Tokyo to the Kyoto lodging. Confirm it will store them from about 26 Dec.
- **24–30 Dec:** travel with cabin bags. That's 6 nights across 3 bases, with laundry in Kanazawa.
- **4 Jan:** forward the big cases from Kyoto to the final Tokyo hotel. That allows the 2-night New Year lead, and the cases arrive by 6–7 Jan.
- **5–7 Jan:** cabin bags again for Kawaguchiko.

### 4.3 Day by day

| Date | Base | Plan | For Fernanda |
|---|---|---|---|
| Sun 20 Dec | Tokyo | Land at Haneda, van to the hotel, Marunouchi lights, easy dinner | Rest |
| Mon 21 | Tokyo | Museums closed: Tsukiji outer market, Hama-rikyu garden, Ginza food halls | Flat; seated breaks |
| Tue 22 | Tokyo | Asakusa and Senso-ji early, Ueno or the Tokyo National Museum, Skytree at dusk | Lifts everywhere |
| Wed 23 | Tokyo | Meiji Jingu and Harajuku, the Nezu Museum garden, Shibuya. Forward the big cases to Kyoto. | Ramped gate at Harajuku |
| Thu 24 | → Nagano | Shinkansen to Nagano. Zenko-ji (flat approach; the dark passage under the hall is optional). On to Yudanaka. Christmas Eve ryokan dinner, then Shibu's lantern lane. | Private or in-room bath |
| Fri 25 | Yudanaka | Snow monkeys in the morning (1.6 km of packed snow; spikes, or footbaths in Shibu). Afternoon in Obuse: Hokusai museum, Gansho-in ceiling, chestnut sweets. *Obuse hours over the holidays: check.* | Monkey path optional |
| Sat 26 | → Kanazawa | Train via Nagano. Kenroku-en, then the 21st Century Museum (open late on Saturday) | Flat |
| Sun 27 | Kanazawa | Omicho market, Higashi Chaya and gold leaf, D.T. Suzuki Museum, the Nagamachi lanes; crab dinner (kobako crab is in season until 31 Dec) | Flat; long lunch |
| Mon 28 | → Takayama | Museums closed: Nohi bus to Shirakawa-go (viewpoint shuttle, Wada house), bus on to Takayama. Old town at dusk and Hida beef. | Seated bus; the farmhouse stairs are optional |
| Tue 29 | Takayama | Miyagawa morning market (with the New Year decorations market, 27–31 Dec), Sanmachi sake breweries, festival-float hall, Hida Folk Village. Takayama Jinya is closed from 29 Dec. | Icy riverside; cleats |
| Wed 30 | → Kyoto | Train to Kyoto, arriving early afternoon. Nishiki market before it closes 1–3 Jan, Gion at dusk. | Green Car, light afternoon |
| Thu 31 | Kyoto | Kiyomizu-dera and the Higashiyama lanes early, then rest. A daytime bell for anyone (in 2025: Myoman-ji 15:00–17:00, Zuiko-ji 14:00–17:30). Dinner in, toshikoshi soba. Okera fire at Yasaka from about 19:30, back by 21:00. Midnight bell for whoever wants it: Kodai-ji (numbered tickets from 22:00, first 108 groups), Eikando, Chishaku-in. | Daytime bell, early fire, bed by 21:00 |
| Fri 1 Jan | Kyoto | Slow on purpose: Ohara's Sanzen-in (open 1–3 Jan), or Nanzen-ji and the Philosopher's Path. Hotel or ryokan lunch, since restaurants are shut. The early crew can go to Todai-ji in Nara (free until 08:00, with the window to the Great Buddha's face open). | The planned rest day |
| Sat 2 | Kyoto | Kyoto National Museum's New Year show, Kitano Tenmangu's first-calligraphy festival | Seated museum |
| Sun 3 | Kyoto | Uji: Byodo-in and the tea street (*New Year hours to check*); or the New Year bunraku in Osaka (from about 3 Jan, seated) | Flat |
| Mon 4 | Kyoto | Nara by reserved Kintetsu train (35 min): Todai-ji, the deer, Kasuga Taisha (the museum is closed on Mondays). Or Himeji Castle (50 min; grounds for her, the keep for the fit four). Forward the big cases to Tokyo. | Grounds only at Himeji |
| Tue 5 | → Kawaguchiko | Long move (4 h 15). Nothing planned after arrival; the lakeshore at sunset. | Green Car, rest |
| Wed 6 | Kawaguchiko | Fuji at dawn, the panoramic ropeway, the Itchiku Kubota Art Museum, Oishi Park | Seated ropeway |
| Thu 7 | → Tokyo | Second dawn, then the Fuji Excursion to Tokyo. Afternoon at the Tokyo National Museum or a department-store food hall. | |
| Fri 8 | Tokyo | A single act at Kabuki-za, last shopping, farewell dinner | |
| Sat 9 | Tokyo | Fly home from Haneda | |

### 4.4 Hospitals, night by night (rule kept)

| Nights | Base | Nearest obstetric care (from `08-pregnancy` and `expanded.md`) |
|---|---|---|
| 20–23 Dec, 7–8 Jan | Tokyo | Many |
| 24–25 Dec | Yudanaka | Hokushin General Hospital, Nakano: regional perinatal centre, ~10 km (estimate). Before New Year. |
| 26–27 Dec | Kanazawa | City perinatal centre |
| 28–29 Dec | Takayama | Takayama Red Cross Hospital, ~10 min from the station |
| 30 Dec – 4 Jan | Kyoto | Kyoto University Hospital, Japan Baptist Hospital |
| 5–6 Jan | Kawaguchiko | **Not checked.** Find the nearest obstetric emergency service before booking. If it is far, Hakone is the alternative (§4.6). |

Every night from 29 Dec to 3 Jan is in Takayama or Kyoto, so rule 8 of `08-pregnancy` is met.

### 4.5 Compared with the current main route and route F

| | Current main | F (expanded.md) | **Proposed** |
|---|---|---|---|
| Stays | Tokyo 4, Kanazawa 4, Takayama 2, Gero 2, Kyoto 4, Kawaguchiko 2, Tokyo 2 | Tokyo 3, Shibu 3, Kanazawa 4, Kyoto 6, Kawaguchiko 2, Tokyo 2 | Tokyo 4, Yudanaka 2, Kanazawa 2, Takayama 2, Kyoto 6, Kawaguchiko 2, Tokyo 2 |
| Small places over 2 nights | Kanazawa 4 | Shibu 3, Kanazawa 4 | **None** |
| New Year's Eve | Quiet ryokan night in Gero | Kyoto event | Kyoto event, with a ryokan dinner if one is booked |
| New places for Pedro and Fernanda | Kanazawa, Takayama, Gero, Kawaguchiko | Shibu, Kanazawa, Kawaguchiko | Nagano/Shibu, Kanazawa, Shirakawa-go, Takayama, Kawaguchiko |
| Moves | 6 | 5 | 6 (4 of them in 24–30 Dec) |
| Peak-day moves | 30 Dec, 45 min | 30 Dec, ~2–2.5 h | 30 Dec, ~3.5 h (against the main flow) |
| Hospital rule (29 Dec – 3 Jan) | Broken (Gero) | Kept | Kept |
| Lodging risk | Gero New Year moderate | Shibu 23–26 Dec unchecked; Kyoto New Year high | Yudanaka 24–26 Dec unchecked; Kyoto New Year high |

### 4.6 Variants to show next to it

- **V1, Hakone instead of Kawaguchiko (5–7 Jan).**
  - Gains: about 3 hours from Kyoto instead of 4 h 15, which keeps the 4-hour rule. Five museums for a cloudy day. Ryokan with private baths.
  - Costs: Pedro and Fernanda know Hakone, and Fuji is less direct. The Ekiden road closures are 2–3 Jan only.
- **V2, a ski day for the fit four.**
  - Stays: Tokyo 3 (20–23) → Nagano 3 (23–26), then as the main route.
  - The fit four ski at Shiga Kogen (30-minute bus from Yudanaka; *2026 opening date to check*). Fernanda and the parents do Obuse and Zenko-ji.
  - Costs one first-timer Tokyo day.
- **V3, Kyoto at 4, if 6 still feels long.**
  - Stays: Kyoto 4 (30 Dec – 3 Jan), then Nara 2 (3–5 Jan). Kyoto to Nara is a 35-minute local hop, so it is allowed under rule 1 below. Then Hakone 2 (V1).
  - Gains: a calm Nara with the deer at dawn.
  - Costs: 5 Jan becomes Nara → Hakone, about 4 h. Two check-ins instead of one.
- **V4, a calm New Year's Eve (if Fernanda would rather not be in a crowd).**
  - Keep the route.
  - Book a Higashiyama ryokan for 30–31 Dec with the New Year's Eve dinner. On the night, only the 19:30 fire, from the edge of the crowd, or nothing at all.
  - This is cheaper than moving New Year's Eve to a rural onsen, and it keeps the hospital rule.

### 4.7 Book or check now

1. **Yudanaka or Shibu, 24–26 Dec, for 7.** Ask for beds and a private bath; Kokuya, Kanaguya and Biyunoyado are the candidates in `07-lodging`. Pedro's note that Shibu is sold out refers to New Year; before Christmas is *unchecked*. Book only through official channels; Kanaguya warns of fake emails.
2. **Kyoto, Higashiyama, 30 Dec – 5 Jan.** The hardest booking. Either a townhouse for 7 (ask about ground-floor beds, the walk to Yasaka shrine, the licence number and heating), or a ryokan for 30–31 Dec plus a second base for 1–5 Jan.
3. **Kanazawa 26–28 Dec and Takayama 28–30 Dec, for 7.**
4. **Kawaguchiko or Hakone 5–7 Jan**, after the hospital check (§4.4).
5. **Calendar:**
   - 24 Nov, 26 Nov, ~28 Nov (Nohi bus), 30 Nov 10:00 JST (the 30 Dec trains)
   - 1 Dec, 14:00 (Chion-in bell tickets, optional)
   - 5 Dec, 7 Dec, 9 Dec (airport transfer)

---

## 5. Rule changes for trip and route making

Each rule has a short id, what changes, and the reason. The names are suggestions; map them onto the app's current schema.

### Rule 1. Peak-day moves become directional and distance-based (replaces `no_peak_moves`)

- **Data.** Replace the flat `peak_travel_days` list with peak flows, each with a date range, a direction and the lines affected:
  - **outbound**: 26–30 Dec, worst 29–30 Dec, leaving Tokyo, Osaka and Nagoya on the trunk shinkansen lines (Tohoku, Hokuriku, Tokaido/San'yo, Joetsu) and the long-distance expresses;
  - **return**: 2–4 Jan, worst 3 Jan, the same lines towards those cities;
  - **calm**: 31 Dec and 1 Jan, marked as good move days.
- **Check.**
  - *Warn* for a move over 90 minutes on a trunk line in the peak direction on a peak day.
  - *Info* (no warning) for: a move under 90 minutes; a regional line or bus; a move against the flow. Each needs the note "reserve at 10:00 JST one month ahead".
  - *Error* for any plan that relies on unreserved seats between 24 Dec and 11 Jan.
- **Why.** `03-transport` §1 is about crowding on trunk lines in one direction at a time. The current list blocks calm days and short hops, and that freezes the calendar into long stays.

### Rule 2. Cap nights by what a place can fill (new)

- **Data.** Each region gets:
  - **full days**: content days for this group in these dates, after closures;
  - **hub**: whether it is a base with easy day trips;
  - **day trips**: each with its one-way time and its open dates.
- **Check.**
  - *Warn* when a non-hub stay has more nights than its full days + 1.
  - *Warn* when a hub stay has more nights than full days + the day trips that are open on those dates + 1.
  - The message names the empty days. Example: "Kanazawa 4 nights: 2 full days, museums closed 28 Dec; 2 nights would leave no empty day".
- **Starting values** (§3.2): Kanazawa 2, Nagano 1.5, Takayama 1, Gero 0.5, Kawaguchiko 1, Kyoto 4 + day trips, Tokyo 4 + day trips.

### Rule 3. No unplanned days in small places (new; extends "pace overload")

- *Warn* when a day in a non-hub stay has no main outing and isn't the move day, or when its plan is "free / easy / slow / rest".
- A rest *afternoon* is fine everywhere. A rest *day* belongs in a hub (rule 4).

### Rule 4. Rest days go in hubs (changes the nights formula)

- The current formula is "nights = arrival day + full days + easy days".
- New formula: "nights = arrival day + full days", **capped by rule 2**. Rest days are added only to hub stays, about one per 5 days.
- Explain the result as now: "Kyoto 6: arrival afternoon, New Year's Eve, a rest day on 1 Jan, 3 museum and day-trip days."

### Rule 5. Shorter Tokyo ending (new)

- **Check.**
  - *Error* if the night of 8 Jan is more than 90 minutes from the departure airport.
  - *Warn* if the final Tokyo stay is over 2 nights, unless the first-timers have had fewer than 3 full Tokyo days at the start.
  - *Info* if no intercity move is planned on 9 Jan.
- **Why.** `03-transport` R4 needs one night near the airport, not four.

### Rule 6. New Year's Eve becomes a choice, not a ryokan requirement (replaces `new_years_eve_dinner`)

- **Data.** The New Year's Eve stay records:
  - **type**: an event (shrine or temple), a ryokan, or a house;
  - **dinner arranged**: yes or no, for every type;
  - **what's on**: what is actually happening that night, with sources.
- **Check.** *Info* if no dinner is arranged, since restaurants close. *Warn* if "what's on" is empty for an event-type base.
- **Default** for this trip: event type in Kyoto (Higashiyama), with dinner arranged.
- **Why.** The ryokan rule pushed every route to a rural onsen town that has nothing on, is sold out and breaks the hospital rule.

### Rule 7. Travel light mode for luggage (new)

- **Data.** A trip-level travel-light pattern: where the big cases are forwarded to, on which dates, and when they rejoin the group.
- **Check.**
  - *Warn* when a base change happens without a forwarding plan.
  - *Warn* when cases handed in 26 Dec – 4 Jan have less than 2 nights' lead.
  - Don't let the forwarding lead drive the number of nights: with travel light on, 2-night stays across New Year are allowed.

### Rule 8. Move density for Fernanda (new; complements the 4-hour rule)

- *Warn* for more than 3 moves in any 7 days.
- *Warn* for moves on consecutive days.
- *Info* when a move of 3 hours or more is followed by a plan heavier than "light afternoon".
- **Why.** Short stays are only fair to her if the moves are spaced out. The proposed route has 4 moves in 24–30 Dec, all of them 2 days apart, which is the most this allows.

### Rule 9. The hospital rule stays and gets data (keeps `08-pregnancy` rule 8)

- **Data.** Each region records its nearest obstetric emergency hospital: name, minutes by taxi at night, phone number, whether it is a perinatal centre, and the source.
- **Check.**
  - *Warn* for any night more than 30 minutes from obstetric care.
  - *Warn* for any night from 29 Dec to 3 Jan more than 30 minutes from a perinatal centre.
- **Missing data shows as "not checked"**, never as a pass. Gero and Kawaguchiko are not checked yet.

### Rule 10. Credit for what the planners already know (new)

- **Data.** Each traveller records the places they already know. For Pedro and Fernanda: Tokyo, Kyoto, Osaka, Hakone, Kamakura (summer), Nikko (summer).
- **Use.**
  - Show "new to N of 7" per stay.
  - *Info* when more than half the nights fall in places the planners already know. Long stays there should cite the first-timers.

### Rule 11. Every limit applies to the route as a whole (fixes in the existing rules)

- The 4-hour rule should check every move. Kyoto → Kawaguchiko (4 h 15) passes today.
- The two-night minimum stays a warning, not a reason to pad.
- Party size is a trip setting (7), not a constant. `07-lodging` and the budget assume 6.

### Rule 12. Uncertain facts are marked, never presented as fact (process)

- Every time, hour or opening that wasn't checked in a source for the 2026–27 dates is shown as **"to check"**.
- Every one carries a re-check date (mid-December for JR's year-end reports and the temples' New Year notices).
- The Gero bell, the Gero → Kyoto time and the Okera time all reached the app unchecked.

---

## 6. Questions for the family (they change the route, not the rules)

1. **New Year's Eve:** in the middle of it at Yasaka shrine, or a calm ryokan dinner (V4)? The route is the same either way. Only the booking changes.
2. **Fuji:** Kawaguchiko (the clearest view, 4 h 15 from Kyoto) or Hakone (3 h, museums, known to Pedro and Fernanda)?
3. **A ski day for the fit four (V2)?** It costs a Tokyo day.
4. **Kyoto at 6 nights, or Kyoto 4 + Nara 2 (V3)?**

---

## Sources

The research files referenced throughout (all in this repository):
- `docs/research/00-synthesis.md`
- `03-transport.md` (R1, R4, R6 and §1, the peak days)
- `07-lodging.md`
- `08-pregnancy.md`
- `docs/research/routes/*.json`
- `docs/research/plan-doc/*`
- `BRIEF.md` and `expanded.md` (17 Oct)

External sources for the New Year's Eve and hospital facts:
- [Watabi, Kyoto New Year guide](https://watabi.org/en/articles/kyoto-new-year-guide): Okera times, the Chion-in tickets, bells you can ring, transport.
- [Kyoto Tourist Information Center, 2025 New Year's Eve bell list](https://global.kyoto.travel/resource/global/download/80-pdf.pdf): daytime bells at Myoman-ji and Zuiko-ji.
- [Nara City Tourism, Todai-ji at New Year](https://narashikanko.or.jp/en/event/hatsumoude_todaiji)
- [Ishikawa Prefecture, Kenroku-en open all night on 31 Dec](https://www.pref.ishikawa.lg.jp/kisya/r7/documents/1210_10_kanazawajou-kenrokuen2.pdf)
- [Caloo, Hokushin General Hospital](https://caloo.jp/hospitals/detail/1206500110)
- [japan-guide, Yamanouchi and Shiga Kogen access](https://japan-guide.com/e/e6027.html)
- [Traffic News, Hida HC85 cancellations](https://trafficnews.jp/post/593602)
- [Benesse Art Site, winter maintenance closures 2027](https://benesse-artsite.jp/en/news/20260630-3559.html): Chichu closed 12 Jan – 19 Mar 2027, after the trip.
