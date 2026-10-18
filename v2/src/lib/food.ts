/**
 * The Food tab's own data: place ids, the food booking dates and the
 * bookings Pedro tracks. Isomorphic: the loader, the actions and the UI
 * all use it.
 */
import foodDeadlines from "../../data/food-deadlines.json";
import type { Deadline, FoodBooking } from "./types";

/** "Otome Zushi" → "otome-zushi"; "Ōmichō" → "omicho". */
export function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A food place's stable id: `<city>/<slug of its name>`. */
export function placeId(city: string, name: string): string {
  return `${city}/${slug(name)}`;
}

export const FOOD_DEADLINES: Deadline[] = (foodDeadlines.deadlines as Deadline[]).map((d) => ({ ...d, done: false }));

const FOOD_BY_ID = new Map(FOOD_DEADLINES.map((d) => [d.id!, d]));

export function foodDeadline(id: string): Deadline | undefined {
  return FOOD_BY_ID.get(id);
}

/** The trip's deadlines plus the food ones not already stored; stored rows keep their done flag and gain the food fields. */
export function withFoodDeadlines(rows: Deadline[]): Deadline[] {
  const have = new Set(rows.map((d) => d.id));
  const merged = rows.map((d) => {
    const f = d.id ? FOOD_BY_ID.get(d.id) : undefined;
    return f ? { ...f, done: d.done } : d;
  });
  return [...merged, ...FOOD_DEADLINES.filter((d) => !have.has(d.id))];
}

/** What a booking keeps in trip.bookings.notes, as JSON (the table has no columns for them). */
type Notes = Pick<FoodBooking, "date" | "meal" | "time" | "party" | "ref" | "note">;

const MEALS = ["breakfast", "lunch", "dinner"];
const STATUSES = ["idea", "held", "booked", "paid"];

export function encodeNotes(b: Partial<Notes>): string {
  return JSON.stringify({ date: b.date ?? null, meal: b.meal ?? null, time: b.time ?? null, party: b.party ?? null, ref: b.ref ?? null, note: b.note ?? null });
}

export function rowToFoodBooking(r: Record<string, unknown>): FoodBooking {
  let n: Partial<Notes> = {};
  try {
    n = JSON.parse(String(r.notes ?? "{}")) as Partial<Notes>;
  } catch {
    n = { note: String(r.notes ?? "") || null };
  }
  return {
    id: String(r.id),
    target_id: String(r.target_id),
    name: String(r.name ?? ""),
    status: STATUSES.includes(String(r.status)) ? (r.status as FoodBooking["status"]) : "idea",
    url: (r.url as string | null) ?? null,
    date: typeof n.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(n.date) ? n.date : null,
    meal: MEALS.includes(String(n.meal)) ? (n.meal as FoodBooking["meal"]) : null,
    time: typeof n.time === "string" ? n.time : null,
    party: typeof n.party === "number" ? n.party : null,
    ref: typeof n.ref === "string" ? n.ref : null,
    note: typeof n.note === "string" ? n.note : null,
  };
}

/** Checks a booking sent from the browser; returns why it is not valid, or null. */
export function badBooking(b: Partial<FoodBooking>): string | null {
  if (!b.target_id || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(b.target_id)) return "A food place id is required";
  if (!b.name?.trim()) return "A name is required";
  if (!b.status || !STATUSES.includes(b.status)) return "Unknown status";
  if (b.date && !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return "Date must be YYYY-MM-DD";
  if (b.meal && !MEALS.includes(b.meal)) return "Meal is breakfast, lunch or dinner";
  if (b.url && !/^https?:\/\//.test(b.url)) return "The link must start with http";
  return null;
}

/** Booked or paid: the table is ours. */
export function isConfirmed(b: Pick<FoodBooking, "status">): boolean {
  return b.status === "booked" || b.status === "paid";
}
