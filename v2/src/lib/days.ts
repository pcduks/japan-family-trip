/**
 * What each day of a route holds, for any route the family makes.
 *
 * Days come from the place, not the date: data/day-plans.json lists, per
 * place, the day plans a first visit would do, in order, with what each
 * needs (open museums, not a Monday…). A route's days are assembled stop by
 * stop: the move and an easy afternoon on arrival, then the best plans that
 * work on those dates, the place's own New Year's Eve and New Year's Day,
 * and the morning before the flight.
 *
 * A stop that is exactly as some written route has it (same place, same
 * dates, arriving from the same place) keeps that route's own days: the
 * plan's day-by-day, or the day plan made from a researched route's line for
 * that date. Change the stop and the plans take over.
 */
import dayPlans from "../../data/day-plans.json";
import { dateRange, weekday } from "./dates";
import { legBetween } from "./legs";
import type { Crew, Day, DayItem, DaySlot, Place, Snapshot, Stay, Version } from "./types";

export interface PlanItem {
  place_id: string | null;
  slot: DaySlot;
  crew: string;
  note?: string | null;
}

export interface DayPlan {
  id?: string;
  title: string;
  kind?: "explore" | "daytrip" | "easy";
  items?: PlanItem[];
  new_year?: "ok" | "closed" | "only";
  closed_weekdays?: string[];
  dates_not?: string[];
  /** Only on these days ("01-01"), for plans like a New Year's Day arrival. */
  dates_only?: string[];
  for_her?: string | null;
  from?: string[];
}

interface PlacePlans {
  arrival?: DayPlan[];
  last_morning?: string;
  days?: DayPlan[];
  special?: Record<string, DayPlan>;
}

const PLANS = (dayPlans as unknown as { regions: Record<string, PlacePlans> }).regions;

export function placePlans(region: string): PlacePlans | null {
  return PLANS[region] ?? null;
}

export interface PlannedDay {
  date: string;
  stayIndex: number;
  region: string;
  /** Arrive, Explore, Move, Easy, Day trip or Fly. */
  kind: string;
  title: string;
  items: DayItem[];
  forHer: string | null;
  /** Where the day came from: a route's own written day, the place's day plans, or nothing written yet. */
  source: "written" | "plans" | "plain";
}

type Snap = Pick<Snapshot, "versions" | "regions" | "places" | "days" | "calendar">;

const CREW: Record<string, Crew> = { everyone: "everyone", early: "early", rest: "easy", easy: "easy" };
const toItems = (items: PlanItem[] | undefined): DayItem[] => (items ?? []).map((it, i) => ({ place_id: it.place_id, slot: it.slot, crew: CREW[it.crew] ?? "everyone", note: it.note ?? null, sort: i }));

/** Does a written route have this stop exactly: same place, same dates, arriving from the same place? */
function sameStop(a: Stay[], i: number, b: Stay[]): number {
  const s = a[i];
  return b.findIndex((x, k) => x.region === s.region && x.from === s.from && x.to === s.to && (k === 0) === (i === 0) && (k === 0 || b[k - 1].region === a[i - 1].region));
}

