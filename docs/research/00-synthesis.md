# Seis pelo Japão — research synthesis and design brief (1 Oct 2026)

## The product today
A private PWA (Next.js 16, Supabase, Vercel) for six family members: Pedro (planner), his partner (29–32 weeks pregnant during the trip), his brother and sister-in-law (30s, active), and his parents (older but very fit: 10 km/day is easy). Portuguese UI; place names stay in English. Eki-stamp passport design (washi paper, inks, serif, rubber stamps). Bottom nav: Início · Hoje · + Anotar · Viagem · Passaporte. Sign-in by tapping your name + 6-digit email code; planner can "Ver como" anyone.

Decide phase today: FOUR pre-defined routes (A Grande Volta, B País da Neve, C Sudoeste, D Montanhas Sagradas), each an essay with stays, a route page with map/photos, and a majority vote (favourite + optional 2nd choice). Planner's "Mesa do Pedro" copies a route into a plan, edits stays/nights, has a rules engine (20 nights, peak days, long legs, stairs, NY closures warnings), day planner, bookings with deadlines, budget. Existing tables: trip places (89, Google place ids), routes, votes, hearts, media, tips, plans, activities, bookings, settings, notes, packing, expenses, food marks.

The user's verdict: the four routes feel shallow and arbitrary. He wants (1) the family to say what they want to live, (2) the app to build routes from that, anchored on what Japan offers 20 Dec 2026–9 Jan 2027, (3) much deeper research as the data.

## Fixed constraints (from the user)
- Flights fixed: Tokyo in (20 Dec) and out (9 Jan). Domestic flights inside Japan allowed.
- Nothing booked yet (1 Oct). Vote deadline 15 Oct. Bookings must be locked ~20 Oct.
- Budget ≈ S$15k per couple for 20 nights excl. flights (≈ ¥1.85M per couple, ≈ ¥275k/day for six all-in).
- Hokkaido out. Parents: very fit. Partner: no doctor limits beyond standard pregnancy guidance. Claude API key will be added to Vercel for the builder.
- Majority vote stays (favourite + 2nd choice as tie-break).

