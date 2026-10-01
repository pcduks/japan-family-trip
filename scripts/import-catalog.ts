/**
 * Builds data/experiences.json, data/bases.json and data/transit.json from the
 * research in docs/research. Re-runnable: parse → normalise → merge
 * scripts/catalog-overrides.json last. Also writes scripts/catalog-review.csv.
 *
 *   npx tsx scripts/import-catalog.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Base, Confidence, ExperienceCard, NyStatus, TransitLeg, Who } from "../src/lib/catalog/types";


const ROOT = join(import.meta.dirname, "..");
const RESEARCH = join(ROOT, "docs", "research");
const WINDOW_FROM = "2026-12-20";
const WINDOW_TO = "2027-01-09";
const NY_DATES = ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03", "2027-01-04", "2027-01-05"];
const VERIFIED_AT = "2026-10-01";
const ALL_WHO: Who[] = ["her", "parents", "bros", "pedro"];
const CUTS = new Set(["KS-10", "KY-08", "KY-11", "KS-12", "NW-NII-05", "NW-FUJ-12", "NW-KUS-07", "NW-KAN-11", "NW-TOH-04", "ST-03"]);

type Row = Record<string, string>;
type Review = { id: string; field: string; raw: string; parsed: string; needs_review: string };
const reviews: Review[] = [];

// ---------- helpers ----------
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const num = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const clampIso = (d: string) => (d < WINDOW_FROM ? WINDOW_FROM : d > WINDOW_TO ? WINDOW_TO : d);
function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Parse markdown pipe tables under the "card table" header: returns rows keyed by header. */
function parseTables(md: string, header: string): Row[] {
  const lines = md.split("\n");
  const rows: Row[] = [];
  let cols: string[] | null = null;
  for (const line of lines) {
    if (!line.startsWith("|")) {
      cols = null;
      continue;
    }
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells[0] === header) {
      cols = cells;
      continue;
    }
    if (!cols || /^-+$/.test(cells[0] ?? "-")) continue;
    const row: Row = {};
    cols.forEach((c, i) => (row[c] = cells[i] ?? ""));
    rows.push(row);
  }
  return rows;
}

// ---------- dates ----------
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const yearOf = (m: number) => (m >= 10 ? 2026 : 2027);
const MON = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
const MONC = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
const DAYNAMES: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

/** Finds the first date span in text: "20–27 Dec", "31 Dec–1 Jan", "mid Dec–Mar", "from 27 Dec", "31 Dec". */
function findSpan(text: string): { from: string; to: string } | null {
  const t = norm(text).replace(/~/g, "").replace(/[-−]/g, "–");
  const relDay = (w: string) => (w.startsWith("early") ? 5 : w.startsWith("mid/late") ? 20 : w.startsWith("mid") ? 15 : w.startsWith("late") ? 25 : w.startsWith("end") ? 28 : 1);
  const point = (s: string): { y: number; m: number; d: number } | null => {
    let m = s.match(new RegExp(`^\\s*(\\d{1,2})\\s*${MONC}`));
    if (m) return { y: yearOf(MONTHS[m[2]]), m: MONTHS[m[2]], d: +m[1] };
    m = s.match(new RegExp(`^\\s*(early|mid/late|mid|late|end)[- ]?${MONC}`));
    if (m) return { y: yearOf(MONTHS[m[2]]), m: MONTHS[m[2]], d: relDay(m[1]) };
    m = s.match(new RegExp(`^\\s*${MONC}`));
    if (m) return { y: yearOf(MONTHS[m[1]]), m: MONTHS[m[1]], d: 1 };
    return null;
  };
  // cross-month or relative range
  const re = new RegExp(`((?:\\d{1,2}\\s*)?(?:early|mid/late|mid|late|end)?[- ]?${MON})\\s*–\\s*((?:\\d{1,2}\\s*)?(?:early|mid/late|mid|late|end)?[- ]?${MON})`);
  let m = t.match(re);
  if (m) {
    const a = point(m[1]);
    const b = point(m[2]);
    if (a && b) {
      const bd = m[2].match(/^\s*\d/) || /early|mid|late|end/.test(m[2]) ? b.d : new Date(Date.UTC(b.y, b.m, 0)).getUTCDate();
      return { from: iso(a.y, a.m, a.d), to: iso(b.y, b.m, bd) };
    }
  }
  // same-month range "20–27 Dec"
  m = t.match(new RegExp(`(\\d{1,2})\\s*–\\s*(\\d{1,2})\\s*${MONC}`));
  if (m) {
    const mo = MONTHS[m[3]];
    return { from: iso(yearOf(mo), mo, +m[1]), to: iso(yearOf(mo), mo, +m[2]) };
  }
  m = t.match(new RegExp(`from\\s*(\\d{1,2})\\s*${MONC}`));
  if (m) {
    const mo = MONTHS[m[2]];
    return { from: iso(yearOf(mo), mo, +m[1]), to: WINDOW_TO };
  }
  if (/\b31–1\b/.test(t)) return { from: "2026-12-31", to: "2027-01-01" };
  if (/\b(ny|new year)\b/.test(t) && !/\d/.test(t)) return { from: "2026-12-29", to: "2027-01-03" };
  m = t.match(new RegExp(`(\\d{1,2})\\s*${MONC}`));
  if (m) {
    const mo = MONTHS[m[2]];
    const d = iso(yearOf(mo), mo, +m[1]);
    return { from: d, to: d };
  }
  m = t.match(new RegExp(`(early|mid/late|mid|late|end)[- ]?${MONC}`));
  if (m) {
    const mo = MONTHS[m[2]];
    const d = iso(yearOf(mo), mo, relDay(m[1]));
    return { from: d, to: WINDOW_TO };
  }
  return null;
}

type Valid = ExperienceCard["valid"];
const ANY = /^(all window|any|daily|all)$/;

function parseDates(raw: string, id: string): { valid: Valid; flags: string[] } {
  const valid: Valid = {};
  const flags: string[] = [];
  const closed = new Set<string>();
  let text = raw.replace(/\*\*/g, "");
  // parentheticals: weekday closures live there; the rest is a note
  const parens = [...text.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  text = text.replace(/\([^)]*\)/g, "").trim();
  const segs = [...text.split(/;|\bor\b/), ...parens].map((s) => s.trim()).filter(Boolean);
  for (const seg of segs) {
    const s = norm(seg).replace(/~/g, "");
    if (/tbc|verify|confirm/.test(s)) flags.push(`dates: ${seg}`);
    if (ANY.test(s) || /^(all window|any|daily|weather|best|lottery|rules|museum lottery|tbc|crater closed|keep closed|some houses closed|declaration varies|female to 31 dec|festival feb|lights feb|light-up feb|museum confirm|dawn|patchy|winter limited|\d{1,2}:\d{2}|avoid)/.test(s)) {
      continue;
    }
    const dayM = s.match(/\b(closed|not)\s+(mon|tue|wed|thu|fri|sat|sun)/) ?? s.match(/\b(closed)\s+(mon|tue|wed|thu|fri|sat|sun)/);
    if (dayM) {
      const skip = DAYNAMES[dayM[2]];
      valid.weekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== skip);
      continue;
    }
    if (/^sat(urdays| only)?\b/.test(s)) {
      valid.weekdays = [6];
      const span = findSpan(s);
      if (span) applySpan(valid, span);
      continue;
    }
    if (/^fri\/sat/.test(s)) {
      valid.weekdays = [5, 6];
      flags.push("dates: holiday evenings too (check which nights)");
      continue;
    }
    const span = findSpan(s);
    if (/^(not|museum not|closed|avoid)\b/.test(s)) {
      if (span) for (const d of datesBetween(clampIso(span.from), clampIso(span.to))) closed.add(d);
      else flags.push(`dates: ${seg}`);
      continue;
    }
    if (span) {
      applySpan(valid, span);
      continue;
    }
    if (/^(—|-)$/.test(s)) {
      flags.push("dates: none given");
      continue;
    }
    flags.push(`dates: ${seg}`);
  }
  if (closed.size) valid.closed = [...closed].sort();
  reviews.push({ id, field: "dates_valid", raw, parsed: JSON.stringify(valid), needs_review: flags.join(" | ") });
  return { valid, flags };
}

function applySpan(valid: Valid, span: { from: string; to: string }) {
  const from = clampIso(span.from);
  const to = clampIso(span.to);
  const days = datesBetween(from, to);
  if (days.length <= 3 && span.to >= WINDOW_FROM && span.from <= WINDOW_TO) {
    valid.only = [...new Set([...(valid.only ?? []), ...days])].sort();
    return;
  }
  if (span.to < WINDOW_FROM || span.from > WINDOW_TO) {
    valid.only = valid.only ?? [];
    return;
  }
  if (from > WINDOW_FROM) valid.from = from;
  if (to < WINDOW_TO) valid.to = to;
}

// ---------- scalar fields ----------
function parseRating(raw: string, id: string, field: string): { main: number; alt?: number; flags: string[] } {
  const flags: string[] = [];
  const s = raw.replace(/\*\*/g, "").trim();
  let main: number;
  let alt: number | undefined;
  if (/^n\/?a$/i.test(s)) {
    main = 1;
    alt = 4;
  } else {
    const parts = s.split("/").map((p) => p.match(/\d/g)?.map(Number) ?? []);
    const first = parts[0] ?? [];
    if (!first.length) {
      main = 3;
      flags.push(`${field}: unparsed "${raw}"`);
    } else main = Math.max(...first);
    if (parts.length > 1 && parts[1].length) {
      const a = Math.max(...parts[1]);
      if (a > main) alt = a; // "3 / 1" = same person, two parts; keep the main figure
    }
  }
  reviews.push({ id, field, raw, parsed: alt ? `${main} (alt ${alt})` : String(main), needs_review: flags.join(" | ") });
  return { main: num(main, 1, 5), alt: alt ? num(alt, 1, 5) : undefined, flags };
}

function parseCost(raw: string, id: string): { cost: number | null; note?: string } {
  const s = raw.replace(/,/g, "").trim();
  const m = s.match(/\d+/);
  const cost = m && !/^(—|-)$/.test(s) ? +m[0] : null;
  const note = /[/+–()]|day|night|bus/.test(s) && cost !== null ? raw : undefined;
  reviews.push({ id, field: "cost_pp_jpy", raw, parsed: String(cost), needs_review: cost === null && !/^(—|-|0)$/.test(s) ? `cost: ${raw}` : "" });
  return { cost, note };
}

function parseHours(raw: string, id: string): number | "overnight" {
  const s = norm(raw);
  let out: number | "overnight";
  if (/overnight|night|days/.test(s)) out = "overnight";
  else if (/^day$/.test(s)) out = 8;
  else {
    const n = s.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    out = n.length ? Math.max(...n) : 2;
  }
  reviews.push({ id, field: "hours_needed", raw, parsed: String(out), needs_review: "" });
  return out;
}

