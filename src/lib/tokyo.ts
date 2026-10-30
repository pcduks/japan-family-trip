import data from "../../data/tokyo-routes.json";
import type { Activity, Plan } from "./plan";
import { planToRoute } from "./plan";
import { addDays, inClosureZone, slugify, stayEnd } from "./trip";

/*
 * "Tokyo a pé": the Neighborhood Guide's ten flexible Tokyo routes as data,
 * plus the pure helpers that tie them to the family's actual plan
 * (which days we sleep in Tokyo), to the day planner (activities tagged
 * tokyo-route:N / tokyo-spot:id) and to the family's "quero ir" marks.
 */

export type Zone = "centro" | "leste" | "oeste" | "sul";
export type SpotCat = "cafe" | "bakery" | "food" | "sweets" | "bar" | "shop" | "book" | "park" | "culture" | "market" | "view" | "spa" | "transit";
export type When = "manha" | "tarde" | "noite";

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
  /** Text Search query; names stay in English. */
  query: string;
  hood: string;
  /** Route number, or 0 for the rest-day list. */
  route: number;
  when: When | null;
}

export interface Move {
  hood: string;
  title: string;
  text: string;
  /** How you get here from the previous neighbourhood, when the route changes area. */
  leg: string | null;
  spots: Spot[];
}

export interface Block {
  when: When;
  moves: Move[];
}

export interface TokyoRoute {
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
export const ZONE_INK: Record<Zone, string> = { centro: "var(--vermilion)", leste: "var(--indigo)", oeste: "var(--pine)", sul: "var(--plum)" };
/** Hex inks per theme, for the Google map (CSS variables don't reach it). */
export const ZONE_HEX: Record<"light" | "dark", Record<Zone, string>> = {
  light: { centro: "#bb3b27", leste: "#2d4a7a", oeste: "#2e6a4e", sul: "#7b3a5c" },
  dark: { centro: "#ec8a72", leste: "#93acdb", oeste: "#83bb9c", sul: "#d19ab8" },
};

export const HOODS: Record<string, Hood> = Object.fromEntries(Object.entries(raw.hoods).map(([id, h]) => [id, { id, ...h }]));

export const CAT_LABEL: Record<SpotCat, string> = {
  cafe: "Café",
  bakery: "Padaria",
  food: "Comer",
  sweets: "Doce",
  bar: "Bar",
  shop: "Loja",
  book: "Livros",
  park: "Parque",
  culture: "Cultura",
  market: "Mercado",
  view: "Mirante",
  spa: "Descanso",
  transit: "Estação",
};

export const WHEN_LABEL: Record<When, { name: string; hours: string }> = {
  manha: { name: "Manhã", hours: "8h – 12h" },
  tarde: { name: "Tarde", hours: "12h – 16h" },
  noite: { name: "Noite", hours: "16h em diante" },
};

export const spotId = (name: string, hood: string) => `${slugify(name)}-${hood}`;

function expandSpot(s: RawSpot, hood: string, route: number, when: When | null): Spot {
  const [name, cat, note, query] = s;
  return {
    id: spotId(name, hood),
    name,
    cat: cat as SpotCat,
    note: note ?? null,
    query: query ?? `${name}, ${HOODS[hood]?.name ?? hood}, Tokyo`,
    hood,
    route,
    when,
  };
}

export const ROUTES: TokyoRoute[] = raw.routes.map((r) => {
  const blocks: Block[] = r.blocks.map((b) => ({
    when: b.when,
    moves: b.moves.map((m) => ({ hood: m.hood, title: m.title, text: m.text, leg: m.leg ?? null, spots: m.spots.map((s) => expandSpot(s, m.hood, r.n, b.when)) })),
  }));
  return {
    n: r.n,
    hoods: r.hoods,
    title: r.hoods.map((h) => HOODS[h]?.name ?? h).join(" → "),
    tagline: r.tagline,
    reflect: r.reflect,
    blocks,
    spots: blocks.flatMap((b) => b.moves.flatMap((m) => m.spots)),
  };
});

export const REST = {
  title: raw.rest.title,
  tagline: raw.rest.tagline,
  note: raw.rest.note,
  spots: raw.rest.spots.map<RestSpot>((s) => ({ ...expandSpot([s.name, s.cat, undefined, s.query], s.hood, 0, null), text: s.text })),
};

export const ALL_SPOTS: Spot[] = [...ROUTES.flatMap((r) => r.spots), ...REST.spots];
const SPOT_BY_ID = new Map(ALL_SPOTS.map((s) => [s.id, s]));
export const spotById = (id: string) => SPOT_BY_ID.get(id) ?? null;
export const routeByN = (n: number) => ROUTES.find((r) => r.n === n) ?? null;

/** Routes that pass through a neighbourhood. */
export function routesThrough(hood: string): TokyoRoute[] {
  return ROUTES.filter((r) => r.hoods.includes(hood) || r.spots.some((s) => s.hood === hood));
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
  /** Other routes that visit it ("express mode": layer a nearby neighbourhood from another day). */
  routes: number[];
}

/** Neighbourhoods within `km` of one, nearest first, excluding the route's own. */
export function nearbyHoods(hoodId: string, km = 1.8, excludeRoute: number | null = null): NearbyHood[] {
  const me = HOODS[hoodId];
  if (!me) return [];
  const own = new Set(excludeRoute ? (routeByN(excludeRoute)?.hoods ?? []) : [hoodId]);
  return Object.values(HOODS)
    .filter((h) => !own.has(h.id))
    .map((h) => ({ hood: h, km: distanceKm(me, h), routes: routesThrough(h.id).map((r) => r.n).filter((n) => n !== excludeRoute) }))
    .filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km);
}