## Research findings that shape routes (8 reports in scratchpad/research/01–08)
Calendar (03, 02, 01):
- Worst train days: 27–30 Dec and 2–4 Jan (JR data; northern/Hokuriku shinkansen "nearly full" 29–30 Dec and 3 Jan; expressways jam 2–3 Jan). 31 Dec and 1 Jan are calm travel days. Nozomi all-reserved 25 Dec–5 Jan and 9–11 Jan. 9 Jan starts a 3-day weekend (Coming-of-Age Day 11 Jan): no intercity move on 9 Jan; night of 8 Jan within 60–90 min of the airport.
- Functional shutdown 29 Dec–3 Jan (museums, castles, markets, many restaurants, clinics). Only 1 Jan is fully dead. Dept stores closed 1 Jan; some open 2 Jan (lucky bags), others 3 Jan. Markets at their most crowded 28–30 Dec, full again 5 Jan. Always open: teamLab, Mori Art, Skytree, Hakone Open-Air Museum, aquariums, Kenrokuen (free + all night 31 Dec), snow monkeys, Beppu hells. Shrines/temples are the show (Tōdai-ji free from midnight on 1 Jan with the Buddha's face window open; Zenkō-ji all night; Sensō-ji; Itsukushima from midnight). Imperial Palace public greeting Sat 2 Jan (no application). Hakone Ekiden 2–3 Jan (Hakone lodging 1–3 Jan sold out a year ago; roads closed). Kabuki-za from 2 Jan with ¥1,000–2,500 single acts + English guide. Comiket 29–31 Dec (avoid Odaiba/Toyosu mornings). Christmas illuminations end 25 Dec (arrival week = lights week). Sumo opens 10 Jan (one day after departure). Shirakawa-gō light-ups 11–31 Jan (outside). Zaō monsters partial. Diamond Fuji at Yamanakako: reports disagree (daily in season vs Feb) — verify.
- Ticket alarms: Nintendo Museum Jan lottery closes 31 Oct; Ghibli Park Jan tickets 10 Nov 14:00 JST; Ghibli Museum 10 Dec 10:00 JST; Chion-in/Zōjō-ji bells 1 Dec; Skytree sunrise early Dec; Toyosu first auction (5 Jan) deck lottery early Dec; every train seat 24 Dec–11 Jan at 10:00 JST one month ahead (9 Dec for 9 Jan).
- Every shinkansen leg: six seats in one booking (3+3 or 2+2+2), Green Car for her and the parents on legs ≥2 h; luggage by takkyubin on every base change ≥2 h (2 nights' lead over NY; 3 days for airport); nationwide JR Pass not worth it; at most one bus-dependent base.

Lodging (07):
- Ryokan loaded NY inventory ~6 months out; famous houses gone (Ginzan, Nozawa ryokan, Shibu small inns, Yufuin's big names, Kurokawa, Nishimuraya 31 Dec, Hakone Ginyu 31 Dec, Niseko). Shirakawa-gō: no 6-pax house over NY (day trip; farmhouse night feasible 20–27 Dec).
- Still realistic for six: apartment hotels/machiya in Tokyo, Kyoto, Osaka (new Mimaru Namba 3BR), Kanazawa, Takayama, Matsumoto, Nara, Hiroshima, Fukuoka, Sendai; large onsen hotels with lifts and beds: Suginoi Beppu, Taikansō Matsushima, Takamiya Zaō, Shogetsutei Kinosaki, Konansou Kawaguchiko, Biyunoyado Yudanaka, Nikkō Kanaya (29–30 Dec, 2–3 Jan), Hakone big hotels. Kōyasan by association request ≥14 working days (Fukuchi-in gentlest). Hakuba 3BR chalets (Wadano, flat) still show gaps.
- Prices per night for six: cities ¥45–80k / ¥90–170k / ¥250k+; onsen with 2 meals ¥120–180k / ¥200–330k / ¥400–800k; NY +50–100%. Cancellation free to 14–30 days typically. Strategy: hold refundable anchors for 2–3 route shapes this week, release the losers.

Pregnancy (08) — her constraints (not the parents'):
- SIA certificate dated 10–20 Dec (issue 11–18 Dec), both flights; twins would be a blocker on 9 Jan. Domestic flights need no certificate at these weeks. Insurance: complications only, no birth/newborn cover; Singlife wouldn't cover with a 7 Mar EDD.
- Transit ≤4 h door-to-door/day, ≤1 rail leg >2 h/day, aisle/Green Car, rest day after a ≥3 h travel day, no rush-hour departures; walking ≤8–10 km/day, seated break every 60–90 min, no queue >30 min, no standing events; no icy hikes/stone stairs without handrail; crampons in snow towns; day-bag only.
- Onsen OK (private/in-room, ≤10 min ≤41 °C, ≤2/day, never alone, no sauna). Fresh sushi not banned by Japanese OBs; avoid raw egg, rare meat, raw shellfish, cold-smoked salmon, soft unpasteurised cheese; limit bluefin/swordfish.
- Every base within ~30 min of a 24-h obstetrics hospital; 29 Dec–3 Jan nights preferably in a city with a university/Red Cross/perinatal centre (Tokyo, Kyoto, Osaka, Kanazawa, Hiroshima, Fukuoka, Sendai), not a rural onsen town (clinics closed). Tension with "onsen towns are the best NY base" — resolve per base by hospital distance (check Kinosaki→Toyooka).

Regions (05, 06): ~156 experience cards exist in the two files with columns id, name_pt, name_en, region, base, dates_valid, suits, bump_ok 1–5, effort 1–5, indoor, cost_pp_jpy, hours_needed, booking_lead, ny_status, uniqueness 1–5, source. Highlights the agents would fight for: Kenrokuen yukitsuri (all-night 31 Dec), Shirakawa-gō farmhouse night (pre-NY), Zenkō-ji dawn + hatsumōde, snow monkeys (split: fit four walk, she waits in Shibu), Nozawa ski + 13 free baths (split), Zaō ropeway light-up (seated), Kanazawa crab + Himi buri, Shin-Hotaka ropeway (no stairs), Kawaguchiko first days (Fuji clearest), Kusatsu yubatake + yumomi, Yasaka Okera-mairi 31 Dec, Tōdai-ji dawn 1 Jan, Kinosaki crab+baths, Kōyasan temple night + Okunoin walk + 6 am fire ritual, Chion-in bell (fit four), Ōhara Sanzen-in (open 1–3 Jan, quiet), Hiroshima Peace Park (open 1 Jan), Miyajima oysters, Naoshima art day, Kurokawa lanterns + private baths, Takachiho kagura (car, fit four), Fukuoka yatai + FUK→HND. Cuts: Yoshino, Aso (closed), Gunkanjima, Hokkaido, Tōka Ebisu, Sado, Shimoda, Ikaho steps, Noto bus day, Yamadera steps. Every ski card is a split-group card.

Product patterns (04):
- LLM group planners: fairness ~35% at six people; 43% of AI-planned days have a verifiable fault (closed venue, overrun, backtracking, duplicates). Swipe decks with hidden votes: 5–8 min/person. Only one tool treats booking lead times as first-class.
- Proposal adopted: quick facts (walking tolerance, midday rest, food limits, early/late, up to 3 "tem que acontecer") → ~30–80 picture cards with não / gosto / tem que acontecer, hidden until all finish → her limits as filters not scores → every route must include ≥2 of each person's 3 non-negotiables or say why → multiplicative scoring (a strong "não" drags an item) with a fairness nudge across days → one veto round on whole routes → routes that differ on a real axis → per-person coverage bars, km/day vs limits, rest half-days, cost vs budget, what's open 29 Dec–3 Jan, deadlines strip, "what each route gives up and who loses".
- Pitfalls: validate hours/closures/transit before showing; de-duplicate across 20 days; ≤2 anchors/day; keep constraints out of free chat; everyone sees the UI; booking windows as hard dates; "regenerate" keeps locked items.

## Emergent skeleton (from calendar + lodging + pregnancy)
Tokyo 20–~24 Dec (lights week, Fuji day trip possible) → move by 26 Dec → sit still 27–30 Dec → optional calm move 31 Dec/1 Jan → sit still 2–4 Jan in a city with a hospital and a kitchen → move 5 Jan → last base near Tokyo 5–8 Jan (Imperial Palace 2 Jan only if in Tokyo then; Toyosu first auction 5 Jan; Kabuki; Dezomeshiki 6 Jan) → fly 9 Jan. 3–4 bases + day trips, decided largely by the calendar; the wishes pick WHICH bases and what fills the days. Domestic flight unlocks Kyushu/Setouchi as the pre- or post-NY block.

## The proposed flow (to be critiqued)
1. Desejos: quick facts + picture cards (não / gosto / tem que acontecer, max 3 TQA), private, hidden until everyone finishes; parents can do it on Pedro's phone via "Ver como".
2. Retrato da família: overlap, splits, conflicts the app spots ("neve ou calor no Réveillon?").
3. O app monta: rules cluster wishes into bases, assign nights on the calendar skeleton, enforce her limits + train/closure rules + bookability; Claude (API) writes pitch, trade-offs, alternatives when rules reject; outputs 2–3 routes into the existing plans table.
4. Votação com cartas na mesa: per-person coverage, km/day, rest, cost per couple vs S$15k, NY location/open status, deadlines strip, "what you give up"; majority vote as now; one veto round.
5. Dias divididos: parallel tracks (ski / icy trail / Ekiden roadside for the fit four; baths / tea / museum for her) built in.
Plus: a 20 Dec→9 Jan "what's on" timeline; booking deadlines as app reminders; lodging anchors held this week for 2–3 shapes.

## Timeline
Catalog + card deck by 6 Oct; family swipes by 10 Oct; routes built + vote closes 15 Oct; bookings locked 20 Oct. Ticket alarms start 31 Oct (Nintendo), 10 Nov, 1 Dec, 9 Dec…
