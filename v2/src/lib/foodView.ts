/**
 * What the Food tab's screens compute from the guide and the route: which
 * nights we spend where, whether a place is open on our date, and the
 * marks every restaurant row carries.
 */
import photos from "../../data/food-deep/photos.json";
import { addDays, weekday } from "./dates";
import { DEEP_CITIES, DEEP_FOR_TAB, FOOD_REGION, type DeepCity, type DeepPlace, type Pregnancy, type Seven } from "./foodDeep";
import { placeId, slug } from "./food";
import type { Stay } from "./types";

/** The guide cities a route region eats from (Yudanaka with Nagano, Kyoto with Nara). */
export function citiesFor(region: string): string[] {
  return DEEP_FOR_TAB[FOOD_REGION[region] ?? region] ?? [];
}

export interface Night {
  date: string;
  region: string;
  /** Index of the stay on the route, so a second Tokyo stay is its own stop. */
  stop: number;
  cities: string[];
  first: boolean;
  last: boolean;
}

/** Every night of the route, in order, with the guide cities for it. */
export function routeNights(stays: Stay[]): Night[] {
  const out: Night[] = [];
  stays.forEach((s, i) => {
    for (let d = s.from; d < s.to; d = addDays(d, 1)) out.push({ date: d, region: s.region, stop: i, cities: citiesFor(s.region), first: d === s.from, last: addDays(d, 1) === s.to });
  });
  return out;
}

/** The route's stops as guide cities, in order and without repeats; then the guide's other cities. */
export function cityOrder(stays: Stay[]): { onRoute: string[]; others: string[] } {
  const onRoute: string[] = [];
  for (const s of stays) for (const c of citiesFor(s.region)) if (!onRoute.includes(c) && DEEP_CITIES[c]) onRoute.push(c);
  return { onRoute, others: Object.keys(DEEP_CITIES).filter((c) => !onRoute.includes(c)) };
}

/** The route stop number (1-based) a guide city belongs to, or null when it is not on the route. */
export function stopNumber(stays: Stay[], city: string): number | null {
  const i = stays.findIndex((s) => citiesFor(s.region).includes(city));
  if (i < 0) return null;
  // A city we come back to (Tokyo) keeps its first number; count distinct regions before it.
  return new Set(stays.slice(0, i + 1).map((s) => s.region)).size;
}

/** The dates we are in a guide city (Nara counts as Kyoto's day trips). */
export function datesIn(stays: Stay[], city: string): string[] {
  return routeNights(stays)
    .filter((n) => n.cities.includes(city))
    .map((n) => n.date);
}

export type Open = "open" | "closed" | "check";

/** New Year: closed unless a place says otherwise, so anything not stated needs a check. */
const NEW_YEAR = ["2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"];

export function openOn(p: Pick<DeepPlace, "closed_weekdays" | "closed_dates">, date: string): Open {
  if (p.closed_dates?.includes(date)) return "closed";
  if (p.closed_weekdays?.includes(weekday(date) as never)) return "closed";
  if (NEW_YEAR.includes(date)) return "check";
  return p.closed_weekdays ? "open" : "check";
}

export const PREG_MARK: Record<Pregnancy | "unknown", { glyph: string; label: string; cls: string }> = {
  ok: { glyph: "●", label: "Fine", cls: "text-ok" },
  careful: { glyph: "◆", label: "Ask", cls: "text-ask" },
  avoid: { glyph: "⊘", label: "Skip", cls: "text-danger" },
  unknown: { glyph: "○", label: "Not checked", cls: "text-muted" },
};

export const SEVEN_MARK: Record<Seven, { short: string; long: string; fits: boolean }> = {
  yes: { short: "⑦ tables", long: "Tables for seven", fits: true },
  room: { short: "⑦ room", long: "A private room for seven", fits: true },
  counter: { short: "⑦ counter", long: "Seven seats at the counter", fits: true },
  split: { short: "4+3", long: "Two tables, 4 and 3", fits: true },
  ask: { short: "⑦ ask", long: "Ask whether seven fit", fits: false },
  no: { short: "✕ for 7", long: "Can't seat seven", fits: false },
};

