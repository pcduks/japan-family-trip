/**
 * Tokyo on foot: the Neighborhood Guide's ten one-day walks as data
 * (data/tokyo-walks.json), plus the pure helpers that tie them to the
 * route (which days the plan puts us in Tokyo, from planDays), to the
 * family's pins (one walk per Tokyo day, in settings) and to their hearts.
 */
import data from "../../data/tokyo-walks.json";
import { planDays, type PlannedDay } from "./days";
import type { Comment, Reaction, Snapshot, Version } from "./types";

export type Zone = "centre" | "east" | "west" | "south";
export type SpotCat = "cafe" | "bakery" | "food" | "sweets" | "bar" | "shop" | "book" | "park" | "culture" | "market" | "view" | "spa" | "transit";
export type When = "morning" | "afternoon" | "evening";

export interface Hood {
  id: string;
  name: string;
  ja: string;
  zone: Zone;
  lat: number;
  lng: number;
  /** Google Maps query for the station or gateway. */
  station: string;
  vibe: string;
}

export interface Spot {
  id: string;
  name: string;
  cat: SpotCat;
  note: string | null;
  /** The Text Search query (names stay as the guide wrote them). */
  query: string;
  hood: string;
  /** Walk number, or 0 for the rest-day list. */
  walk: number;
  when: When | null;
}

export interface Move {
  hood: string;
  title: string;
  text: string;
  /** How you get here when the walk changes neighbourhood. */
  leg: string | null;
  spots: Spot[];
}

export interface Block {
  when: When;
  moves: Move[];
}

export interface Walk {
  n: number;
  hoods: string[];
  title: string;
  tagline: string;
  reflect: string;
  blocks: Block[];
  spots: Spot[];
}

export interface RestSpot extends Spot {
  text: string;
}

type RawSpot = [string, string, string?, string?];
interface RawMove {
  hood: string;
  title: string;
  text: string;
  leg?: string;
  spots: RawSpot[];
}
interface Raw {
  zones: Record<Zone, { name: string; ink: string }>;
  hoods: Record<string, Omit<Hood, "id">>;
  routes: { n: number; hoods: string[]; tagline: string; reflect: string; blocks: { when: When; moves: RawMove[] }[] }[];
  rest: { title: string; tagline: string; note: string; spots: { name: string; hood: string; cat: string; text: string; query?: string }[] };
}

const raw = data as unknown as Raw;

export const ZONES = raw.zones;
/** Zone inks as CSS variables (the page) and as hex per theme (the Google map cannot read variables). */
export const ZONE_INK: Record<Zone, string> = { centre: "var(--accent)", east: "var(--indigo)", west: "var(--ok)", south: "#7048e8" };
export const ZONE_HEX: Record<"light" | "dark", Record<Zone, string>> = {
  light: { centre: "#c8402a", east: "#2a3f6f", west: "#2b8a3e", south: "#7048e8" },
  dark: { centre: "#ff7a5c", east: "#9db4e8", west: "#69db7c", south: "#b197fc" },
};

export const HOODS: Record<string, Hood> = Object.fromEntries(Object.entries(raw.hoods).map(([id, h]) => [id, { id, ...h }]));

export const CAT_LABEL: Record<SpotCat, string> = {
  cafe: "Café",
  bakery: "Bakery",
  food: "Eat",
  sweets: "Sweets",
  bar: "Bar",
  shop: "Shop",
  book: "Books",
  park: "Park",
  culture: "Culture",
  market: "Market",
  view: "View",
  spa: "Rest",
  transit: "Station",
};

export const WHEN_LABEL: Record<When, { name: string; hours: string }> = {
  morning: { name: "Morning", hours: "8am – 12pm" },
  afternoon: { name: "Afternoon", hours: "12 – 4pm" },
  evening: { name: "Evening", hours: "4pm – late" },
};

/** "Onibus Coffee" in Nakameguro → "onibus-coffee-nakameguro"; the same name in two neighbourhoods stays apart. */
export function slugify(s: string): string {
  const ascii = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || "p-" + Array.from(s).map((c) => c.codePointAt(0)!.toString(16)).join("");
}

export const spotId = (name: string, hood: string) => `${slugify(name)}-${hood}`;

function expandSpot(s: RawSpot, hood: string, walk: number, when: When | null): Spot {
  const [name, cat, note, query] = s;
  return { id: spotId(name, hood), name, cat: cat as SpotCat, note: note ?? null, query: query ?? `${name}, ${HOODS[hood]?.name ?? hood}, Tokyo`, hood, walk, when };
}