/** Walking distance between a route's neighbourhood centres, in km (the spots add more). */
export function routeWalkKm(route: TokyoRoute): number {
  let km = 0;
  for (let i = 1; i < route.hoods.length; i++) {
    const a = HOODS[route.hoods[i - 1]];
    const b = HOODS[route.hoods[i]];
    if (a && b) km += distanceKm(a, b);
  }
  return km;
}

/** Nearest spot to a point, with distance; used for "perto de mim" during the trip. */
export function nearest<T extends { lat: number; lng: number }>(from: { lat: number; lng: number }, items: T[], limit = 8): (T & { km: number })[] {
  return items
    .map((i) => ({ ...i, km: distanceKm(from, i) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

/* --------------------------------------------------------- the plan */

export interface TokyoDay {
  date: string;
  stayId: string;
  /** We land this day (half a day at most). */
  arrival: boolean;
  /** The day we leave Tokyo for the next base (morning only). */
  departure: boolean;
  /** Second visit (e.g. the last nights before the flight home). */
  returnVisit: boolean;
}

/**
 * The days the plan puts us in Tokyo: every night's date, plus the morning
 * we move on. Changing the plan changes these, and the page follows.
 */
export function tokyoDays(plan: Plan | null): TokyoDay[] {
  if (!plan) return [];
  const route = planToRoute(plan);
  const out: TokyoDay[] = [];
  let visits = 0;
  route.stays.forEach((s, i) => {
    if (s.place !== "tokyo") return;
    visits++;
    const end = stayEnd(s);
    for (let d = s.startDate; d < end; d = addDays(d, 1)) out.push({ date: d, stayId: s.id, arrival: i === 0 && d === s.startDate, departure: false, returnVisit: visits > 1 });
    // The move-on morning, unless it is the flight home (last stay).
    if (i < route.stays.length - 1) out.push({ date: end, stayId: s.id, arrival: false, departure: true, returnVisit: visits > 1 });
  });
  return out;
}

export const ACTIVITY_ROUTE = "tokyo-route:";
export const ACTIVITY_SPOT = "tokyo-spot:";

/** Which route each Tokyo day has pinned, read from the plan's activities. */
export function routeAssignments(activities: Activity[], planId: string | null): Map<string, { n: number; activity: Activity }> {
  const out = new Map<string, { n: number; activity: Activity }>();
  for (const a of activities) {
    if (planId && a.plan_id !== planId) continue;
    if (!a.place_slug?.startsWith(ACTIVITY_ROUTE)) continue;
    const n = Number(a.place_slug.slice(ACTIVITY_ROUTE.length));
    if (Number.isFinite(n) && !out.has(a.date)) out.set(a.date, { n, activity: a });
  }
  return out;
}

/** Spots already on a plan day: spot id → activities. */
export function spotAssignments(activities: Activity[], planId: string | null): Map<string, Activity[]> {
  const out = new Map<string, Activity[]>();
  for (const a of activities) {
    if (planId && a.plan_id !== planId) continue;
    if (!a.place_slug?.startsWith(ACTIVITY_SPOT)) continue;
    const id = a.place_slug.slice(ACTIVITY_SPOT.length);
    out.set(id, [...(out.get(id) ?? []), a]);
  }
  return out;
}

/** The activity row that pins a route to a day. */
export function routeActivity(route: TokyoRoute, planId: string, date: string, sort: number): Omit<Activity, "id"> {
  const first = HOODS[route.hoods[0]];
  return {
    plan_id: planId,
    date,
    time: "09:00",
    title: `Rota ${route.n} de Tokyo: ${route.title}`,
    place_slug: `${ACTIVITY_ROUTE}${route.n}`,
    query: first ? `${first.station}, Tokyo` : null,
    note: `${route.tagline}. Manhã em ${HOODS[route.hoods[0]]?.name}, tarde em ${HOODS[route.hoods[1]]?.name ?? HOODS[route.hoods[0]]?.name}, noite em ${HOODS[route.hoods.at(-1)!]?.name}. Detalhes em Tokyo a pé.`,
    split_group: null,
    who: [],
    sort,
  };
}

const DEFAULT_TIME: Record<When, string> = { manha: "10:00", tarde: "13:00", noite: "18:00" };

/** The activity row that puts one spot on a day. */
export function spotActivity(spot: Spot, planId: string, date: string, sort: number): Omit<Activity, "id"> {
  const hood = HOODS[spot.hood];
  return {
    plan_id: planId,
    date,
    time: spot.when ? DEFAULT_TIME[spot.when] : null,
    title: spot.name,
    place_slug: `${ACTIVITY_SPOT}${spot.id}`,
    query: spot.query.replace(/, Tokyo$/, "") + ", Tokyo",
    note: [CAT_LABEL[spot.cat], hood?.name, spot.note].filter(Boolean).join(" · "),
    split_group: null,
    who: [],
    sort,
  };
}

/* ------------------------------------------------------ family marks */

/** "Quero ir" marks live in food_marks with a prefixed slug, so no new table is needed. */
export const MARK_PREFIX = "tokyo:";
export const markSlug = (spotId: string) => `${MARK_PREFIX}${spotId}`;
export const isTokyoMark = (slug: string) => slug.startsWith(MARK_PREFIX);
export const spotIdFromMark = (slug: string) => (isTokyoMark(slug) ? slug.slice(MARK_PREFIX.length) : null);

/* ----------------------------------------------------- New Year notes */

const SHRINE = /shrine|jingu|senso-ji|benzaiten|temple/i;
const CLOSES = new Set<SpotCat>(["market", "culture", "shop", "book"]);

export interface NYNote {
  level: "warn" | "info";
  text: string;
}

/** What the New Year closures mean for a spot on a given date (29 Dec – 4 Jan). */
export function nyNote(spot: Pick<Spot, "cat" | "name">, date: string | null): NYNote | null {
  if (!date || !inClosureZone(date)) return null;
  if (SHRINE.test(spot.name)) return { level: "info", text: "Hatsumōde: aberto, mas lotado de 1 a 3 de janeiro." };
  if (spot.cat === "market") return date >= "2026-12-31" ? { level: "warn", text: "Mercados costumam fechar de 31 dez a 4 jan. Confira." } : { level: "info", text: "Véspera de Ano-Novo: o mercado fica lotado, vá cedo." };
  if (CLOSES.has(spot.cat)) return { level: "warn", text: "Museus e lojas costumam fechar de 29 dez a 3 jan. Confira os dias." };
  if (spot.cat === "park") return { level: "info", text: "Jardins pagos costumam fechar de 29 dez a 1 jan." };
  return null;
}

/* --------------------------------------------------------- summaries */

export interface RouteFootprint {
  spots: number;
  eat: number;
  cafe: number;
  shop: number;
  culture: number;
  km: number;
}

export function routeFootprint(route: TokyoRoute): RouteFootprint {
  const c = (cats: SpotCat[]) => route.spots.filter((s) => cats.includes(s.cat)).length;
  return {
    spots: route.spots.filter((s) => s.cat !== "transit").length,
    eat: c(["food", "sweets", "bar"]),
    cafe: c(["cafe", "bakery"]),
    shop: c(["shop", "book", "market"]),
    culture: c(["culture", "park", "view"]),
    km: routeWalkKm(route),
  };
}