export function planDays(v: Pick<Version, "id" | "stays" | "parent_version_id">, snap: Snap): PlannedDay[] {
  const stays = v.stays;
  if (!stays.length) return [];
  const last = stays[stays.length - 1];
  const places = new Map(snap.places.map((p) => [p.id, p]));
  const nyStart = snap.calendar.new_year_closures.start;
  const nyEnd = snap.calendar.new_year_closures.end;
  const inNewYear = (d: string) => d >= nyStart && d <= nyEnd;
  const peak = new Set(snap.calendar.peak_travel_days);
  const plan = snap.versions.find((x) => x.status === "plan");
  // Written routes to borrow days from, nearest first: this route, where it started, the plan, then the rest.
  const refs = [snap.versions.find((x) => x.id === v.id), snap.versions.find((x) => x.id === v.parent_version_id), plan, ...snap.versions.filter((x) => x.status === "alternative")].filter(
    (x, k, all): x is Version => !!x && x.status !== "personal" && all.findIndex((y) => y?.id === x.id) === k,
  );
  const used = new Set<DayPlan>();
  const out: PlannedDay[] = [];

  const placeOpen = (p: Place | undefined, date: string) =>
    !p || (!p.closed_weekdays?.includes(weekday(date)) && !p.closures?.some((c) => date >= c.start && date <= c.end));
  const works = (dp: DayPlan, date: string) => {
    if (dp.new_year === "closed" && inNewYear(date)) return false;
    if (dp.new_year === "only" && !inNewYear(date)) return false;
    if (dp.closed_weekdays?.includes(weekday(date))) return false;
    if (dp.dates_not?.includes(date.slice(5))) return false;
    if (dp.dates_only && !dp.dates_only.includes(date.slice(5))) return false;
    // A plan built around one place is off when that place is shut; a side visit can be dropped instead.
    const main = dp.items?.find((it) => it.place_id);
    return main ? placeOpen(places.get(main.place_id!), date) : true;
  };
  const openItems = (dp: DayPlan, date: string) => toItems(dp.items).filter((it) => placeOpen(places.get(it.place_id ?? ""), date));

  stays.forEach((s, i) => {
    const pp = PLANS[s.region] ?? {};
    const name = snap.regions.find((r) => r.id === s.region)?.name.replace(/ Onsen$/, "") ?? s.region;
    const leg = i > 0 ? legBetween(stays[i - 1].region, s.region, snap.regions) : null;
    const moving = i > 0 && stays[i - 1].region !== s.region;
    const dates = dateRange(s.from, s.to);
    if (s === last) dates.push(last.to);

    // Days written for exactly this stop.
    const written = new Map<string, Omit<PlannedDay, "date" | "stayIndex" | "region">>();
    for (const ref of refs) {
      const k = sameStop(stays, i, ref.stays);
      if (k < 0) continue;
      for (const date of dates) {
        if (written.has(date)) continue;
        const db = snap.days.find((d) => d.version_id === ref.id && d.date === date);
        if (db) {
          written.set(date, fromDb(db));
          continue;
        }
        const dp = allPlans(pp).find((x) => x.from?.includes(`${ref.id}:${date}`));
        if (dp) {
          used.add(dp);
          written.set(date, { kind: s === last && date === last.to ? "Fly" : kindOf(dp, date === s.from && moving), title: dp.title, items: toItems(dp.items), forHer: dp.for_her ?? null, source: "written" });
        }
      }
    }

    const pool = (pp.days ?? []).filter((dp) => !used.has(dp));
    let afterLongMove = !!leg && moving && leg.hours >= 3.5;
    for (const date of dates) {
      const base = { date, stayIndex: i, region: s.region };
      const w = written.get(date);
      if (w) {
        out.push({ ...base, ...w });
        afterLongMove = false;
        continue;
      }
      if (date === last.to && s === last) {
        out.push({ ...base, kind: "Fly", title: pp.last_morning ? `${pp.last_morning} Then to the airport.` : "Pack, then to the airport", items: [], forHer: null, source: pp.last_morning ? "plans" : "plain" });
        continue;
      }
      if (date === s.from && (i === 0 || moving)) {
        const arrive = (pp.arrival ?? []).find((dp) => works(dp, date)) ?? pp.arrival?.find((dp) => !dp.dates_only && dp.new_year !== "only");
        // The train itself is shown with the day; the title says what the afternoon holds.
        const easy = !!leg && leg.hours >= 3.5;
        out.push({
          ...base,
          kind: i === 0 ? "Arrive" : "Move",
          title: arrive && !easy ? arrive.title : easy ? `A long travel day to ${name}: check in and an early dinner` : `To ${name}: settle in`,
          items: arrive && !easy ? openItems(arrive, date) : [],
          forHer: arrive?.for_her ?? null,
          source: arrive ? "plans" : "plain",
        });
        continue;
      }
      const special = pp.special?.[date.slice(5)];
      if (special) {
        out.push({ ...base, kind: kindOf(special, false), title: special.title, items: openItems(special, date), forHer: special.for_her ?? null, source: "plans" });
        afterLongMove = false;
        continue;
      }
      // The best plan left that works on this date: an easy one after a long move, no day trip on a peak travel day.
      const fits = pool.filter((dp) => works(dp, date));
      const pick =
        (afterLongMove ? fits.find((dp) => dp.kind === "easy") : undefined) ??
        (peak.has(date) ? fits.find((dp) => dp.kind !== "daytrip") : undefined) ??
        fits[0];
      afterLongMove = false;
      if (pick) {
        pool.splice(pool.indexOf(pick), 1);
        out.push({ ...base, kind: kindOf(pick, false), title: pick.title, items: openItems(pick, date), forHer: pick.for_her ?? null, source: "plans" });
      } else {
        out.push({ ...base, kind: "Easy", title: `A free day in ${name}`, items: [], forHer: null, source: "plain" });
      }
    }
  });
  return out;
}

function allPlans(pp: PlacePlans): DayPlan[] {
  return [...(pp.arrival ?? []), ...(pp.days ?? []), ...Object.values(pp.special ?? {})];
}

function kindOf(dp: DayPlan, moving: boolean): string {
  if (moving) return "Move";
  return dp.kind === "daytrip" ? "Day trip" : dp.kind === "easy" ? "Easy" : "Explore";
}

function fromDb(d: Day): Omit<PlannedDay, "date" | "stayIndex" | "region"> {
  return { kind: d.kind ?? "Explore", title: d.title ?? "", items: d.items, forHer: null, source: "written" };
}