export const WALKS: Walk[] = raw.routes.map((r) => {
  const blocks: Block[] = r.blocks.map((b) => ({
    when: b.when,
    moves: b.moves.map((m) => ({ hood: m.hood, title: m.title, text: m.text, leg: m.leg ?? null, spots: m.spots.map((s) => expandSpot(s, m.hood, r.n, b.when)) })),
  }));
  return { n: r.n, hoods: r.hoods, title: r.hoods.map((h) => HOODS[h]?.name ?? h).join(" → "), tagline: r.tagline, reflect: r.reflect, blocks, spots: blocks.flatMap((b) => b.moves.flatMap((m) => m.spots)) };
});

export const REST = {
  title: raw.rest.title,
  tagline: raw.rest.tagline,
  note: raw.rest.note,
  spots: raw.rest.spots.map<RestSpot>((s) => ({ ...expandSpot([s.name, s.cat, undefined, s.query], s.hood, 0, null), text: s.text })),
};

export const ALL_SPOTS: Spot[] = [...WALKS.flatMap((w) => w.spots), ...REST.spots];
const SPOT_BY_ID = new Map(ALL_SPOTS.map((s) => [s.id, s]));
export const spotById = (id: string) => SPOT_BY_ID.get(id) ?? null;
export const walkByN = (n: number) => WALKS.find((w) => w.n === n) ?? null;

/** Walks that pass through a neighbourhood. */
export function walksThrough(hood: string): Walk[] {
  return WALKS.filter((w) => w.hoods.includes(hood) || w.spots.some((s) => s.hood === hood));
}

/* ----------------------------------------------------------- geography */

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface NearbyHood {
  hood: Hood;
  km: number;
  /** Other walks that visit it ("express mode": layer a nearby neighbourhood from another day). */
  walks: number[];
}

/** Neighbourhoods within `km` of one, nearest first, excluding the walk's own. */
export function nearbyHoods(hoodId: string, km = 1.8, excludeWalk: number | null = null): NearbyHood[] {
  const me = HOODS[hoodId];
  if (!me) return [];
  const own = new Set(excludeWalk ? (walkByN(excludeWalk)?.hoods ?? []) : [hoodId]);
  return Object.values(HOODS)
    .filter((h) => !own.has(h.id))
    .map((h) => ({ hood: h, km: distanceKm(me, h), walks: walksThrough(h.id).map((w) => w.n).filter((n) => n !== excludeWalk) }))
    .filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km);
}

/** Distance between a walk's neighbourhood centres, in km (the spots add more). */
export function walkKm(walk: Walk): number {
  let km = 0;
  for (let i = 1; i < walk.hoods.length; i++) {
    const a = HOODS[walk.hoods[i - 1]];
    const b = HOODS[walk.hoods[i]];
    if (a && b) km += distanceKm(a, b);
  }
  return km;
}