function parseBooking(raw: string, id: string): ExperienceCard["booking"] {
  const s = norm(raw);
  let lead: number | null = null;
  const flags: string[] = [];
  if (/^(none|same day|taxi\/none|shuttle none|none \(special fare\))$/.test(s) || /^none/.test(s) && !/\d/.test(s)) lead = 0;
  else if (/call ahead|day before/.test(s)) lead = 1;
  else {
    const re = /(\d+)(?:\s*[–-]\s*(\d+))?\s*\+?\s*(wk|week|mo|month|d\b|day)/g;
    let m: RegExpExecArray | null;
    const vals: number[] = [];
    while ((m = re.exec(s))) {
      const unit = m[3].startsWith("w") ? 7 : m[3].startsWith("m") ? 30 : 1;
      vals.push((+(m[2] ?? m[1])) * unit);
    }
    if (vals.length) lead = Math.max(...vals);
    else if (/timed|online/.test(s)) lead = 7;
    else if (/^(—|-)$/.test(s)) lead = null;
    else if (/stay|guests/.test(s)) lead = null;
    else if (/lottery|sale|sells|dec|nov/.test(s)) lead = 30;
    else flags.push(`booking: ${raw}`);
  }
  if (/check/.test(s)) flags.push(`booking: ${raw}`);
  const how = lead === 0 && /^none$/.test(s) ? undefined : raw;
  reviews.push({ id, field: "booking_lead", raw, parsed: String(lead), needs_review: flags.join(" | ") });
  return { lead_days: lead, ...(how ? { how } : {}), ...(flags.length ? { _flags: flags } : {}) } as ExperienceCard["booking"];
}

function parseSuits(raw: string, id: string): { suits: Who[]; split: boolean; flags: string[] } {
  const s = norm(raw);
  const flags: string[] = [];
  let suits: Who[];
  if (/^(—|-)$/.test(s)) {
    suits = [];
    flags.push("suits: none given");
  } else if (/five|not partner/.test(s)) suits = ["parents", "bros", "pedro"];
  else if (/^all|^guests|^partner|all \(|all \/|all;/.test(s) || /\ball\b/.test(s)) suits = [...ALL_WHO];
  else {
    suits = [];
    if (/parent/.test(s)) suits.push("parents");
    if (/bro|sil|brother|fit/.test(s)) suits.push("bros");
    if (/fit (four|4)/.test(s) && !suits.includes("parents")) suits.unshift("parents");
    if (!suits.length) {
      suits = [...ALL_WHO];
      flags.push(`suits: ${raw}`);
    }
  }
  const split = !suits.includes("her") || /split|\/|;|partner|fit|summit|keep|four|only/.test(s) || suits.length < 4;
  reviews.push({ id, field: "suits", raw, parsed: suits.join("+") + (split ? " split" : ""), needs_review: flags.join(" | ") });
  return { suits, split, flags };
}

// ---------- closures ----------
type ClosureRow = { name: string; status: NyStatus[]; conf: Confidence; tokens: string[] };
const GENERIC = new Set(["museum", "castle", "market", "park", "garden", "temple", "shrine", "onsen", "ropeway", "lake", "bay", "ferry", "hells", "outer", "baths", "island", "city", "station", "snow", "tower", "art", "house", "village", "street", "night", "winter", "nagano", "nara", "osaka", "kyoto", "tokyo", "hakone", "kanazawa", "hida", "miyajima", "hiroshima", "fukuoka", "nagasaki", "kagoshima", "yufuin", "matsushima", "kurashiki", "okayama", "takayama", "naoshima", "kamakura", "toyosu", "nikko", "yamagata", "kumamoto", "kinosaki"]);
const STOP = new Set(["the", "and", "with", "from", "day", "new", "year", "ny", "in", "at", "of", "to", "plus", "via", "for", "on", "by", "cut", "etc", "walk", "lunch", "dinner", "dawn", "tour", "crab", "beef", "cruise", "jan", "dec", "food", "ride", "sake", "class", "gold", "leaf", "bath", "beach", "lights", "stamp", "soba", "trail", "dinner", "sushi", "oysters", "udon", "lantern", "lanterns", "open", "opening", "air", "sky", "streets", "bamboo", "stores", "department", "express", "kitchen", "view", "folk", "free", "monkey", "canal", "hall"]);
const tokens = (s: string) =>
  norm(s)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));

function cellStatus(cell: string): NyStatus {
  const c = cell.replace(/\*\*/g, "").trim();
  const m = c.match(/^(O|C|R|\?)/);
  if (!m) return "unknown";
  if (/^O\s*\(R\)/.test(c) || /^C\/R/.test(c)) return "reduced";
  if (m[1] === "?") return "unknown";
  if (/^O\?/.test(c)) return "unknown";
  const base: NyStatus = m[1] === "O" ? "open" : m[1] === "C" ? "closed" : "reduced";
  if (base !== "closed" && /free|all night|bell|sunrise|event|ceremon|party|countdown|first auction|hatsu|初/i.test(c)) return "event";
  return base;
}

function loadClosures(): ClosureRow[] {
  const md = readFileSync(join(RESEARCH, "02-closures.md"), "utf8");
  const out: ClosureRow[] = [];
  for (const line of md.split("\n")) {
    if (!line.startsWith("| ")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 13 || cells[0] === "Name" || /^-+$/.test(cells[0])) continue;
    const status = cells.slice(1, 10).map(cellStatus);
    if (cells.slice(1, 10).every((c) => !c)) continue;
    const conf = (cells[cells.length - 1].match(/[ABC]/)?.[0] ?? "C") as Confidence;
    const name = cells[0].replace(/\*\*/g, "");
    out.push({ name, status, conf, tokens: tokens(name) });
  }
  return out;
}

function matchClosure(id: string, name_en: string, closures: ClosureRow[]): ClosureRow | null {
  if (id in NY_ALIASES) {
    const alias = NY_ALIASES[id];
    if (alias === null) return null;
    const row = closures.find((c) => norm(c.name).startsWith(norm(alias)));
    if (!row) throw new Error(`alias not found for ${id}: ${alias}`);
    return row;
  }
  const ct = tokens(name_en);
  let best: { row: ClosureRow; score: number }[] = [];
  for (const row of closures) {
    let score = 0;
    for (const t of ct) {
      const hit = row.tokens.some((r) => (t.length >= 4 ? r.startsWith(t) || t.startsWith(r) && r.length >= 4 : r === t));
      if (hit) score += GENERIC.has(t) ? 0.4 : 1;
    }
    if (score >= 1) best.push({ row, score });
  }
  best = best.sort((a, b) => b.score - a.score);
  if (!best.length) return null;
  if (best.length > 1 && best[0].score === best[1].score) {
    reviews.push({ id, field: "ny_match", raw: name_en, parsed: best.map((b) => b.row.name).slice(0, 3).join(" / "), needs_review: "ambiguous closures match — add alias" });
    return null;
  }
  return best[0].row;
}

/** ny_status from the card's own ny_status + dates text when no closures row matched. */
function ownNyStatus(nyText: string, valid: Valid): { ny: Record<string, NyStatus>; flags: string[]; conf: Confidence } {
  const s = norm(nyText);
  const flags: string[] = [];
  let base: NyStatus = "unknown";
  let conf: Confidence = "C";
  if (/open|runs|on\b|most|packed|busy|peak|premium|partial|patchy|reduced|capped|short|surcharge|2-night/.test(s)) base = "open";
  if (/partial|patchy|reduced|capped|short hours|partly|mostly closed|many closed/.test(s)) base = "reduced";
  if (/^event|the event|n\/a/.test(s)) base = "event";
  if (/sold out|tight|gone/.test(s)) base = "reduced";
  if (/some guides|likely closed/.test(s)) base = /likely closed/.test(s) ? "closed" : "reduced";
  if (/verify|tbc|confirm|check/.test(s)) flags.push(`ny: ${nyText}`);
  const ny: Record<string, NyStatus> = {};
  for (const d of NY_DATES) ny[d] = base;
  const closedSpan = /(closed|shut|ends|finished|not)\b[^;]*/.exec(s);
  if (closedSpan) {
    const span = findSpan(closedSpan[0]);
    if (span) {
      for (const d of datesBetween(clampIso(span.from), clampIso(span.to))) if (d in ny) ny[d] = "closed";
      if (/ends|finished/.test(closedSpan[0])) for (const d of NY_DATES) if (d > span.to) ny[d] = "closed";
      if (base === "unknown") for (const d of NY_DATES) if (ny[d] === "unknown") ny[d] = "open";
      conf = "B";
    } else if (/finished|ends/.test(closedSpan[0])) for (const d of NY_DATES) ny[d] = "closed";
  }
  if (valid.only?.length) {
    conf = "B";
    for (const d of NY_DATES) ny[d] = valid.only.includes(d) ? "event" : "closed";
  }
  return { ny, flags, conf };
}

// ---------- tags / photo ----------
function tagsFor(c: { id: string; name_en: string; name_pt: string; hours: number | "overnight"; split: boolean }): string[] {
  const t = norm(c.name_en + " " + c.name_pt);
  const tags: string[] = [];
  const add = (tag: string, re: RegExp) => re.test(t) && tags.push(tag);
  add("onsen", /onsen|bath|rotenburo|sotoyu|kashikiri|hells|soto-yu|banho/);
  add("snow", /snow|neve|frozen|ice\b|gelo|juhyo|yukitsuri|ski|congelad/);
  add("ski", /ski|snow-play|tubing/);
  add("food", /crab|beef|soba|sushi|lunch|dinner|yatai|oyster|udon|hoto|gyutan|yuba|sake|buri|seafood|tongue|hegi|wanko|champon|caranguejo|carne|breakfast|tuna|cuisine|pies/);
  add("shrine", /shrine|jingu|taisha|inari|hatsumode|tenmangu|dazaifu|okera|ebisu|togakushi|itsukushima|santuario/);
  add("temple", /temple|-ji\b|dera|zenko|eihei|chion|todai|koyasan|shukubo|byodo|sanzen|ohara|sino|bell/);
  add("art", /museum|art |teamlab|ghibli|kusama|glass|nebuta|dinosaur|kabuki|museu/);
  add("market", /market|mercado|yatai|nishiki|kuromon|omicho|tsukiji|toyosu|morning/);
  add("view", /ropeway|view|panoram|sunrise|fuji|lake|gorge|falls|bay|cruise|caldera|sakurajima|teleferico|lago|cascata/);
  add("lights", /illumination|light|lantern|starlight|pageant|yubatake|fireworks|lamps|yu akari|lights|ilumina|fogos|luzes/);
  add("ride", /train|express|ropeway|cruise|ferry|loop|cable|revaty|liner|trem|teleferico|boat/);
  add("castle", /castle|jinya|castelo/);
  add("garden", /garden|kenroku|ritsurin|korakuen|sengan|jardim/);
  add("walk", /walk|path|street|district|town|village|canal|trail|avenue|passeio|rua|aldeia/);
  add("night", /night|evening|dusk|dawn|midnight|sunrise|noite|anoitecer|amanhecer/);
  add("ny", /new year|hatsumode|joya|okera|countdown|ano-novo|ano novo|1 jan|31 dec/);
  if (c.hours === "overnight") tags.push("overnight");
  if (c.split) tags.push("split");
  if (CUTS.has(c.id)) tags.push("cut");
  return [...new Set(tags)];
}

const photoQuery = (name_en: string) => name_en.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").replace(/[—–]/g, "-").trim() + " Japan winter";

