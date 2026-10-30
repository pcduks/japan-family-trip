# 12 — Method layer: validating restaurants the way Japanese insiders do

*Research date: 18 Oct 2026. Scope: how to check a restaurant, not which restaurants. Every regional agent should use this file as its checklist and scoring key. Facts I couldn't verify are marked **unverified**.*

---

## 0. TL;DR for the other agents

1. **The Tabelog score is the spine.** Read it **against the genre ceiling**, not against an absolute scale. In Tokyo the #10 ramen shop scores 3.87, while the #10 sushi counter scores 4.50 (fetched Oct 2026, §1.3).
2. **百名店 (Hyakumeiten) is simply the top-100 by score within a genre/region on a cut-off date.** So it confirms the score rather than adding independent evidence. **The Tabelog Award is different:** it adds user votes on top of the 4.00+ nominee pool, so it counts more.
3. **Pair Tabelog with one independent Japanese source:** Michelin JP 2026, TRY, a named critic (マッキー牧元 et al.), *東京最高のレストラン*, or dancyu.
4. **Tabelog's 定休日 field ignores New Year.** Look for 年末年始 in the hours notes or on the shop's Instagram/X, which usually posts in early December.
5. **Six people at an 8-seat counter means booking the whole counter or splitting 3+3.** Online systems often cap parties at 4. Email or phone the shop directly.
6. **Book now.** Many top places open slots one to three months ahead on the 1st of the month. The 1 Nov and 1 Dec 2026 openings are the critical ones for this trip.

---

## 1. Tabelog (食べログ), read like a Japanese diner

### 1.1 How the score is calculated (official, current)
Tabelog's own help page ([tabelog.com/help/score](https://tabelog.com/help/score/), fetched Oct 2026) says:

- **The score is not a simple average** (「単純平均したものではありません」). Each reviewer carries an **影響度 (influence weight)**. The weight is higher for people with a long eating history, and it is **set per genre**. A heavyweight ramen reviewer can count for almost nothing on sweets.
- **Some users get zero weight:** suspected stealth marketers, restaurant staff, Tabelog staff, and **グルメ著名人 (gourmet celebrities)**. A famous critic's Tabelog review is therefore *information*, not *score*. Example: マッキー牧元 has a Tabelog page at [tabelog.com/rvwr/mackeymakimoto](https://tabelog.com/rvwr/mackeymakimoto/).
- **Volume matters.** Few reviews means a capped score even if every review is glowing. Location, seat count and opening hours are also factored in, because they affect how many reviews a place can attract.
- **Bands:** 4.00+ is roughly the **top 0.07%** of all restaurants. 3.50–3.99 is roughly the **top 3%**. Below 3.50 is the other ~97% ("not enough evaluations yet", which includes new places and hidden gems). **That is why 3.5 counts as excellent:** the scale is compressed and starts around 3.0.
- **Updates run on the 1st and 3rd Tuesday of each month**, and year-end can shift the date. Scores can move with no new reviews, because influence weights get recalculated. **Always record the date you read a score.** The last update noted on the page was 2026-10-06.
- Tabelog says paid plans have **no effect on the score** (「一切ありません」). Paid plans **do** affect the default 標準 (standard) search order. Kakaku.com itself described that tab as an "ad slot" ([ITmedia 2016](https://www.itmedia.co.jp/news/articles/1609/08/news116.html)). **Always sort by ランキング/score (`?SrtT=rt`), never by the default search.**

### 1.2 Algorithm changes and controversies (what moved the numbers)
| When | What happened | Why it matters |
|---|---|---|
| Dec 2011 – Jan 2012 | Kakaku.com found **39 やらせ (fake-review) companies** selling paid reviews at about ¥100k/month and changed its logic ([ScanNetSecurity 2012](https://scan.netsecurity.ne.jp/article/2012/01/05/28072.html)). | This is the origin of the influence-weight model. Low-trust accounts barely move scores. |
| 6 Sep 2016 | An algorithm review knocked many shops back to about **3.0**. This caused a stir over claims that paid plans affected rank; Kakaku denied it ([ITmedia](https://www.itmedia.co.jp/news/articles/1609/08/news116.html)). | Some good older places with few weighted reviews still sit near 3.0–3.3. |
| 21 May 2019 | A change **lowered chain-store scores**. The KollaBo yakiniku chain's 21 branches fell about 0.2 on average. | Chains are structurally penalised. A chain at 3.4 is not comparable with an independent shop at 3.4. |
| Oct 2019 | A blog accused Tabelog of lowering non-payers. Kakaku issued a formal denial, and the JFTC began surveying restaurant platforms ([J-CAST](https://www.j-cast.com/2019/10/10369781.html?p=2)). | Background noise only, since the ranking sort ignores paid status. |
| Jun 2022 → Jan 2024 → Mar 2026 | 韓流村 v. カカクコム. Tokyo District Court found abuse of a superior bargaining position and awarded ¥38.4m ([ScanNetSecurity](https://scan.netsecurity.ne.jp/article/2022/06/22/47773.html)). **The Tokyo High Court reversed this on 19 Jan 2024**, holding that the change reflects consumers' perception ([ben54](https://www.ben54.jp/news/837), [gentosha](https://gentosha-go.com/articles/-/57832)). Supreme Court leave to appeal was reportedly refused on 5 Mar 2026 ([unofficial wiki](https://scrapbox.io/jcomp/%E9%9F%93%E6%B5%81%E6%9D%91%E5%AF%BE%E3%82%AB%E3%82%AB%E3%82%AF%E3%82%B3%E3%83%A0%E9%A3%9F%E3%81%B9%E3%83%AD%E3%82%B0), **unverified** against the court record). | The chain penalty stands. |
| Ongoing | The help page cites a **ramen-genre influence recalculation** that lowered scores without any new reviews. | Ramen scores were reined in deliberately. |

*I found no separate public notice of a "2022 algorithm change". The 2022 news was the court case about the 2019 change.*

### 1.3 Genre and regional ceilings (fetched Oct 2026, sorted by score)
| Genre / area | #1 | #10 | Read it as |
|---|---|---|---|
| Sushi, Tokyo | 4.65 (Sugita) | 4.50 | High-end ceiling. 3.8 is merely "good" here. |
| 日本料理, Kyoto | 4.64 (Dojin) | 4.39 | Same as sushi. |
| Yakiniku, Tokyo | 4.54 (Akasaka Raimon) | 4.20 | **High-end yakiniku scores like kaiseki.** Only casual yakiniku runs low. |
| Soba, Tokyo | 4.27 (Kanjou) | 3.76 | Casual ceiling: 3.75+ is top-10 in Tokyo. |
| Udon, Kagawa | 4.25 | 3.84 | Same: 3.8+ is elite. |
| Ramen, Tokyo | 4.13 (Shima) | 3.87 | Same: 3.6+ is very strong and 3.85+ is elite. |

Sources: Tabelog English ranking pages, e.g. [ramen](https://tabelog.com/en/tokyo/rstLst/ramen/?SrtT=rt), [sushi](https://tabelog.com/en/tokyo/rstLst/sushi/?SrtT=rt), [soba](https://tabelog.com/en/tokyo/rstLst/soba/?SrtT=rt), [yakiniku](https://tabelog.com/en/tokyo/rstLst/yakiniku/?SrtT=rt), [Kagawa udon](https://tabelog.com/en/kagawa/rstLst/udon/?SrtT=rt), [Kyoto Japanese](https://tabelog.com/en/kyoto/rstLst/japanese/?SrtT=rt).

**Correction to the brief:** "yakiniku scores low" applies only to casual yakiniku. Wagyu-specialist yakiniku sits in the high tier.

**Regional effect (practitioner heuristic, not published by Tabelog):** there are fewer high-influence reviewers in Tōhoku, Setouchi and rural Kyushu. The local top places there therefore sit about 0.05–0.15 lower than equivalent places in Tokyo, Kyoto or Osaka. Use the **prefecture's own ranking page** (e.g. `https://tabelog.com/en/ishikawa/rank/`) to see the local ceiling before judging a number.

### 1.4 The Tabelog Award (Gold / Silver / Bronze)
- **Nominees for the 2026 edition:** restaurants that exceeded **4.00 on at least two score-update days** in the previous year, 733 in total. **Users then vote**, and only votes backed by verified visits count. Results were announced on 26 Jan 2026 ([Impress](https://gourmet.watch.impress.co.jp/docs/news/2081169.html), [award guide](https://award.tabelog.com/en/2025/guide)).
- **2026 counts:** **Gold 36, Silver 160, Bronze 537**. There are also category awards: Best New Entry, Best Regional Restaurants and Chefs' Gold ([award.tabelog.com](https://award.tabelog.com/)).
- Gold 2026 covers Tokyo, Kyoto, Shizuoka (four Golds), Ishikawa, Hyogo, Mie, Aichi, Osaka, Fukuoka and Nagano. Genres are innovative, Spanish, yakiniku, Japanese, yakitori, Italian, sushi, Chinese, tempura, unagi and French. **No ramen, soba or udon:** the 4.00 nominee bar effectively excludes the casual genres.
- **URLs:** `https://award.tabelog.com/restaurants/gold` (also `/silver`, `/bronze`). The archive is linked as 「過去のAward」, and past-year URL patterns are **unverified**.
- **The Award 2027** will probably be announced around late January 2027, after the trip.

### 1.5 百名店 (Hyakumeiten)
- **Method:** the **top 100 by score** among shops whose *first genre* matches, on a stated cut-off date. Example: soba EAST 2025 used the score as of 18 Jun 2025 and was published on 23 Jul 2025. **Nobody votes.** It is effectively a badge for being in the top 100 by score.
- **Regions:** large genres are split into `tokyo`, `east` and `west` lists of 100 each. Ramen has seven lists: Hokkaido, Tokyo, Kanagawa, Aichi, Osaka, East and West, for 700 shops. **EAST includes Nagano, Gifu, Shizuoka and Aichi. WEST includes Toyama, Ishikawa and Fukui**, which puts Hokuriku in WEST alongside Kyoto, Osaka and Kyushu. In Japanese WEST 2025, Kyoto has about 43 of the 100, Osaka about 13, Fukuoka 6, Hiroshima 5, Ishikawa 3 and Kagawa 0. My tally from the [list](https://award.tabelog.com/hyakumeiten/japanese_west/2025).
- **URL pattern (verified):** `https://award.tabelog.com/hyakumeiten/{genre}_{region}/{year}`, e.g. [`/hyakumeiten/ramen_tokyo/2025`](https://award.tabelog.com/hyakumeiten/ramen_tokyo/2025) and [`/hyakumeiten/soba_east/2025`](https://award.tabelog.com/hyakumeiten/soba_east/2025). Without the year you get the latest list. The index is at [award.tabelog.com/hyakumeiten](https://award.tabelog.com/hyakumeiten/).
- **Latest editions as of Oct 2026** (35 genres):

| Genre | Latest | Slug(s) |
|---|---|---|
| Yakiniku | 2026-10-14 | `yakiniku_tokyo/east/west` |
| Izakaya | 2026-09-29 | `izakaya_east/west` |
| Wagashi | 2026-09-15 | `wagashi_tokyo/east/west` |
| Sweets | 2026-09-01 | `sweets_tokyo/east/west` |
| Ice/gelato | 2026-08-18 | `ice_gelato` |
| Unagi | 2026-07-22 | `unagi` |
| Bread | 2026-07-07 | `bread_tokyo/east/west` |
| Kissaten | 2026-06-23 | `kissaten` |
| Curry | 2026-06-09 | `curry_tokyo/east/west` |
| Asian/ethnic | 2026-05-26 | `asia_ethnic_*` |
| Shokudō | 2026-04-21 | `shokudo` |
| Spanish | 2026-04-07 | `spanish` |
| Chinese | 2026-03-24 | `chinese_tokyo/east/west` |
| Hamburger | 2026-03-10 | `hamburger` |
| Tonkatsu | 2026-02-25 | `tonkatsu` |
| **Ramen** | 2025-12-02 (2026 list likely early Dec 2026) | `ramen_hokkaido/tokyo/kanagawa/aichi/osaka/east/west` |
| **Yakitori** | 2025-11-11 | `yakitori_east/west` |
| 鳥料理 | 2025-10-28 | `toriryori` |
| Tachinomi | 2025-09-17 | `tachinomi` |
| Okonomiyaki | 2025-09-02 | `okonomiyaki` |
| Steak/teppanyaki | 2025-08-19 | `steak_east/west` |
| **Soba** | 2025-07-23 | `soba_east/west` |
| Café | 2025-07-08 | `cafe_east/west` |
| Yōshoku | 2025-06-24 | `yoshoku_east/west` |
| French | 2025-06-10 | `french_tokyo/east/west` |
| Innovative | 2025-05-27 | `creative_innovative` |
| Italian | 2025-04-22 | `italian_tokyo/east/west` |
| Pizza | 2025-04-09 | `pizza` |
| **日本料理** | 2025-03-25 | `japanese_tokyo/east/west` |
| **Tempura** | 2025-03-11 | `tempura` |
| **Sushi** | 2025-02-26 | `sushi_tokyo/east/west` |
| Sukiyaki/shabu | 2024-09-10 | `sukiyaki_shabushabu` |
| Gyōza | 2024-06-25 | `gyoza` |
| **Udon** | 2024-02-27 | `udon_kagawa/east/west` |
| Bar | 2022-11-01 | `bar` |

The cadence is roughly yearly per genre, but **some genres lag** (udon 2024, bar 2022). Cite the year exactly as the page shows it. Expect new ramen and yakitori lists to land during the trip planning window (Nov–Dec 2026).

### 1.6 Reading a Tabelog detail page
The Japanese pages (tabelog.com/…) return 403 to this environment, while the English pages (`/en/`) load. Labels below are as they appear on the Japanese site, with the English labels verified.

| Japanese label | English label | What to extract |
|---|---|---|
| 点数 / 口コミ数 | Score / Reviews | Score **plus date**. Under 50 reviews means a fragile score. Over 500 means stable. A high score on few reviews but many *high-influence* reviewers is common at elite kappo. |
| 予約可否 | Reservation | 完全予約制 (reservation only), 予約可 (bookable), 予約不可 (no reservations, i.e. queue). Free-text 予約の注意 often says 「お電話のみ」 (phone only), 「一見様お断り」 (no first-timers), 「紹介制・会員制」 (introduction/members only). **Members-only places are excluded from planning.** |
| 定休日 | Closed on | **Usually omits 年末年始.** Look for 「年末年始は休業」 in 営業時間 備考, 店舗からのお知らせ, or the official Instagram/X. |
| 営業時間 | Business hours | Note 「売り切れ次第終了」 (closes when sold out). This matters for ramen and soba on 31 Dec. |
| 予算 / 予算（口コミ集計） | Average price | The shop's figure versus the reviewers' average. Use the latter. |
| サービス料・チャージ | Service charge | お通し (cover), 10% service at kappo and hotels. |
| 席数 | Seats | 「カウンター8席」 tells you six people means a full or near-full counter. |
| 個室 | Private rooms | 「有（6人可）」 is the key string for six. 「有（2人可、4人可）」 does not fit six. |
| 貸切 | Private use | 「可（20人以下可）」. Ask the minimum spend (最低保証). |
| お子様連れ | Children | Not critical for this group. |
| 支払い方法 | Payment | Cards versus cash only, which is still common at ramen, soba and udon shops. |
| 百名店 / Award badges | (badges) | The year sits on the badge, e.g. 「ラーメン 百名店 2025 選出店」. |

**Reviewer check:** open the top three or four reviews. Profiles with hundreds of reviews in the same genre are the high-influence voices. Their **visit month** shows whether they've seen the winter menu.

### 1.7 Known weaknesses and how to compensate
- **Lag:** new openings sit below 3.5 for months. Use critics (§2) to catch them.
- **Tokyo/high-end reviewer skew** and a **regional deflation** effect (§1.3).
- **Chains are penalised** (2019) and **ramen influence was recalibrated**. Neither is a quality signal for a single shop.
- **Members-only or introduction-only places** can top the charts but cannot be booked.
- **Gaming:** paid review agencies (2012), plus "influence farming" by top reviewers ([Toyo Keizai 2017](https://toyokeizai.net/articles/-/177996?display=b)). Spikes after a single famous reviewer's visit are a known pattern.
- **One-dimensional:** a ¥1,000 bowl and a ¥60,000 omakase share a scale. The genre adjustment in §6 fixes this.
- **Default search is ad-ordered:** always sort by score.

---

## 2. Japanese expert sources to pair with Tabelog (ranked by trust for this job)

The rank reflects independence from Tabelog, editorial rigour, how current the source is (2025–26), and whether it covers our regions and genres.

| # | Source | URL | What it's good for | Caveats |
|---|---|---|---|---|
| 1 | **Michelin Guide, Japanese edition** (stars, Bib Gourmand) | [guide.michelin.com/jp/ja](https://guide.michelin.com/jp/ja) | Independent, anonymous inspectors. **Tokyo 2026** (published 25 Sep 2025): 12 three-star, 26 two-star, about 122 one-star and **114 Bib Gourmand** places ([Michelin](https://guide.michelin.com/jp/ja/article/michelin-guide-ceremony/michelin-guide-tokyo-2026-stars-reveal), [Bib list](https://guide.michelin.com/jp/ja/article/michelin-guide-ceremony/michelin-guide-tokyo-2026-bib-gourmand)). **Bib is the best tool for affordable dinners for six.** | **The next Tokyo, Kyoto/Osaka and Nara editions arrive on 16 Feb 2027**, after the trip ([PR Times](https://prtimes.jp/main/html/rd/p/000000086.000117133.html)), so 2026 is the current edition. The guide leans French and kaiseki, and inspectors are partly non-Japanese. |
| 2 | **Tabelog Award / 百名店** | [award.tabelog.com](https://award.tabelog.com/) | The Award adds verified-visitor votes on top of 4.00+. Hyakumeiten maps genre and region. | Hyakumeiten is **not independent** of the score. Count it as confirmation only. |
| 3 | **TRY ラーメン大賞** (講談社, 26th edition 2025–26) | [tokyoramenoftheyear.com](https://tokyoramenoftheyear.com/) · [book](https://www.kodansha.co.jp/book/products/0000407892) | The most authoritative ramen award. A panel of judges, 279 bowls, and the book marks where all nine judges gave full marks. Divided into new-shop and established-shop categories by style. The 2025–26 grand prize went to a Saitama shop ([Best Car](https://bestcarweb.jp/news/1353956)). | Tokyo and Kantō centric. **The 27th edition is due about late Oct 2026** (inferred from the previous 21 Oct 2025 release, **unverified**). Shortlist articles are already live in English. |
| 4 | **東京最高のレストラン** (ぴあ, 2026 edition published Dec 2025) | [NDL record](https://ndlsearch.ndl.go.jp/books/R100000002-I034435243) | About 400 Tokyo restaurants chosen **under their real names** by five critics: マッキー牧元, 森脇慶子, 小石原はるか, 松浦達也, 浅妻千映子. This is the best single Japanese critics' consensus for Tokyo. The 2027 edition is likely Dec 2026 (**unverified**). | Tokyo only. Paywalled print. |
| 5 | **マッキー牧元** (タベアルキスト, eats out 600–700 times a year) | [mackeymakimoto.jp](https://mackeymakimoto.jp/) · [Tabelog page](https://tabelog.com/rvwr/mackeymakimoto/) · [annual picks on Tabelog Magazine](https://magazine.tabelog.com/articles/430846) | **The most active critic in 2025–26.** His official site was updated in Sep 2026. He publishes yearly "breakout" picks (e.g. 旧雨 in Nishi-Waseda for 2025, [livedoor](https://news.livedoor.com/article/detail/28042043/)) and covers ramen, soba, kappo and regional places. | His Tabelog reviews carry **zero score weight** under the celebrity rule. Treat them as an independent signal. |
| 6 | **小石原はるか** (food writer, b. 1972) | [profile](https://www.mitsubishielectric.co.jp/club-me/life/mykitchen/2403/index.html) | Writes about everything from grand maisons to 大衆酒場 (popular taverns). Co-author of 東京最高のレストラン. Books include 『レストランをめぐる冒険』. Active 2025–26 through the ぴあ guide. | Few online texts are freely accessible. |
| 7 | **山本益博** (b. 1948) | [Serai, 2025](https://serai.jp/?p=305355) | The elder statesman of sushi and tempura criticism (すきやばし次郎, みかわ). Writes for Serai and runs a YouTube channel (2025). Good for Edomae etiquette and for the classic canon. | Narrow focus and an old-guard canon. Rarely covers new places. |
| 8 | **dancyu** (プレジデント社) | [dancyu.jp](https://dancyu.jp/) | The serious food-lover's magazine. Genre deep dives on soba, ramen, sake and regional food, with credible chef interviews. **Became quarterly in 2026** (autumn issue 4 Sep 2026; [Fujisan](https://www.fujisan.co.jp/product/5773/next/)). | Features are thematic, not ranked. Less news-driven now. |
| 9 | **ラーメンデータベース (RDB)**, run by 大崎裕史's ラーメンデータバンク | [ramendb.supleks.jp](https://ramendb.supleks.jp/) | Ramen-only user scores from heavy users. Yearly prefecture rankings: the 2025 Tokyo #1 was 中華そば しば田, which matches Tabelog ([ねとらぼ](https://nlab.itmedia.co.jp/research/articles/3704446/)). Useful for regional ramen where Tabelog is thin. | The method isn't published. Its users overlap with Tabelog's ramen heavyweights. |
| 10 | **大崎裕史** (ラーメン評論家) | via RDB and festivals | Still active: supervised Sendai Ramen Festa 2025 ([resemom](https://resemom.jp/release/prtimes/20250418/142495.html)). Good for Tōhoku ramen. | Festival and commercial tie-ins. |
| 11 | **SUSURU TV.** (YouTube) | [youtube.com/@SUSURUTV](https://www.youtube.com/@SUSURUTV) | Daily ramen videos for more than 3,500 days. About 1.8m subscribers in 2025, reportedly **2m in Aug 2026** ([OCEANS](https://oceans.tokyo.jp/article/detail/52261), [yutura](https://yutura.net/ranking/?p=978)). Best for *what the bowl looks like* and queue reality, and for catching new openings. | An entertainer, not a critic. Some PR and collaboration content. |
| 12 | **Hanako** (マガジンハウス) | [hanako.tokyo](https://hanako.tokyo/) | Neighbourhood guides, sweets, cafés and kissaten. Good for depachika and New Year sweets runs. | Lifestyle editing. Commercial tie-ins. |
| 13 | **東京カレンダー** | [tokyo-calendar.jp](https://tokyo-calendar.jp/) | Date-night and private-room places, the Christmas Eve scene, and Azabu/Ginza openings. | **Heavy advertorial model**: article tie-ups listed **from ¥4.5m** ([media kit](https://media-radar.jp/detail4804.html)). A "Minato-ku date" lens favours glamour over cooking. Use only to find private rooms, never as validation. |
| 14 | **食べログ top reviewers** (トップレビュアー) | reviewer pages `tabelog.com/rvwr/<id>/` | Genre specialists with hundreds of reviews. Read their winter-dated reviews for seasonal dishes and how flexible the kitchen is. | Some farm influence ([Toyo Keizai](https://toyokeizai.net/articles/-/177996?display=b)). Prefer those with long histories. |
| 15 | **Retty** (real-name reviews) | [retty.me](https://retty.me/) | Real-name recommendations and a "best of the year" for each user. A second opinion for casual places. | The company is shrinking and pivoting to SaaS for restaurants (FY9/2026 revenue down 7.9%, [Monex](https://scouter.monex.co.jp/news/detail/7356_20260813_act_20260813_170010_4)). Thin outside the big cities. |
| 16 | **ippin** (ぐるなび) | [ippin.gnavi.co.jp](https://ippin.gnavi.co.jp/) | **A curated food-gift and omiyage site, not a restaurant guide.** Useful for osechi and souvenirs (it features a 2026 osechi). | Not a restaurant validator. |
| 17 | **来栖けい** | — | Wrote 『美食の王様』 (2004) and ate at 20,000 places by age 30. He **now runs his own restaurant** (Bon.nu, Tokyo; [TV Tokyo 2020](https://www.tv-tokyo.co.jp/plus/entertainment/entry/2020/022932.html)). | **Not an active critic in 2025–26.** Historical reference only. |
| — | **石神秀幸** | — | A ramen critic (TV チャンピオン). I found no 2025–26 activity. | Treat as inactive. |
| — | **OMAKASE.in** | [omakase.in](https://omakase.in/) | A *booking* platform (§3). Its presence signals a high-end counter but proves nothing about quality. | Not a review source. |

**How to use them:** one independent hit from rows 1 or 3–9 together with a strong genre-adjusted Tabelog score is the gold standard. Rows 11–15 add colour. Rows 13 and 16–17 never count as validation.

---

## 3. Booking playbook for foreigners (and for six people)

### 3.1 Channels
| Channel | Best for | Foreign-friendly? | Cost / guarantee |
|---|---|---|---|
| **Tabelog online booking** (EN/中/한, since Jun 2024, 35k+ shops) | Mid to high-end places that list 「ネット予約」 | Yes. Card required. **Set menus only** for overseas booking. | **¥440 per person system fee**, not refunded if you cancel ([Kakaku release](https://www.businesswire.com/news/home/20240626189960/en), [guide](https://real-japan-guide.com/?p=2769)) |
| **TableCheck** | Hotel restaurants, kappo, many high-end places | English UI, foreign cards | Free for diners. Card guarantee or prepayment set per shop. Typical penalty: cancelling within 36h incurs a fee; same-day cancellation or 15 min late costs 100% of the course ([example](https://www.tablecheck.com/en/shops/katsukami/reserve)). The paid "FastPass" tier exists ([help](https://support-diners.tablecheck.com/hc/en-us/articles/25868607767193)). |
| **OMAKASE (GMO)** | Hard-to-book sushi, kappo and French counters | English site. Account plus card. | Fees set per shop (e.g. **¥390 per seat** at one shop). Cancellation commonly 50% from three days out and 100% on the day. Groups of 5+ have stricter scales (e.g. 60% at four days, 70% at three days, 100% at two days) ([search summary](https://omakase.in/r/hc778124)). Slots open on irregular dates per shop. |
| **Pocket Concierge** | Top-end counters where foreigners are otherwise refused | Yes. Built for this. | Usage fees plus "smart payment" (prepaid). Default cancellation fees apply if the shop sets none ([guide](https://real-japan-guide.com/?p=1209)). Exact fees are **unverified**. |
| **一休.com レストラン** (Ikyu) | Hotel and luxury restaurants, special Xmas and New Year courses | Japanese UI (use translate). Card. | Points and coupons are limited for overseas users ([guide](https://yokohama-minatomirai.com/en/restaurant-reservation-japan-tabelog-ikyu/)). |
| **Hotel concierge** | Phone-only places, buyouts, Christmas Eve | Yes, especially luxury hotels | Many elite counters accept foreigners **only** through concierge or agents, because of no-shows ([Unseen Japan](https://unseen-japan.com/japan-restaurant-no-shows-tourists)). Ask about four to six weeks out. |
| **Phone via a Japanese speaker** (Pedro's network, paid agents such as JPNEazy at about ¥800 per booking) | 電話のみ (phone-only) places, ramen/soba group asks, 個室 negotiation | — | Have the speaker state the pregnancy request (§5) at the same time. |

### 3.2 When bookings open (typical patterns, verify per shop)
- **On the 1st of the month for the following month** (e.g. 「9月分は8月1日正午より」), or **up to three months ahead** (「毎月1日に3ヶ月先の月末分まで」). Some open twice a year by phone only ([examples](https://www.tablecheck.com/es/shops/sushitoshukotomikawa/reserve), [bunshun](https://bunshun.jp/articles/-/1798)).
- **For this trip** (today is 18 Oct 2026): **1 Nov 2026** releases December at one-month places and some January slots. **1 Dec 2026** releases January at one-month places. Three-month places are already selling 20 Dec – Jan. **Act this week.**
- Cancellations surface on the shop's X/Instagram and on OMAKASE's キャンセル待ち (waitlist). It's worth following the shortlist.

### 3.3 Etiquette and guarantees
- Card guarantees are standard at counters. The usual Japanese scale is **50% the day before and 100% on the day** for course bookings. METI's 2018 no-show guidance supports charging the full course for no-shows.
- **Reconfirm.** Some shops call a week ahead and **cancel if they can't reach you within three days** (OMAKASE example). Give a reachable number or email.
- Be on time (15 minutes late can void the booking). Don't wear perfume at sushi counters. Declare **all dietary needs at booking**, never on the night: omakase shops buy fish to the headcount.
- Cancel as early as possible. A cancellation on 24 Dec is a serious loss for a counter.

### 3.4 The reality for six
- An 8–10-seat counter for six means asking for 75% of the room. **Online systems often cap at 2–4.** Email or phone, or ask for a **counter buyout** (貸切). Buyouts often require 8 or more paid covers or a minimum spend (最低保証).
- Options in order of preference:
  1. A **個室 for six** (kappo, ryōtei, sukiyaki/shabu, yakiniku, Chinese with a round table).
  2. **3+3 at the same seating** (two bookings under two names, declared to the shop).
  3. **Two seatings** (6pm and 8:30pm rotations).
  4. **2+2+2** for queue shops (ramen, udon, soba), eating in waves.
- For queue-only ramen, one person queues while the others arrive. Check whether the shop allows that (many don't: 「全員揃ってからお並びください」, i.e. queue only when your whole party is present).

---

## 4. December–January eating calendar (2026–27)

### 4.1 Key dates
| Date (2026–27) | Day | What happens | Implication |
|---|---|---|---|
| 20–23 Dec | Sun–Wed | Normal service. 忘年会 (year-end party) season, so izakaya are full on Fri/Sat. | Good window for top counters in Tokyo. |
| **24 Dec** | **Thu** | **Christmas Eve is couples' night.** Counters sell special Xmas courses at a premium. | Don't fight it: book a **private room** (yakiniku, sukiyaki, Chinese) or a hotel restaurant, and book now. |
| 25 Dec | Fri | Still busy. Japanese Christmas ends at midnight. | — |
| 26–27 Dec | Sat–Sun | Last full weekend. Toyosu: in 2026 **27 Dec was designated a market day** even though it is a Sunday (Tokyo Metropolitan market rules; [schedule doc](https://www.shijou.metro.tokyo.lg.jp/documents/d/shijou/20250905_singi-pdf)). | — |
| **28 Dec** | Mon | Traditional 餅つき (mochi-pounding) day (the 29th is avoided because 9 is 苦, "suffering"). Shops close for the year from about the 28th onward (御用納め). | Mochitsuki at shrines and shōtengai (**dates per venue unverified**). |
| **28–30 Dec** | Mon–Wed | **Market rush:** Ameyoko (very crowded, peaking on the 30–31st, [guide](https://banzokubiology.com/ameyoko-konzatsu/)), Tsukiji outer market, Nishiki (Kyoto), Kuromon (Osaka), Ōmichō (Kanazawa: "the aisles fill" on the 30–31st, [guide](https://banzokubiology.com/omicho-konzatsu/)). | Go before 10:00. This is to *watch* and graze (grilled crab, oden, tamagoyaki), not to dine. |
| 29 Dec – 3 Jan | — | **Functional shutdown.** Independents close about 29/30 Dec – 3/4 Jan. Ramen often closes 31 Dec – 3 Jan. | Lifelines: **hotel restaurants, department-store restaurant floors (from 2 Jan), chains, ryokan meals.** |
| **31 Dec** | Thu | **年越しそば (New Year's Eve soba).** Soba shops open (often only until sold out, mid-afternoon to early evening) with long queues. Toyosu is closed (holiday 31 Dec per the 2026 rules). Ōmichō opens early but sells out. | Plan a soba lunch, not dinner, or eat soba at a ryokan or hotel. |
| **1 Jan** | Fri | Dead day. おせち (New Year boxed dishes) and お雑煮 (mochi soup). Hatsumōde (first shrine visit) stalls (屋台). | Pre-order osechi or eat at the hotel. Kantō zōni is a clear broth with square grilled mochi. Kyoto zōni is white miso with round boiled mochi. |
| **2 Jan** | Sat | **初売り** (first sales). Most department stores reopen with **食品福袋** (food lucky bags) at depachika (**exact dates per store unverified**, some open on 1 Jan). | Depachika lunch. Fukubukuro sell out early. |
| 3 Jan | Sun | Some places reopen. Hakone Ekiden traffic in Hakone on 2–3 Jan. | — |
| 4 Jan | Mon | Most businesses resume. Toyosu is still closed (1–4 Jan are closed under the 2026 rules). | — |
| **5 Jan** | Tue | **Toyosu 初競り (first auction of the year).** Pattern: about 5 Jan every year, record tuna prices, wall-to-wall media ([2019 example](https://www.metro.tokyo.lg.jp/governor/action/katsudo/2019/1/05_00)). The 2027 date is **unverified** until the 令和9年 market calendar is published. | Public viewing of the auction needs advance application. Assume it's not possible on 初競り day (**unverified**). Have sushi at Toyosu or Tsukiji afterwards. |
| **7 Jan** | Thu | 七草粥 (seven-herb rice porridge). | Hotel breakfasts and some restaurants serve it, and it's safe in pregnancy. |
| 5–8 Jan | — | Restaurants fully back. **The best window for elite counters** at the end of the trip. | Book these first. |

### 4.2 Winter produce worth chasing
- **寒ブリ (winter yellowtail, Dec–Jan):** Himi (Toyama) "Himi kanburi" means set-net caught, auctioned at Himi and over 6 kg ([KNT](https://www.knt.co.jp/meito/sp/kamburi/index.html)). Order it as ぶりしゃぶ (yellowtail hot pot), 照り焼き (teriyaki) or ぶり大根 (yellowtail with daikon), all cooked.
- **Crab (snow crab):** opens **6 Nov**. Males (越前がに/松葉ガニ) are caught until 20 Mar. **Females (香箱/せいこ) close 31 Dec in Fukui** under prefectural rules ([Fukui](https://www2.pref.fukui.lg.jp/press/atfiles/pa77160392932785.pdf)). Ishikawa is similar, so **kōbako only before New Year**. Order boiled or grilled. Avoid 蟹刺し (crab sashimi).
- **Fugu (Nov–Feb):** Shimonoseki, Osaka (Kuromon and Tsukiji-style places). Licensed chefs only.
- **Oysters (Hiroshima, Miyagi, Akkeshi):** peak in winter.
- **白子 (milt):** tara (cod, Hokkaido and Tōhoku) and fugu.
- **Also:** あんこう鍋 (monkfish hot pot, Ibaraki), せり鍋 (Japanese parsley hot pot, Sendai), 寒鰤しゃぶ (yellowtail shabu).

---

## 5. Pregnancy-safe ordering (29–32 weeks)

Basis: MHLW leaflet 「これからママになるあなたへ」 ([PDF](https://www.mhlw.go.jp/topics/syokuchu/dl/ninpu.pdf)), which covers **Listeria** (natural cheese, smoked salmon, 生ハム (cured ham), pâté), **Toxoplasma** (undercooked meat) and **mercury** in large fish. Raw oysters carry norovirus and Vibrio risk, and raw egg carries Salmonella risk ([Rakuten Family](https://event.rakuten.co.jp/family/story/article/2022/oysters-pregnancy/)). The brief's rule applies: Japanese OBs don't ban fresh sushi, so the hard lines are raw egg, rare meat and raw shellfish.

### 5.1 Phrases (say at booking and again at the table)
| Situation | Japanese | Romaji |
|---|---|---|
| At booking (key line) | 同行者が一名妊娠中のため、生の貝類・生卵・レアのお肉は控えています。加熱したものに替えていただくことは可能でしょうか。 | Dōkōsha ga ichimei ninshin-chū no tame, nama no kairui, nama-tamago, rea no oniku wa hikaete imasu. Kanetsu shita mono ni kaete itadaku koto wa kanō deshō ka. |
| "I'm pregnant" | 妊娠中です。 | Ninshin-chū desu. |
| "Is this raw?" | これは生ですか？ | Kore wa nama desu ka? |
| "Please cook it through" | しっかり火を通していただけますか。 | Shikkari hi o tōshite itadakemasu ka. |
| "Well done, please" (yakiniku/yakitori) | よく焼きでお願いします。 | Yoku-yaki de onegai shimasu. |
| "No raw egg" (sukiyaki) | 生卵なしでお願いします。／溶き卵は使いません。 | Nama-tamago nashi de onegai shimasu. |
| "Does this contain alcohol?" | お酒（アルコール）は入っていますか？ | O-sake (arukōru) wa haitte imasu ka? |
| "Please leave out cheese / ham / smoked salmon" | チーズ・生ハム・スモークサーモンは抜いてください。 | … wa nuite kudasai. |
| "Just a little" (bluefin) | 本マグロは少しだけで。 | Hon-maguro wa sukoshi dake de. |
| Soft-boiled egg (ramen) | 味玉なしで。 | Ajitama nashi de. |

### 5.2 Winter risk map
| Risky dish | Why | Order instead |
|---|---|---|
| **生牡蠣 (raw oysters)** | Norovirus, Vibrio | カキフライ (fried oysters), 焼き牡蠣 (grilled oysters, **fully** cooked), 土手鍋 (miso oyster hot pot) |
| **白子ポン酢 (tara milt, often raw or barely blanched)** | Raw shellfish-like risk | 焼き白子 (grilled milt), 白子天ぷら (milt tempura), 白子の茶碗蒸し (milt custard), all hot right through |
| **てっさ (fugu sashimi)** | Raw fish (the toxin is managed by licensed chefs) | てっちり (fugu hot pot), ふぐ唐揚げ (fried fugu), 焼き白子 (grilled milt), 雑炊 (rice porridge) |
| **雲丹 (uni)** | Raw shellfish (a judgment call) | Skip, or 焼き雲丹 (grilled uni) or 雲丹の茶碗蒸し (uni custard) |
| **いくら (salmon roe)** | Raw, cured. Low but real Listeria risk (judgment) | 炙り (seared) cooked items, 玉子焼き (rolled omelette) |
| **Raw egg: すき焼き dip, TKG (卵かけご飯), 月見 (raw-yolk toppings), 釜玉 udon** | Salmonella | Sukiyaki without the egg dip, or the 割下 (cooking broth) only. かけ (plain hot broth) udon or 釜揚げ (boiled, dipped) instead of 釜玉 (raw egg) |
| **Rare wagyu: ユッケ (raw beef), 牛刺し/炙り (raw/seared beef), rare yakiniku, ローストビーフ丼 (rare roast beef bowl)** | Toxoplasma | Yakiniku よく焼き (well done), すき焼き cooked through, しゃぶしゃぶ (cook until no pink) |
| **鶏刺し・鶏たたき・ささみ/レバー半生 (raw or rare chicken at yakitori)** | Campylobacter, Salmonella | Thigh, tsukune, negima, よく焼き. Skip the omakase "rare" sticks |
| **レバー, あん肝 (liver, monkfish liver)** | Vitamin A (retinol) when eaten in quantity | A small taste is OK. Don't make it a course |
| **本マグロ大トロ, メカジキ, キンメダイ (bluefin, swordfish, alfonsino)** | Mercury in large fish (MHLW gives weekly limits) | White fish, cooked fish, ブリ照り焼き (teriyaki yellowtail), small portions |
| **生ハム, ナチュラルチーズ, スモークサーモン** (in French and Italian courses) | Listeria | Cooked charcuterie, hot dishes |
| **蟹刺し, 生エビ, ボタンエビ (crab sashimi, raw shrimp)** | Raw shellfish | 茹でガニ (boiled crab), 焼きガニ (grilled crab), 茹で海老 (boiled prawn) |
| **お屠蘇 (New Year spiced sake), 甘酒 made from sake lees, 粕汁 (sake-lees soup), 奈良漬** | Alcohol | **米麹の甘酒** (rice-koji amazake, alcohol-free). Ask 「麹の甘酒ですか？」 ("Is it koji amazake?") at shrines |

**Sushi omakase strategy:** say at booking that she'll eat 加熱・〆もの中心 (mostly cooked and cured items). These are naturally cooked: 煮穴子 (simmered conger eel), 煮蛤 (simmered clam), 車海老 (boiled prawn), 蒸し鮑 (steamed abalone), 煮烏賊 (simmered squid), 玉子 (omelette), かんぴょう巻 (gourd roll) and 焼き物 (grilled items). Fresh white fish is allowed by Japanese OBs. If a counter refuses substitutions, score it low on pregnancy fit (§6).

---

## 6. Scoring rubric: the 0–100 Confidence Score

### 6.1 Gates (fail any of these and the place is listed only as "not plannable")
- Permanently closed, 会員制 (members only), or 紹介制 (introduction only).
- Confirmed closed on every date we'd be in that city.
- The core of the experience is unsafe in pregnancy and the kitchen won't substitute (e.g. a raw-chicken specialist or an oyster bar). It can still be listed for the others to visit, but flag it.

### 6.2 Components
| Component | Max | How to score |
|---|---|---|
| **A. Tabelog, genre-adjusted** | **35** | `A = 35 × clamp((S + R − floor) / (top − floor), 0, 1) × N` (see 6.3) |
| **B. Tabelog Award / 百名店** | **15** | Award Gold 15 · Silver 13 · Bronze 11 · 百名店 latest edition 9 · 百名店 older editions only 6 · none 0. Take the highest. |
| **C. Japanese critic backing** | **15** | Sum, capped at 15: Michelin 2026 star 7 (Bib 6) · TRY current edition ranked 6 · 東京最高のレストラン 5 · named critic article (Makimoto, Yamamoto, Koishihara…) 5 · dancyu feature 4 · RDB prefecture top 10 3 · Hanako / Tokyo Calendar / SUSURU 1 each (max 2 from this tier) |
| **D. Trusted-foodie trace** | **10** | Visit by someone on the brief's list with a link 10 · recommended by them without a visit 6 · visited the chef's sister restaurant 3 · none 0 |
| **E. Group-of-6 feasibility** | **10** | 個室 or table for 6 confirmed 10 · counter buyout within budget 8 · 3+3 same seating 6 · separate seatings or 2+2+2 queue 4 · max 4, no flexibility 0 |
| **F. Pregnancy fit** | **10** | Mostly cooked menu, or substitutions confirmed 10 · à la carte, easy to steer 7 · raw-heavy omakase with substitutions unconfirmed 3 · core dish unsafe 0 |
| **G. Dec–Jan availability** | **5** | Open on our date confirmed by the shop or SNS 5 · likely from the pattern 3 · unknown 1 |

### 6.3 Genre adjustment for A
Let S be the Tabelog score on the date read, R the regional bonus, and N the review-count factor.

| Tier | Genres | floor | top |
|---|---|---|---|
| **H (high-end)** | sushi, 日本料理/kaiseki/kappo, French, innovative, tempura, steak/teppanyaki, **wagyu yakiniku** | 3.45 | 4.30 |
| **M (mid)** | yakitori, unagi, tonkatsu, sukiyaki/shabu, Chinese, Italian, fugu, crab ryōri, izakaya | 3.40 | 4.10 |
| **C (casual)** | ramen, tsukemen, soba, udon, curry, gyōza, okonomiyaki, shokudō, kissaten, bread, sweets | 3.35 | 3.95 |

The anchors come from §1.3 (fetched Oct 2026). A score at the "top" value is roughly a regional top-10 in the genre, so it earns full points. The "floor" is roughly where a place stops being remarkable.

- **R (regional bonus):** +0.00 for Tokyo, Kyoto, Osaka, Kanagawa, Aichi, Hyogo and Fukuoka. **+0.05 for the rest** (Hokuriku, Alps, Setouchi, Tōhoku, rural Kyushu). Heuristic, explained in §1.3.
- **N (review count):** under 50 reviews 0.85 · 50–199 0.95 · 200 or more 1.00.

Check: for sushi at 3.80 in Tokyo with 300 reviews, (3.80 − 3.45) / 0.85 = 0.41, so A = 14.4. For ramen at 3.80 in Tokyo, (3.80 − 3.35) / 0.60 = 0.75, so A = 26.3. The same number means different things in each genre, and the formula reflects that.

### 6.4 Why these weights
- **Tabelog, 35:** the user's primary validator and the broadest sample of serious Japanese diners. It stays under 50% because it is gameable, lags new openings and penalises chains, and because one number shouldn't decide a family dinner.
- **Award / 百名店, 15:** the Award adds verified-visitor voting, which is real new information. 百名店 is mostly the score again, so it gets less (9 versus up to 15) to avoid double counting.
- **Japanese critics, 15:** the independent check, using different people and methods (anonymous inspectors, a judging panel, named critics). Weighted the same as awards because it catches what Tabelog misses: new places, and regional places with thin review counts.
- **Trusted foodies, 10:** the user's personal taste filter. It is valuable as a tie-breaker, but it's a sample of one or two people, often tourists themselves, so it is capped low.
- **Group feasibility and pregnancy, 10 each:** these decide whether the dinner *works* for this family. A 4.5 counter that seats them 2+2+2 across three nights, with a raw-only menu, is a worse family plan than a 3.9 kappo with a six-person room.
- **Dec–Jan availability, 5:** it is mostly a gate (6.1). The 5 points reward places whose dates are confirmed over guessed ones.

### 6.5 Reading the total
| Score | Meaning | Action |
|---|---|---|
| **85–100** | Insider-validated and works for the family | Book now (1 Nov / 1 Dec release dates) |
| **70–84** | Strong | Book. Use as a backup for the top choice. |
| **55–69** | Good, with a known compromise (group, pregnancy or dates) | Lunch or a casual slot, or the half of the group it suits |
| **< 55** | Weak evidence or a poor fit | Drop, or keep for a walk-in day |

### 6.6 Worked example (illustrative; only the verified items are filled in)
**中華そば しば田** (Komae, ramen, tier C):
- A: S = 4.00, 1,709 reviews, Tokyo, so the raw fraction is (4.00 − 3.35) / 0.60 = 1.08, clamped to 1, giving **35**.
- B: 百名店 ramen_tokyo 2025 gives **9**.
- C: RDB 2025 Tokyo #1 gives **3**. TRY standing is unverified, scored 0.
- D: none found, **0**.
- E: small ramen shop with queues, so 2+2+2 gives **4**.
- F: ask for 味玉なし (no soft-boiled egg), otherwise fine, **7**.
- G: unknown, **1**.

**Total 59.** That puts it in the "Good, with compromise" band: a weekday lunch, not a family-dinner anchor. It would rise to about 65 with a TRY ranking confirmed.

---

## 7. Per-restaurant workflow checklist for the regional agents
1. Find the place on Tabelog (EN page) and record the score, review count and **date**. Check 予約可否, 定休日, 席数, 個室, 貸切 and payment.
2. Check its genre and region list at `award.tabelog.com/hyakumeiten/{genre}_{region}/{year}` and the Award lists (`/restaurants/gold|silver|bronze`).
3. Find one independent Japanese source: Michelin JP 2026 or Bib, TRY or RDB for ramen, Makimoto or 東京最高のレストラン for Tokyo, dancyu for genre classics.
4. Search for trusted-foodie traces (handle + restaurant, in romaji and Japanese).
5. Search 「<店名> 年末年始 営業 2026」 and check the shop's Instagram/X (posted in early December).
6. Pick the booking channel (§3). Settle the six-person format. Write the pregnancy line into the booking note.
7. Score it with §6 and output it in the BRIEF format.

---

## Sources
- Tabelog score help: https://tabelog.com/help/score/
- Tabelog Award 2026: https://award.tabelog.com/ ; Gold list https://award.tabelog.com/restaurants/gold ; guide https://award.tabelog.com/en/2025/guide ; Impress https://gourmet.watch.impress.co.jp/docs/news/2081169.html
- 百名店 index https://award.tabelog.com/hyakumeiten/ ; ramen_tokyo/2025, soba_east/2025, japanese_west/2025 (fetched)
- Tabelog EN genre rankings (fetched Oct 2026), URLs in §1.3
- ITmedia 2016: https://www.itmedia.co.jp/news/articles/1609/08/news116.html
- ScanNetSecurity 2012 (39 fake-review firms): https://scan.netsecurity.ne.jp/article/2012/01/05/28072.html
- J-CAST 2019: https://www.j-cast.com/2019/10/10369781.html?p=2
- KollaBo case: https://scan.netsecurity.ne.jp/article/2022/06/22/47773.html ; https://www.ben54.jp/news/837 ; https://gentosha-go.com/articles/-/57832
- Toyo Keizai on top reviewers: https://toyokeizai.net/articles/-/177996?display=b
- Michelin Tokyo 2026: https://guide.michelin.com/jp/ja/article/michelin-guide-ceremony/michelin-guide-tokyo-2026-stars-reveal ; 2027 date: https://prtimes.jp/main/html/rd/p/000000086.000117133.html
- TRY: https://www.kodansha.co.jp/book/products/0000407892 ; https://tokyoramenoftheyear.com/ ; https://bestcarweb.jp/news/1353956
- 東京最高のレストラン 2026: https://ndlsearch.ndl.go.jp/books/R100000002-I034435243
- マッキー牧元: https://mackeymakimoto.jp/ ; https://news.livedoor.com/article/detail/28042043/ ; https://magazine.tabelog.com/articles/430846
- 小石原はるか: https://www.mitsubishielectric.co.jp/club-me/life/mykitchen/2403/index.html
- 山本益博: https://serai.jp/?p=305355
- 来栖けい: https://www.tv-tokyo.co.jp/plus/entertainment/entry/2020/022932.html
- dancyu quarterly: https://www.fujisan.co.jp/product/5773/next/
- RDB 2025: https://nlab.itmedia.co.jp/research/articles/3704446/ ; 大崎裕史: https://resemom.jp/release/prtimes/20250418/142495.html
- SUSURU TV: https://oceans.tokyo.jp/article/detail/52261 ; https://yutura.net/ranking/?p=978
- 東京カレンダー media kit: https://media-radar.jp/detail4804.html
- Retty results: https://scouter.monex.co.jp/news/detail/7356_20260813_act_20260813_170010_4
- ippin: https://ippin.gnavi.co.jp/
- Tabelog overseas booking: https://www.businesswire.com/news/home/20240626189960/en ; https://real-japan-guide.com/?p=2769
- TableCheck: https://www.tablecheck.com/en/shops/katsukami/reserve ; https://support-diners.tablecheck.com/hc/en-us/articles/25868607767193
- Pocket Concierge: https://real-japan-guide.com/?p=1209
- Ikyu / Tabelog guide: https://yokohama-minatomirai.com/en/restaurant-reservation-japan-tabelog-ikyu/
- No-shows: https://unseen-japan.com/japan-restaurant-no-shows-tourists
- Booking-open patterns: https://www.tablecheck.com/es/shops/sushitoshukotomikawa/reserve ; https://bunshun.jp/articles/-/1798
- Tokyo market 2026 holidays: https://www.shijou.metro.tokyo.lg.jp/documents/d/shijou/20250905_singi-pdf
- Ameyoko / Ōmichō year-end: https://banzokubiology.com/ameyoko-konzatsu/ ; https://banzokubiology.com/omicho-konzatsu/
- Crab seasons (Fukui): https://www2.pref.fukui.lg.jp/press/atfiles/pa77160392932785.pdf ; Himi kanburi: https://www.knt.co.jp/meito/sp/kamburi/index.html
- MHLW pregnancy food leaflet: https://www.mhlw.go.jp/topics/syokuchu/dl/ninpu.pdf ; oysters: https://event.rakuten.co.jp/family/story/article/2022/oysters-pregnancy/
