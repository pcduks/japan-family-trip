/**
 * Rules check (PRD §7). Pure functions: a version (and optionally its day
 * plan) in, findings out. Runs on every edit.
 */
import routeRules from "../../data/route-rules.json";
import { addDays, dateRange, fmtDay, weekday } from "./dates";
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

/** A move shorter than this is never a crowding problem, whatever the day. */
const PEAK_HOP_HOURS = 1.5;
/** The most door-to-door travel in one day for Fernanda (08-pregnancy rule 3). */
const MAX_MOVE_HOURS = 4;

interface Hospital {
  name: string;
  phone?: string;
  perinatal: boolean;
  minutes: number;
  checked?: boolean;
  note?: string;
}
const RR = routeRules as unknown as {
  peak_flows: { outbound: { from: string; to: string; worst: string[] }; return: { from: string; to: string; worst: string[] }; calm: string[] };
  city_sides: Record<"tokyo" | "kansai", string[]>;
  capacity: Record<string, { full_days: number; hub: boolean; day_trips?: string[] }>;
  hospitals: Record<string, Hospital>;
  known_by_planners: string[];
};

/** Which big-city side a place belongs to: the crowds flow out of these sides before New Year and back into them after. */
function sideOf(region: string): "tokyo" | "kansai" | null {
  if (RR.city_sides.tokyo.includes(region)) return "tokyo";
  if (RR.city_sides.kansai.includes(region)) return "kansai";
  return null;
}

/** Is a move on this date going with the New Year crowds: out of a city side before, back into one after? */
export function withTheCrowds(from: string, to: string, date: string): "outbound" | "return" | null {
  const f = RR.peak_flows;
  if (date >= f.outbound.from && date <= f.outbound.to) {
    const s = sideOf(from);
    if (s && sideOf(to) !== s) return "outbound";
  }
  if (date >= f.return.from && date <= f.return.to) {
    const s = sideOf(to);
    if (s && sideOf(from) !== s) return "return";
  }
  return null;
}

export function hospitalFor(region: string): Hospital | null {
  return RR.hospitals[region] ?? null;
}