// ---------- build cards ----------
function buildCard(row: Row, baseMap: Record<string, string[]>, closures: ClosureRow[]): ExperienceCard {
  const id = row.id;
  const flags: string[] = [];
  const name_en = row.name_en.replace(/\*\*/g, "");
  const name_pt = row.name_pt;
  const { valid, flags: df } = parseDates(row.dates_valid, id);
  flags.push(...df);
  const bump = parseRating(row.bump_ok, id, "bump_ok");
  const effort = parseRating(row.effort, id, "effort");
  const uniq = parseRating(row.uniqueness, id, "uniqueness");
  flags.push(...bump.flags, ...effort.flags, ...uniq.flags);
  const { cost, note } = parseCost(row.cost_pp_jpy, id);
  const hours = parseHours(row.hours_needed, id);
  const bookingRaw = parseBooking(row.booking_lead, id) as ExperienceCard["booking"] & { _flags?: string[] };
  const { _flags: bf, ...booking } = bookingRaw;
  flags.push(...(bf ?? []));
  const suits = parseSuits(row.suits, id);
  flags.push(...suits.flags);

  const baseKey = row.base.replace(/\*\*/g, "").trim();
  const bases = baseMap[baseKey];
  if (!bases) {
    flags.push(`base: unmapped "${baseKey}"`);
  }
  reviews.push({ id, field: "base", raw: baseKey, parsed: (bases ?? []).join("+"), needs_review: bases ? "" : "unmapped base" });

  const indoorRaw = norm(row.indoor);
  const indoor: ExperienceCard["indoor"] = /^in|covered/.test(indoorRaw) ? "in" : /^out/.test(indoorRaw) ? "out" : "mixed";

  // ny_status
  const matched = matchClosure(id, name_en, closures);
  let ny: Record<string, NyStatus> = {};
  let confidence: Confidence;
  if (matched) {
    NY_DATES.forEach((d, i) => (ny[d] = matched.status[i]));
    confidence = matched.conf;
    reviews.push({ id, field: "ny_match", raw: name_en, parsed: matched.name, needs_review: "" });
    if (/verify|tbc|confirm|check/i.test(row.ny_status)) flags.push(`ny: ${row.ny_status}`);
  } else {
    const own = ownNyStatus(row.ny_status, valid);
    ny = own.ny;
    confidence = own.conf;
    flags.push(...own.flags);
    reviews.push({ id, field: "ny_match", raw: name_en, parsed: "(own text)", needs_review: "" });
  }
  for (const d of valid.closed ?? []) if (d in ny) ny[d] = "closed";
  if (valid.only) for (const d of NY_DATES) if (!valid.only.includes(d) && ny[d] !== "closed") ny[d] = "closed";
  if (valid.from) for (const d of NY_DATES) if (d < valid.from) ny[d] = "closed";
  if (valid.to) for (const d of NY_DATES) if (d > valid.to) ny[d] = "closed";
  if (valid.weekdays) for (const d of NY_DATES) if (!valid.weekdays.includes(new Date(d + "T00:00:00Z").getUTCDay())) ny[d] = "closed";
  reviews.push({ id, field: "ny_status", raw: row.ny_status, parsed: NY_DATES.map((d) => ny[d][0]).join(""), needs_review: "" });

  const anchor = hours === "overnight" || hours >= 3 || uniq.main >= 4;
  const card: ExperienceCard = {
    id,
    name_pt,
    name_en,
    promise_pt: PROMISES[id] ?? name_pt,
    region: row.region,
    place_slug: PLACE_SLUGS[id] ?? null,
    bases: bases ?? [],
    valid,
    ny_status: ny,
    bump_ok: bump.main as ExperienceCard["bump_ok"],
    ...(bump.alt ? { bump_ok_alt: bump.alt as ExperienceCard["bump_ok"] } : {}),
    effort: effort.main as ExperienceCard["effort"],
    indoor,
    cost_pp_jpy: cost,
    ...(note ? { cost_note: note } : {}),
    hours,
    booking,
    uniqueness: uniq.main as ExperienceCard["uniqueness"],
    split_group: suits.split,
    suits_default: suits.suits,
    anchor,
    tags: tagsFor({ id, name_en, name_pt, hours, split: suits.split }),
    deck_group: DECK[id]?.group ?? null,
    ...(DECK[id] ? { deck_order: DECK[id].order } : {}),
    photo_query: photoQuery(name_en),
    confidence,
    source: row.source,
    verified_at: VERIFIED_AT,
    needs_review: [...new Set(flags)],
  };
  if (!PROMISES[id]) card.needs_review.push("promise_pt missing");
  if (PROMISES[id] && PROMISES[id].length > 90) throw new Error(`promise too long ${id}`);
  return card;
}

// ---------- overrides ----------
type Overrides = {
  cards?: Record<string, Partial<ExperienceCard> & { clear_review?: string[] }>;
  bases?: Record<string, Partial<Base>>;
};
function mergeCard(card: ExperienceCard, o: Partial<ExperienceCard> & { clear_review?: string[] }): ExperienceCard {
  const { clear_review, ...rest } = o;
  const out: ExperienceCard = { ...card, ...rest } as ExperienceCard;
  if (rest.valid) out.valid = rest.valid; // replace whole validity
  if (rest.ny_status) out.ny_status = { ...card.ny_status, ...rest.ny_status };
  if (rest.booking) out.booking = { ...card.booking, ...rest.booking };
  if (rest.tags) out.tags = [...new Set([...card.tags, ...rest.tags])];
  if (rest.needs_review) out.needs_review = [...new Set([...card.needs_review, ...rest.needs_review])];
  if (clear_review) out.needs_review = out.needs_review.filter((r) => !clear_review.some((c) => c === "*" || r.startsWith(c)));
  out.anchor = out.hours === "overnight" || out.hours >= 3 || out.uniqueness >= 4;
  return out;
}

// ---------- main ----------
function main() {
  const { baseMap, baseRows } = BASES;
  const closures = loadClosures();
  const md05 = readFileSync(join(RESEARCH, "05-north-west.md"), "utf8");
  const md06 = readFileSync(join(RESEARCH, "06-south-west-hokkaido.md"), "utf8");
  const rows = [...parseTables(md05, "id"), ...parseTables(md06, "id"), ...parseTables(EXTRA_ROWS, "id")].filter((r) => r.id && !r.id.startsWith("HK-"));
  const overrides = JSON.parse(readFileSync(join(ROOT, "scripts", "catalog-overrides.json"), "utf8")) as Overrides;

  let cards = rows.map((r) => buildCard(r, baseMap, closures));
  cards = cards.map((c) => (overrides.cards?.[c.id] ? mergeCard(c, overrides.cards[c.id]) : c));

  let bases: Base[] = baseRows.map((b) => ({ ...b, source: b.source ?? "07-lodging.md; 08-pregnancy.md §4" }));
  bases = bases.map((b) => (overrides.bases?.[b.slug] ? ({ ...b, ...overrides.bases[b.slug], hospital: { ...b.hospital, ...(overrides.bases[b.slug].hospital ?? {}) } } as Base) : b));
  const slugs = new Set(bases.map((b) => b.slug));
  for (const c of cards) for (const b of c.bases) if (!slugs.has(b)) throw new Error(`card ${c.id} references missing base ${b}`);
  const legs: TransitLeg[] = TRANSIT;
  for (const l of legs) for (const s of [l.from, l.to]) if (!slugs.has(s)) throw new Error(`leg references missing base ${s}`);

  const write = (name: string, data: unknown) => writeFileSync(join(ROOT, "data", name), JSON.stringify(data, null, 2) + "\n");
  write("experiences.json", cards);
  write("bases.json", bases);
  write("transit.json", legs);

  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const csv = ["id,field,raw,parsed,needs_review", ...reviews.map((r) => [r.id, r.field, r.raw, r.parsed, r.needs_review].map(esc).join(","))].join("\n") + "\n";
  writeFileSync(join(ROOT, "scripts", "catalog-review.csv"), csv);

  const withReview = cards.filter((c) => c.needs_review.length);
  const deck = cards.filter((c) => c.deck_group);
  console.log(`cards ${cards.length} · deck ${deck.length} · needs_review ${withReview.length} · bases ${bases.length} · legs ${legs.length}`);
  for (const c of withReview) console.log(`  ${c.id}: ${c.needs_review.join(" | ")}`);
}


// =====================================================================
// Hand tables (content, not parsing). Keep PT lines ≤90 chars.
// =====================================================================

/** Cards whose closures match is ambiguous or wrong by fuzzy name; null = no venue row. */
const NY_ALIASES: Record<string, string | null> = {
  "KS-16": "Kinosaki Onsen — 7 outer baths",
  "KS-15": "Kōyasan temple lodging",
  "KS-09": "Kasuga Taisha",
  "NW-NAG-04": "Hakuba (Happo-one)",
  "NW-NAG-05": "Hakuba (Happo-one)",
  "NW-NAG-08": "Hakuba (Happo-one)",
  "NW-TOH-08": "Ginzan Onsen",
  "NW-TOH-09": "Ginzan Onsen",
  "NW-TOH-10": "Ginzan Onsen",
  "NW-KAN-12": "Kenrokuen",
  "NW-TAK-09": "Gokayama — Ainokura",
  "NW-TAK-01": "Shirakawa-gō village",
  "NW-FUJ-06": "Hakone Ropeway",
  "KY-03": "Yufuin — Kinrin Lake",
  "KY-12": "Sakurajima ferry",
  "KY-10": "Nagasaki — Glover Garden",
  "ST-01": "Naoshima — Chichu",
  "ST-09": "Itsukushima Shrine",
  "ST-04": "Kurashiki Ōhara Museum",
  "TK-01": "Zōjō-ji",
  "TK-02": "Sensō-ji",
  "TK-03": null,
  "TK-04": "Tokyo Skytree",
  "TK-06": "teamLab Planets",
  "TK-07": "Toyosu Market",
  "TK-08": "Ghibli Museum",
  "TK-10": "Tsukiji Outer Market",
  "TK-12": "Kamakura Daibutsu",
  "TK-13": null,
  "TK-14": "Mori Art Museum",
  "NW-NAG-11": null,
  "NW-TAK-05": null,
  "NW-TAK-04": null,
  "NW-TOH-02": null,
  "NW-TON-06": null,
  "NW-KAN-09": null,
  "KS-19": null,
  "KS-04": "Nishiki Market",
  "KS-11": "Kuromon Market",
  "KY-01": "Fukuoka yatai",
  "KY-05": "Kurokawa Onsen",
  "NW-NIK-01": "Nikkō Tōshōgū",
  "NW-TOH-03": "Matsushima bay cruise",
  "NW-TOH-05": "Zaō Ropeway",
  "NW-TOH-07": "Zaō Ropeway",
  "NW-TOH-06": null,
  "NW-KUS-03": null, "NW-NAG-03": null, "NW-MAT-02": null, "NW-MAT-04": null, "NW-TAK-06": null, "NW-NAG-12": null,
  "NW-TOH-13": null, "NW-TON-02": null, "NW-TON-09": null, "NW-FUJ-11": null, "KS-06": null, "KY-09": "Kumamoto Castle",
  "NW-KAN-04": null, "TK-11": null, "TK-09": null, "KS-14": "Universal Studios Japan", "KS-05": null,
};

/** Existing trip-data.json place ids, when the card is that place. */
const PLACE_SLUGS: Record<string, string> = {
  "NW-NIK-01": "nikko", "NW-NAG-01": "jigokudani", "NW-NAG-02": "nagano", "NW-NAG-03": "yudanaka", "NW-NAG-07": "yudanaka",
  "NW-MAT-01": "matsumoto", "NW-TAK-01": "shirakawago", "NW-TAK-02": "shirakawago", "NW-TAK-03": "takayama", "NW-TAK-04": "takayama",
  "NW-KAN-01": "kanazawa", "NW-TOH-08": "ginzan", "NW-TOH-09": "ginzan", "NW-TOH-10": "ginzan", "NW-FUJ-01": "kawaguchiko",
  "NW-FUJ-04": "kawaguchiko", "NW-FUJ-06": "hakone", "KS-05": "uji", "KS-08": "nara", "KS-09": "nara", "KS-11": "osaka",
  "KS-15": "koyasan", "KS-16": "kinosaki", "KS-17": "himeji", "ST-01": "naoshima", "ST-08": "hiroshima", "ST-09": "miyajima",
  "KY-01": "fukuoka", "KY-02": "dazaifu", "KY-03": "yufuin", "KY-04": "beppu", "KY-10": "nagasaki", "TK-02": "tokyo",
  "TK-10": "tokyo", "TK-12": "kamakura", "TK-13": "hakone",
};

