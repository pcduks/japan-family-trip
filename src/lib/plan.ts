import notesJson from "../../data/route-notes.json";
import {
  CLOSURE_ZONE,
  TRIP_NIGHTS,
  TRIP_START,
  addDays,
  formatDay,
  formatHours,
  parseLegHours,
  stayEnd,
  tripDates,
} from "./trip";
import type { Place, Route } from "./types";

/* ---------------------------------------------------------------- types */

export type LegMode = "train" | "bus" | "drive" | "ferry" | "flight";

export interface PlanStay {
  id: string;
  place: string; // slug
  nights: number;
  legNote: string | null;
  /** Curated door-to-door hours; overrides whatever legNote says. */
  legHours: number | null;
  legMode: LegMode | null;
  daytrips: string[];
  via: string[];
  /** Planner accepted moving on a peak travel day. */
  overridePeak?: boolean;
  notes?: string | null;
}

export interface Plan {
  id: string;
  name: string;
  color: string;
  based_on: string | null;
  stays: PlanStay[];
  is_chosen: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Activity {
  id: string;
  plan_id: string | null;
  date: string;
  time: string | null;
  title: string;
  place_slug: string | null;
  query: string | null;
  note: string | null;
  split_group: string | null;
  who: string[];
  sort: number;
  created_at?: string;
}

export type BookingStatus = "idea" | "held" | "booked" | "paid";
export type BookingKind = "lodging" | "transport" | "activity" | "other";

export interface Booking {
  id: string;
  plan_id: string | null;
  stay_id: string | null;
  kind: BookingKind;
  name: string;
  url: string | null;
  price_jpy: number | null;
  people: number;
  date: string | null;
  cancel_by: string | null;
  status: BookingStatus;
  confirmation: string | null;
  address: string | null;
  address_ja: string | null;
  phone: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Tip {
  id: string;
  place_slug: string | null;
  url: string | null;
  text: string;
  source: string | null;
  created_by: string | null;
  created_at?: string;
}

export interface Setting {
  id: string;
  value: unknown;
}

export const STATUS_ORDER: BookingStatus[] = ["idea", "held", "booked", "paid"];

/* ------------------------------------------------------------- plans */

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function inferLegMode(note: string | null | undefined): LegMode | null {
  if (!note) return null;
  const n = note.toLowerCase();
  // Rail first: "Fuji Excursion ...; pick up van" is a train leg.
  if (/shinkansen|express|train|\bline\b|romancecar|thunderbird|excursion|railway/.test(n)) return "train";
  if (/\bdrive|\bvan\b|\bcar\b/.test(n)) return "drive";
  if (/\bfly|flight|plane/.test(n)) return "flight";
  if (/\bbus\b/.test(n)) return "bus";
  if (/ferry|boat/.test(n)) return "ferry";
  return null;
}

/** Copy a candidate route into an editable plan. */
export function planFromRoute(route: Route, name?: string): Omit<Plan, "id"> {
  return {
    name: name ?? `My ${route.name}`,
    color: route.color,
    based_on: route.code,
    is_chosen: false,
    stays: route.stays.map((s) => ({
      id: newId(),
      place: s.place,
      nights: s.nights,
      legNote: s.legNote,
      legHours: null,
      legMode: inferLegMode(s.legNote),
      daytrips: [...s.daytrips],
      via: [...s.via],
    })),
  };
}

/** Start dates are derived from the trip start and nights, so they are always continuous (F7). */
export function planToRoute(plan: Plan, code = "★"): Route {
  let date = TRIP_START;
  return {
    id: plan.id,
    code,
    name: plan.name,
    title: plan.name,
    color: plan.color,
    exitAirport: "",
    isCandidate: false,
    stays: plan.stays.map((s) => {
      const out = {
        id: s.id,
        place: s.place,
        startDate: date,
        nights: s.nights,
        legNote: s.legNote,
        daytrips: s.daytrips,
        via: s.via,
      };
      date = addDays(date, Math.max(0, s.nights));
      return out;
    }),
  };
}

export function planNights(plan: Pick<Plan, "stays">): number {
  return plan.stays.reduce((a, s) => a + s.nights, 0);
}

export function legHours(stay: Pick<PlanStay, "legHours" | "legNote">): number | null {
  return stay.legHours ?? parseLegHours(stay.legNote);
}

/* ------------------------------------------------------------ rules */

/** Dates the PRD says not to change cities (P2.2). */
export const NO_MOVE_DATES = ["2026-12-29", "2026-12-30", "2026-12-31", "2027-01-02", "2027-01-03", "2027-01-04"];
export const LONG_TRAVEL_HOURS = 4;
const CLOSED_ON_NEW_YEAR = /market|museum|gallery|castle|aquarium|department store|depachika|arcade/i;
const NEW_YEAR_DAYS = ["2027-01-01", "2027-01-02", "2027-01-03"];
const STAIRS = /stairs|steps|climb|steep/i;
const ICY = /\bicy\b|\bice\b|fall risk/i;

export interface Warning {
  level: "error" | "warn" | "info";
  code: "nights" | "empty" | "peak-move" | "long-leg" | "stairs" | "icy" | "closure" | "exit";
  message: string;
  stayId?: string;
  activityId?: string;
  date?: string;
}

export function planWarnings(plan: Plan, places: Map<string, Place>, activities: Activity[] = []): Warning[] {
  const out: Warning[] = [];
  const name = (slug: string) => places.get(slug)?.name ?? slug;
  const total = planNights(plan);

  if (!plan.stays.length) out.push({ level: "error", code: "empty", message: "Add at least one stay." });
  else if (total !== TRIP_NIGHTS)
    out.push({
      level: "error",
      code: "nights",
      message: `Nights add up to ${total}; the trip is ${TRIP_NIGHTS} nights (${total > TRIP_NIGHTS ? "remove" : "add"} ${Math.abs(total - TRIP_NIGHTS)}).`,
    });

  const route = planToRoute(plan);
  route.stays.forEach((s, i) => {
    const ps = plan.stays[i];
    if (i > 0 && NO_MOVE_DATES.includes(s.startDate)) {
      out.push({
        level: ps.overridePeak ? "info" : "warn",
        code: "peak-move",
        stayId: s.id,
        date: s.startDate,
        message: ps.overridePeak
          ? `Moving to ${name(s.place)} on ${formatDay(s.startDate)}, a peak travel day (accepted).`
          : `Moving to ${name(s.place)} on ${formatDay(s.startDate)}, a peak travel day. Trains are packed; book seats the day they open or change the dates.`,
      });
    }
    const h = i > 0 ? legHours(ps) : null;
    if (h != null && h > LONG_TRAVEL_HOURS)
      out.push({
        level: "warn",
        code: "long-leg",
        stayId: s.id,
        date: s.startDate,
        message: `Long travel day to ${name(s.place)} on ${formatDay(s.startDate)}: about ${formatHours(h)}. Plan rest stops for her.`,
      });
  });

  // Accessibility notes for every place on the plan, once each.
  const seen = new Set<string>();
  for (const s of route.stays)
    for (const slug of [...s.via, s.place, ...s.daytrips]) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      const bump = places.get(slug)?.bump ?? "";
      if (STAIRS.test(bump)) out.push({ level: "info", code: "stairs", stayId: s.id, message: `${name(slug)}: ${bump}` });
      else if (ICY.test(bump)) out.push({ level: "info", code: "icy", stayId: s.id, message: `${name(slug)}: ${bump}` });
    }