export function capacityOf(region: string): { full_days: number; hub: boolean; day_trips?: string[] } | null {
  return RR.capacity[region] ?? null;
}

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

  // min_two_nights: a suggestion, not a rule
  stays.forEach((s, i) => {
    if (s.nights < 2 && s.nights > 0)
      out.push({ rule: "min_two_nights", severity: "info", stayIndex: i, message: `${name(regions, s.region)} is one night. That is half a day of packing and checking in; fine for a stopover, worth two nights if there is much to see.` });
    if (s.nights <= 0) out.push({ rule: "min_two_nights", severity: "info", stayIndex: i, message: `${name(regions, s.region)} has no nights.` });
  });

  // no_peak_moves: only a long move with the New Year crowds is a problem. 31 Dec and 1 Jan are calm days to travel.
  for (let i = 1; i < stays.length; i++) {
    const a = stays[i - 1];
    const b = stays[i];
    if (a.region === b.region) continue;
    const date = b.from;
    const flow = withTheCrowds(a.region, b.region, date);
    const leg = legBetween(a.region, b.region, regions);
    const route = `${name(regions, a.region)} → ${name(regions, b.region)}`;
    if (flow && leg.hours >= PEAK_HOP_HOURS) {
      const worst = (flow === "outbound" ? RR.peak_flows.outbound.worst : RR.peak_flows.return.worst).includes(date);
      out.push({ rule: "no_peak_moves", severity: "warn", stayIndex: i, date, message: `${route} (${leg.hours} h) on ${fmtDay(date)} goes with the New Year crowds${flow === "outbound" ? ", out of the big cities" : ", back to the big cities"}${worst ? " on one of the busiest days" : ""}. Book reserved seats at 10:00 the day sales open, a month ahead.` });
    } else if (calendar.peak_travel_days.includes(date) && !RR.peak_flows.calm.includes(date))
      out.push({ rule: "no_peak_moves", severity: "info", stayIndex: i, date, message: `${route} on ${fmtDay(date)} is a busy travel day, but ${leg.hours < PEAK_HOP_HOURS ? `a short hop (${leg.hours} h)` : "this train runs against the main flow"}. Reserve seats at 10:00 the day sales open, a month ahead.` });
  }

  // long_move: no day over about four hours door to door, wherever it falls.
  for (let i = 1; i < stays.length; i++) {
    const a = stays[i - 1];
    const b = stays[i];
    if (a.region === b.region) continue;
    const leg = legBetween(a.region, b.region, regions);
    if (leg.hours > MAX_MOVE_HOURS)
      out.push({ rule: "long_move", severity: "warn", stayIndex: i, date: b.from, message: `${name(regions, a.region)} → ${name(regions, b.region)} is about ${leg.hours} h${leg.curated ? "" : " (an estimate)"}, more than the four hours a day Fernanda may prefer. Green Car seats and nothing planned after arriving.` });
  }

  // move_density: moves on consecutive days, or more than four in a week, wear her out.
  const moveDates = stays.slice(1).filter((s, k) => s.region !== stays[k].region).map((s) => s.from);
  for (let k = 1; k < moveDates.length; k++)
    if (addDays(moveDates[k - 1], 1) === moveDates[k]) out.push({ rule: "move_density", severity: "warn", date: moveDates[k], message: `Moves on ${fmtDay(moveDates[k - 1])} and ${fmtDay(moveDates[k])}, two days running. Two nights between moves is kinder for Fernanda.` });
  for (let k = 0; k + 4 < moveDates.length; k++)
    if (moveDates[k + 4] <= addDays(moveDates[k], 6)) out.push({ rule: "move_density", severity: "warn", date: moveDates[k], message: `Five moves between ${fmtDay(moveDates[k])} and ${fmtDay(moveDates[k + 4])}: a lot of packing in one week.` });

  // capacity: no more nights than a place can fill.
  stays.forEach((s, i) => {
    const c = RR.capacity[s.region];
    if (!c) return;
    const cap = c.hub ? c.full_days + (c.day_trips?.length ?? 0) + 1 : Math.floor(c.full_days + 1);
    if (s.nights > cap) {
      const days = c.full_days === 1 ? "one full day" : `about ${c.full_days} full days`;
      out.push({ rule: "capacity", severity: "warn", stayIndex: i, message: c.hub ? `${name(regions, s.region)} has ${s.nights} nights: ${days} in the city and ${c.day_trips?.length ?? 0} easy day trips. Every day needs a plan.` : `${name(regions, s.region)} has ${s.nights} nights, but ${days} to fill in our dates. More than ${cap} leaves empty days; a quiet day sits better in a big city.` });
    }
  });

  // tokyo_ending: one or two nights near Haneda, not four.
  if (stays.length) {
    const last = stays[stays.length - 1];
    const first = stays[0];
    const toAirport = legBetween(last.region, "tokyo", regions).hours;
    if (last.region !== "tokyo" && toAirport > 1.5) out.push({ rule: "tokyo_ending", severity: "error", stayIndex: stays.length - 1, message: `The last night is in ${name(regions, last.region)}, about ${toAirport} h from Tokyo, before a Saturday flight at the start of a long weekend.` });
    if (last.region === "tokyo" && stays.length > 1 && last.nights > 2 && !(first.region === "tokyo" && first.nights < 4))
      out.push({ rule: "tokyo_ending", severity: "warn", stayIndex: stays.length - 1, message: `${last.nights} nights in Tokyo at the end. Two cover the museums that were closed and the flight; more is worth it only if the first Tokyo stay was short.` });
  }

  // hospital: every night near obstetric care; 29 Dec – 3 Jan near a perinatal centre. Missing data is "not checked", never a pass.
  stays.forEach((s, i) => {
    const h = RR.hospitals[s.region];
    const newYear = s.from <= "2027-01-03" && s.to > "2026-12-29";
    if (!h || h.checked === false) {
      out.push({ rule: "hospital", severity: newYear ? "warn" : "info", stayIndex: i, message: `${name(regions, s.region)}: the nearest hospital with obstetrics ${h ? `(${h.name}) is not confirmed for night emergencies` : "is not checked yet"}. Find it before booking.` });
      return;
    }
    if (h.minutes > 30) out.push({ rule: "hospital", severity: "warn", stayIndex: i, message: `${name(regions, s.region)}: the nearest obstetric emergency, ${h.name}, is about ${h.minutes} minutes away.` });
    else if (newYear && !h.perinatal) out.push({ rule: "hospital", severity: "info", stayIndex: i, message: `${name(regions, s.region)} over New Year: ${h.name} has obstetrics, but is not a perinatal centre.` });
  });

  // known_places: long stays where Pedro and Fernanda have been should be for the first-timers.
  {
    const known = stays.filter((s) => RR.known_by_planners.includes(s.region)).reduce((n, s) => n + s.nights, 0);
    const total = stays.reduce((n, s) => n + s.nights, 0);
    if (total && known > total / 2) out.push({ rule: "known_places", severity: "info", message: `${known} of ${total} nights are in places Pedro and Fernanda already know. Worth it if the time is for the five first-timers.` });
  }

  // new_years_eve_dinner
  const nye = stays.find((s) => s.from <= "2026-12-31" && s.to > "2026-12-31");
  if (nye && nye.lodging !== "ryokan") {
    const idx = stays.indexOf(nye);
    out.push({ rule: "new_years_eve_dinner", severity: "info", stayIndex: idx, date: "2026-12-31", message: `New Year's Eve in ${name(regions, nye.region)}: most restaurants close that night, so arrange dinner ahead (a ryokan, a booked restaurant or cooking in).` });
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
    if (mains > level.main_per_day) out.push({ rule: "pace_overload", severity: "info", date, message: `${fmtDay(date)} has ${mains} half-day visits; at a ${pace} pace ${level.main_per_day === 1 ? "one is usually enough" : `${level.main_per_day} is plenty`}. Split the group or drop one if it feels like a lot.` });
    if (!hasRest && level.rest_window && list.length) out.push({ rule: "pace_overload", severity: "info", date, message: `${fmtDay(date)} has no free afternoon. A break after lunch helps her; a suggestion, not a rule.` });
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