/** The 36-card trunk deck: 6 groups × 6, chosen to discriminate route shapes (see docs/research/09-catalog-notes.md). */
const DECK: Record<string, { group: NonNullable<ExperienceCard["deck_group"]>; order: number }> = {
  "KS-16": { group: "noite-tranquila", order: 1 },
  "NW-TAK-02": { group: "noite-tranquila", order: 2 },
  "KS-15": { group: "noite-tranquila", order: 3 },
  "KY-05": { group: "noite-tranquila", order: 4 },
  "NW-FUJ-03": { group: "noite-tranquila", order: 5 },
  "NW-TOH-10": { group: "noite-tranquila", order: 6 },
  "KS-04": { group: "dia-de-rua", order: 1 },
  "NW-KAN-03": { group: "dia-de-rua", order: 2 },
  "ST-04": { group: "dia-de-rua", order: 3 },
  "KY-10": { group: "dia-de-rua", order: 4 },
  "TK-05": { group: "dia-de-rua", order: 5 },
  "NW-TAK-04": { group: "dia-de-rua", order: 6 },
  "NW-NAG-01": { group: "natureza", order: 1 },
  "NW-FUJ-08": { group: "natureza", order: 2 },
  "ST-09": { group: "natureza", order: 3 },
  "KY-07": { group: "natureza", order: 4 },
  "NW-TAK-08": { group: "natureza", order: 5 },
  "KS-06": { group: "natureza", order: 6 },
  "NW-KAN-02": { group: "comida", order: 1 },
  "NW-TAK-05": { group: "comida", order: 2 },
  "KY-01": { group: "comida", order: 3 },
  "ST-12": { group: "comida", order: 4 },
  "KS-19": { group: "comida", order: 5 },
  "TK-10": { group: "comida", order: 6 },
  "KS-02": { group: "reveillon", order: 1 },
  "KS-08": { group: "reveillon", order: 2 },
  "TK-03": { group: "reveillon", order: 3 },
  "ST-05": { group: "reveillon", order: 4 },
  "KY-02": { group: "reveillon", order: 5 },
  "NW-KAN-01": { group: "reveillon", order: 6 },
  "NW-NAG-04": { group: "neve", order: 1 },
  "NW-TOH-05": { group: "neve", order: 2 },
  "NW-TAK-01": { group: "neve", order: 3 },
  "NW-KUS-01": { group: "neve", order: 4 },
  "NW-KAR-01": { group: "neve", order: 5 },
  "NW-TON-04": { group: "neve", order: 6 },
};

/** Tokyo/Kantō cards from 01-events.md and 02-closures.md (the two region files start west of Tokyo). */
const EXTRA_ROWS = `
| id | name_pt | name_en | region | base | dates_valid | suits | bump_ok | effort | indoor | cost_pp_jpy | hours_needed | booking_lead | ny_status | uniqueness | source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TK-01 | Sino de Zōjō-ji e Tokyo Tower | Zōjō-ji Joya-no-Kane & hatsumōde (31 Dec night) | Tokyo | Tokyo | 31 Dec–1 Jan | all (ringing bros) | 4 | 1 | outdoor | 0 | 2 | ringing tickets 1 Dec 09:00 | event | 4 | zojoji.or.jp; rurubu.jp |
| TK-02 | Sensō-ji ao amanhecer de 1 Jan | Sensō-ji hatsumōde at dawn | Tokyo | Tokyo | 1–3 Jan | all | 3 | 1 | outdoor | 0 | 1.5 | none | open, packed | 3 | senso-ji.jp |
| TK-03 | Saudação de Ano-Novo no Palácio Imperial | Imperial Palace New Year greeting (2 Jan) | Tokyo | Tokyo | 2 Jan | all | 3 | 2 | outdoor | 0 | 3 | none | event | 5 | kunaicho.go.jp/visit/sanga |
| TK-04 | Primeiro nascer do sol na Skytree | Tokyo Skytree first-sunrise opening (1 Jan) | Tokyo | Tokyo | 1 Jan | all | 5 | 1 | indoor | 9000 | 2 | online early Dec; sells out in minutes | event | 4 | tokyo-skytree.jp |
| TK-05 | Kabuki de Ano-Novo (um ato) | Kabuki-za New Year single-act seat | Tokyo | Tokyo | 2–9 Jan; not 8 Jan | all | 5 | 1 | indoor | 2000 | 1.5 | day before online (makumi) | open from 2 Jan | 4 | kabukiweb.net |
| TK-06 | teamLab Planets | teamLab Planets Toyosu | Tokyo | Tokyo | all window | all | 4 | 1 | indoor | 4200 | 2 | 3–6 wk timed ticket | open daily; Comiket jams Toyosu 29–31 Dec | 3 | teamlab.art |
| TK-07 | Primeiro leilão de atum em Toyosu | Toyosu first tuna auction (5 Jan) | Tokyo | Tokyo | 5 Jan | fit four; partner 2F window | 3 / 4 | 2 | indoor | 0 | 2 | deck lottery early Dec; 2F window none | event | 4 | shijou.metro.tokyo.lg.jp |
| TK-08 | Museu Ghibli | Ghibli Museum Mitaka | Tokyo | Tokyo | 3–9 Jan | all | 4 | 1 | indoor | 1000 | 2.5 | Jan tickets 10 Dec 10:00 JST | closed 27 Dec–2 Jan | 4 | ghibli-museum.jp |
| TK-09 | Semana de luzes de Natal em Tokyo | Tokyo Christmas lights week (Marunouchi, Yebisu, Roppongi) | Tokyo | Tokyo | 20–25 Dec | all | 5 | 1 | outdoor | 0 | 2 | none | ends 25 Dec (Marunouchi runs to 14 Feb) | 3 | gotokyo.org |
| TK-10 | Café da manhã em Tsukiji | Tsukiji outer market breakfast | Tokyo | Tokyo | not 1–3 Jan | all | 4 | 1 | covered | 3000 | 2 | none | closed 1–3 Jan; packed 28–30 Dec | 3 | tsukiji.or.jp |
| TK-11 | Dezomeshiki dos bombeiros | Tokyo Fire Department Dezomeshiki (6 Jan) | Tokyo | Tokyo | 6 Jan | all | 4 | 2 | mixed | 0 | 3 | none (indoor free; outdoor seats lottery closed) | event | 3 | tfd.metro.tokyo.lg.jp |
| TK-12 | Grande Buda de Kamakura e Enoshima | Kamakura Daibutsu + Hase-dera + Enoshima | Kamakura | Kamakura | all window (avoid 1–3 Jan) | all | 4 | 2 | outdoor | 1500 | 6 | none | open; Hachimangū crush 1–3 Jan | 3 | kotoku-in.jp |
| TK-13 | Hakone Ekiden à beira da estrada | Hakone Ekiden roadside at Hakone-Yumoto (2–3 Jan) | Hakone | Hakone | 2–3 Jan | all | 3 | 2 | outdoor | 0 | 2 | hotel 12 mo | event | 4 | hakonenavi.jp; kgrr.org |
| TK-14 | Mori Art Museum e Tokyo City View | Mori Art Museum + City View (open 1 Jan) | Tokyo | Tokyo | all window | all | 5 | 1 | indoor | 2300 | 2 | none | open daily incl. 1 Jan | 2 | mori.art.museum |
`;

