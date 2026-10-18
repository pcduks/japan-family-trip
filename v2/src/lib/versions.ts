/** Pure helpers on versions and stays: dates, stats, diffs, swaps. */
import { addDays, daysBetween, fmtDay } from "./dates";
import { legBetween } from "./legs";
import type { Pace, Region, Stay, TripData, Version } from "./types";

/** Re-derive from/to from the trip start and each stay's nights (stays are contiguous). */
export function relayout(stays: Stay[], tripStart: string): Stay[] {
  let cursor = tripStart;
  return stays.map((s) => {
    const nights = Math.max(0, Math.round(s.nights));
    const from = cursor;
    const to = addDays(cursor, nights);
    cursor = to;
    return { ...s, from, to, nights };
  });
}

export function totalNights(stays: Stay[]): number {
  return stays.reduce((a, s) => a + s.nights, 0);
}

export interface Move {
  index: number;
  from: string;
  to: string;
  date: string;
  hours: number;
  how: string;
  curated: boolean;
}

/** One move per boundary between different regions. */
export function movesOf(stays: Stay[], regions: Region[]): Move[] {
  const out: Move[] = [];
  for (let i = 1; i < stays.length; i++) {
    const a = stays[i - 1];
    const b = stays[i];
    if (a.region === b.region) continue;
    const leg = legBetween(a.region, b.region, regions);
    out.push({ index: i, from: a.region, to: b.region, date: b.from, ...leg });
  }
  return out;
}

export interface VersionStats {
  nights: number;
  moves: number;
  travelHours: number;
  travelEstimated: boolean;
  shortestStay: number;
  /** Full days with no move at Gentle/Balanced, roughly one every 4.5 days of a stay of 4+ nights. */
  restDays: number;
  newYearsEve: { region: string; lodging: string | null } | null;
  fuji: boolean;
  bases: number;
}

/** The two Fuji bases: the lake in the plan, Hakone in the alternatives that use it. */
const FUJI_STOPS: Record<string, string> = { kawaguchiko: "Kawaguchiko", hakone: "Hakone" };

export function statsOf(v: Version, data: Pick<TripData, "regions" | "pace">): VersionStats {
  const moves = movesOf(v.stays, data.regions);
  const travelHours = moves.reduce((a, m) => a + m.hours, 0);
  const nye = v.stays.find((s) => s.from <= "2026-12-31" && s.to > "2026-12-31") ?? null;
  const level = data.pace.levels[v.pace];
  const restDays = level.rest_day_every ? v.stays.reduce((a, s) => a + Math.floor(Math.max(0, s.nights - 1) / level.rest_day_every!), 0) : 0;
  return {
    nights: totalNights(v.stays),
    moves: moves.length,
    travelHours: Math.round(travelHours * 4) / 4,
    travelEstimated: moves.some((m) => !m.curated),
    shortestStay: v.stays.length ? Math.min(...v.stays.map((s) => s.nights)) : 0,
    restDays,
    newYearsEve: nye ? { region: nye.region, lodging: nye.lodging } : null,
    fuji: v.stays.some((s) => s.region in FUJI_STOPS),
    bases: new Set(v.stays.map((s) => s.region)).size,
  };
}

export function regionName(id: string, regions: Region[]): string {
  return regions.find((r) => r.id === id)?.name ?? id;
}

