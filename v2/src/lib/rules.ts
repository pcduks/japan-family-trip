/**
 * Rules check (PRD §7). Pure functions: a version (and optionally its day
 * plan) in, findings out. Runs on every edit.
 */
import { dateRange, fmtDay, weekday } from "./dates";
import { legBetween } from "./legs";
import type { Calendar, Effort, Pace, PaceModel, Place, Region, Severity, Stay, TripData, Version } from "./types";

export interface Finding {
  rule: string;
  severity: Severity;
  message: string;
  /** Index into version.stays when the finding is about one stay. */
  stayIndex?: number;
  date?: string;
  placeId?: string;
  source?: string | null;
}

export interface RulesContext {
  trip: TripData["trip"];
  calendar: Calendar;
  pace: PaceModel;
  regions: Region[];
  places: Place[];
}

export interface DayItemLike {
  date: string;
  place_id: string;
  slot: "early" | "morning" | "afternoon" | "evening" | "rest";
  crew: "everyone" | "early" | "easy";
}

const PEAK_HOP_HOURS = 1;

function name(regions: Region[], id: string): string {
  return regions.find((r) => r.id === id)?.name ?? id;
}

export function checkStays(stays: Stay[], pace: Pace, ctx: RulesContext): Finding[] {
  const out: Finding[] = [];
  const { trip, calendar, regions } = ctx;

  // twenty_nights: coverage without gaps or overlaps.
  if (!stays.length) out.push({ rule: "twenty_nights", severity: "error", message: `No stays yet. The trip runs ${fmtDay(trip.start)} to ${fmtDay(trip.end)}.` });
  else {
    if (stays[0].from !== trip.start) out.push({ rule: "twenty_nights", severity: "error", stayIndex: 0, message: `The first stay starts ${fmtDay(stays[0].from)}, but the trip starts ${fmtDay(trip.start)}.` });
    for (let i = 1; i < stays.length; i++) {
      if (stays[i].from !== stays[i - 1].to) {
        const gap = stays[i].from > stays[i - 1].to ? "a gap" : "an overlap";
        out.push({ rule: "twenty_nights", severity: "error", stayIndex: i, message: `There is ${gap} between ${name(regions, stays[i - 1].region)} and ${name(regions, stays[i].region)} (${fmtDay(stays[i - 1].to)} vs ${fmtDay(stays[i].from)}).` });
      }
    }
    const last = stays[stays.length - 1];
    const total = stays.reduce((a, s) => a + s.nights, 0);
    if (last.to !== trip.end || total !== trip.nights) {
      const diff = total - trip.nights;
      out.push({
        rule: "twenty_nights",
        severity: "error",
        stayIndex: stays.length - 1,
        message:
          diff === 0
            ? `The stays end ${fmtDay(last.to)}, but the flight home is ${fmtDay(trip.end)}.`
            : `${total} nights planned; the trip has ${trip.nights}. ${diff > 0 ? `Take ${diff} night${diff === 1 ? "" : "s"} out` : `Add ${-diff} night${diff === -1 ? "" : "s"}`}.`,
      });
    }
  }

  // min_two_nights
  stays.forEach((s, i) => {
    if (s.nights < 2 && s.nights > 0)
      out.push({ rule: "min_two_nights", severity: "warn", stayIndex: i, message: `${name(regions, s.region)} is only ${s.nights} night: a one-night stop costs half a day packing and checking in.` });
    if (s.nights <= 0) out.push({ rule: "min_two_nights", severity: "warn", stayIndex: i, message: `${name(regions, s.region)} has no nights.` });
  });

  // no_peak_moves
  for (let i = 1; i < stays.length; i++) {
    const a = stays[i - 1];
    const b = stays[i];
    if (a.region === b.region) continue;
    const date = b.from;
    if (!calendar.peak_travel_days.includes(date)) continue;
    const leg = legBetween(a.region, b.region, regions);
    if (leg.hours < PEAK_HOP_HOURS)
      out.push({ rule: "no_peak_moves", severity: "info", stayIndex: i, date, message: `${name(regions, a.region)} → ${name(regions, b.region)} on ${fmtDay(date)} is a peak travel day, but it is a short local hop (${leg.hours} h), which is fine.` });
    else
      out.push({ rule: "no_peak_moves", severity: "warn", stayIndex: i, date, message: `${name(regions, a.region)} → ${name(regions, b.region)} (${leg.hours} h) falls on ${fmtDay(date)}, a peak travel day: trains and roads are at their fullest for New Year.` });
  }

  // new_years_eve_dinner
  const nye = stays.find((s) => s.from <= "2026-12-31" && s.to > "2026-12-31");
  if (nye && nye.lodging !== "ryokan") {
    const idx = stays.indexOf(nye);
    out.push({ rule: "new_years_eve_dinner", severity: "info", stayIndex: idx, date: "2026-12-31", message: `31 Dec is in ${name(regions, nye.region)} at ${nye.lodging ?? "an unset lodging"}, not a ryokan with dinner included. Most restaurants close that night.` });
  } else if (!nye && stays.length) {
    out.push({ rule: "new_years_eve_dinner", severity: "info", date: "2026-12-31", message: "No stay covers 31 Dec." });
  }

  // closures at stay level: a stay entirely inside the New Year window in a region whose places mostly close.
  stays.forEach((s, i) => {
    const days = dateRange(s.from, s.to);
    const inRegion = ctx.places.filter((p) => p.region === s.region && p.size !== "meal");
    if (!inRegion.length || !days.length) return;
    const closedAllStay = inRegion.filter((p) => days.every((d) => isClosedOn(p, d)));
    if (closedAllStay.length && closedAllStay.length >= Math.ceil(inRegion.length / 2))
      out.push({
        rule: "closure_check",
        severity: "warn",
        stayIndex: i,
        message: `${closedAllStay.length} of ${inRegion.length} places in ${name(regions, s.region)} are closed for the whole stay (${closedAllStay
          .slice(0, 3)
          .map((p) => p.name)
          .join(", ")}${closedAllStay.length > 3 ? "…" : ""}).`,
        source: closedAllStay[0].closures[0]?.source ?? null,
      });
  });

  void pace;
  return out;
}

