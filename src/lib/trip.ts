import tripJson from "../../data/trip-data.json";
import foodJson from "../../data/tokyo-foodlist.json";
import notesJson from "../../data/route-notes.json";
import type { Place, PlaceKind, Route, Trip } from "./types";

/* ---------------------------------------------------------------- dates */

export const TRIP_START = "2026-12-20";
export const TRIP_END = "2027-01-09";
export const TRIP_NIGHTS = 20;

/** Most shops, markets and museums close or run short hours. */
export const CLOSURE_ZONE: [string, string] = ["2026-12-29", "2027-01-04"];
export const PEAK_DATES = [
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-02",
  "2027-01-03",
  "2027-01-04",
  "2027-01-09",
];

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WEEKDAYS_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDay(iso: string): string {
  const d = parseISO(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function weekday(iso: string): string {
  return WEEKDAYS[parseISO(iso).getUTCDay()];
}

/** "sábado, 20 de dezembro" */
export function formatLong(iso: string): string {
  const d = parseISO(iso);
  return `${WEEKDAYS_LONG[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS_LONG[d.getUTCMonth()]}`;
}

/** Stamp-style date: "20 · XII · 2026" */
export function stampDate(iso: string): string {
  const d = parseISO(iso);
  return `${d.getUTCDate()} · ${ROMAN[d.getUTCMonth()]} · ${d.getUTCFullYear()}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000);
}

export function tripDates(): string[] {
  const out: string[] = [];
  for (let d = TRIP_START; d <= TRIP_END; d = addDays(d, 1)) out.push(d);
  return out;
}

export const isPeak = (iso: string) => PEAK_DATES.includes(iso);
export const inClosureZone = (iso: string) => iso >= CLOSURE_ZONE[0] && iso <= CLOSURE_ZONE[1];

/* --------------------------------------------------------- bundled data */

type RawPlace = (typeof tripJson.places)[number];
type RawStay = {
  place: string;
  from: string;
  nights: number;
  leg?: string;
  daytrips?: string[];
  via?: string[];
};
type FoodItem = {
  n: string;
  area: string;
  cat: string;
  rating: string;
  note?: string;
  closed?: string;
};

export function slugify(s: string): string {
  const ascii = s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii) return ascii;
  // Non-Latin names (e.g. Korean): stable hex of the code points.
  return "p-" + Array.from(s).map((c) => c.codePointAt(0)!.toString(16)).join("");
}

export function foodQuery(item: { n: string; area: string }): string {
  return /verify on map/i.test(item.area) ? `${item.n} Tokyo` : `${item.n}, ${item.area}, Tokyo`;
}

export function bundledFoodPlaces(): Place[] {
  return (foodJson as FoodItem[]).map((f) => ({
    id: "food-" + slugify(f.n),
    slug: "food-" + slugify(f.n),
    name: f.n,
    query: foodQuery(f),
    lat: null,
    lng: null,
    region: "Tokyo",
    kind: "food" as PlaceKind,
    blurb: f.note ?? "",
    winter: "",
    bump: "",
    googlePlaceId: null,
    category: f.cat,
    area: /verify on map/i.test(f.area) ? null : f.area,
    note: f.note ?? null,
    closedNote: f.closed ?? null,
    listRating: f.rating === "—" ? null : f.rating,
  }));
}

export function bundledTrip(): Trip {
  const places: Place[] = tripJson.places.map((p: RawPlace) => ({
    id: p.id,
    slug: p.id,
    name: p.name,
    query: p.q,
    lat: p.lat,
    lng: p.lng,
    region: p.region,
    kind: p.kind as PlaceKind,
    blurb: p.blurb,
    winter: p.winter,
    bump: p.bump,
    googlePlaceId: null,
  }));
  const routes: Route[] = tripJson.routes.map((r) => ({
    id: r.id,
    code: r.id,
    name: r.name,
    title: r.title,
    color: r.color,
    exitAirport: r.exit,
    isCandidate: true,
    stays: (r.stays as RawStay[]).map((s, i) => ({
      id: `${r.id}-${i}`,
      place: s.place,
      startDate: s.from,
      nights: s.nights,
      legNote: s.leg ?? null,
      daytrips: s.daytrips ?? [],
      via: s.via ?? [],
    })),
  }));
  return {
    name: tripJson.trip.name,
    start: tripJson.trip.start,
    end: tripJson.trip.end,
    nights: tripJson.trip.nights,
    notes: tripJson.trip.notes,
    places: [...places, ...bundledFoodPlaces()],
    routes,
    modules: tripJson.modules,
    travellers: tripJson.trip.travellers.map((name, i) => ({
      id: `demo-${i}`,
      name,
      role: i === 0 ? "planner" : "member",
      couple: ["pedro", "irmao", "pais"][Math.floor(i / 2)] ?? null,
    })),
  };
}

/* ------------------------------------------------------------- helpers */

export function placeMap(trip: Trip): Map<string, Place> {
  return new Map(trip.places.map((p) => [p.slug, p]));
}

/** Every slug the route touches, in travel order: via stops, then the base. */
export function routeSequence(route: Route): string[] {
  const seq: string[] = [];
  for (const s of route.stays) {
    seq.push(...s.via, s.place);
  }
  return seq;
}

/** All slugs shown on the map for a route (bases, via stops and day trips). */
export function routePlaces(route: Route): string[] {
  const out = new Set<string>();
  for (const s of route.stays) {
    out.add(s.place);
    s.via.forEach((v) => out.add(v));
    s.daytrips.forEach((d) => out.add(d));
  }
  return [...out];
}

export function stayEnd(stay: { startDate: string; nights: number }): string {
  return addDays(stay.startDate, stay.nights);
}

/** The stay whose night covers the given date, if any. */
export function stayOnNight(route: Route, iso: string) {
  return route.stays.find((s) => iso >= s.startDate && iso < stayEnd(s));
}

export function totalNights(route: Route): number {
  return route.stays.reduce((a, s) => a + s.nights, 0);
}

/** Where a place appears in a route: as a base, a stop on the way, or a day trip. */
export function placeInRoute(route: Route, slug: string) {
  const out: { role: "base" | "via" | "daytrip"; from: string; to: string; stayIndex: number }[] = [];
  route.stays.forEach((s, i) => {
    const to = stayEnd(s);
    if (s.place === slug) out.push({ role: "base", from: s.startDate, to, stayIndex: i });
    if (s.via.includes(slug)) out.push({ role: "via", from: s.startDate, to: s.startDate, stayIndex: i });
    if (s.daytrips.includes(slug)) out.push({ role: "daytrip", from: s.startDate, to, stayIndex: i });
  });
  return out;
}

/** The place you travel from to reach `slug` on this route (for directions). */
export function previousStop(route: Route, slug: string): string | null {
  const seq = routeSequence(route);
  const i = seq.indexOf(slug);
  if (i > 0) return seq[i - 1];
  // Day trips start from their base.
  const stay = route.stays.find((s) => s.daytrips.includes(slug));
  return stay ? stay.place : null;
}

/**
 * Parse the upper-bound duration in hours from a curated leg note such as
 * "Train to Matsumoto + bus, ~5–6 h", "~2 h 15 (peak day)" or "~85 min".
 */
export function parseLegHours(note: string | null | undefined): number | null {
  if (!note) return null;
  const h = note.match(/(\d+(?:\.\d+)?)(?:\s*[–-]\s*(\d+(?:\.\d+)?))?\s*h\b(?:\s*(\d{1,2})\b)?/);
  if (h) {
    const hours = Number(h[2] ?? h[1]);
    const mins = h[3] ? Number(h[3]) : 0;
    return hours + mins / 60;
  }
  const m = note.match(/(\d+)\s*min/);
  if (m) return Number(m[1]) / 60;
  return null;
}

export function formatHours(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (whole === 0) return `${mins} min`;
  return mins ? `${whole} h ${mins}` : `${whole} h`;
}

/* ------------------------------------------------------------ compare */

type Notes = {
  budget: Record<string, { lodge: [number, number]; move: [number, number] }> & {
    food: [number, number];
    exp: [number, number];
  };
  routes: Record<string, { snow: { score: number; label: string }; comfort: { score: number; label: string } }>;
};
const NOTES = notesJson as unknown as Notes;

export interface CompareCell {
  /** Numeric value for sorting; higher is not always better. */
  value: number | null;
  text: string;
  detail?: string;
}

export interface CompareRow {
  key: string;
  label: string;
  /** "low" = lower is better, "high" = higher is better, null = neutral. */
  better: "low" | "high" | null;
  cells: Record<string, CompareCell>;
}

export function landCostPerPerson(code: string): [number, number] | null {
  const b = NOTES.budget[code];
  if (!b) return null;
  const lo = (b.lodge[0] + b.move[0] + NOTES.budget.food[0] + NOTES.budget.exp[0]) * 1000;
  const hi = (b.lodge[1] + b.move[1] + NOTES.budget.food[1] + NOTES.budget.exp[1]) * 1000;
  return [lo, hi];
}

export function yen(n: number): string {
  return "¥" + (Math.round(n / 1000) * 1000).toLocaleString("pt-BR");
}

export function compareRows(trip: Trip, routes: Route[]): CompareRow[] {
  const P = placeMap(trip);
  const name = (slug: string) => P.get(slug)?.name ?? slug;
  const row = (
    key: string,
    label: string,
    better: CompareRow["better"],
    f: (r: Route) => CompareCell,
  ): CompareRow => ({ key, label, better, cells: Object.fromEntries(routes.map((r) => [r.id, f(r)])) });

  return [
    row("nights", "Noites por base", null, (r) => ({
      value: r.stays.length,
      text: r.stays.map((s) => `${name(s.place)} ${s.nights}`).join(" · "),
    })),
    row("changes", "Trocas de base", "low", (r) => ({
      value: r.stays.length - 1,
      text: String(r.stays.length - 1),
    })),
    row("longest", "Dia de viagem mais longo", "low", (r) => {
      let best: { h: number; stay: Route["stays"][number] } | null = null;
      for (const s of r.stays.slice(1)) {
        const h = parseLegHours(s.legNote);
        if (h != null && (!best || h > best.h)) best = { h, stay: s };
      }
      return best
        ? {
            value: best.h,
            text: `~${formatHours(best.h)}`,
            detail: `${formatDay(best.stay.startDate)} até ${name(best.stay.place)}`,
          }
        : { value: null, text: "—" };
    }),
    row("peakMoves", "Mudanças em dias de pico", "low", (r) => {
      const moves = r.stays.slice(1).filter((s) => isPeak(s.startDate));
      return {
        value: moves.length,
        text: String(moves.length),
        detail: moves.map((s) => `${formatDay(s.startDate)} → ${name(s.place)}`).join(", ") || undefined,
      };
    }),
    row("snow", "Chance de neve", null, (r) => {
      const n = NOTES.routes[r.code]?.snow;
      return n ? { value: n.score, text: ["", "Baixa", "Alguma", "Provável", "Alta"][n.score] ?? "", detail: n.label } : { value: null, text: "—" };
    }),
    row("comfort", "Conforto para ela", "high", (r) => {
      const n = NOTES.routes[r.code]?.comfort;
      return n ? { value: n.score, text: "●".repeat(n.score) + "○".repeat(5 - n.score), detail: n.label } : { value: null, text: "—" };
    }),
    row("nye", "Réveillon", null, (r) => {
      const s = stayOnNight(r, "2026-12-31");
      return { value: null, text: s ? name(s.place) : "—" };
    }),
    row("exit", "Aeroporto de volta", null, (r) => ({ value: null, text: r.exitAirport })),
    row("cost", "Custo em terra por pessoa", "low", (r) => {
      const c = landCostPerPerson(r.code);
      return c
        ? { value: (c[0] + c[1]) / 2, text: yen((c[0] + c[1]) / 2), detail: `${yen(c[0])} – ${yen(c[1])}, sem passagens aéreas` }
        : { value: null, text: "—" };
    }),
  ];
}