export const CHANNEL_LABEL: Record<string, string> = { online: "Online", phone: "By phone", "walk-in": "Walk in", hotel: "Through the hotel", queue: "Queue" };

/** "@jwang815 (Jason Wang)" → { name: "Jason Wang", handle: "@jwang815", initials: "JW" }. */
export function critic(who: string): { name: string; handle: string | null; initials: string } {
  const m = who.match(/^(@\S+)\s*\((.+)\)\s*$/);
  const handle = m ? m[1] : who.startsWith("@") ? who.split(/\s/)[0] : null;
  let name = m ? m[2] : who;
  // "The Hungry Tourist / David Califa": the person's name reads better.
  if (name.includes("/")) name = name.split("/").pop()!.trim();
  const initials = name
    .replace(/^(J\.|The)\s+/, "")
    .split(/[\s-]+/)
    .filter((w) => /^[A-Za-zÀ-ÿ]/.test(w))
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
  return { name, handle, initials: initials || "?" };
}

export function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** The short "why go" line: the structured glance, else the first sentence of why. */
export function glanceOf(p: { glance?: string; why?: string; what?: string }): string {
  if (p.glance) return p.glance;
  const t = p.why ?? p.what ?? "";
  const first = t.split(/(?<=[.!?])\s/)[0];
  return first.length > 110 ? first.slice(0, 108) + "…" : first;
}

/** A place row's data, small enough to send every city's places to the home screen. */
export interface PlaceLite {
  id: string;
  city: string;
  slug: string;
  name: string;
  name_ja?: string;
  area?: string;
  genre?: string;
  price?: string;
  score: number | null;
  pregnancy?: Pregnancy;
  seven?: Seven;
  closed_weekdays?: DeepPlace["closed_weekdays"];
  closed_dates?: string[];
  meals?: DeepPlace["meals"];
  glance: string;
}

export function placeLite(city: string, p: DeepPlace): PlaceLite {
  return {
    id: placeId(city, p.name),
    city,
    slug: slug(p.name),
    name: p.name,
    name_ja: p.name_ja,
    area: p.area,
    genre: p.genre,
    price: p.price,
    score: p.tabelog?.score ?? null,
    pregnancy: p.pregnancy,
    seven: p.seven,
    closed_weekdays: p.closed_weekdays,
    closed_dates: p.closed_dates,
    meals: p.meals,
    glance: glanceOf(p),
  };
}

export interface DishLite {
  id: string;
  city: string;
  slug: string;
  name: string;
  name_ja?: string;
  romaji?: string;
  glance: string;
  must: boolean;
  pregnancy?: Pregnancy;
  photo: Photo | null;
}

export interface Photo {
  url: string;
  width?: number;
  height?: number;
  author?: string;
  license?: string;
  source?: string;
}

/** Dish photos from Wikimedia Commons, keyed `<city>/<dish name>`. */
export const DISH_PHOTOS = photos as unknown as Record<string, Photo>;

export function dishLite(city: string, d: NonNullable<DeepCity["meibutsu"]>[number], photo: Photo | null): DishLite {
  return { id: `${city}/${slug(d.name)}`, city, slug: slug(d.name), name: d.name, name_ja: d.name_ja, romaji: d.romaji, glance: glanceOf(d), must: !!d.must, pregnancy: d.pregnancy, photo };
}

/** "Area · Kyoto · Higashiyama (Maruyama)" → "Higashiyama (Maruyama)". */
export function shortArea(area?: string): string {
  if (!area) return "";
  const parts = area.split(" · ");
  return parts.length > 1 ? parts.slice(1).join(" · ") : area;
}

/** "Tabelog range ¥20,000–39,000 + 15% service" → "¥20,000–39,000". */
export function shortPrice(price?: string): string {
  if (!price) return "";
  const m = price.match(/¥[\d,]+(?:\s*[–-]\s*(?:¥)?[\d,]+)?/);
  return m ? m[0].replace(/\s/g, "") : price.length > 24 ? "" : price;
}
