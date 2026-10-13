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
    fuji: v.stays.some((s) => s.region === "hakone" || s.region === "kawaguchiko"),
    bases: new Set(v.stays.map((s) => s.region)).size,
  };
}

export function regionName(id: string, regions: Region[]): string {
  return regions.find((r) => r.id === id)?.name ?? id;
}

/** Plain-language lines describing how `after` differs from `before`. */
export function describeDiff(before: Stay[], after: Stay[], regions: Region[]): string[] {
  const lines: string[] = [];
  const sum = (stays: Stay[]) => {
    const m = new Map<string, number>();
    stays.forEach((s) => m.set(s.region, (m.get(s.region) ?? 0) + s.nights));
    return m;
  };
  const a = sum(before);
  const b = sum(after);
  for (const [region, n] of b) {
    const was = a.get(region);
    if (was == null) {
      const st = after.filter((s) => s.region === region);
      lines.push(`add ${regionName(region, regions)} ${st.map((s) => `${fmtDay(s.from, false)}–${fmtDay(s.to, false)}`).join(", ")} (${n} night${n === 1 ? "" : "s"})`);
    } else if (was !== n) lines.push(`${regionName(region, regions)} ${was} → ${n} nights`);
  }
  for (const [region] of a) if (!b.has(region)) lines.push(`drop ${regionName(region, regions)}`);
  const orderA = before.map((s) => s.region).join(">");
  const orderB = after.map((s) => s.region).join(">");
  if (!lines.length && orderA !== orderB) lines.push("same places, different order");
  if (!lines.length) {
    const changed = after.some((s, i) => before[i]?.lodging !== s.lodging || before[i]?.note !== s.note);
    if (changed) lines.push("lodging or notes changed");
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
 * candidate, copy that; else if the fit text says it replaces Hakone, swap it
 * in for the Hakone stay; else add it as a two-night stay before the final
 * Tokyo nights, taking the nights from the longest stay.
 */
export function swapInRegion(plan: Version, region: Region, versions: Version[], ownerId: string, tripStart: string): { version: Version; how: string } {
  const existing = versions.find((v) => v.status !== "personal" && v.stays.some((s) => s.region === region.id));
  if (existing) {
    const v = copyVersion(existing, ownerId, `${existing.name} (my copy)`, tripStart);
    return { version: v, how: `Copied “${existing.name}”, which already includes ${region.name}.` };
  }
  const v = copyVersion(plan, ownerId, `${region.name} instead`, tripStart);
  const hakone = v.stays.findIndex((s) => s.region === "hakone");
  if (hakone >= 0 && /hakone/i.test(region.fit ?? "")) {
    v.stays[hakone] = { ...v.stays[hakone], region: region.id, lodging: null, note: `Swapped in for Hakone` };
    v.name = `${region.name} instead of Hakone`;
    v.stays = relayout(v.stays, tripStart);
    return { version: v, how: `Replaced the Hakone stay with ${region.name}, same dates.` };
  }
  const longest = v.stays.reduce((best, s, i) => (s.nights > v.stays[best].nights ? i : best), 0);
  v.stays[longest] = { ...v.stays[longest], nights: v.stays[longest].nights - 2 };
  const insertAt = Math.max(1, v.stays.length - 1);
  v.stays.splice(insertAt, 0, { region: region.id, from: "", to: "", nights: 2, lodging: null, note: "Added from What we're missing" });
  v.stays = relayout(v.stays, tripStart);
  return { version: v, how: `Added 2 nights in ${region.name} before the last stay, taken from ${regionName(plan.stays[longest].region, [region])}.` };
}

export function paceLabel(p: Pace): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export function nightsBetween(from: string, to: string): number {
  return daysBetween(from, to);
}
