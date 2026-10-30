# Porting the food guide into the live app (v2)

The live app is `v2/` (Vercel builds only `v2/`, see `vercel.json`). Its UI is in **plain English** (see `v2/src/components/Food.tsx` and `v2/data/food-guide.json` for the tone: short, warm, concrete, no jargon, "we"/"our" voice for the family). The family is **seven**: Pedro, Fernanda (29–32 weeks pregnant), João, Carolina, Carlos, Nadir, Tatiana.

**The plan route (dates):** Tokyo 20–24 Dec → Yudanaka/Shibu (snow monkeys) 24–27 Dec → Kanazawa 27–30 Dec → Kyoto 30 Dec – 5 Jan (New Year) → Kawaguchiko 5–7 Jan → Tokyo 7–9 Jan (fly 9 Jan). The alternatives also use Takayama, Gero, Okuhida, Nara, Hakone and Hiroshima.

## Your job
Translate and adapt the Portuguese guide files in `data/food-guide/` (repo root) into **English** files in `v2/data/food-deep/` using the same JSON structure, but with **every `_pt` key renamed without the suffix** (`tagline_pt`→`tagline`, `history_pt`→`history`, `what_pt`→`what`, `pregnancy_pt`→`pregnancy_note`, `why_pt`→`why`, `order_pt`→`order`, `group_pt`→`group`, `booking_pt`→`booking`, `dec_jan_pt`→`dec_jan`, `story_pt`→`story`, `eat_pt`→`eat`, `tips_pt`→`tips`, `buy_pt`→`buy`, `price_pt`→`price`, `where_pt`→`where`, `name_pt`→`name`, `note_pt`→`note`, `tip_pt`→`tip`, `body_pt`→`body`, `intro_pt`→`intro`, `title_pt`→`title`, `winter_pt`→`winter`, `genre_pt`→`genre`). The `pregnancy` enum becomes `"ok" | "careful" | "avoid"` (from ok/cuidado/evitar).

Rules:
- **Seven, not six.** Every group note must be rewritten for seven people. A room "for 6" does NOT obviously fit 7: say "room for 6; ask whether a seventh chair fits" or suggest the split (4+3). A counter "of 8" now means booking 7 of 8 seats or the whole counter. Never claim 7 fits unless the source says so.
- **The pregnant traveller is Fernanda**: write "For Fernanda: …" style notes where the old text said "a grávida/ela".
- **Dates:** rewrite `dec_jan` notes against OUR dates in that city (e.g. Kyoto is New Year, so Kikunoi being closed over New Year means "closed while we're there; only an option on the Takayama/Gero alternative if…" or simply "closed 31 Dec–3 Jan; try 4 Jan"). Keep "to confirm" where unknown.
- Keep every number, URL, Tabelog score, Japanese name and critic link **exactly**. Don't add facts. Natural English, not literal translation; keep it concise.
- Validate each file with `python3 -m json.tool`.