/** One plain PT-BR line per card, for the family. */
const PROMISES: Record<string, string> = {
  "NW-NIK-01": "Portões dourados sob cedros e neve; a gestante para no Yōmeimon.",
  "NW-NIK-02": "Trilha plana à beira do rio com 70 Jizō cobertos de neve.",
  "NW-NIK-03": "Lago gelado e a cascata Kegon congelada, vista por elevador.",
  "NW-NIK-04": "Raquetes de neve no pântano plano de Senjōgahara (só os quatro).",
  "NW-NIK-05": "Banho de enxofre leitoso a 1.500 m, com neve garantida.",
  "NW-NIK-06": "Parque temático samurai: shows cobertos, caminhos planos, diversão boba.",
  "NW-NIK-07": "Ryokan à beira do rio Kinugawa com banho privativo e kaiseki.",
  "NW-NIK-08": "Almoço de yuba, a especialidade de Nikkō, perto da ponte.",
  "NW-KUS-01": "O campo de água quente fumegante de Kusatsu iluminado ao anoitecer.",
  "NW-KUS-02": "Show de 20 min sentado e aquecido: mulheres mexendo a água cantando.",
  "NW-KUS-03": "Banho ao ar livre num parque nevado; a gestante fica nos pés.",
  "NW-KUS-04": "Noite em ryokan de Kusatsu com banho privativo reservável.",
  "NW-KUS-05": "Dia de esqui pequeno e fácil a 5 min do centro (irmão e cunhada).",
  "NW-KUS-06": "Casa de banho de 1691 que parece Spirited Away, em Shima Onsen.",
  "NW-KUS-07": "365 degraus de pedra e arcades retrô; só para os quatro em forma.",
  "NW-KAR-01": "Esqui e tubing a 10 min do shinkansen; a gestante lê no shopping.",
  "NW-KAR-02": "Luzes de inverno planas e cafés em Karuizawa.",
  "NW-KAR-03": "Terraço na floresta com lojas e onsen moderno morno.",
  "NW-KAR-04": "Cascata em cortina meio congelada, 5 min de caminho plano.",
  "NW-NAG-01": "Macacos de banho na neve; 1,6 km de trilha gelada (os quatro vão).",
  "NW-NAG-02": "Cerimônia ao amanhecer e o túnel escuro da 'chave do paraíso'.",
  "NW-NAG-03": "Nove banhinhos de madeira numa viela de 400 m, de yukata e geta.",
  "NW-NAG-04": "Pistas longas entre árvores com gôndola saindo da vila (os quatro).",
  "NW-NAG-05": "Treze banhos públicos gratuitos de madeira numa vila íngreme.",
  "NW-NAG-06": "Caminhada guiada suave de raquetes pelos arrozais nevados.",
  "NW-NAG-07": "Ryokan de madeira de 1758 que inspirou Spirited Away.",
  "NW-NAG-08": "O maior vale de esqui do Japão, bate-volta de ônibus de Nagano.",
  "NW-NAG-09": "Resort onde os seis ficam num prédio: tirolesa, tubing, spa, neve.",
  "NW-NAG-10": "Avenida plana de cedros de 400 anos coberta de neve até o Okusha.",
  "NW-NAG-11": "Soba gelado de Togakushi, o prato da região, em 1 hora.",
  "NW-NAG-12": "Trem retrô de poltronas largas entre pomares até Yudanaka.",
  "NW-MAT-01": "Castelo negro com os Alpes atrás; a gestante fica no jardim plano.",
  "NW-MAT-02": "Ruas planas de armazéns, cafés, lojas de missô e saquê.",
  "NW-MAT-03": "Banhos leitosos a 1.400 m com neve funda, 1 h de ônibus.",
  "NW-MAT-04": "Uma hora quente com as salas de Yayoi Kusama.",
  "NW-TAK-01": "A aldeia de telhados de palha sob neve funda, de dia, com ônibus.",
  "NW-TAK-02": "Dormir numa casa gasshō: jantar na lareira, futon sob o telhado.",
  "NW-TAK-03": "Barracas à beira do rio: maçãs, picles e amazake quente.",
  "NW-TAK-04": "Três ruas planas de madeira escura com degustação de saquê.",
  "NW-TAK-05": "Carne de Hida: hoba-miso, sushi de rua ou yakiniku.",
  "NW-TAK-06": "Único escritório de governador Edo que sobrou; tatami e 20 degraus.",
  "NW-TAK-07": "Trinta casas de fazenda numa encosta nevada, sem multidão.",
  "NW-TAK-08": "Teleférico de dois andares até um terraço de neve a 2.156 m.",
  "NW-TAK-09": "Vinte casas gasshō com um décimo das multidões.",
  "NW-TAK-10": "Cidade de canais, muros brancos e cenários de 'Your Name'.",
  "NW-KAN-01": "Jardim com cordas de neve, chá quente e caminhos de cascalho planos.",
  "NW-KAN-02": "Caranguejo grelhado e buri no mercado de 170 barracas.",
  "NW-KAN-03": "Vielas de gueixas e uma aula de folha de ouro de 30 min.",
  "NW-KAN-04": "Muros de terra protegidos com esteiras de palha; casa de samurai.",
  "NW-KAN-05": "Museu quente com a piscina falsa; precisa de horário marcado.",
  "NW-KAN-06": "Olhete de inverno no porto de Himi, com os Alpes sobre a baía.",
  "NW-KAN-07": "Museu de vidro de Kengo Kuma e sushi de camarão branco.",
  "NW-KAN-08": "Mosteiro zen de 70 prédios ligados por escadas cobertas.",
  "NW-KAN-09": "O caranguejo imperial inteiro, em kaiseki ou set de almoço.",
  "NW-KAN-10": "Um dos três melhores museus de dinossauros do mundo, todo coberto.",
  "NW-KAN-11": "Dia longo de apoio a Noto: mercado provisório e terraços de luz.",
  "NW-KAN-12": "Luzes à noite no jardim do castelo, grátis e plano.",
  "NW-TOH-01": "Avenida de zelkovas com 600 mil luzes, até 27 dez.",
  "NW-TOH-02": "Língua grelhada de Sendai, set de ¥2–3 mil.",
  "NW-TOH-03": "Cruzeiro sentado de 50 min pelas ilhas e templo de cedros.",
  "NW-TOH-04": "1.015 degraus gelados até o templo; só os quatro em forma.",
  "NW-TOH-05": "Gôndola até 1.660 m e árvores de gelo iluminadas, sem caminhar.",
  "NW-TOH-06": "Banhos ácidos fortes de Zaō; a gestante só um mergulho morno.",
  "NW-TOH-07": "Esqui entre os monstros de neve, a 5 min do onsen.",
  "NW-TOH-08": "Rua de ryokan de madeira na neve, de dia, com shuttle.",
  "NW-TOH-09": "Lampiões a gás e neve ao anoitecer, com ingresso limitado.",
  "NW-TOH-10": "Noite em Ginzan: a vila é sua depois das 20h.",
  "NW-TOH-11": "Sukiyaki de carne de Yonezawa numa parada de 30 min.",
  "NW-TOH-12": "Rua de 300 m de casas de palha; soba comido com um alho-poró.",
  "NW-TOH-13": "Castelo de telhas vermelhas na neve e onsen antigo.",
  "NW-TOH-14": "Trem direto e reservado de Asakusa até Aizu, via Nikkō.",
  "NW-TON-01": "Banho leitoso ao ar livre numa estalagem de palha dos anos 1600.",
  "NW-TON-02": "Passe para sete estalagens de onsen com shuttle; o céu dos pais.",
  "NW-TON-03": "Cercas pretas e cerejeiras nuas sob a neve; rua plana.",
  "NW-TON-04": "Ônibus aquecido até cascatas congeladas iluminadas.",
  "NW-TON-05": "Hotel grande com cascata de gelo iluminada no jardim.",
  "NW-TON-06": "Desafio de wanko-soba e passeio pela cidade de tijolos.",
  "NW-TON-07": "Parque do castelo na neve e 40 cafés de torta de maçã.",
  "NW-TON-08": "Os carros alegóricos gigantes de Nebuta, cobertos e quentes.",
  "NW-TON-09": "Beco de 26 barraquinhas com sopa de senbei e saquê.",
  "NW-TON-10": "Lago de caldeira silencioso na neve.",
  "NW-NII-01": "Gôndola de esqui direto da estação de shinkansen.",
  "NW-NII-02": "Parede de 125 saquês e banho de saquê, tudo dentro da estação.",
  "NW-NII-03": "Quatro banhos gigantes ao ar livre num rio nevado (os quatro).",
  "NW-NII-04": "Soba com alga marinha, o prato de Niigata.",
  "NW-NII-05": "Ilha de Sado no inverno: balsa brava, dois dias por um sítio. Cortado.",
  "NW-FUJ-01": "Cabine de 3 min até a vista do Fuji e do lago, deck plano.",
  "NW-FUJ-02": "Oito nascentes cristalinas com o Fuji atrás, caminhos planos.",
  "NW-FUJ-03": "Casa para seis com cozinha, banho privativo e o Fuji vermelho ao amanhecer.",
  "NW-FUJ-04": "Três km planos da margem norte com os melhores reflexos do Fuji.",
  "NW-FUJ-05": "Hōtō: sopa de massa e abóbora, o prato de inverno do Fuji.",
  "NW-FUJ-06": "Trem, cabo, teleférico e navio pirata: tudo sentado com o Fuji.",
  "NW-FUJ-07": "Esculturas ao ar livre, Picasso e um banho de pés.",
  "NW-FUJ-08": "Fuji enorme sobre o lago dos cisnes; Diamond Fuji ~15h30 no parque.",
  "NW-FUJ-09": "Vinte minutos de fogos na baía de Atami, no Natal.",
  "NW-FUJ-10": "Museu por escadas rolantes com vista do mar e passeio quente.",
  "NW-FUJ-11": "Caminho de bambu, banho de pés e soba numa vila de onsen.",
  "NW-FUJ-12": "Shimoda: porto agradável a 2h40 de Tokyo. Cortado.",
  "KS-01": "Dezessete monges tocam o maior sino do Japão; 3 h em pé no frio.",
  "KS-02": "Acender uma corda no fogo sagrado e girá-la até em casa por Gion.",
  "KS-03": "Túneis de torii abertos a noite toda; a volta baixa serve a todos.",
  "KS-04": "Kyoto comprando osechi; chegar às 9h do dia 30, beliscar e sair.",
  "KS-05": "Salão da Fênix, rua do matchá e, com sorte na loteria, o Museu Nintendo.",
  "KS-06": "Jardim de musgo com neve e caminhada plana no campo, quieto no Ano-Novo.",
  "KS-07": "Caminhada íngreme entre templos e um onsen no fim (os quatro).",
  "KS-08": "Portão abre à meia-noite e a janela mostra o rosto do Buda: uma vez por ano.",
  "KS-09": "Cervos, lanternas de pedra e caminhos planos de Nara.",
  "KS-10": "Monte Yoshino vazio no inverno; vila íngreme. Cortado.",
  "KS-11": "Caranguejo e fugu no Kuromon, depois o letreiro Glico de Dōtonbori.",
  "KS-12": "Festival dos comerciantes de Osaka; só o dia 9 cabe. Cortado.",
  "KS-13": "2,7 km planos até uma cascata; tempurá de folha de bordo.",
  "KS-14": "Parque aberto 26 h com Nintendo World e contagem regressiva (irmão e cunhada).",
  "KS-15": "Noite em templo, jantar vegetariano, cemitério à noite e ritual do fogo às 6h.",
  "KS-16": "Cidade plana de yukata, seis banhos públicos e caranguejo no ryokan.",
  "KS-17": "Castelo branco; os quatro sobem a torre, a gestante fica no jardim.",
  "KS-18": "O onsen mais antigo do Japão: água dourada e prateada perto de Kobe.",
  "KS-19": "Teppanyaki de carne de Kobe para seis no balcão.",
  "ST-01": "Monet sob a terra, abóboras de Kusama e museu novo de Ando numa ilha.",
  "ST-02": "Concha de concreto com gotas d'água; silêncio e pés descalços.",
  "ST-03": "Refinaria de cobre virada museu numa ilha minúscula. Cortado.",
  "ST-04": "Canal plano de salgueiros, armazéns Edo e El Greco.",
  "ST-05": "Grous soltos no jardim e entrada grátis em 1 de janeiro.",
  "ST-06": "Trinta km de pontes e ilhas de bicicleta (os quatro); a gestante vai de balsa.",
  "ST-07": "Teleférico até o alto e vielas de gatos ladeira abaixo.",
  "ST-08": "Parque e museu da paz, planos e com bancos; abre em 1 de janeiro.",
  "ST-09": "Torii flutuante, cervos e ostras grelhadas na ilha.",
  "ST-10": "Cinco arcos de madeira; a gestante vê da margem.",
  "ST-11": "A casa de banho de Spirited Away, restaurada, com salas privativas mornas.",
  "ST-12": "Jardim de cascalho plano com barco no lago e udon depois.",
  "ST-13": "785 degraus até o santuário; a gestante fica na rua de lojas.",
  "KY-01": "Barraquinhas de ramen e yakitori à beira do rio, seis em duas barracas.",
  "KY-02": "Santuário das ameixeiras com 2 milhões de pessoas em 1–3 jan; ir dia 31.",
  "KY-03": "Trem panorâmico reservado até uma vila plana com lago de neblina.",
  "KY-04": "Sete 'infernos' fumegantes e almoço cozido no vapor.",
  "KY-05": "Aldeia de ryokan à beira do rio com lanternas de bambu acesas.",
  "KY-06": "Noite inteira de danças num casarão com os moradores (os quatro).",
  "KY-07": "Barco a remo sob a cascata e passarela de 1 km.",
  "KY-08": "Caldeira e campos com neve; a cratera segue fechada. Cortado.",
  "KY-09": "Portão aberto por samurais e entrada grátis em 1 de janeiro; tem elevador.",
  "KY-10": "Jardim Glover, Dejima, bonde, champon e a vista do monte Inasa.",
  "KY-11": "Ilha-navio abandonada; desembarque acontece 1 em 3 no inverno. Cortado.",
  "KY-12": "Balsa de 15 min até o vulcão e jardim de frente para ele.",
  "KY-13": "Enterrado em areia quente por 10 min (os cinco; não a gestante).",
  "KY-14": "Floresta de musgo de Mononoke; 2–3 noites e chuva (os quatro).",
  "TK-01": "Sino da meia-noite com a Tokyo Tower atrás e barracas de comida.",
  "TK-02": "A primeira visita do ano no Sensō-ji, cedo, com a Nakamise aberta.",
  "TK-03": "A família imperial na sacada: o único dia em que o palácio abre.",
  "TK-04": "O primeiro sol de 2027 a 350 m, quente e sentado.",
  "TK-05": "Um ato de kabuki de Ano-Novo por ¥1–2 mil, com guia em inglês.",
  "TK-06": "Salas de água e luz descalço; indoor para dia de chuva.",
  "TK-07": "O primeiro leilão de atum do ano às 5h; a gestante vê do 2º andar.",
  "TK-08": "O museu do Totoro; só 3–9 jan, ingressos em 10 dez.",
  "TK-09": "A semana de luzes de Natal: Marunouchi, Yebisu, Roppongi, até 25 dez.",
  "TK-10": "Café da manhã de sushi e tamagoyaki no mercado externo.",
  "TK-11": "Acrobacias em escadas e 100 carros de bombeiro, no dia 6.",
  "TK-12": "Grande Buda, Hase-dera e a ilha de Enoshima com Fuji ao fundo.",
  "TK-13": "A maratona que para o Japão passa na porta do ryokan em Hakone.",
  "TK-14": "Arte contemporânea e vista da cidade, aberto até em 1 de janeiro.",
};