/** Plain-language lines describing how `after` differs from `before`, stop by stop ("Tokyo at the end" apart from Tokyo). */
export function describeDiff(before: Stay[], after: Stay[], regions: Region[]): string[] {
  const lines: string[] = [];
  const keyed = (stays: Stay[]) => {
    const seen = new Map<string, number>();
    const m = new Map<string, Stay>();
    for (const s of stays) {
      const n = (seen.get(s.region) ?? 0) + 1;
      seen.set(s.region, n);
      m.set(n > 1 ? `${s.region}:${n}` : s.region, s);
    }
    return m;
  };
  const nights = (n: number) => `${n} ${n === 1 ? "night" : "nights"}`;
  const name = (k: string) => `${regionName(k.split(":")[0], regions)}${k.includes(":") ? " at the end" : ""}`;
  const a = keyed(before);
  const b = keyed(after);
  for (const [k, s] of b) {
    const was = a.get(k);
    if (!was) lines.push(`Add ${name(k)}, ${fmtDay(s.from, false)}–${fmtDay(s.to, false)} (${nights(s.nights)})`);
    else if (was.nights !== s.nights) lines.push(`${name(k)} ${was.nights} → ${nights(s.nights)}`);
  }
  for (const [k] of a) if (!b.has(k)) lines.push(`Drop ${name(k)}`);
  const orderA = before.map((s) => s.region).join(">");
  const orderB = after.map((s) => s.region).join(">");
  if (!lines.length && orderA !== orderB) lines.push("Same places, different order");
  if (!lines.length) {
    const changed = after.some((s, i) => before[i]?.lodging !== s.lodging || before[i]?.note !== s.note);
    if (changed) lines.push("Where we stay changed");
  }
  return lines;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A copy of `source` owned by `ownerId`, dated from the trip start. */
export function copyVersion(source: Version, ownerId: string, name: string, tripStart: string): Version {
  return {
    id: newId(),
    name,
    pace: source.pace,
    status: "personal",
    owner: ownerId,
    stays: relayout(
      source.stays.map((s) => ({ region: s.region, from: s.from, to: s.to, nights: s.nights, lodging: s.lodging, note: s.note })),
      tripStart,
    ),
    gains: null,
    gives_up: null,
    parent_version_id: source.id,
    shared: true,
    created_at: new Date().toISOString(),
  };
}

/**
 * A7: "make a version with this swap". If a seeded version already shows the
 * candidate, copy that; else if the fit text says it replaces the Fuji stop
 * (Kawaguchiko, or Hakone in versions that use it), swap it in for that stay;
 * else add it as a two-night stay before the final
 * Tokyo nights, taking the nights from the longest stay.
 */
export function swapInRegion(plan: Version, region: Region, versions: Version[], ownerId: string, tripStart: string, allRegions: Region[] = [region]): { version: Version; how: string } {
  const existing = versions.find((v) => (v.status === "plan" || v.status === "alternative") && v.stays.some((s) => s.region === region.id));
  if (existing) {
    const v = copyVersion(existing, ownerId, `${existing.name} (my copy)`, tripStart);
    return { version: v, how: `Copied “${existing.name}”, which already includes ${region.name}.` };
  }
  const v = copyVersion(plan, ownerId, `${region.name} instead`, tripStart);
  const fuji = v.stays.findIndex((s) => s.region in FUJI_STOPS);
  const fujiName = fuji >= 0 ? FUJI_STOPS[v.stays[fuji].region] : "";
  if (fuji >= 0 && new RegExp(`\\b(${Object.values(FUJI_STOPS).join("|")})\\b`, "i").test(region.fit ?? "")) {
    v.stays[fuji] = { ...v.stays[fuji], region: region.id, lodging: null, note: `Swapped in for ${fujiName}` };
    v.name = `${region.name} instead of ${fujiName}`;
    v.stays = relayout(v.stays, tripStart);
    return { version: v, how: `Replaced the ${fujiName} stay with ${region.name}, same dates.` };
  }
  // Put it where it adds the least travel, between two stops.
  const regions = allRegions.some((r) => r.id === region.id) ? allRegions : [...allRegions, region];
  const leg = (x: string, y: string) => legBetween(x, y, regions).hours;
  let insertAt = Math.max(1, v.stays.length - 1);
  let detour = Infinity;
  for (let p = 1; p < v.stays.length; p++) {
    const d = leg(v.stays[p - 1].region, region.id) + leg(region.id, v.stays[p].region) - leg(v.stays[p - 1].region, v.stays[p].region);
    if (d < detour) [insertAt, detour] = [p, d];
  }
  // Two nights from the longest stay that can spare them and still keeps New Year's Eve where it is.
  const nye = (stays: Stay[]) => stays.find((s) => s.from <= "2026-12-31" && s.to > "2026-12-31")?.region;
  const donors = v.stays.map((s, i) => i).filter((i) => v.stays[i].nights > 2).sort((x, y) => v.stays[y].nights - v.stays[x].nights);
  const attempt = (donor: number) => {
    const stays = v.stays.map((s, i) => (i === donor ? { ...s, nights: s.nights - 2 } : s));
    stays.splice(insertAt, 0, { region: region.id, from: "", to: "", nights: 2, lodging: null, note: "Added on the Japan page" });
    return relayout(stays, tripStart);
  };
  const donor = donors.find((i) => nye(attempt(i)) === nye(v.stays)) ?? donors[0] ?? 0;
  v.stays = attempt(donor);
  v.name = `With ${region.name}`;
  const before = v.stays[insertAt - 1] ? regionName(v.stays[insertAt - 1].region, regions) : null;
  return { version: v, how: `Added 2 nights in ${region.name}${before ? ` after ${before}` : ""}, taken from ${regionName(plan.stays[donor].region, regions)}.` };
}

export function paceLabel(p: Pace): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export function nightsBetween(from: string, to: string): number {
  return daysBetween(from, to);
}

/** Nights two routes spend in the same place on the same date. */
export function sharedNights(a: Pick<Version, "stays">, b: Pick<Version, "stays">): number {
  let n = 0;
  for (const s of a.stays) for (const t of b.stays) if (s.region === t.region) n += Math.max(0, daysBetween(s.from > t.from ? s.from : t.from, s.to < t.to ? s.to : t.to));
  return n;
}

/**
 * Two routes in one: follow `a` for the nights before `switchDate` and `b`
 * from that night on. Neighbouring nights in the same place merge into one
 * stay (the first one's lodging and note win).
 */
export function combineRoutes(a: Pick<Version, "stays">, b: Pick<Version, "stays">, switchDate: string, tripStart: string, nights: number): Stay[] {
  const at = (v: Pick<Version, "stays">, d: string) => v.stays.find((s) => s.from <= d && s.to > d) ?? v.stays[v.stays.length - 1];
  const out: Stay[] = [];
  for (let k = 0; k < nights; k++) {
    const d = addDays(tripStart, k);
    const src = at(d < switchDate ? a : b, d);
    if (!src) continue;
    const last = out[out.length - 1];
    if (last && last.region === src.region) last.nights += 1;
    else out.push({ id: newId(), region: src.region, from: "", to: "", nights: 1, lodging: src.lodging, note: src.note });
  }
  return relayout(out, tripStart);
}

/**
 * Keep the trip at `target` nights after stay `changed` grew or shrank (or
 * appeared): take nights from the longest other stays (never below two), or
 * give spare nights to the stay before it. Returns the stays and a line
 * saying where the nights went, for a toast.
 */
export function rebalance(stays: Stay[], changed: number, target: number, regions: Region[]): { stays: Stay[]; note: string | null } {
  const list = stays.map((s) => ({ ...s }));
  const name = (id: string) => regionName(id, regions).replace(/ Onsen$/, "");
  let diff = list.reduce((a, s) => a + s.nights, 0) - target;
  const touched = new Map<number, number>();
  let guard = 60;
  while (diff > 0 && guard-- > 0) {
    // Take from later stops first, so the dates before this one (and New Year) stay where they are.
    const others = list.map((s, i) => ({ s, i })).filter(({ s, i }) => i !== changed && s.nights > 2);
    if (!others.length) break;
    const later = others.filter(({ i }) => i > changed);
    const pool = later.length ? later : others;
    const longest = pool.reduce((x, y) => (y.s.nights > x.s.nights || (y.s.nights === x.s.nights && Math.abs(y.i - changed) < Math.abs(x.i - changed)) ? y : x));
    longest.s.nights -= 1;
    touched.set(longest.i, (touched.get(longest.i) ?? 0) - 1);
    diff -= 1;
  }
  if (diff < 0) {
    // A spare night goes to the next stop (or the one before, at the end), so earlier dates stay put.
    const to = changed + 1 < list.length ? changed + 1 : Math.max(0, changed - 1);
    if (to !== changed && list[to]) {
      list[to].nights += -diff;
      touched.set(to, (touched.get(to) ?? 0) - diff);
      diff = 0;
    }
  }
  const parts = Array.from(touched.entries()).map(([i, d]) => `${d > 0 ? "gave" : "took"} ${Math.abs(d)} ${Math.abs(d) === 1 ? "night" : "nights"} ${d > 0 ? "to" : "from"} ${name(list[i].region)}`);
  return { stays: list, note: parts.length ? `${parts.join(", ")} to keep ${target} nights.` : diff ? `Now ${target + diff} nights; take some off somewhere.` : null };
}