  for (const a of activities) {
    if (!NEW_YEAR_DAYS.includes(a.date)) continue;
    const p = a.place_slug ? places.get(a.place_slug) : undefined;
    const text = [a.title, p?.name, p?.category, p?.blurb].filter(Boolean).join(" ");
    if (CLOSED_ON_NEW_YEAR.test(text))
      out.push({
        level: "warn",
        code: "closure",
        activityId: a.id,
        date: a.date,
        message: `“${a.title}” on ${formatDay(a.date)}: markets and museums are often closed 1–3 Jan. Check opening days.`,
      });
  }

  const order = { error: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

/* ---------------------------------------------------------- legs */

export interface Leg {
  stayId: string;
  date: string;
  from: string;
  to: string;
  via: string[];
  mode: LegMode | null;
  hours: number | null;
  note: string | null;
}

export function planLegs(plan: Plan): Leg[] {
  const route = planToRoute(plan);
  return route.stays.slice(1).map((s, k) => {
    const ps = plan.stays[k + 1];
    return {
      stayId: s.id,
      date: s.startDate,
      from: route.stays[k].place,
      to: s.place,
      via: s.via,
      mode: ps.legMode ?? inferLegMode(ps.legNote),
      hours: legHours(ps),
      note: ps.legNote,
    };
  });
}

/* ------------------------------------------------------- reminders */

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

export interface Reminder {
  kind: "rail" | "deadline" | "status";
  date: string;
  title: string;
  detail: string;
  stayId?: string;
  bookingId?: string;
  done: boolean;
}

/**
 * Shinkansen seats go on sale one month before travel, at 10:00 JST.
 * A leg counts as done once a transport booking for that stay is booked or paid.
 */
export function railReminders(plan: Plan, bookings: Booking[], places: Map<string, Place>): Reminder[] {
  return planLegs(plan)
    .filter((l) => l.mode === "train")
    .map((l) => {
      const booked = bookings.some(
        (b) => b.kind === "transport" && b.stay_id === l.stayId && (b.status === "booked" || b.status === "paid"),
      );
      const peak = NO_MOVE_DATES.includes(l.date);
      return {
        kind: "rail" as const,
        date: addMonths(l.date, -1),
        title: `Book seats: ${places.get(l.from)?.name ?? l.from} → ${places.get(l.to)?.name ?? l.to}`,
        detail: `Travel ${formatDay(l.date)}. Seats open 10:00 JST${peak ? "; peak day, book the moment they open" : ""}.${l.note ? " " + l.note : ""}`,
        stayId: l.stayId,
        done: booked,
      };
    });
}

export function deadlineReminders(bookings: Booking[]): Reminder[] {
  return bookings
    .filter((b) => b.cancel_by)
    .map((b) => ({
      kind: "deadline" as const,
      date: b.cancel_by!,
      title: `Free cancellation ends: ${b.name}`,
      detail: `Status: ${b.status}${b.price_jpy ? ` · ¥${b.price_jpy.toLocaleString("en-US")}` : ""}`,
      bookingId: b.id,
      stayId: b.stay_id ?? undefined,
      done: b.status === "paid",
    }));
}

/** Upcoming items, soonest first. `withinDays` limits how far ahead to look (F9 uses 7). */
export function upcoming(reminders: Reminder[], today: string, withinDays: number): Reminder[] {
  const limit = addDays(today, withinDays);
  return reminders
    .filter((r) => !r.done && r.date <= limit && r.date >= addDays(today, -30))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Stays whose lodging isn't at least "held" (PRD success measure). */
export function staysNeedingLodging(plan: Plan, bookings: Booking[]): string[] {
  const good = new Set<BookingStatus>(["held", "booked", "paid"]);
  return plan.stays
    .filter((s) => !bookings.some((b) => b.kind === "lodging" && b.stay_id === s.id && good.has(b.status)))
    .map((s) => s.id);
}

/* ----------------------------------------------------------- budget */

type Range = [number, number];
const NOTES = notesJson as unknown as {
  budget: Record<string, { lodge: Range; move: Range }> & { food: Range; exp: Range };
};
const midK = (r: Range) => ((r[0] + r[1]) / 2) * 1000;

export type BudgetCategory = "lodging" | "transport" | "food" | "activities";

export interface BudgetLine {
  category: BudgetCategory;
  label: string;
  estimate: number; // ¥ per person
  booked: number; // ¥ per person from bookings
  projected: number; // what we expect to spend per person
  note: string;
}

export function perPerson(b: Pick<Booking, "price_jpy" | "people">): number {
  return b.price_jpy ? b.price_jpy / Math.max(1, b.people) : 0;
}

/** P2.6: per-person estimate by category, updated from bookings. */
export function planBudget(plan: Plan, bookings: Booking[], opts: { foodPerDay?: number } = {}): BudgetLine[] {
  const base = NOTES.budget[plan.based_on ?? ""] ?? NOTES.budget.A;
  const nights = Math.max(1, planNights(plan));
  const lodgingPerNight = midK(base.lodge) / TRIP_NIGHTS;
  const mine = bookings.filter((b) => b.plan_id === plan.id && b.status !== "idea");
  const sum = (kind: BookingKind) => mine.filter((b) => b.kind === kind).reduce((a, b) => a + perPerson(b), 0);

  // Lodging: bookings where we have them, the per-night estimate for the rest.
  const lodgingBooked = sum("lodging");
  const bookedStays = new Set(mine.filter((b) => b.kind === "lodging" && b.price_jpy).map((b) => b.stay_id));
  const unbookedNights = plan.stays.filter((s) => !bookedStays.has(s.id)).reduce((a, s) => a + s.nights, 0);
  const lodgingEstimate = lodgingPerNight * nights;

  const transportEstimate = midK(base.move);
  const foodEstimate = opts.foodPerDay ? opts.foodPerDay * (nights + 1) : midK(NOTES.budget.food);
  const expEstimate = midK(NOTES.budget.exp);
  const transportBooked = sum("transport");
  const expBooked = sum("activity") + sum("other");

  return [
    {
      category: "lodging",
      label: "Lodging",
      estimate: lodgingEstimate,
      booked: lodgingBooked,
      projected: lodgingBooked + unbookedNights * lodgingPerNight,
      note: `${nights - unbookedNights} of ${nights} nights priced from bookings`,
    },
    {
      category: "transport",
      label: "Trains, buses, taxis",
      estimate: transportEstimate,
      booked: transportBooked,
      projected: Math.max(transportEstimate, transportBooked),
      note: "Estimate until tickets exceed it",
    },
    {
      category: "food",
      label: "Food",
      estimate: foodEstimate,
      booked: 0,
      projected: foodEstimate,
      note: opts.foodPerDay ? `¥${opts.foodPerDay.toLocaleString("en-US")} a day` : "Middle of ¥7–12k a day",
    },
    {
      category: "activities",
      label: "Activities",
      estimate: expEstimate,
      booked: expBooked,
      projected: Math.max(expEstimate, expBooked),
      note: "Classes, museums, ropeways, tea",
    },
  ];
}

/* ----------------------------------------------------------- days */

export interface PlanDay {
  date: string;
  stay: Route["stays"][number] | null;
  /** Set when this is a moving day. */
  arriving: Route["stays"][number] | null;
  leaving: Route["stays"][number] | null;
  departure: boolean;
}

export function planDays(plan: Plan): PlanDay[] {
  const route = planToRoute(plan);
  return tripDates().map((date, i, all) => {
    const stay = route.stays.find((s) => date >= s.startDate && date < stayEnd(s)) ?? null;
    const arriving = route.stays.find((s, k) => k > 0 && s.startDate === date) ?? null;
    const leaving = arriving ? route.stays[route.stays.indexOf(arriving) - 1] : null;
    return { date, stay, arriving, leaving, departure: i === all.length - 1 };
  });
}

export const inNewYearClosures = (iso: string) => iso >= CLOSURE_ZONE[0] && iso <= CLOSURE_ZONE[1];

/** Today's date in Japan. */
export function todayInJapan(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(now);
}