// ---------- bases ----------
type BaseRow = Omit<Base, "source"> & { source?: string };
/** Compact base row: slug, name, lat, lng, region, [hospital, minutes, perinatal], kitchen, lodging, ny, bus, airport, [lo, hi], hnd, tags */
const B = (
  slug: string, name: string, lat: number, lng: number, region: string, hospital: [string, number, boolean], kitchen: boolean,
  lodging_tier: 1 | 2 | 3, ny_tier: 1 | 2 | 3, bus_dependent: boolean, airport: Base["airport"], cost_night_6: [number, number], to_hnd_minutes: number | null, tags: string[],
): BaseRow => ({ slug, name, lat, lng, region, hospital: { name: hospital[0], minutes: hospital[1], perinatal: hospital[2] }, kitchen, lodging_tier, ny_tier, bus_dependent, airport, cost_night_6, to_hnd_minutes, tags });

const BASE_ROWS: BaseRow[] = [
  B("tokyo", "Tokyo", 35.7148, 139.7967, "Kanto", ["St. Luke's International Hospital", 20, true], true, 1, 1, false, "HND", [45000, 150000], 45, ["city", "hub", "lights", "ny-safe", "apartment"]),
  B("kamakura", "Kamakura", 35.3167, 139.5358, "Kanto", ["Shonan Kamakura General Hospital", 15, true], false, 1, 2, false, "HND", [60000, 150000], 90, ["sea", "temple", "daytrip"]),
  B("hakone", "Hakone", 35.2046, 139.0253, "Kanagawa", ["Odawara Municipal Hospital", 30, true], false, 2, 2, false, "HND", [90000, 300000], 120, ["onsen", "fuji", "ekiden"]),
  B("kawaguchiko", "Lake Kawaguchiko", 35.5163, 138.7519, "Fuji Five Lakes", ["Fujiyoshida Municipal Hospital", 15, true], true, 2, 2, false, "HND", [80000, 250000], 150, ["fuji", "house", "lake"]),
  B("atami", "Atami (Izu)", 35.0956, 139.0718, "Izu", ["Odawara Municipal Hospital", 35, true], false, 1, 2, false, "HND", [60000, 180000], 90, ["sea", "warm", "onsen"]),
  B("nikko", "Nikkō / Kinugawa", 36.758, 139.5988, "Tochigi", ["Dokkyo Medical University Nikko Medical Center", 25, true], true, 1, 2, false, "HND", [60000, 200000], 150, ["shrine", "snow", "onsen", "kominka"]),
  B("kusatsu", "Kusatsu Onsen", 36.6207, 138.5964, "Gunma", ["Haramachi Red Cross Hospital", 50, true], false, 2, 2, true, "HND", [90000, 260000], 240, ["onsen", "snow", "bus"]),
  B("karuizawa", "Karuizawa", 36.3425, 138.6349, "Nagano", ["Saku Central Hospital (Saku Medical Center)", 35, true], true, 1, 2, false, "HND", [60000, 200000], 150, ["villa", "ski", "lights", "outlet"]),
  B("matsumoto", "Matsumoto", 36.2383, 137.969, "Nagano", ["Shinshu University Hospital", 15, true], true, 1, 1, false, "HND", [50000, 200000], 210, ["castle", "city", "transit"]),
  B("nagano", "Nagano (Zenkō-ji)", 36.6614, 138.1875, "Nagano", ["Nagano Red Cross Hospital", 15, true], true, 1, 2, false, "HND", [60000, 240000], 165, ["temple", "hub", "apartment", "ny-safe"]),
  B("yudanaka", "Yudanaka / Shibu Onsen", 36.7337, 138.4312, "Nagano", ["Nagano Red Cross Hospital", 50, true], false, 2, 2, false, "HND", [60000, 240000], 230, ["onsen", "monkeys", "ryokan"]),
  B("nozawa", "Nozawa Onsen", 36.9218, 138.4407, "Nagano", ["Nagano Red Cross Hospital", 70, true], true, 2, 3, true, "HND", [60000, 220000], 240, ["ski", "onsen", "snow", "steep"]),
  B("hakuba", "Hakuba", 36.698, 137.862, "Nagano", ["Shinshu University Hospital", 75, true], true, 2, 2, true, "HND", [50000, 200000], 270, ["ski", "chalet", "snow"]),
  B("yuzawa", "Echigo-Yuzawa", 36.9346, 138.8104, "Niigata", ["Uonuma Kikan Hospital", 40, true], false, 2, 2, false, "HND", [80000, 200000], 150, ["ski", "onsen", "sake", "snow"]),
  B("niigata", "Niigata city", 37.9162, 139.0364, "Niigata", ["Niigata University Medical & Dental Hospital", 15, true], true, 1, 1, false, "HND", [45000, 110000], 200, ["city", "sake"]),
  B("takayama", "Takayama / Hida", 36.1408, 137.2596, "Gifu (Hida)", ["Takayama Red Cross Hospital", 10, true], true, 1, 2, false, null, [60000, 150000], 330, ["machiya", "old-town", "snow", "food"]),
  B("shirakawago", "Shirakawa-gō", 36.2578, 136.906, "Gifu", ["Takayama Red Cross Hospital", 55, true], false, 3, 3, true, null, [90000, 110000], 360, ["village", "snow", "gassho", "bus"]),
  B("kanazawa", "Kanazawa", 36.5621, 136.6627, "Ishikawa", ["Kanazawa University Hospital", 15, true], true, 1, 1, false, null, [50000, 160000], 240, ["city", "machiya", "garden", "crab", "ny-safe"]),
  B("toyama", "Toyama", 36.7014, 137.2132, "Toyama", ["Toyama University Hospital", 20, true], false, 1, 1, false, null, [40000, 100000], 230, ["city", "transit", "buri"]),
  B("fukui", "Fukui / Awara Onsen", 36.0617, 136.2229, "Fukui", ["University of Fukui Hospital", 30, true], false, 1, 2, false, null, [60000, 250000], 270, ["crab", "temple", "onsen"]),
  B("kinosaki", "Kinosaki Onsen", 35.6257, 134.8082, "Hyogo", ["Toyooka Public Hospital (Tajima Perinatal Center)", 18, true], false, 2, 2, false, null, [120000, 320000], 330, ["onsen", "crab", "flat", "ryokan"]),
  B("kyoto", "Kyoto", 35.0037, 135.7788, "Kansai", ["Kyoto University Hospital", 20, true], true, 1, 2, false, "KIX", [45000, 170000], 240, ["city", "machiya", "temple", "ny-event", "ny-safe"]),
  B("osaka", "Osaka", 34.6687, 135.5013, "Kansai", ["Yodogawa Christian Hospital", 20, true], true, 1, 1, false, "KIX", [45000, 140000], 240, ["city", "apartment", "food", "ny-safe"]),
  B("nara", "Nara", 34.689, 135.8398, "Kansai", ["Nara Prefecture General Medical Center", 20, true], false, 1, 1, false, "KIX", [50000, 180000], 270, ["temple", "deer", "daytrip"]),
  B("koyasan", "Kōyasan", 34.213, 135.586, "Wakayama", ["Hashimoto Municipal Hospital", 60, false], false, 2, 2, true, "KIX", [110000, 220000], 330, ["temple", "shukubo", "cold", "stairs"]),
  B("himeji", "Himeji", 34.8394, 134.6939, "Hyogo", ["Himeji Red Cross Hospital", 15, true], false, 1, 1, false, "ITM", [45000, 140000], 270, ["castle", "transit"]),
  B("kobe", "Kobe / Arima", 34.6901, 135.1956, "Hyogo", ["Kobe University Hospital", 15, true], false, 1, 1, false, "ITM", [50000, 150000], 240, ["city", "beef", "onsen"]),
  B("hiroshima", "Hiroshima", 34.3955, 132.4536, "Chugoku", ["Hiroshima University Hospital", 20, true], true, 1, 1, false, null, [50000, 180000], 240, ["city", "peace", "oysters", "ny-safe", "flight"]),
  B("miyajima", "Miyajima", 34.296, 132.3198, "Hiroshima", ["Hiroshima University Hospital", 60, true], false, 2, 3, false, null, [130000, 330000], 300, ["island", "shrine", "ryokan"]),
  B("onomichi", "Onomichi", 34.4089, 133.2053, "Hiroshima", ["JA Onomichi General Hospital", 10, false], false, 2, 2, false, null, [50000, 140000], 320, ["sea", "cycling", "hill"]),
  B("okayama", "Okayama", 34.6617, 133.935, "Setouchi", ["Okayama University Hospital", 15, true], false, 1, 1, false, null, [45000, 120000], 270, ["city", "hub", "garden"]),
  B("kurashiki", "Kurashiki", 34.5956, 133.772, "Setouchi", ["Kurashiki Central Hospital", 10, true], false, 1, 1, false, null, [45000, 120000], 300, ["canal", "art", "flat"]),
  B("naoshima", "Naoshima", 34.4605, 133.9955, "Kagawa", ["Okayama University Hospital", 90, true], false, 2, 3, false, null, [150000, 280000], 330, ["art", "island", "ferry"]),
  B("takamatsu", "Takamatsu", 34.3428, 134.0466, "Kagawa", ["Takamatsu Red Cross Hospital", 10, true], false, 1, 1, false, null, [45000, 120000], 300, ["city", "ferry", "udon", "garden"]),
  B("matsuyama", "Matsuyama / Dōgo", 33.8392, 132.7657, "Ehime", ["Ehime Prefectural Central Hospital", 10, true], false, 2, 2, false, null, [60000, 200000], 240, ["onsen", "castle", "flight"]),
  B("fukuoka", "Fukuoka", 33.5904, 130.4017, "Kyushu", ["Kyushu University Hospital", 20, true], true, 1, 1, false, "FUK", [40000, 140000], 240, ["city", "hub", "food", "ny-safe", "flight", "apartment"]),
  B("yufuin", "Yufuin", 33.2659, 131.369, "Oita (Kyushu)", ["Oita University Hospital", 30, true], false, 2, 3, false, "FUK", [120000, 360000], 300, ["onsen", "ryokan", "flat"]),
  B("beppu", "Beppu", 33.3155, 131.4734, "Oita (Kyushu)", ["Oita University Hospital", 30, true], false, 1, 1, false, "FUK", [150000, 320000], 300, ["onsen", "hotel", "lift", "ny-safe"]),
  B("kurokawa", "Kurokawa Onsen", 33.089, 131.154, "Kumamoto (Kyushu)", ["Kumamoto University Hospital", 90, true], false, 2, 3, true, "FUK", [140000, 330000], 330, ["onsen", "lanterns", "bus", "steep"]),
  B("kumamoto", "Kumamoto", 32.8031, 130.7079, "Kyushu", ["Kumamoto University Hospital", 15, true], false, 1, 1, false, null, [45000, 120000], 240, ["city", "castle", "car-hub", "flight"]),
  B("takachiho", "Takachiho", 32.7111, 131.3086, "Miyazaki (Kyushu)", ["Miyazaki Prefectural Nobeoka Hospital", 70, true], false, 2, 3, true, null, [60000, 120000], 360, ["gorge", "kagura", "car"]),
  B("nagasaki", "Nagasaki", 32.7348, 129.8687, "Kyushu", ["Nagasaki University Hospital", 15, true], false, 1, 1, false, null, [45000, 150000], 250, ["city", "tram", "flight"]),
  B("kagoshima", "Kagoshima", 31.5966, 130.5571, "Kyushu", ["Kagoshima University Hospital", 20, true], false, 1, 1, false, null, [45000, 130000], 250, ["city", "volcano", "flight"]),
  B("yakushima", "Yakushima", 30.3853, 130.6627, "Kagoshima (Kyushu)", ["Yakushima Tokushukai Hospital", 15, false], false, 2, 2, false, null, [60000, 180000], 360, ["island", "forest", "rain", "weather"]),
  B("sendai", "Sendai", 38.2682, 140.8694, "Tōhoku", ["Tohoku University Hospital", 15, true], true, 1, 1, false, null, [50000, 160000], 165, ["city", "hub", "apartment", "ny-safe"]),
  B("matsushima", "Matsushima", 38.3689, 141.064, "Tōhoku", ["Tohoku University Hospital", 45, true], false, 1, 2, false, null, [110000, 280000], 210, ["bay", "hotel", "lift"]),
  B("yamagata", "Yamagata city", 38.2554, 140.3396, "Tōhoku", ["Yamagata University Hospital", 15, true], false, 1, 1, false, null, [40000, 100000], 230, ["city", "hub", "cheap"]),
  B("zao", "Zaō Onsen", 38.166, 140.399, "Tōhoku", ["Yamagata University Hospital", 45, true], false, 2, 2, true, null, [90000, 260000], 270, ["ski", "onsen", "snow", "ropeway", "steep"]),
  B("ginzan", "Ginzan Onsen", 38.5697, 140.5306, "Tōhoku", ["Yamagata University Hospital", 75, true], false, 3, 3, true, null, [150000, 400000], 300, ["onsen", "snow", "lamps", "stairs"]),
  B("aizu", "Aizu-Wakamatsu", 37.4947, 139.9298, "Tōhoku", ["Aizu Chuo Hospital", 10, true], false, 1, 1, false, null, [50000, 180000], 240, ["castle", "snow", "post-town"]),
  B("nyuto", "Nyūtō Onsen / Tazawako", 39.7978, 140.8126, "Tōhoku", ["Omagari Kosei Medical Center", 60, true], false, 3, 3, true, null, [90000, 150000], 300, ["onsen", "snow", "remote"]),
  B("morioka", "Morioka", 39.702, 141.1545, "Tōhoku", ["Iwate Medical University Hospital", 20, true], false, 1, 1, false, null, [40000, 100000], 200, ["city", "hub", "food"]),
  B("towada", "Lake Towada / Oirase", 40.4280, 140.9018, "Tōhoku", ["Towada City Central Hospital", 50, false], false, 2, 2, true, null, [150000, 240000], 330, ["hotel", "ice", "remote"]),
  B("hachinohe", "Hachinohe", 40.5124, 141.4884, "Tōhoku", ["Hachinohe City Hospital", 15, true], false, 1, 1, false, null, [40000, 100000], 240, ["city", "yatai"]),
  B("aomori", "Aomori / Hirosaki", 40.8222, 140.7474, "Tōhoku", ["Hirosaki University Hospital", 15, true], false, 1, 1, false, null, [40000, 110000], 270, ["city", "snow", "castle"]),
];