/** Nearest items to a point, with distance; for "where am I" during the trip. */
export function nearest<T extends { lat: number; lng: number }>(from: { lat: number; lng: number }, items: T[], limit = 8): (T & { km: number })[] {
  return items
    .map((i) => ({ ...i, km: distanceKm(from, i) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/* --------------------------------------------------------- the route */

export interface TokyoDay {
  date: string;
  /** The plan's own day: Arrive, Explore, Easy, Fly… and its title. */
  kind: string;
  title: string;
  stayIndex: number;
  /** A later stay in Tokyo (the nights before the flight home). */
  returnVisit: boolean;
  /** The plan's day is a travel or flight day: half a day at most. */
  partial: boolean;
}

type Snap = Pick<Snapshot, "versions" | "regions" | "places" | "days" | "calendar">;

/**
 * The days the route puts us in Tokyo, as the plan already describes them.
 * Change the route and these change with it.
 */
export function tokyoDays(plan: Pick<Version, "id" | "stays" | "parent_version_id"> | null, snap: Snap): TokyoDay[] {
  if (!plan) return [];
  const firstTokyo = plan.stays.findIndex((s) => s.region === "tokyo");
  return planDays(plan, snap)
    .filter((d: PlannedDay) => d.region === "tokyo")
    .map((d) => ({ date: d.date, kind: d.kind, title: d.title, stayIndex: d.stayIndex, returnVisit: d.stayIndex !== firstTokyo, partial: /arrive|move|fly/i.test(d.kind) }));
}

export const thePlan = (snap: Pick<Snapshot, "versions">) => snap.versions.find((v) => v.status === "plan") ?? null;

/** Today's date in Japan. */
export function todayInJapan(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(now);
}

/* ------------------------------------------------------------- pins */

/** One walk per Tokyo day, chosen by the family: date → walk number. Stored under settings key "tokyo_walks". */
export type Pins = Record<string, number>;
export const PINS_KEY = "tokyo_walks";

export function pinsFromSetting(value: unknown): Pins {
  const pins = (value as { pins?: unknown } | null)?.pins;
  if (!pins || typeof pins !== "object") return {};
  const out: Pins = {};
  for (const [date, n] of Object.entries(pins as Record<string, unknown>)) if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof n === "number" && Number.isInteger(n) && n >= 0) out[date] = n;
  return out;
}

export function withPin(pins: Pins, date: string, walk: number | null): Pins {
  const next = { ...pins };
  if (walk == null) delete next[date];
  else next[date] = walk;
  return next;
}

/** Dates per walk, sorted. */
export function datesOfWalk(pins: Pins): Map<number, string[]> {
  const m = new Map<number, string[]>();
  for (const [date, n] of Object.entries(pins)) m.set(n, [...(m.get(n) ?? []), date].sort());
  return m;
}

/* ----------------------------------------------------- hearts, notes */

/** Hearts live in reactions with target_type "walk"; comments on a spot or a walk's reflection too. */
export const REACTION_TYPE = "walk";
export const COMMENT_TYPE: Comment["target_type"] = "walk";
export const reflectionId = (n: number) => `walk:${n}:reflect`;

export function heartsBySpot(reactions: Reaction[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const r of reactions) if (r.target_type === REACTION_TYPE && r.kind === "heart") m.set(r.target_id, [...(m.get(r.target_id) ?? []), r.traveller_id]);
  return m;
}

/* ----------------------------------------------------- New Year notes */

const SHRINE = /shrine|jingu|senso-ji|benzaiten|temple/i;
const CLOSES = new Set<SpotCat>(["culture", "shop", "book"]);

export interface NYNote {
  level: "warn" | "info";
  text: string;
}

/** What the New Year closures mean for a spot on a date inside the closure window. */
export function nyNote(spot: Pick<Spot, "cat" | "name">, date: string | null, window: { start: string; end: string }): NYNote | null {
  if (!date || date < window.start || date > window.end) return null;
  if (SHRINE.test(spot.name)) return { level: "info", text: "Hatsumōde: open, but packed 1–3 January." };
  if (spot.cat === "market") return date >= "2026-12-31" ? { level: "warn", text: "Markets usually close 31 Dec – 4 Jan. Check." } : { level: "info", text: "The last days of the year: the market is at its busiest, go early." };
  if (CLOSES.has(spot.cat)) return { level: "warn", text: "Museums and shops usually close 29 Dec – 3 Jan. Check the days." };
  if (spot.cat === "park") return { level: "info", text: "Paid gardens usually close 29 Dec – 1 Jan." };
  return null;
}

/* --------------------------------------------------------- summaries */

export interface Footprint {
  spots: number;
  eat: number;
  cafe: number;
  shop: number;
  culture: number;
  km: number;
}

export function footprint(walk: Walk): Footprint {
  const c = (cats: SpotCat[]) => walk.spots.filter((s) => cats.includes(s.cat)).length;
  return { spots: walk.spots.filter((s) => s.cat !== "transit").length, eat: c(["food", "sweets", "bar"]), cafe: c(["cafe", "bakery"]), shop: c(["shop", "book", "market"]), culture: c(["culture", "park", "view"]), km: walkKm(walk) };
}

/* ------------------------------------------------------------- links */

const enc = encodeURIComponent;

export function mapsSearchUrl(query: string, placeId?: string | null): string {
  return `https://www.google.com/maps/search/?api=1&query=${enc(query + ", Japan")}${placeId ? `&query_place_id=${enc(placeId)}` : ""}`;
}

export function walkingUrl(from: string, to: string, toPlaceId?: string | null): string {
  const p = new URLSearchParams({ api: "1", origin: from + ", Japan", destination: to + ", Japan", travelmode: "walking" });
  if (toPlaceId) p.set("destination_place_id", toPlaceId);
  return `https://www.google.com/maps/dir/?${p}`;
}

/** One Google Maps walking route through several places, the middle ones as waypoints. */
export function routeUrl(queries: string[]): string {
  const stops = queries.map((q) => `${q}, Japan`);
  if (stops.length < 2) return mapsSearchUrl(queries[0] ?? "Tokyo");
  const p = new URLSearchParams({ api: "1", origin: stops[0], destination: stops[stops.length - 1], travelmode: "walking" });
  if (stops.length > 2) p.set("waypoints", stops.slice(1, -1).join("|"));
  return `https://www.google.com/maps/dir/?${p}`;
}