export function isClosedOn(place: Place, date: string): { note: string | null; source: string | null } | null {
  for (const c of place.closures) if (date >= c.start && date <= c.end) return { note: c.note, source: c.source };
  if (place.closed_weekdays.includes(weekday(date))) return { note: `Closed on ${weekday(date)}s`, source: place.links?.source ?? null };
  return null;
}

/** Day-plan checks (closures, pregnancy flags, pace overload). */
export function checkDays(items: DayItemLike[], pace: Pace, ctx: RulesContext): Finding[] {
  const out: Finding[] = [];
  const level = ctx.pace.levels[pace];
  const byDate = new Map<string, DayItemLike[]>();
  for (const it of items) byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]);
  for (const [date, list] of byDate) {
    let mains = 0;
    let hasRest = false;
    for (const it of list) {
      const p = ctx.places.find((x) => x.id === it.place_id);
      if (it.slot === "rest") hasRest = true;
      if (!p) continue;
      const closed = isClosedOn(p, date);
      if (closed) out.push({ rule: "closure_check", severity: "warn", date, placeId: p.id, source: closed.source, message: `${p.name} is closed on ${fmtDay(date)}${closed.note ? ` (${closed.note})` : ""}.` });
      if (p.effort_for_her === ("high" as Effort) || p.status === "avoid_for_her")
        out.push({ rule: "pregnancy_flags", severity: "info", date, placeId: p.id, source: p.links?.source ?? null, message: `${p.name} on ${fmtDay(date)} is ${p.status === "avoid_for_her" ? "marked avoid for her" : "high effort for her"}${p.effort_note ? `: ${p.effort_note}` : ""}.` });
      if (p.size === "main" || p.size === "day_trip") mains += p.size === "day_trip" ? level.main_per_day : 1;
    }
    if (mains > level.main_per_day) out.push({ rule: "pace_overload", severity: "warn", date, message: `${fmtDay(date)} has ${mains} main outings; ${pace} allows ${level.main_per_day}.` });
    if (!hasRest && level.rest_window && list.length) out.push({ rule: "pace_overload", severity: "warn", date, message: `${fmtDay(date)} has no rest window (${level.rest_window} at ${pace}).` });
  }
  return out;
}

export function checkVersion(v: Version, ctx: RulesContext, items: DayItemLike[] = []): Finding[] {
  return [...checkStays(v.stays, v.pace, ctx), ...checkDays(items, v.pace, ctx)];
}

export function worst(findings: Finding[]): Severity | null {
  if (findings.some((f) => f.severity === "error")) return "error";
  if (findings.some((f) => f.severity === "warn")) return "warn";
  if (findings.length) return "info";
  return null;
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  return findings.reduce((acc, f) => ({ ...acc, [f.severity]: acc[f.severity] + 1 }), { error: 0, warn: 0, info: 0 });
}