/** Card "base" column text → base slugs. */
const BASE_MAP: Record<string, string[]> = {
  "Nikkō": ["nikko"], "Nikkō/Yumoto": ["nikko"], "Yumoto": ["nikko"], "Kinugawa": ["nikko"],
  "Kusatsu": ["kusatsu"], "Shima Onsen": ["kusatsu"], "Ikaho": ["kusatsu"],
  "Karuizawa": ["karuizawa"],
  "Nagano/Shibu": ["nagano", "yudanaka"], "Nagano": ["nagano"], "Shibu": ["yudanaka"], "Nozawa": ["nozawa"], "Nagano (day)": ["nagano"], "Myōkō": ["nagano"],
  "Matsumoto": ["matsumoto"], "Shirahone": ["matsumoto"],
  "Takayama/Kanazawa": ["takayama", "kanazawa", "shirakawago"], "Shirakawa-gō": ["shirakawago"], "Takayama": ["takayama"], "Takayama/Hirayu": ["takayama"], "Shirakawa-gō/Takaoka": ["shirakawago", "kanazawa"],
  "Kanazawa": ["kanazawa"], "Toyama/Kanazawa": ["toyama", "kanazawa"], "Toyama": ["toyama"], "Fukui/Awara": ["fukui"], "Awara/Mikuni": ["fukui"], "Fukui": ["fukui"],
  "Sendai": ["sendai"], "Sendai/Yamagata": ["sendai", "yamagata"], "Zaō/Yamagata": ["zao", "yamagata"], "Zaō": ["zao"], "Yamagata/Sendai": ["yamagata", "sendai"], "Yamagata": ["yamagata"], "Ginzan": ["ginzan"],
  "en route": ["yamagata"], "Aizu-Wakamatsu": ["aizu"], "—": ["nikko", "aizu"],
  "Nyūtō/Tazawako": ["nyuto"], "Nyūtō": ["nyuto"], "Morioka/Tazawako": ["morioka", "nyuto"], "Towada-ko/Hachinohe": ["towada", "hachinohe"], "Towada": ["towada"], "Morioka": ["morioka"], "Hirosaki/Aomori": ["aomori"], "Aomori": ["aomori"], "Hachinohe": ["hachinohe"],
  "Yuzawa/Tokyo": ["yuzawa", "tokyo"], "Yuzawa": ["yuzawa"], "Yuzawa/Minakami": ["yuzawa"], "Niigata": ["niigata"],
  "Kawaguchiko": ["kawaguchiko"], "Hakone-Yumoto": ["hakone"], "Hakone": ["hakone"], "Atami": ["atami"], "Shuzenji": ["atami"], "Shimoda": ["atami"],
  "Kyoto": ["kyoto"], "Kyoto/Nara": ["kyoto", "nara"], "Osaka": ["osaka"], "Kōyasan": ["koyasan"], "Kinosaki": ["kinosaki"], "Himeji": ["himeji"], "Kobe/Arima": ["kobe"], "Kobe": ["kobe"],
  "Okayama/Takamatsu": ["okayama", "takamatsu"], "Takamatsu/Naoshima": ["takamatsu", "naoshima"], "Naoshima": ["naoshima"], "Okayama": ["okayama"], "Onomichi": ["onomichi"], "Hiroshima": ["hiroshima"], "Matsuyama": ["matsuyama"], "Takamatsu": ["takamatsu"],
  "Fukuoka": ["fukuoka"], "Yufuin": ["yufuin"], "Beppu/Yufuin": ["beppu", "yufuin"], "Kurokawa": ["kurokawa"], "Takachiho": ["takachiho"], "Aso/Kumamoto": ["kumamoto"], "Kumamoto": ["kumamoto"], "Nagasaki": ["nagasaki"], "Kagoshima": ["kagoshima"], "Yakushima": ["yakushima"],
  "Tokyo": ["tokyo"], "Kamakura": ["kamakura"],
};
const BASES = { baseMap: BASE_MAP, baseRows: BASE_ROWS };

// ---------- transit (03-transport.md §6, plus 05/06 prose legs for bases the cards use) ----------
const L = (from: string, to: string, mode: string, hours_d2d: number, transfers: number, bump: TransitLeg["bump"], yen_pp: number | null, flags: TransitLeg["flags"] = [], note?: string): TransitLeg =>
  ({ from, to, mode, hours_d2d, transfers, bump, yen_pp, flags, ...(note ? { note } : {}) });
const NO = (from: string, to: string, note: string): TransitLeg => ({ from, to, mode: "none", hours_d2d: 8, transfers: 3, bump: 1, yen_pp: null, flags: ["LD"], no_route: true, note });

