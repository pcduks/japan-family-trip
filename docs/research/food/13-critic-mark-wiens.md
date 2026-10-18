# Critic deep-dive: Mark Wiens (@migrationology)

Researched 18 Oct 2026 for the 20 Dec 2026 – 9 Jan 2027 family trip. Sources were both YouTube channels, read in full and filtered for Japan: the main channel **@MarkWiens** (1,578 long videos and 68 Shorts listed) and the second channel **@MarkWiensAbroad** (263 videos). I read the description of every Japan video (83 descriptions, through YouTube's `youtubei/v1/next` endpoint after the watch pages started rate-limiting). I also read migrationology.com's Japan posts via the WordPress API search, including the full Tokyo and Osaka guides. Tabelog scores were fetched on 18 Oct 2026 from tabelog.com/en.

---

## 1. Who

- **Mark Wiens**, born 1986 in Phoenix, Arizona, to a missionary family. He grew up partly in the DR Congo and Nairobi and studied at Arizona State University. He has been based in **Bangkok** for over a decade with his wife Ying (Thai) and son Micah. He started migrationology.com in 2009 and has done YouTube full time since 2012. He co-owns the Bangkok kaphrao restaurant Phed Mark (2019) and hosted *Food Affair with Mark Wiens* (HBO Asia, 2022) and *Epic Food Journeys with Mark Wiens* (Nat Geo, 2024). ([Wikipedia](https://en.wikipedia.org/wiki/Mark_Wiens), [migrationology.com/about](https://migrationology.com/about/))
- **Reach:** about 12M subscribers on [@MarkWiens](https://www.youtube.com/@MarkWiens) and 1.14M on [@MarkWiensAbroad](https://www.youtube.com/@MarkWiensAbroad) (channel pages, Oct 2026). Instagram: @migrationology (not reachable from here).
- **Japan visits (from the videos):**
  - **2014** (Mar–Apr, winter): 2 weeks in Tokyo with Ying, on a budget, with lunch as the main meal.
  - **2015** (Sep–Oct): 14 days in Osaka/Kyoto/Kobe/Nara with Dwight Turner (@bkkfatty).
  - **2017** (May–Jun, then Oct–Nov): a Tokyo week with a baby, then a week on *The Hungry Tourist's* high-end "Best of Tokyo Food Tour".
  - **2019** (Feb–Mar): Sapporo/Otaru family trip.
  - **2023** (Feb–Mar): Kyushu (Fukuoka, Yanagawa, Itoshima, Kagoshima, Miyazaki), organised with **Visit Kyushu**, followed by Okinawa in May.
  - **2024** (summer): Osaka, Tokyo with **Ramen Beast**, and a mountain road trip (Nikko, Kawaguchiko, Chichibu).
  - **2025:** Tokyo, Kamakura and the Shinkansen to Osaka in March; Kanazawa, Toyama, Takayama, Okuhida and Nagano in autumn; Okinawa.
  - **2026:** a Sapporo Short (white strawberries, June).

**Who guided him.** These guides are useful leads in their own right.

| Guide / host | Role | Evidence |
|---|---|---|
| **David Califa, "The Hungry Tourist"** (IG @the.hungry.tourist, Israel-based high-end food-tour operator) | Ran the 2017 *Best of Tokyo Food Tour*: Wagyu Mafia, Nakahara, Shima, Motoyoshi, Sushi Arai, Sushi Namba, the Kazami/Kagari/Shichisai ramen crawl, Gyoza Gaudí. He also recommended Unagi Obana and set up the Hiro Sato (Sushi Tokami) and Wagyu Mafia pop-ups in Phuket. | [blog](https://migrationology.com/best-tokyo-food-tour/), [Obana video](https://www.youtube.com/watch?v=N26pjkM_z4A), [WErpgU9XS8Q](https://www.youtube.com/watch?v=WErpgU9XS8Q). This is a different account from the user's trusted @we.are.hungry.tourists; I found no link between the two. |
| **Shinji Nohara, "Tokyo Fixer"** (IG @tokyofixer, Bourdain's fixer) | Led the 2017 Shimbashi night: Gyoza Gaudí, Land Bar, Osaka Hyakkaten. | Mark's blog links "Tokyo Fixer" to instagram.com/tokyofixer ([post](https://migrationology.com/best-tokyo-food-tour/)) |
| **Hiroyuki "Hiro" Sato**, chef of Sushi Tokami (Tabelog 3.89) | Took him through the Tsukiji tuna auction and to the tuna wholesaler "Yamaguki" (likely Yamayuki) | [Cm2dczXpBG0](https://www.youtube.com/watch?v=Cm2dczXpBG0) |
| **Abram Plaut, "Ramen Beast"** (IG @ramen_beast, ramenbeast.substack.com; "4,000 bowls") | Showed him 3 of his Tokyo favourites in 2024: E-chan Shokudo, Aidaya, Rashohan | [4MVYLU7UD94](https://www.youtube.com/watch?v=4MVYLU7UD94) |
| **Yukari Sasaki, Food Sake Tokyo** (foodsaketokyo.com) | Recommended Tenmatsu and Narutomi in 2014 | [Tenmatsu video](https://www.youtube.com/watch?v=PwY4fWJMSLc), [Narutomi](https://www.youtube.com/watch?v=nw1whY-8NbY) |
| **"Yuko"** | Recommended Sanshuya, Ginza | [iszTT9U4OA8](https://www.youtube.com/watch?v=iszTT9U4OA8) |
| **Dwight Turner (@bkkfatty)** | Osaka 2015: Ramen Yashichi, Maguroya, Yakitori Smith, and an introduction to Lauralee | Osaka series |
| **Lauralee and her husband** (owners of La Shomon, Kobe) | Kobe day: La Shomon, Akashi market, Roshoki, Horumon "A" | [JR6FyQfwynI](https://www.youtube.com/watch?v=JR6FyQfwynI) |
| **Visit Kyushu** (tourism board) | Organised the 2023 Fukuoka, Yanagawa and oyster-hut shoots (disclosed) | [0II-qU0ADr4](https://www.youtube.com/watch?v=0II-qU0ADr4) |
| **Yuji-san** (IG @hotel_manager_jt) | Naha guide, 2023 | [FwetMQ3G0xs](https://www.youtube.com/watch?v=FwetMQ3G0xs) |
| **Jeffrey Merrihue** (Chowzter, later @xtremefoodies_) | Sponsored the Narisawa meal (2014) | [XJnqXauvd4c](https://www.youtube.com/watch?v=XJnqXauvd4c) |

Neither Mark's channel nor Ramen Beast's public pages show any other collaboration with Ramen Beast or Shinji Nohara.

---

## 2. His palate, in his own words

1. **On spice and big flavour:** "I'm really a spicy food, curry, full on flavor, kind of guy. But Japanese food is one cuisine that is so fresh, and so balanced, that little seasoning is needed." ([Best of Tokyo tour](https://migrationology.com/best-tokyo-food-tour/))
2. **On sushi:** sushi and sashimi are "the ONE food worth flying to Japan just to eat." ([Osaka food guide](https://migrationology.com/osaka-food-guide-japan/))
3. **On garlic in ramen:** "For myself, it's the raw minced garlic that really makes a bowl of Japanese ramen incredible. Without raw garlic I wouldn't like it nearly as much." ([Chuka Soba Inoue](https://www.youtube.com/watch?v=9ykW8TLFwTo))
4. **On okonomiyaki:** it was "sort of like eating a fresh bag of potato chips, kind of junk food tasting… To me it sort of lacks spice." ([Sometaro](https://www.youtube.com/watch?v=qg4G5y_0Bro))
5. **On refined meals:**
   - Hakone ryokan kaiseki: "Some dishes were good, others a little plain for my liking – but I really appreciated the quality and simplicity." ([hJht8LYvHwk](https://www.youtube.com/watch?v=hJht8LYvHwk))
   - Saga Tofu Ine, Kyoto: "a little on the plain side for me… the quality was outstanding." ([t7BA8U7UK24](https://www.youtube.com/watch?v=t7BA8U7UK24))
6. **On generous over pretty:** at Harukoma, "Don't go… looking for delicate, extremely beautiful sushi (the kind that won't make you full). Instead, go there for generous slices of thick cut fresh fish." ([Osaka guide](https://migrationology.com/osaka-food-guide-japan/))
7. **On heritage over trend:** Yonekyu sukiyaki, "one of the main reasons I wanted to eat here is because it's an old heritage restaurant that's stood the test of time." ([f7HIc3B0BLI](https://www.youtube.com/watch?v=f7HIc3B0BLI)) The same idea drives his picks of Honke Shibato ("over 300 years… 15th generation"), Ganso Motoyoshiya (since 1681) and Tonki.
8. **On chain flagships:** he is honest about them. Ichiran HQ "may not be the best bowl of tonkotsu ramen you'll eat when you're in Fukuoka" ([bBD8LwbJB3E](https://www.youtube.com/watch?v=bBD8LwbJB3E)). Ippudo was "good, but basic."
9. **On queues as a signal:** "When I see a line like this, I can't help myself from joining!" ([sushi in Ginza](https://migrationology.com/sushi-in-tokyo-ginza/))
10. **On tonkatsu:** "For taste – there's no doubt Butagumi wins for me. For style and ambiance – I really loved Tonkatsu Tonki." ([kYPus4Dq4V0](https://www.youtube.com/watch?v=kYPus4Dq4V0))

**Taste pattern.** He rewards:
- generosity and big flavour (spice, garlic, fat)
- heritage and family-run counters
- watching the cook work
- value at lunch

He is lukewarm on austere or delicate food: tofu kaiseki, ryokan kaiseki, okonomiyaki and Toyama black ramen ("a bit intense, not my favorite"). He is almost never negative on camera, so a merely "pretty good" or "alright" from him reads as a mild pan.

---

## 3. What he champions anywhere (taste pattern)

| Place | Where | Why he champions it | Source |
|---|---|---|---|
| Raan Jay Fai | Bangkok | Michelin street-food crab omelette | [vv8LUSqT3JQ](https://www.youtube.com/watch?v=vv8LUSqT3JQ), [2017 best-of](https://migrationology.com/best-food-travel-2017/) |
| Wattana Panich | Bangkok | Decades-old beef noodle broth | [NR74br4VTAk](https://www.youtube.com/watch?v=NR74br4VTAk) |
| Phed Mark (his own) | Bangkok | Spicy pad kaphrao | [Wikipedia](https://en.wikipedia.org/wiki/Mark_Wiens) |
| Ayam Taliwang | Lombok/Jakarta | "best grilled chicken in the world" | [2017 best-of](https://migrationology.com/best-food-travel-2017/) |
| Aling Sosing's Carinderia | Manila | Stews and grilled pork belly | same |
| El Capricho | León, Spain | "World's Best Steak" | [FERg3aS8Y48](https://www.youtube.com/watch?v=FERg3aS8Y48) |
| Chez Wong (Javier Wong) | Lima | Ceviche master | [blog](https://migrationology.com/worlds-best-ceviche-at-chez-wong/) |
| Ministry of Crab | Colombo | Giant crab curry | [31f2E1aJG2Y](https://www.youtube.com/watch?v=31f2E1aJG2Y) |
| Cervejaria Ramiro | Lisbon | Tiger prawns | [3mJ7YVF8tpw](https://www.youtube.com/watch?v=3mJ7YVF8tpw) |
| Gaggan | Bangkok | "Super chef" Indian | [HGJ7gaty42o](https://www.youtube.com/watch?v=HGJ7gaty42o) |
| La Shomon | Kobe | "the best beef meal of my life" | [2015 best-of](https://migrationology.com/11-best-meals-i-ate-in-2015/) |
| Harukoma | Osaka | 2015 best-meals list | same |
| Nakahara | Tokyo | 2017 best-meals list ("favorite meal of the entire tour") | [2017 best-of](https://migrationology.com/best-food-travel-2017/) |
| Tenmatsu, Yoshihashi, Narisawa | Tokyo | 2014 best-meals list (#3, #4, #6) | [2014 best-of](https://migrationology.com/21-best-meals-ate-2014/) |

---

## 4. Japan: everything he filmed, wrote or recommended

**Verdict scale:** ❤️ loved · 👍 liked · ➖ mixed or lukewarm · 👎 panned. A "†" means he did not eat there himself. Tabelog scores are on the EN pages, fetched on 18 Oct 2026; "n/f" means not found on Tabelog.

### 4a. Tokyo

| Name (JP) | Area | What he ate / said | Verdict | Source · date | Tabelog |
|---|---|---|---|---|---|
| Chuka Soba Inoue (中華そば 井上) | Tsukiji outer market | Shoyu ramen at a standing street stall, with raw garlic. "It might not be the absolute best… but the… atmosphere… wonderful" | 👍 | [9ykW8TLFwTo](https://www.youtube.com/watch?v=9ykW8TLFwTo) 2014 | n/f in EN search. A Tsukiji ramen shop burned in Aug 2017 (Mark mentions the fire; identity and current status unverified) |
| Uoriki Kaisen Sushi (魚力) | Shibuya, Tokyu dept-store basement | Chirashi don as his first Tokyo meal ("truly an amazing meal") | ❤️ | [Z9nJo5oZRx4](https://www.youtube.com/watch?v=Z9nJo5oZRx4) 2014 | Uoriki Shibuya Tokyu honten 3.00 ([page](https://tabelog.com/en/tokyo/A1303/A130301/13137475/)). ⚠ weak score; the Toyoko store has since moved |
| Nakaya (仲家) | Tsukiji | Uni, ikura and toro donburi for breakfast, chosen over the Sushi Dai queue. "Service wasn't the friendliest" | 👍 | [blog](https://migrationology.com/nakaya-restaurant-tsukiji-tokyo/) 2014 | 3.41 (268) [page](https://tabelog.com/en/tokyo/A1313/A131307/13227150/), now at Toyosu Shijo-mae |
| Tsukiji blowtorched seafood shell stall | Tsukiji outer | Scallop, oyster, uni and shirako for ¥800 | ❤️ | [BHFYi88AgNE](https://www.youtube.com/watch?v=BHFYi88AgNE) 2014 | stall, n/a |
| Tenmatsu Nihonbashi (天松) | Nihonbashi/Muromachi | Counter tempura plus maguro-zuke don at lunch (¥1,260). "raised the bar" | ❤️ (#3 meal of 2014) | [PwY4fWJMSLc](https://www.youtube.com/watch?v=PwY4fWJMSLc) 2014 | 3.49 (542) [page](https://tabelog.com/en/tokyo/A1302/A130202/13020875/) |
| Chanko Tomoegata (巴潟) | Ryogoku | Sumo chanko lunch set | ❤️ | [7KcFGjAUgcU](https://www.youtube.com/watch?v=7KcFGjAUgcU) 2014 | 3.49. **[Closed]** per Tabelog ([page](https://tabelog.com/en/tokyo/A1312/A131201/13002987/)) |
| Memory Lane / Omoide Yokocho (思い出横丁) | Shinjuku | Unnamed yakitori bar; 5-skewer set, preferred tare to shio | 👍 | [m5RBtgpC9ZI](https://www.youtube.com/watch?v=m5RBtgpC9ZI) 2014 | alley, n/a |
| Yakitori Ton Ton (登運とん) | Yurakucho, under the tracks | Pork and chicken skewers with beer. "a decent option" | 👍 | [blog](https://migrationology.com/yakitori-tonton-yurakucho-tokyo/) 2014 | 3.49 (630) [page](https://tabelog.com/en/tokyo/A1301/A130102/13012733/) |
| Ginza lunch sushi (name unknown, "no name outside") | Ginza | About 20 pieces for ¥1,280. "negi toro – one of the best things in the world" | ❤️ | [blog](https://migrationology.com/sushi-in-tokyo-ginza/) 2014 | unidentifiable |
| Oreshiki Jun (俺式 純), Tokyo Ramen Street | Tokyo Station B1 | Tonkotsu; mentions Rokurinsha as "most famous" | 👍 | [Tokyo guide](https://migrationology.com/tokyo-travel-guide-for-food-lovers/) 2014 | 3.55 (1,431) [page](https://tabelog.com/en/tokyo/A1302/A130201/13160396/) |
| Narutomi (手打ち蕎麦 成冨) | Ginza 8-chome / Tsukiji | Seiro soba plus salt-dipped scallop tempura. "one of the most simple yet most amazing meals" | ❤️ | [nw1whY-8NbY](https://www.youtube.com/watch?v=nw1whY-8NbY) 2014 | **3.73** (787), Soba 百名店 2021/22/24/25 [page](https://tabelog.com/en/tokyo/A1313/A131301/13023064/) |
| Yoshihashi (よしはし) | Moto-Akasaka | ¥2,100 lunch sukiyaki at the counter; photos stopped. #4 meal of 2014 | ❤️ | [rg_HGGuCY2I](https://www.youtube.com/watch?v=rg_HGGuCY2I) 2014 | **Closed** per a 4travel listing ("よしはしは閉鎖しました"); not on Tabelog EN |
| Sometaro (染太郎) | Asakusa | Okonomiyaki. Loved the antique room, not the dish | ➖ | [qg4G5y_0Bro](https://www.youtube.com/watch?v=qg4G5y_0Bro) 2014 | 3.41 (285), Okonomiyaki 百名店 2018 [page](https://tabelog.com/en/tokyo/A1311/A131102/13003710/) |
| Narisawa (NARISAWA) | Minami-Aoyama | Winter 2014 menu; "Sumi 2009" Kobe beef was "the best piece of beef I've ever had" (sponsored by Chowzter) | ❤️ | [XJnqXauvd4c](https://www.youtube.com/watch?v=XJnqXauvd4c) 2015 | **4.25** (777), Tabelog Award Silver 2020–2026 [page](https://tabelog.com/en/tokyo/A1306/A130603/13005423/) |
| Marion Crêpes | Harajuku | Crêpe, "a little expensive" | ➖ | [Tokyo guide](https://migrationology.com/tokyo-travel-guide-for-food-lovers/) 2014 | not checked |
| Depachika: Isetan Shinjuku, Shinjuku Takashimaya, Shibuya station mall | — | "The best department stores I found" for take-away | 👍 | Tokyo guide 2014 | n/a |
| Kitsuneya (きつねや) | Tsukiji outer | Horumon-don/organ stew, "legendary" | ❤️ | [BqdFvgaiynM](https://www.youtube.com/watch?v=BqdFvgaiynM) 2017 | 3.49 (2,744) [page](https://tabelog.com/en/tokyo/A1313/A131301/13007656/) |
| Tsukiji Saito Suisan (斉藤水産) | Tsukiji outer | Giant oyster (¥1,400), a favourite of that day | ❤️ | same | 3.18 [page](https://tabelog.com/en/tokyo/A1313/A131301/13147413/). ⚠ weak (a fishmonger stall) |
| "Home-style sushi 本種", Nishin Tasuke eel skewer, Ajino Hamato corn fishcake | Tsukiji outer | "amazing home style sushi" | ❤️/👍 | same | not verified |
| Tenfusa (天房) | Tsukiji (now Toyosu) | "amazing small restaurant for tempura" | ❤️ | same | 3.53 (244) [page](https://tabelog.com/en/tokyo/A1313/A131307/13227313/) |
| Unagi Obana (尾花) | Minami-Senju | Waited over 1 hour in a queue of 20. "the most buttery perfectly cooked unagi I've ever had" (¥13,824 for 2) | ❤️ | [N26pjkM_z4A](https://www.youtube.com/watch?v=N26pjkM_z4A) 2017 | **3.77** (1,599), Award Bronze 2017–20, Unagi 百名店 2018–2026 [page](https://tabelog.com/en/tokyo/A1324/A132401/13003509/) |
| Yonekyu Honten (米久本店) | Asakusa | Heritage sukiyaki with tatami and a drum at the door. Would order one special plus one normal beef next time | ❤️ | [f7HIc3B0BLI](https://www.youtube.com/watch?v=f7HIc3B0BLI) 2017 | 3.61 (1,314), Sukiyaki 百名店 2024 [page](https://tabelog.com/en/tokyo/A1311/A131102/13003667/) |
| Butagumi (豚組) | Nishi-Azabu | Choose-your-breed tonkatsu (Hyogo golden boar, Okinawan Ryuka-ton). Won on taste | ❤️ | [kYPus4Dq4V0](https://www.youtube.com/watch?v=kYPus4Dq4V0) 2017 | 3.59 (905), Tonkatsu 百名店 2017–2026 [page](https://tabelog.com/en/tokyo/A1307/A130701/13004791/) |
| Tonki Meguro (とんき 目黒) | Meguro | Old-style fatty tonkatsu. Won on ambiance and the open kitchen | ❤️ | same | 3.51 (2,306), 百名店 2017–21 [page](https://tabelog.com/en/tokyo/A1316/A131601/13002040/) |
| Karashibi Miso Ramen Kikanbo (鬼金棒) | Kanda | "Devil level" chilli plus sansho. "one of the most flavorful bowls" | ❤️ | [jrMsWztL1n8](https://www.youtube.com/watch?v=jrMsWztL1n8) 2017 | **3.72** (2,848) [page](https://tabelog.com/en/tokyo/A1310/A131002/13097205/) |
| Higashi-Shinjuku Shokudo (東新宿食堂) | Higashi-Shinjuku | Teishoku breakfast | 👍 | [iszTT9U4OA8](https://www.youtube.com/watch?v=iszTT9U4OA8) 2017 | 3.08. ⚠ weak (cafeteria) |
| Sanshuya Ginza (三州屋 銀座本店) | Ginza 2-chome | Fresh-fish teishoku. "one of the best local Japanese restaurants I've ever been to in Tokyo" | ❤️ | same | 3.50 (2,355), Teishoku 百名店 2021 [page](https://tabelog.com/en/tokyo/A1301/A130101/13002473/) |
| Shibuya Morimoto (森本) | Shibuya west exit, since 1948 | Yakitori omakase; "chicken sashimi was actually incredible" | ❤️ | same | 3.59 (1,036), Yakitori 百名店 2018/19/21 [page](https://tabelog.com/en/tokyo/A1303/A130301/13001787/) |
| Ameya-Yokocho market: Niku no Ōyama (肉の大山) menchi, Izakaya Hamachan, taiyaki, budget chirashi, "Jumbo Kebab" | Ueno | Budget crawl; the chirashi was "not the best, but quite budget" | 👍/➖ | [KzZmPXGlMRI](https://www.youtube.com/watch?v=KzZmPXGlMRI) 2017 | Niku no Ōyama 3.49 (2,439) [page](https://tabelog.com/en/tokyo/A1311/A131101/13016728/) |
| Station/train bentos (ekiben, Kansai sushi, katsu rice burger) | Shinjuku → Hakone | "Food is one of the best reasons to take a Japanese train trip" | 👍 | [L2y_ZlaYSuk](https://www.youtube.com/watch?v=L2y_ZlaYSuk) 2017 | n/a |
| Wagyu Mafia | Tokyo (members' restaurant) | Opening night of the tour: Kobe steak, sukiyaki, Chateaubriand katsu sando, Kobe gyoza | ❤️ (hosted) | [blog](https://migrationology.com/best-tokyo-food-tour/) 2017 | WAGYUMAFIA outlets 3.0–3.2 ⚠ (e.g. [Cutlet Sandwich 3.10](https://tabelog.com/en/tokyo/A1317/A131701/13209035/)). Local diners don't rate it |
| Sumibi Yakiniku Nakahara (なかはら) | Ichigaya | Counter yakiniku; tongue, skirt, wagyu katsu sando. "probably my favorite meal of the entire tour" | ❤️ (top 10 of 2017) | [FonKlmYXUPo](https://www.youtube.com/watch?v=FonKlmYXUPo) 2017 | **3.88** (773), Award Silver 2017 / Bronze 2018–2026, Yakiniku 百名店 [page](https://tabelog.com/en/tokyo/A1309/A130904/13175110/) |
| Seiyo Ryori Shima (西洋料理 島) | Kyobashi/Nihonbashi basement | Thick wagyu sirloin from his own oven-grill plus a steak sandwich (~¥12,000) | ❤️ | [4sMejozB6XU](https://www.youtube.com/watch?v=4sMejozB6XU) 2017 | **3.71** (269), Award Bronze 2017–20, Steak 百名店 [page](https://tabelog.com/en/tokyo/A1302/A130202/13000495/) |
| Tempura Motoyoshi (てんぷら 元吉) | Aoyama then (since relocated) | "his tempura is literally flawless"; uni on fried shiso was the best bite | ❤️ | [blog](https://migrationology.com/best-tokyo-food-tour/) 2017 | Old page **[Relocated]** 4.00 (Award 2017–22) ([page](https://tabelog.com/en/tokyo/A1306/A130603/13035758/)). Now Daikanyama **4.06**, Tempura 百名店 2023/25 ([page](https://tabelog.com/en/tokyo/A1303/A130302/13270939/)) |
| Tsukiji tuna auction plus "Tuna King" wholesaler, with Hiro Sato | Tsukiji (auction now at Toyosu) | The whole sushi supply chain | ❤️ | [Cm2dczXpBG0](https://www.youtube.com/watch?v=Cm2dczXpBG0) 2017 | n/a |
| Sushi Arai (鮨 あらい) | Ginza | Whole 8-seat counter booked by the tour (~¥34,000). "next level" | ❤️ (top of 2017) | same | **4.59** (1,083), Award **Gold** 2017, 2020–2026 [page](https://tabelog.com/en/tokyo/A1301/A130101/13188186/) |
| Sushi Namba (鮨 なんば) | Asagaya (2017) | Self-taught chef; uni rice with caviar | ❤️ | [blog](https://migrationology.com/best-tokyo-food-tour/) 2017 | Chef now at **Sushi Nanba Hibiya 4.52** (Award Gold 2020–24, Silver 2025–26) ([page](https://tabelog.com/en/tokyo/A1301/A130102/13219857/)). The old Asagaya site is now Sushi Shunsuke 4.32 |
| Ginza Kagari (銀座 篝) | Ginza | Tori paitan; 30-minute queue; "very good bowl" | 👍 | [kMVmGjCC8Eo](https://www.youtube.com/watch?v=kMVmGjCC8Eo) 2017 | 3.78 (1,048), Ramen 百名店 2017. Page marked **[Relocated]** ([page](https://tabelog.com/en/tokyo/A1301/A130101/13153231/)) |
| Kazami (風見) | Ginza back alley | Sake-kasu ramen, "one of my favorites of the day" | ❤️ | same | Not found on Tabelog EN. A 4travel review says it announced closure (2022), but the closure is unconfirmed |
| Menya Shichisai (麺屋 七彩) | Hatchobori | Hand-cut noodles made to order, "best of the tour" | ❤️ | same | **3.78** (4,766), Ramen TOKYO 百名店 2018–2025 [page](https://tabelog.com/en/tokyo/A1302/A130203/13184399/) |
| Osaka Hyakkaten (大阪百貨店) | Yurakucho | Takoyaki, okonomiyaki, yakisoba ("pretty good, especially… with lots of sauce") | 👍 | [u1YtIwW6HGY](https://www.youtube.com/watch?v=u1YtIwW6HGY) 2017 | n/f |
| Land Bar | Shimbashi | Closet-sized bar; "Bartender was amazing" (Tokyo Fixer night) | ❤️ | same | Possibly LAND BAR artisan 3.04 (unverified match) |
| Gyoza Gaudí (ガウディ) | Shimbashi | About 15 gyoza flavours; "exactly my style" | ❤️ | same, [blog](https://migrationology.com/best-tokyo-food-tour/) | Gaudi (Shimbashi) 3.27 (104) [page](https://tabelog.com/en/tokyo/A1301/A130103/13150008/). ⚠ weak |
| E-chan Shokudo (えーちゃん食堂) | Meguro (Fudomae), breakfast only | Ramen Beast pick; clean broth, hand-made noodles, sells out in 2–3 hours | ❤️ | [4MVYLU7UD94](https://www.youtube.com/watch?v=4MVYLU7UD94) 2024 | **3.77** (1,212), Ramen TOKYO 百名店 2024/25 [page](https://tabelog.com/en/tokyo/A1316/A131601/13284505/) |
| Aidaya (あいだや) | Naka-Okachimachi | Ramen Beast pick; tsukemen with wagyu-sukiyaki "bonus" | ❤️ | same | **3.70** (1,613) [page](https://tabelog.com/en/tokyo/A1311/A131101/13288181/) |
| Tantan-men Rashohan (辣椒漢) | Shibuya | Ramen Beast pick; extreme-spicy soupless tantanmen | ❤️ | same | Shibuya branch 3.29 (119) ⚠ ([page](https://tabelog.com/en/tokyo/A1303/A130301/13286244/)). Kanda honten 3.64 |
| Ekiben for the Shinkansen Tokyo→Osaka, incl. self-heating Kobe-beef bento | Tokyo Station | Bento shopping, business-class Shinkansen | 👍 | [I7OBAusmbuo](https://www.youtube.com/watch?v=I7OBAusmbuo) 2025 | n/a |

### 4b. Day trips from Tokyo (Kanagawa, Tochigi, Yamanashi, Saitama)

| Name | Area | What / said | Verdict | Source · date | Tabelog |
|---|---|---|---|---|---|
| Yoshiike Ryokan (吉池旅館) | Hakone-Yumoto | Private-onsen room, in-room kaiseki (¥77,760 a night for 2 adults and a baby). "Some dishes… a little plain" | ➖/👍 | [hJht8LYvHwk](https://www.youtube.com/watch?v=hJht8LYvHwk), [AVrVlvlK6Wc](https://www.youtube.com/watch?v=AVrVlvlK6Wc) 2017 | 3.20 [page](https://tabelog.com/en/kanagawa/A1410/A141001/14040972/) |
| Shintomi ramen & sushi (新富) | Kita-Kamakura | "simple and good" ramen | 👍 | [6EfnBkbgEKU](https://www.youtube.com/watch?v=6EfnBkbgEKU) 2025 | 3.37 (likely match) |
| Verve Coffee Roasters | Kita-Kamakura | Coffee before the Daibutsu hike | 👍 | same | — |
| Shirasu Cafe Kamakura Jinbei (甚平) | Hase/Kamakura | Shirasu (whitebait), the reason for the trip | 👍 | same | Kamakura Jinbei 3.36 (likely match). ⚠ raw *nama-shirasu* is a pregnancy flag; *kama-age* (boiled) is fine |
| Mihashi (みはし) steakhouse | Nikko | Tochigi wagyu steak (¥10,800) and hamburg | 👍 | [bgzyczSWOu8](https://www.youtube.com/watch?v=bgzyczSWOu8) 2024 | 3.45 [page](https://tabelog.com/en/tochigi/A0903/A090301/9000110/) |
| Kosaku Kawaguchiko (小作) | Lake Kawaguchi, Fuji | Hōtō noodles | 👍 | same | 3.49 [page](https://tabelog.com/en/yamanashi/A1903/A190303/19000046/) |
| Kinoko no Sato Suzukaen (きのこの里 鈴加園) | Chichibu | Wild-game hot-stone BBQ set | ❤️ | same | 3.59 [page](https://tabelog.com/en/saitama/A1107/A110701/11003242/) |

### 4c. Osaka

| Name (JP) | Area | What / said | Verdict | Source · date | Tabelog |
|---|---|---|---|---|---|
| Ramen Yashichi (らーめん弥七) | Nakatsu | Chicken shoyu, "the best bowl of ramen I'd ever had" | ❤️ | [fVR6oJSMcmw](https://www.youtube.com/watch?v=fVR6oJSMcmw) 2015 | **3.74** (1,999), Ramen WEST/OSAKA 百名店 2017–2025. Closed Sat/Sun/holidays [page](https://tabelog.com/en/osaka/A2701/A270101/27003232/) |
| Jōnetsu Udon Sanshu (情熱うどん 讃州) | Nakatsu | Curry udon (he liked Ying's cold udon better) | 👍 | [-p1EbMQRN-g](https://www.youtube.com/watch?v=-p1EbMQRN-g) 2015 | Shin-Osaka branch 3.65 ([page](https://tabelog.com/en/osaka/A2701/A270301/27066277/)). The Nakatsu original was not found (may have moved) |
| Lumps Coffee | Nakazakicho | "one of the best cups of coffee I had… in Japan" | ❤️ | same | not checked |
| Koga-ryu Takoyaki (甲賀流 本店) | Amerika-mura | "not the best… alright"; edges not crisp | ➖ | same | 3.46 [page](https://tabelog.com/en/osaka/A2701/A270201/27001436/) |
| Shinsaibashi Shokudo (心斎橋食堂) | Shinsaibashi | Cafeteria dinner, "pretty good" | 👍 | same | not checked |
| Yakitori Smith (焼鳥スミス) | Nakazakicho | Impromptu izakaya night, "one of the greatest local… experiences" | ❤️ | same, [Osaka guide](https://migrationology.com/osaka-food-guide-japan/) | Tenma honten 3.29 / Nakazaki 3.04 ⚠ |
| Unnamed all-chicken izakaya | Nakazakicho | Chicken sashimi platter, "an interesting experience" | ➖ | [OLRb20FEBu8](https://www.youtube.com/watch?v=OLRb20FEBu8) 2015 | — (raw chicken: avoid for pregnancy) |
| Wanaka Sennichimae (わなか 千日前本店) | Kuromon/Namba | "one of the best takoyaki's I've ever had" | ❤️ | [z1BchfZFgp4](https://www.youtube.com/watch?v=z1BchfZFgp4) 2015 | 3.49 [page](https://tabelog.com/en/osaka/A2701/A270202/27002320/) |
| Kuromon Ichiba (黒門市場) | Nipponbashi | Grilled scallop, a tuna roll, oden | 👍 | same, [gpQmCk0Nl5E](https://www.youtube.com/watch?v=gpQmCk0Nl5E) | market (now very touristy) |
| Toki Sushi (ときすし) | Namba | 12-piece set for ¥1,050; negitoro the best piece | ❤️ | same | 3.39 (707) [page](https://tabelog.com/en/osaka/A2701/A270202/27015959/) ⚠ |
| Tayutayu Namba Sennichimae (たゆたゆ) | Namba | Yakiton; "meatballs were extremely good" | 👍 | same | 3.39 [page](https://tabelog.com/en/osaka/A2701/A270202/27043164/). Kitashinchi honten 3.61 |
| Camp Curry (野菜を食べるカレー) | Umeda station | "a bit on the mild side… not the best" | ➖ | [T44LU71EU2U](https://www.youtube.com/watch?v=T44LU71EU2U) 2015 | not checked |
| Chayamachi Maguroya (茶屋町まぐろや) | Nakatsu/Umeda | Toro that "started to liquefy without me even chewing" | ❤️ | same, [blog](https://migrationology.com/tuna-izakaya-osaka/) | 3.40 (158) [page](https://tabelog.com/en/osaka/A2701/A270101/27017935/). Umeda Shibata branch 3.44 ⚠ |
| Supermarket sushi; Ippudo (Ikeda) | Osaka | Budget sushi ok; Ippudo "good, but basic" | ➖ | [TJYEvl_ydDo](https://www.youtube.com/watch?v=TJYEvl_ydDo) 2015 | — |
| Okonomiyaki Kiji (きじ) | Umeda Sky Bldg B1 | "pretty good… chef extremely nice"; still "not my favorite food" | 👍 | [fVR6oJSMcmw](https://www.youtube.com/watch?v=fVR6oJSMcmw) 2015 | **3.69** (1,105), Okonomiyaki 百名店 2018–2025. Closed Thu [page](https://tabelog.com/en/osaka/A2701/A270101/27000322/) |
| Kushikatsu Daruma Shinsekai (だるま 新世界総本店) | Shinsekai | "pretty good"; he hadn't expected to like it | 👍 | [3_mqkjCXK8E](https://www.youtube.com/watch?v=3_mqkjCXK8E) 2015 | 3.45 [page](https://tabelog.com/en/osaka/A2701/A270206/27004260/) |
| Osaka Ohsho | Dotonbori | Gyoza, "pretty good" | 👍 | same | chain |
| Ikkaku Shinsaibashi (骨付鳥 一鶴) | Shinsaibashi | Kagawa-style honetsuki-dori, old and young bird: "the juiciest chicken in Osaka" | ❤️ | same, [blog](https://migrationology.com/ikkaku-chicken-osaka/) | 3.41 (667). Closed Thu [page](https://tabelog.com/en/osaka/A2701/A270202/27004566/) |
| Ghar Curry (ガルカレー) | Kyomachibori | Indo-Japanese curry, "really good" | 👍 | [ONodT1pbZAM](https://www.youtube.com/watch?v=ONodT1pbZAM) 2015 | n/f (may be closed) |
| Nosta (ramen) | Namba | "a bit too salty"; filming refused | 👎 | same | — |
| Oretachi no Curry-ya (俺たちのカレー家) | Namba | Katsu curry with egg and negi, "one of the better versions" | ❤️ | [gpQmCk0Nl5E](https://www.youtube.com/watch?v=gpQmCk0Nl5E) 2015 | 3.31 [page](https://tabelog.com/en/osaka/A2701/A270202/27091332/) ⚠ |
| Marugame Seimen | Namba | "alright, not the best" | ➖ | same | chain |
| Shimotaya (裏なんば酒場 しもたや) | Ura-Namba / Doguyasuji | Last-night izakaya; "outstanding" sashimi bowl | ❤️ | same, Osaka guide | Not matched (Shimotaya Abeno 3.41 is another branch) |
| Harukoma (春駒) | Tenjinbashisuji shotengai | Thick-cut sushi, toro, uni. "Of all the restaurants in this Osaka food guide, this place is one of my favorites" | ❤️ (2015 best-of) | [sBS7j4X49Ng](https://www.youtube.com/watch?v=sBS7j4X49Ng), [blog](https://migrationology.com/best-sushi-osaka-japan/) | Honten 3.57 (1,840), Sushi WEST 百名店 2021 ([page](https://tabelog.com/en/osaka/A2701/A270103/27002205/)). Shiten (the one he ate at, "larger branch") 3.50 ([page](https://tabelog.com/en/osaka/A2701/A270103/27023038/)). Both closed Tue |
| Ajinoya Honten (味乃家) | Namba | † 2015: Ying's pick ("best okonomiyaki I've ever had"). He went himself in 2024: a 1965 family shop | ❤️ | [Osaka guide](https://migrationology.com/osaka-food-guide-japan/), [2s-m2XeTcH4](https://www.youtube.com/watch?v=2s-m2XeTcH4) 2024 | 3.59 (1,784), Okonomiyaki 百名店 2018–2025 [page](https://tabelog.com/en/osaka/A2701/A270202/27001439/) |
| Endo Sushi (ゑんどう寿司) | Central Fish Market | † Found it closed on a holiday | — | Osaka guide | Chuo Ichiba Endo 3.59 [page](https://tabelog.com/en/osaka/A2701/A270108/27002698/) |
| Chitose (千とせ) | Namba | † Wanted the nikusui; missed it | — | Osaka guide | not checked |
| Maruyoshi (まるよし) | "morning market" (likely Kizu market) | Kaisen-don (¥2,750); chose "the less famous" of two neighbours | ❤️ | [2s-m2XeTcH4](https://www.youtube.com/watch?v=2s-m2XeTcH4) 2024 | Likely Maruyoshi, Daikokucho 3.40 (177) [page](https://tabelog.com/en/osaka/A2701/A270206/27053505/). Match unverified |
| Kadoya Shokudo (カドヤ食堂 総本店) | Nishinagahori | Tsukemen (¥2,500); "one of the highest rated ramen" in Osaka | ❤️ | same | **3.83** (3,664), Ramen 百名店 2017–2025. Closed Tue/Wed [page](https://tabelog.com/en/osaka/A2701/A270105/27001084/) |
| Honke Shibato (本家柴藤) | Kitahama | 300-year, 15th-generation unagi (¥8,870). "among the best I've had in Japan" | ❤️ | same | 3.57 (465) [page](https://tabelog.com/en/osaka/A2701/A270102/27000005/) |
| Nonkiya (のんきや) | Shinsekai | Standing bar: oden and doteyaki tendon skewers | ❤️ | [3zLvByt52go](https://www.youtube.com/watch?v=3zLvByt52go) 2024 | 3.48 (406). Closed Tue/Wed [page](https://tabelog.com/en/osaka/A2701/A270206/27045066/) |
| Matsuya (立ち食いうどんそば 松屋) | Shinsekai | ¥250 standing kitsune udon. "real deal Japanese fast food" | ❤️ | same | n/f |
| Tengu (てんぐ) | Shinsekai | Kushikatsu with beer | 👍 | same | n/f in EN search |
| Hanadako (はなだこ) | Umeda | Takoyaki: "ask locals… many will point you to Hanadako" | ❤️ | same | 3.55 (3,064) [page](https://tabelog.com/en/osaka/A2701/A270101/27012248/) |
| Izakaya Toyo (居酒屋とよ) | Kyobashi | Mr. Toyo blowtorches tuna cheek bare-handed; the trip's most anticipated stop (also a 2025 Short) | ❤️ | same, [CZlT_TDnfro](https://www.youtube.com/watch?v=CZlT_TDnfro) | 3.54 (1,212), Standing-bar 百名店 2025. Closed Mon/Thu/Sun/holidays [page](https://tabelog.com/en/osaka/A2701/A270107/27002949/) |
| Instant Ramen Museum, Ikeda | Ikeda | Attraction | — | [TJYEvl_ydDo](https://www.youtube.com/watch?v=TJYEvl_ydDo) 2015 | — |

### 4d. Kyoto, Nara, Kobe/Akashi

| Name | Area | What / said | Verdict | Source · date | Tabelog |
|---|---|---|---|---|---|
| Matsuba Honten (総本家にしんそば 松葉) | Gion/Shijo | Nishin (herring) soba; "a little expensive… very good quality" | 👍 | [WiVaC25Gg0I](https://www.youtube.com/watch?v=WiVaC25Gg0I) 2015 | 3.48 (855) [page](https://tabelog.com/en/kyoto/A2601/A260301/26001629/) |
| Nishiki Market (錦市場) | Kyoto | Fish on a stick | 👍 | same | — |
| Saga Tofu Ine (嵯峨とうふ 稲) | Arashiyama | Yuba and tofu set; "a little on the plain side for me" | ➖ | [t7BA8U7UK24](https://www.youtube.com/watch?v=t7BA8U7UK24) 2015 | 3.45 (560) [page](https://tabelog.com/en/kyoto/A2601/A260403/26014024/) |
| Ginza Hageten, Kyoto Porta | Kyoto Station | Tendon, "delicious" | 👍 | [pCF4WOGV9KA](https://www.youtube.com/watch?v=pCF4WOGV9KA) 2015 | 3.12 ⚠ |
| Happoh (和食屋 八寶) | Nara | "alright, but not the best" | ➖ | [sBS7j4X49Ng](https://www.youtube.com/watch?v=sBS7j4X49Ng) 2015 | not checked |
| La Shomon (焼肉バル La Shomon) | Tarumi, Kobe | Kobe and dry-aged Kobe beef yakiniku; "the best beef meal of my life" (#2 meal of 2015). Hosted, not sponsored | ❤️ | [JR6FyQfwynI](https://www.youtube.com/watch?v=JR6FyQfwynI) 2015 | 3.28 (50) [page](https://tabelog.com/en/hyogo/A2801/A280110/28038092/). ⚠ weak: personal-connection bias |
| Tako-iso (たこ磯) | Akashi | Akashiyaki in dashi | 👍 | same | 3.50 (1,366) [page](https://tabelog.com/en/hyogo/A2804/A280401/28001178/) |
| Roshoki (元祖豚饅頭 老祥記) | Nankinmachi, Kobe | Butaman, "pretty tasty" | 👍 | same | **3.68** (2,638). Closed Mon [page](https://tabelog.com/en/hyogo/A2801/A280102/28000947/) |
| Unnamed standing sake bar | Kobe | "so much character" | ❤️ | same | — |
| Sumiyaki Shio Horumon "A" (炭焼塩ホルモン『あ』) | Sannomiya | Esophagus and 4th-stomach horumon | 👍 | same | **3.84** (271), Yakiniku WEST 百名店 2025/26 [page](https://tabelog.com/en/hyogo/A2801/A280101/28035865/) |

### 4e. Kyushu (2023, organised with Visit Kyushu)

| Name | Area | What / said | Verdict | Source · date | Tabelog (search-list score) |
|---|---|---|---|---|---|
| Yatai Kokinchan (小金ちゃん) | Tenjin, Fukuoka | Inventor of yaki-ramen | ❤️ | [0II-qU0ADr4](https://www.youtube.com/watch?v=0II-qU0ADr4) | 3.52 [page](https://tabelog.com/en/fukuoka/A4001/A400103/40000201/) |
| Yatai Mamichan | Tenjin | Gyoza; chef "amazingly skilled" | ❤️ | same | 3.41 |
| Yatai Kiryu (喜柳) | Tenjin | Hakata ramen ¥650 | 👍 | same | 3.47 |
| Yatai Kawachan (かわちゃん) | Tenjin | Yakitori | 👍 | same | 3.31 |
| Unnamed tempura yatai | Fukuoka | "a little oily" | ➖ | same | — |
| Hakuryuken (博龍軒) | Maidashi, Fukuoka | Old-school tonkotsu, "one of the best bowls… I've ever had" | ❤️ | [2hzdBm0saZU](https://www.youtube.com/watch?v=2hzdBm0saZU) | 3.56 [page](https://tabelog.com/en/fukuoka/A4001/A400201/40002391/) |
| Shungetsuan Shotenji-mae (春月庵) | Hakata | All-you-can-eat udon (¥800) | 👍 | same | 3.48 |
| Ide Champon Odo (井手ちゃんぽん) | Fukuoka | Champon | 👍 | same | 3.31 |
| Ichiran HQ (一蘭 本社総本店) | Nakasu | "may not be the best… definitely tasty" | ➖/👍 | [bBD8LwbJB3E](https://www.youtube.com/watch?v=bBD8LwbJB3E) | 3.45 |
| Itoshima oyster huts (2 unnamed, Google-Maps links only) | Itoshima coast | Record abalone sashimi, grilled oysters | ❤️ | [eXjxldwpL5E](https://www.youtube.com/watch?v=eXjxldwpL5E) | not identifiable. Raw abalone/oysters: pregnancy flag |
| Saraya Fukuryu (皿屋福柳) | Yanagawa | Seiromushi eel; the boat captain's pick | 👍 | [PMzfTPgM5pg](https://www.youtube.com/watch?v=PMzfTPgM5pg) | 3.35 |
| "Alien fish" seafood shop | Yanagawa | Warasubo-type fish as sashimi and fried | 👍 | same | not identified |
| Ganso Motoyoshiya (元祖本吉屋) | Yanagawa | Since 1681; 3-eel seiromushi set. "outstanding" | ❤️ | same | **3.69** [page](https://tabelog.com/en/fukuoka/A4008/A400806/40001048/) |
| Shinkansen ekiben, Hakata→Kagoshima | — | "World's best railroad food" | ❤️ | [Oqakl6GTZvQ](https://www.youtube.com/watch?v=Oqakl6GTZvQ) | — |
| Kurobuta (黒福多) | Tenmonkan, Kagoshima | Kurobuta tonkatsu (regular and charcoal crumb) | ❤️ | [1vlsRKEvWaQ](https://www.youtube.com/watch?v=1vlsRKEvWaQ) | 3.46 |
| Ichiniisan (いちにいさん) | Tenmonkan, Kagoshima | Kurobuta shabu in soba broth, "the highlight of the day" | ❤️ | same | **3.72** (Tenmonkan) [page](https://tabelog.com/en/kagoshima/A4601/A460101/46000026/) |
| Izakaya Tsuwabuki | Kagoshima | Kurobuta izakaya dishes | 👍 | same | n/f |
| Mawaru Sushi Mekkemon, Dolphin Port (めっけもん) | Kagoshima | 1-hour queue; "one of the best… conveyor belt sushi restaurants we've tried" | ❤️ | [ESDc9g-QP10](https://www.youtube.com/watch?v=ESDc9g-QP10) (Abroad) | **3.63** [page](https://tabelog.com/en/kagoshima/A4601/A460101/46014192/) |
| Miyachiku (ミヤチク) teppanyaki | Miyazaki | A5 Miyazaki wagyu teppanyaki after a ranch visit | ❤️ | [TfRJal0QLSo](https://www.youtube.com/watch?v=TfRJal0QLSo) | Branch unclear: Hitotsuba 3.67 / Oyodo Kahan **3.77** |
| Coastal lobster hut (unnamed) | Miyazaki coast | Ise-ebi sashimi and miso soup | ❤️ | [4KIwvpSgEP8](https://www.youtube.com/watch?v=4KIwvpSgEP8) | not identifiable |
| Taikai (たいかい) | Miyazaki coast | Kaisen-don and sashimi | ❤️ | same | 3.57 |

### 4f. Hokuriku, Alps, Okuhida (autumn 2025, @MarkWiensAbroad plus main channel)

| Name | Area | What / said | Verdict | Source · date | Tabelog |
|---|---|---|---|---|---|
| Omicho Market croquette (近江町コロッケ) | Kanazawa | "famous Omicho Croquette" | 👍 | [TKFOzNTrWwk](https://www.youtube.com/watch?v=TKFOzNTrWwk) Nov 2025 | not checked |
| Iki-iki Tei (いきいき亭 近江町店) | Omicho, Kanazawa | Sashimi donburi breakfast, "excellent" | ❤️ | same | 3.65 [page](https://tabelog.com/en/ishikawa/A1701/A170101/17001392/) |
| Turban Curry (ターバンカレー) | Kanazawa | Kanazawa curry | 👍 | same | Honten 3.49 |
| Higashi Chaya gold-leaf ice cream; Amano Chaten (天野茶店) | Kanazawa | Matcha "fantastic" | ❤️ | same | Amano 3.34 |
| Gyohan (魚半) | Kanazawa, near Nagamachi | Jibu-ni duck stew | 👍 | same | Gyo Han Bukeyashiki-mae 3.17 (likely match) ⚠ |
| Nishicho Taiki (西町大喜) | Toyama | Original Toyama black ramen: "a bit intense, not my favorite" | ➖ | [9f8vJwYLgCY](https://www.youtube.com/watch?v=9f8vJwYLgCY) Nov 2025 | 3.57 |
| Ramen Isshin, Toyama Ekimae (いっしん) | Toyama | Modern Toyama black, "pretty amazing" | ❤️ | same | 3.59 |
| Kin no Kotte Ushi (金乃こって牛) | Takayama | Hida-beef nigiri | 👍 | [7dYaVC-5LmE](https://www.youtube.com/watch?v=7dYaVC-5LmE) Nov 2025 | 3.44 |
| Rokujuban (六拾番) | Takayama | Hida-beef stew | 👍 | same | 3.33 |
| Kyōya (京や) | Takayama | Hoba-miso Hida beef | ❤️ | same | n/f in EN search |
| Miyabi-an (雅庵) | Takayama | Soba with beef, zaru soba | 👍 | same | 3.26 ⚠ |
| Hida-gyu no Komori (こもり) | Takayama | Beef skewers | 👍 | same | 3.16 ⚠ (street stall) |
| Matsuki Burger | Takayama | Hida-beef burger | 👍 | same | 3.18 ⚠ |
| Hida Beef "Baya" | Takayama | "Best beef sushi!" | ❤️ | same | n/f |
| Hidagyu Maruaki (丸明) | Takayama | A5 Hida shabu and yakiniku (¥13,360) | ❤️ | same | 3.54 [page](https://tabelog.com/en/gifu/A2104/A210401/21000041/) |
| Okuhida Takara Soba (奥飛騨 寳そば) | Okuhida | Own buckwheat and wasabi; "probably the best soba I've had in my life" | ❤️ | [hGBXlqIcSqM](https://www.youtube.com/watch?v=hGBXlqIcSqM) Nov 2025 | 3.02 ⚠ (few reviews; strong local-score gap) |
| Fukuden (そば処 福伝) | Nagano | Tōji soba (soup-dipped soba) | 👍 | same | 3.43 |
| Tsuzumi Soba (つづみそば) | Takayama | Takayama chūka soba | 👍 | same | 3.58 |

### 4g. Okinawa (2023 and 2025)

| Name | Area | What / said | Verdict | Source · date | Tabelog |
|---|---|---|---|---|---|
| Miso-soup stand "MEGURO" | Naha | Craft miso soup and onigiri, "greatest ever" | ❤️ | [FwetMQ3G0xs](https://www.youtube.com/watch?v=FwetMQ3G0xs) 2023 | n/f |
| Takaesu Soba (高江洲そば) | Urasoe | Tofu soba | ❤️ | same | 3.65 |
| Fujiya Tomari (富士家 泊本店) | Naha | Zenzai shaved ice | 👍 | same | 3.55 |
| Urizun (うりずん) | Asato, Naha | Okinawan izakaya | ❤️ | same | 3.49 |
| Yagi-ryōri Nijūban (山羊料理 二十番) | Naha | Goat sashimi | ❤️ | same | 3.36 |
| Makishi Public Market (第一牧志公設市場) | Naha | Slipper lobster, green turban shell, grouper cooked upstairs | ❤️ | [sTG-Gl4gLAE](https://www.youtube.com/watch?v=sTG-Gl4gLAE) 2023 | market |
| King Tacos (キングタコス) | Kin (honten) | Taco rice, "quite tasty" | 👍 | [ZTTG345PxgM](https://www.youtube.com/watch?v=ZTTG345PxgM) 2025 | Kin honten 3.49 |

### 4h. Hokkaido (out of scope; brief)

- **Sapporo 2019:**
  - Sapporo Junren miso ramen (Tabelog 3.76)
  - Nijo Market Daiichi Kaisenmaru (3.17)
  - Soup Curry Treasure, spice level 40 (3.56)
  - Nemuro Hanamaru at JR Tower Stellar Place (3.67)
  - Sapporo Jingisukan, counter only, "one of my favorite food experiences in Hokkaido" (Honten 3.42)
  - Ume e dou crab, king vs hanasaki (3.45)
  - Kita no Gourmet (3.49)
  - Otaru Sankaku Market, Kawashima shop uni-don (not found)
- **Sapporo 2026:** white strawberries (Short).
- Sources: [l35cs9_Pb-M](https://www.youtube.com/watch?v=l35cs9_Pb-M), [mjn9IYb1Pew](https://www.youtube.com/watch?v=mjn9IYb1Pew), [iQBGpocUDVA](https://www.youtube.com/watch?v=iQBGpocUDVA), [Jtbrzrrvhrk](https://www.youtube.com/watch?v=Jtbrzrrvhrk), [s-P9HVOyb0Q](https://www.youtube.com/watch?v=s-P9HVOyb0Q).

### 4i. Japanese food outside Japan (what it shows he looks for)

| Place | Where | What it shows | Source |
|---|---|---|---|
| Hiroyuki Sato (Sushi Tokami, Tokyo, Tabelog 3.89) pop-up | Sri Panwa, Phuket | "the best sushi meal I've ever had in my life". He values a chef handing him each piece | [A2mY-DrGGWE](https://www.youtube.com/watch?v=A2mY-DrGGWE) 2017 |
| Wagyu Mafia Kobe A5 pop-up | Phuket | "one of the most insanely delicious things I've ever tasted" | [WErpgU9XS8Q](https://www.youtube.com/watch?v=WErpgU9XS8Q) 2017 |
| Mihara Tofuten | Bangkok | Tofu omakase built on Fukuoka's Mihara Tofu-ten (Fukuoka original: Tabelog 3.78). "not spicy or strong, yet it was absolutely amazing in its pureness" | [FBNSW2b6Zog](https://www.youtube.com/watch?v=FBNSW2b6Zog) 2019 |
| Maguro Brothers | Honolulu | Chu-toro and uni don | [8KuDjfxCJhk](https://www.youtube.com/watch?v=8KuDjfxCJhk) |
| Takumi (Swissotel), Yamazato (Okura) | Bangkok | Japanese meals | [blog](https://migrationology.com/epic-japanese-food/), [blog](https://migrationology.com/yamazato-restaurant-fine-japanese-food-bangkok/) |
| Koya | London | Udon | [blog](https://migrationology.com/koya-restaurant-udon-noodles-london/) |
| Airline food | JAL, ANA, Thai | His "favorite airline" of 2017 was ANA; Ippudo ramen on ANA business was "the best sky ramen" | [3rWXqlFIlLU](https://www.youtube.com/watch?v=3rWXqlFIlLU) |

**Count:** about **150 Japan entries**, of which **about 128 are named restaurants, shops, stalls or markets** and the rest are experiences. By region: Tokyo and day trips 46, Osaka 38, Kyoto/Nara/Kobe 10, Kyushu 20, Hokuriku/Alps 17, Okinawa 7, Hokkaido 9, plus generic items.

---

## 5. His Japan tips (quoted)

**Lunch is the main meal.**
- "Lunch at restaurants is often MUCH cheaper than dinner… sometimes I even ate two or three lunches – and then had a budget dinner." ([Tokyo guide](https://migrationology.com/tokyo-travel-guide-for-food-lovers/))
- Yoshihashi was "$20 [lunch]… dinner can cost around $200 or more."

**Beat the queue by arriving early.**
- "To avoid lines, I would often show up at a restaurant about 15 – 30 minutes before the restaurant would open." (Tokyo guide)
- "I've never been to a city where there is so much lining up for food." ([Tenmatsu](https://www.youtube.com/watch?v=PwY4fWJMSLc))

**Counter seats:** "Sitting at the bar is actually one of the most awesome things about eating Japanese food in Japan." (Tenmatsu)

**Ordering:**
- At ramen shops: "you enter to a vending machine… pay and get a ticket." ([Kikanbo](https://www.youtube.com/watch?v=jrMsWztL1n8))
- At Tenmatsu you order and pay at reception first.
- Ramen rule: "Taste the broth first… just slurp and enjoy." ([kMVmGjCC8Eo](https://www.youtube.com/watch?v=kMVmGjCC8Eo))
- "slurping is polite in Japan." ([Osaka guide](https://migrationology.com/osaka-food-guide-japan/))

**Etiquette:**
- "Don't tip… considered rude." (Tokyo guide)
- "it's considered impolite to eat while walking." (Tokyo guide)
- High-end places may stop filming: at Yoshihashi "the waitress did ask us not to take any more photos."

**Finding places:** signs are often only in Japanese, so "take a good mental note… or a photo" of the storefront. (Tokyo guide)

**Depachika:**
- "the basements are usually reserved for an array of takeaway food that will blow your mind."
- His picks were Isetan Shinjuku, Shinjuku Takashimaya and the Shibuya-station mall. (Tokyo guide)

**Budget eating:**
- Neighbourhood teishoku (a ¥590 saba set) and vending-machine gyudon chains (Yoshinoya, Sukiya): "not the best quality… but… tasty, and affordable." (Tokyo guide)
- Supermarket sushi is "still pretty fresh." ([TJYEvl_ydDo](https://www.youtube.com/watch?v=TJYEvl_ydDo))

**Trains:** "When you take a train in Japan, you are encouraged to eat"; buy ekiben before boarding. ([L2y_ZlaYSuk](https://www.youtube.com/watch?v=L2y_ZlaYSuk))

**Holidays:**
- He missed Endo Sushi ("I made the mistake of going on a holiday, and they were closed") and Chitose ("back to back holidays").
- On a holiday the Osaka Aquarium was "single file."
- This matters for the New Year shutdown.

**Lukewarm on tourist hubs:** Kuromon is "a tourist attraction… [but] remains very friendly" (2015). He says Fushimi Inari, Kinkaku-ji and Kiyomizu are worth doing early, because they were "incredibly busy" later. Since 2015 Kuromon has become far more touristy and expensive.

**Tsukiji/Toyosu:**
- He skipped the 3-hour Sushi Dai queue for Nakaya.
- The outer market is "a seafood lover's dream."
- The auction needed a 4 am queue by taxi (2014), and he went later only with a guide (2017).

**Tokyo 2014 budget for two:** $139 a day in total, with food at ¥60,361 over 15 days. ([Tokyo guide](https://migrationology.com/tokyo-travel-guide-for-food-lovers/))

---

## 6. Tabelog cross-check summary

**Elite (3.70+) and endorsed by Mark:**

| Place | Score |
|---|---|
| Sushi Arai | 4.59 |
| Sushi Nanba (Hibiya) | 4.52 |
| Narisawa | 4.25 |
| Tempura Motoyoshi | 4.06 |
| Nakahara | 3.88 |
| Sumiyaki Shio Horumon "A" (Kobe) | 3.84 |
| Kadoya Shokudo | 3.83 |
| Ginza Kagari | 3.78 |
| Menya Shichisai | 3.78 |
| Unagi Obana | 3.77 |
| E-chan Shokudo | 3.77 |
| Miyachiku Oyodo Kahan (if that was the branch) | 3.77 |
| Ramen Yashichi | 3.74 |
| Narutomi | 3.73 |
| Kikanbo | 3.72 |
| Ichiniisan | 3.72 |
| Shima | 3.71 |
| Aidaya | 3.70 |

**Solid (3.50–3.69):**
- Okonomiyaki Kiji, Ganso Motoyoshiya, Roshoki, Iki-iki Tei, Takaesu Soba, Mekkemon, Yonekyu, Butagumi, Ajinoya, Harukoma, Honke Shibato, Morimoto, Sanshuya, Hanadako, Izakaya Toyo, Hakuryuken, Kokinchan, Oreshiki Jun, Tonki, Tenfusa, Maruaki, Isshin, Nishicho Taiki, Kinoko no Sato Suzukaen, Fujiya.
- Ramen and soba run lower on Tabelog, so treat those as strong.

**Weak local score (Mark liked it, Japanese diners rate it modestly, ≤3.30):**
- Tokyo: Uoriki (3.00), Tsukiji Saito Suisan (3.18), Higashi-Shinjuku Shokudo (3.08), Gyoza Gaudí (3.27), Wagyu Mafia outlets (3.0–3.2), Rashohan Shibuya (3.29; the Kanda honten is 3.64)
- Kansai: La Shomon (3.28; he was a guest of the owners), Yakitori Smith (3.04–3.29), Ginza Hageten Kyoto (3.12)
- Hokuriku/Alps: Okuhida Takara Soba (3.02, which he called his best-ever soba), Miyabi-an (3.26), Komori (3.16), Matsuki Burger (3.18), Gyohan (3.17)

**Closed or moved:**
- Chanko Tomoegata: [Closed] on Tabelog.
- Yoshihashi: closed, per a 4travel listing.
- Kazami: closure reported in 2022, unconfirmed.
- Tempura Motoyoshi: relocated to Daikanyama.
- Sushi Namba: moved to Hibiya.
- Ginza Kagari: relocated within Ginza.
- Tsukiji inner-market places (Nakaya, Tenfusa) are now at Toyosu.
- The auction he saw is now at Toyosu.

**Not verified:** Chuka Soba Inoue's current status, Ghar Curry, Shimotaya Ura-Namba, Matsuya/Tengu Shinsekai, Kyōya Takayama, "Baya", and Izakaya Tsuwabuki.

---

## 7. Persona card: channelling Mark Wiens (≤150 words)

**What he asks of a restaurant:**
- Is the flavour big: real heat, garlic, fat, charcoal?
- Is it generous: thick-cut fish, full bowls?
- Can I sit at the counter and watch the cook?
- Is it a family or heritage place that's "stood the test of time"?
- Is lunch a deal?

**What he vetoes:** bland or "plain" refinement, overpriced tourist takoyaki, and hype chains (Ichiran or Ippudo as a destination).

**Sample verdict:** "Oh wow… that broth is so rich and so clean at the same time. Add the raw garlic and it goes to another level. Totally worth getting in line 20 minutes before they open!"

**To this family:**
- Book lunch sets at the famous places (Obana, Narutomi, Butagumi, Yonekyu) instead of dinners.
- Queue early.
- Let the pregnant member have the grilled unagi, the tonkatsu, cooked kurobuta shabu and katsu curry, not the uni-don, chicken sashimi or raw oysters.
- The parents will love Yonekyu's tatami rooms and the ekiben on the Shinkansen.

---

## 8. Confidence

**Verified:**
- Every video title, date and description was read from YouTube's own data (main channel plus @MarkWiensAbroad).
- Blog quotes come from migrationology.com's pages and WordPress API.
- Tabelog scores, review counts, awards and closure flags were read from tabelog.com/en on 18 Oct 2026.
- The Tokyo Fixer identity comes from Mark's own link to instagram.com/tokyofixer.

**Inferred or unverified:**
- **Name-to-listing matches.** Several matches between a place named in a description and a Tabelog listing are likely but not certain. These are marked "likely"/"unclear": Maruyoshi = Kizu market Daikokucho, the Miyachiku branch, Gyohan, Kamakura Jinbei, Land Bar, and Harukoma honten vs shiten.
- **Award lists.** These were parsed by regex and may miss some 百名店 years. "None" means none parsed, not proven none.
- **Kyushu, Okinawa, Hokuriku and Hokkaido scores.** These come from Tabelog search listings (score only, no review count).
- **Coverage gaps.**
  - Instagram captions (@migrationology) were not reachable, so Japan posts that exist only on Instagram (e.g. the 2025 Tokyo trip beyond the Kamakura and bento videos) are missing.
  - Nat Geo/HBO shows were not checked.
  - Ramen Beast's own channels show no further Mark collaboration.
- **Disclosures.** Tour, hosted and sponsored meals are flagged as disclosed: The Hungry Tourist 2017, Narisawa/Chowzter, Sri Panwa, Visit Kyushu 2023, and KTO-type sponsorships elsewhere.

No quote, visit or score above was invented.