const TRANSIT: TransitLeg[] = [
  // 6.1 Tokyo hub / Kantō / Chūbu
  L("tokyo", "hakone", "Romancecar from Shinjuku", 1.75, 0, 4, 2470, ["ekiden"], "onward buses/cablecar bump 2; avoid 2–3 Jan (Ekiden)"),
  L("tokyo", "kawaguchiko", "Fuji Excursion from Shinjuku", 2.33, 0, 4, 4130, [], "sells out; fallback highway bus bump 3"),
  L("tokyo", "nikko", "Spacia X / Spacia from Asakusa", 2.25, 0, 4, 4000, [], "Tōshōgū steps; 1–3 Jan crowds"),
  L("tokyo", "kamakura", "JR Yokosuka line (Green Car +¥1,000)", 1.25, 0, 4, 950, [], "Hachiman-gū hatsumōde 1–3 Jan: avoid"),
  L("tokyo", "karuizawa", "Asama / Hakutaka", 1.5, 0, 5, 6400),
  L("tokyo", "kusatsu", "Kusatsu-Shima ltd exp + JR bus", 3.5, 1, 2, 5980, ["BUS"]),
  L("tokyo", "matsumoto", "Azusa from Shinjuku", 3, 0, 4, 7000),
  L("tokyo", "nagano", "Kagayaki / Hakutaka / Asama", 2, 0, 5, 8800, [], "Kagayaki all-reserved; Asama has unreserved cars"),
  L("nagano", "yudanaka", "Nagaden Snow Monkey express / bus", 1.25, 0, 3, 1600, [], "monkey park path 1.6 km snowy walk: bump 1 for her"),
  L("nagano", "nozawa", "Shinkansen to Iiyama + Nozawa Liner bus", 1.25, 1, 3, 2100, ["BUS"], "icy village slopes"),
  L("nagano", "hakuba", "Alpico express bus", 1.5, 0, 3, 2200, ["BUS"]),
  L("matsumoto", "hakuba", "Ōito line local / bus", 2, 1, 2, 1600, [], "infrequent"),
  L("matsumoto", "nagano", "Shinano ltd exp", 1.33, 0, 5, 2900),
  L("matsumoto", "takayama", "Nohi/Alpico bus (reserve)", 3, 0, 2, 3700, ["BUS"], "winter mountain road"),
  L("karuizawa", "nagano", "Shinkansen 25 min", 1, 0, 5, 3500),
  L("karuizawa", "kusatsu", "Kusakaru bus", 2, 0, 2, 2240, ["BUS"]),
  // 6.2 Hida / Hokuriku
  L("tokyo", "takayama", "Nozomi to Nagoya + Hida", 5, 1, 2, 17500, ["LD", "all_reserved"]),
  L("tokyo", "kanazawa", "Kagayaki", 3.25, 0, 5, 15000, ["all_reserved"]),
  L("nagano", "kanazawa", "Kagayaki / Hakutaka", 1.75, 0, 5, 9000),
  L("kanazawa", "shirakawago", "Nohi/Hokutetsu bus (reserve)", 1.75, 0, 3, 2800, ["BUS"]),
  L("shirakawago", "takayama", "Nohi bus (reserve)", 1.25, 0, 3, 2800, ["BUS"]),
  L("takayama", "kanazawa", "Nohi bus direct (reserve)", 2.75, 0, 3, 3600, ["BUS"], "or via Toyama by rail 2h30, bump 4, ¥7,000"),
  L("kanazawa", "kyoto", "Tsurugi/Hakutaka to Tsuruga + Thunderbird", 2.75, 1, 3, 9500, [], "vertical transfer at Tsuruga, elevator"),
  L("kanazawa", "osaka", "Tsurugi to Tsuruga + Thunderbird", 3.17, 1, 3, 10000),
  L("takayama", "kyoto", "Hida to Nagoya + Nozomi", 4.25, 1, 2, 12600, ["LD", "all_reserved"], "borderline LD"),
  L("takayama", "osaka", "Hida 25/36 direct to Osaka", 4.25, 0, 2, 12600, ["LD"], "borderline LD"),
  L("kanazawa", "toyama", "Tsurugi 20 min", 0.75, 0, 5, 1500),
  L("kanazawa", "fukui", "Hokuriku shinkansen 20 min", 0.75, 0, 5, 1500),
  L("tokyo", "fukui", "Kagayaki direct", 3.5, 0, 5, 16000, ["all_reserved"]),
  L("tokyo", "toyama", "Kagayaki", 2.75, 0, 5, 13500, ["all_reserved"]),
  L("toyama", "takayama", "Hida ltd exp north route", 2, 0, 4, 4000),
  // 6.3 Kansai
  L("tokyo", "kyoto", "Nozomi (Hikari 2h40)", 3, 0, 4, 14200, ["all_reserved"], "Nozomi all-reserved 25 Dec–5 Jan, 9–11 Jan; Green 5"),
  L("tokyo", "osaka", "Nozomi", 3.25, 0, 4, 14720, ["all_reserved"]),
  L("kyoto", "osaka", "JR Special Rapid / Thunderbird", 1, 0, 4, 580, [], "3 at rush hour"),
  L("kyoto", "nara", "Kintetsu ltd exp (reserved) / JR Miyakoji", 1.25, 0, 4, 1280),
  L("osaka", "nara", "Kintetsu from Namba", 1.17, 0, 4, 1200),
  L("osaka", "koyasan", "Nankai Kōya + cable car + bus", 2.25, 2, 2, 3010, ["BUS"], "cold, steps at temples"),
  L("kyoto", "koyasan", "via Osaka Namba", 3, 3, 1, 3500),
  L("kyoto", "kinosaki", "Kinosaki ltd exp", 3, 0, 4, 5500, [], "snow delays"),
  L("osaka", "kinosaki", "Kounotori ltd exp", 3.33, 0, 4, 6140),
  L("kinosaki", "himeji", "Hamakaze ltd exp (few/day)", 2.5, 0, 3, 4500),
  L("kyoto", "himeji", "Nozomi/Hikari/Sakura", 1.5, 0, 5, 5500),
  L("osaka", "himeji", "Shinkansen / JR Special Rapid", 1.25, 0, 5, 3500),
  L("kyoto", "kobe", "JR Special Rapid", 1, 0, 4, 1100),
  L("osaka", "kobe", "JR Special Rapid", 0.75, 0, 5, 420),
  L("kobe", "himeji", "JR Special Rapid", 1, 0, 5, 1000),
  // 6.4 San'yō / Setouchi / Shikoku
  L("kyoto", "okayama", "Nozomi / Sakura", 1.67, 0, 5, 7700, ["all_reserved"]),
  L("osaka", "okayama", "Shinkansen 45 min", 1.33, 0, 5, 6500),
  L("okayama", "kurashiki", "JR local 17 min", 0.75, 0, 5, 330),
  L("okayama", "naoshima", "Uno line + ferry Uno–Miyanoura", 1.75, 2, 3, 890, [], "ferry step-free; island buses crowded, bump 2 on island"),
  L("takamatsu", "naoshima", "Ferry 50 min", 1.25, 0, 4, 1200),
  L("okayama", "takamatsu", "Marine Liner 55 min", 1.5, 0, 5, 1660),
  L("okayama", "hiroshima", "Nozomi / Sakura", 1.25, 0, 5, 6500),
  L("okayama", "onomichi", "Shinkansen + local", 1.75, 1, 4, 3500),
  L("onomichi", "hiroshima", "Shinkansen + local", 1.75, 1, 4, 3500),
  L("himeji", "hiroshima", "Shinkansen", 1.67, 0, 5, 8500),
  L("kyoto", "hiroshima", "Nozomi", 2.33, 0, 5, 11500, ["all_reserved"]),
  L("hiroshima", "miyajima", "JR San'yō line + JR ferry", 1.25, 1, 4, 620, [], "island: deer, steps at Daishō-in"),
  L("hiroshima", "matsuyama", "Super Jet ferry from Hiroshima Port", 2.75, 2, 3, 9800, [], "boat; mild seas usually"),
  L("matsuyama", "okayama", "Shiokaze ltd exp", 3.25, 0, 4, 6800),
  L("hiroshima", "fukuoka", "Nozomi / Mizuho / Sakura", 1.75, 0, 5, 9300),
  L("kyoto", "fukuoka", "Nozomi / Mizuho", 3.25, 0, 4, 15500, ["all_reserved"]),
  L("osaka", "fukuoka", "Nozomi / Mizuho", 3.25, 0, 4, 15000, ["all_reserved"]),
  L("tokyo", "hiroshima", "Nozomi 3h50", 4.67, 0, 3, 19500, ["LD", "all_reserved"], "or fly HIJ–HND 1h25 + 50 min to airport, bump 4"),
  L("tokyo", "fukuoka", "Fly HND–FUK (subway 5 min to Hakata)", 4, 0, 4, 25000, ["flight"], "rail 5 h: LD, bump 2"),
  L("tokyo", "matsuyama", "Fly MYJ–HND", 3.5, 0, 4, 25000, ["flight"]),
  // 6.5 Kyūshū
  L("fukuoka", "yufuin", "Yufuin no Mori / Yufu", 2.83, 0, 4, 5700, ["all_reserved"], "Yufuin no Mori all-reserved, steps inside; Yufu flatter; bus 1h45"),
  L("fukuoka", "beppu", "Sonic ltd exp", 2.67, 0, 4, 6500),
  L("yufuin", "beppu", "Yufu / bus", 1.5, 0, 4, 2400),
  L("fukuoka", "kurokawa", "Highway bus (reserve 30 d)", 3.5, 0, 2, 4000, ["BUS"], "no rail"),
  L("kurokawa", "yufuin", "Kyushu Ōdan bus (reserve)", 2, 0, 2, 2400, ["BUS"]),
  L("kurokawa", "beppu", "Kyushu Ōdan bus (reserve)", 3, 0, 2, 3000, ["BUS"]),
  L("kurokawa", "kumamoto", "Bus 1h50", 2.5, 0, 2, 2500, ["BUS"]),
  L("fukuoka", "nagasaki", "Relay Kamome + Kamome", 2.17, 1, 4, 6050, [], "cross-platform transfer"),
  L("fukuoka", "kumamoto", "Sakura / Tsubame", 1.33, 0, 5, 5500),
  L("kumamoto", "kagoshima", "Sakura / Mizuho", 1.5, 0, 5, 7200),
  L("fukuoka", "kagoshima", "Mizuho / Sakura", 2.25, 0, 5, 12150),
  L("nagasaki", "kumamoto", "Kamome + Relay + Sakura", 2.75, 2, 3, 9000),
  L("beppu", "kumamoto", "Kyushu Ōdan bus via Aso", 5, 0, 1, 4000, ["LD", "BUS"]),
  L("kumamoto", "takachiho", "Bus 3h10 (1/day) or car 2 h", 3.5, 0, 2, 2500, ["BUS"], "rent a car realistically"),
  L("kagoshima", "yakushima", "JAC flight 35 min / jetfoil 1h50", 2.5, 0, 3, 15000, ["flight"], "cancels in rough seas"),
  L("tokyo", "kagoshima", "Fly KOJ–HND", 4, 0, 4, 30000, ["flight"], "rail 7 h: never"),
  L("tokyo", "nagasaki", "Fly NGS–HND", 4, 0, 4, 30000, ["flight"], "rail 6 h+: never"),
  L("tokyo", "kumamoto", "Fly KMJ–HND", 4, 0, 4, 30000, ["flight"]),
  // 6.6 Tōhoku
  L("tokyo", "sendai", "Hayabusa", 2.25, 0, 5, 11500, ["all_reserved"]),
  L("sendai", "matsushima", "Senseki line", 1.17, 0, 4, 420),
  L("sendai", "yamagata", "Senzan line / bus", 1.67, 0, 3, 1170),
  L("tokyo", "yamagata", "Tsubasa", 3.33, 0, 4, 12000, ["all_reserved"], "nearly full peaks"),
  L("yamagata", "zao", "Bus 40 min hourly", 1, 0, 3, 1000, ["BUS"], "snow"),
  L("yamagata", "ginzan", "Tsubasa to Ōishida + Hanagasa bus", 1.5, 1, 2, 2000, ["BUS"], "bus overfull in winter; ice"),
  L("tokyo", "ginzan", "Tsubasa to Ōishida + bus", 4.25, 1, 2, 13500, ["LD", "BUS", "all_reserved"]),
  L("tokyo", "aizu", "Tōbu Revaty from Asakusa / Kōriyama + Ban'etsu-West", 3.5, 1, 4, 7000),
  L("nikko", "aizu", "Tōbu Revaty to Aizu-Tajima + Aizu line", 3, 1, 3, 4500, [], "single-car diesel last leg"),
  L("tokyo", "morioka", "Hayabusa", 2.75, 0, 5, 15000, ["all_reserved"]),
  L("sendai", "morioka", "Hayabusa 40 min", 1.2, 0, 5, 7000, ["all_reserved"]),
  L("morioka", "nyuto", "Komachi to Tazawako + bus", 2, 1, 2, 4000, ["BUS"], "snow road"),
  L("tokyo", "nyuto", "Komachi to Tazawako + bus", 4.25, 1, 2, 18000, ["LD", "BUS", "all_reserved"]),
  L("tokyo", "hachinohe", "Hayabusa", 3.25, 0, 5, 17000, ["all_reserved"]),
  L("hachinohe", "towada", "Hotel shuttle 1h30", 1.5, 0, 3, 0, ["BUS"]),
  L("tokyo", "aomori", "Hayabusa to Shin-Aomori", 3.75, 0, 5, 21100, ["all_reserved"]),
  L("tokyo", "yuzawa", "Jōetsu shinkansen", 1.5, 0, 5, 6500),
  L("tokyo", "niigata", "Jōetsu shinkansen", 2.5, 0, 5, 10500),
  L("yuzawa", "niigata", "Shinkansen 50 min", 1.2, 0, 5, 5000),
  L("tokyo", "atami", "Kodama / Hikari", 1.25, 0, 5, 4000),
  L("atami", "hakone", "JR to Odawara + Hakone Tozan", 1, 1, 4, 800),
  L("kawaguchiko", "hakone", "Bus via Gotemba", 2.5, 1, 3, 2500, ["BUS"]),
  // 6.7 never route directly
  NO("koyasan", "kinosaki", "~5 h, 3 transfers; sleep in Osaka/Kyoto between"),
  NO("takayama", "hiroshima", "Takayama ↔ anything south of Nagoya is not one hop"),
  NO("takayama", "fukuoka", "Takayama ↔ Kyushu: break in Kyoto/Osaka"),
  NO("kurokawa", "nagasaki", "5 h+ by bus and rail"),
  NO("sendai", "kyoto", "Tōhoku ↔ Kansai: fly or break in Tokyo"),
  NO("sendai", "osaka", "Tōhoku ↔ Kansai: fly or break in Tokyo"),
  NO("kanazawa", "fukuoka", "break in Kyoto/Osaka"),
];

main();
