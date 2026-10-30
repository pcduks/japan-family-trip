/**
 * City pages (docs/product/city-pages.md): everything we know about a stop
 * as pins in one vocabulary, from four layers: the plan's own days, the
 * Neighborhood Guide walks, the food guide, and the family's tips. The pure
 * logic here says where a pin fits (neighbourhood, walk, plan day) and when
 * it goes (time of day); the UI only draws it.
 */
import cityAreasData from "../../data/city-areas.json";
import neighbourhoods from "../../data/neighbourhoods.json";
import { planDays, type PlannedDay } from "./days";
import { DEEP_CITIES, type DeepCity } from "./foodDeep";
import { citiesFor } from "./foodView";
import { HOODS, WALKS, distanceKm, type Hood, type Spot, type SpotCat } from "./tokyo";
import type { Comment, FoodListItem, Place, Reaction, Snapshot, Tip, TipExtracted, TipSource, Version } from "./types";

export type Layer = "plan" | "walk" | "guide" | "ours";
export type When = "morning" | "afternoon" | "evening" | "any";

export const LAYER_LABEL: Record<Layer, string> = { plan: "Plan", walk: "Walks", guide: "Food guide", ours: "Ours" };
/** Layer inks: CSS for the page, hex per theme for the Google map. */
export const LAYER_INK: Record<Layer, string> = { plan: "var(--indigo)", walk: "var(--accent)", guide: "#b8731b", ours: "#7048e8" };
export const LAYER_HEX: Record<"light" | "dark", Record<Layer, string>> = {
  light: { plan: "#2a3f6f", walk: "#c8402a", guide: "#b8731b", ours: "#7048e8" },
  dark: { plan: "#9db4e8", walk: "#ff7a5c", guide: "#f0b25a", ours: "#b197fc" },
};

export const WHEN_LABEL: Record<When, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", any: "Any time" };

/** One place on the city page, whatever it came from. */
export interface Pin {
  id: string;
  layer: Layer;
  name: string;
  cat: SpotCat;
  /** The Text Search query that finds it on Google (names stay as written). */
  query: string;
  /** One short line: the guide's note, the plan's why, the tip's line. */
  line: string | null;
  /** The source's own area name when it has one ("Ginza", "Asakusa"). */
  area: string | null;
  /** Coordinates when known up front (tips store them; the rest resolve on demand). */
  lat?: number | null;
  lng?: number | null;
  photo?: string | null;
  /** Walk number for walk spots. */
  walk?: number;
  /** Library place id, deep guide place slug, or tip id, for the sheet's links. */
  ref: { kind: "place"; id: string } | { kind: "deep"; city: string; name: string } | { kind: "shop"; city: string; name: string } | { kind: "spot"; id: string } | { kind: "tip"; id: string } | { kind: "list"; name: string };
  /** The day this pin is already on (plan items, tips put on a day). */
  date?: string | null;
  /** Who added it (tips). */
  author?: string | null;
}

/* ------------------------------------------------------------- tips */

export type { Tip, TipExtracted, TipSource };

/** A tip from its drop_places row (the drop gives the author and the date); null when the row is not a tip. */
export function tipFromRow(row: { id: string; drop_id: string; extracted: unknown; confirmed_by?: string | null }, drop: { author_id: string; created_at: string }): Tip | null {
  const x = row.extracted as Partial<TipExtracted> | null;
  if (!x || typeof x.name !== "string" || typeof x.city !== "string") return null;
  return {
    id: row.id,
    drop_id: row.drop_id,
    author_id: drop.author_id,
    city: x.city,
    name: x.name,
    cat: isCat(x.cat) ? x.cat : catFromText(x.type, x.name),
    note: x.note ?? null,
    lat: typeof x.lat === "number" ? x.lat : null,
    lng: typeof x.lng === "number" ? x.lng : null,
    google_place_id: x.google_place_id ?? null,
    photo: x.photo ?? null,
    maps_uri: x.maps_uri ?? null,
    type: x.type ?? null,
    address: x.address ?? null,
    source: x.source ?? "text",
    source_url: x.source_url ?? null,
    source_handle: x.source_handle ?? null,
    planned_for: x.planned_for ?? null,
    created_at: drop.created_at,
  };
}

/** A tip as the browser sends it, checked field by field; null when it is not usable. */
export function cleanTip(raw: unknown): TipExtracted | null {
  const x = raw as Partial<TipExtracted> | null;
  if (!x || typeof x !== "object" || typeof x.name !== "string" || !x.name.trim() || typeof x.city !== "string" || !/^[a-z0-9-]{2,40}$/.test(x.city)) return null;
  const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const sources: TipSource[] = ["maps", "instagram", "text", "screenshot", "list"];
  const planned = str(x.planned_for, 10);
  return {
    city: x.city,
    name: x.name.trim().slice(0, 120),
    cat: isCat(x.cat) ? x.cat : catFromText(x.type, x.name),
    note: str(x.note, 500),
    lat: num(x.lat),
    lng: num(x.lng),
    google_place_id: str(x.google_place_id, 200),
    photo: str(x.photo, 300),
    maps_uri: str(x.maps_uri, 500),
    type: str(x.type, 80),
    address: str(x.address, 200),
    source: sources.includes(x.source as TipSource) ? (x.source as TipSource) : "text",
    source_url: str(x.source_url, 500),
    source_handle: str(x.source_handle, 60),
    planned_for: planned && /^\d{4}-\d{2}-\d{2}$/.test(planned) ? planned : null,
  };
}

const CATS: SpotCat[] = ["cafe", "bakery", "food", "sweets", "bar", "shop", "book", "park", "culture", "market", "view", "spa", "transit"];
export const isCat = (c: unknown): c is SpotCat => typeof c === "string" && (CATS as string[]).includes(c);

/* ----------------------------------------------------- categorising */

/** A category from any free-text type: a Google primary type, a Tabelog genre, a saved-list category, a library kind. */
export function catFromText(...texts: (string | null | undefined)[]): SpotCat {
  const t = texts.filter(Boolean).join(" ").toLowerCase();
  if (/bakery|bread|boulanger|donut|doughnut|pastry|pâtisserie|patisserie/.test(t)) return "bakery";
  if (/coffee|café|cafe|kissaten|roaster|tea house|teahouse|tea room|matcha/.test(t)) return "cafe";
  if (/dessert|sweets|ice cream|gelato|parfait|wagashi|cake|chocolate|crepe|crêpe|pancake|taiyaki|anmitsu|confection/.test(t)) return "sweets";
  if (/\bbar\b|pub|izakaya|cocktail|wine|sake|brewery|beer|club|jazz|whisky|whiskey|vinyl/.test(t)) return "bar";
  if (/book|library/.test(t)) return "book";
  if (/market|depachika|food hall|fish market/.test(t)) return "market";
  if (/museum|gallery|temple|shrine|jingu|castle|theatre|theater|kabuki|sumo|art|class|workshop|experience|event|sight|landmark/.test(t)) return "culture";
  if (/park|garden|nature|river|pond|cemetery|hike|mountain/.test(t)) return "park";
  if (/observation|deck|viewpoint|tower|skytree|sky|bridge|view/.test(t)) return "view";
  if (/spa|onsen|sento|bath|sauna|salon|massage/.test(t)) return "spa";
  if (/\bstation\b|airport|transit|train/.test(t)) return "transit";
  if (/shop|store|boutique|stationery|ceramic|vintage|thrift|clothing|fashion|department|mall|craft|gift|souvenir|knife|kitchenware|record|antique|goods/.test(t)) return "shop";
  if (/restaurant|sushi|ramen|tempura|soba|udon|yakitori|tonkatsu|unagi|eel|grill|steak|curry|pizza|italian|french|chinese|bistro|dining|kaiseki|okonomiyaki|gyoza|noodle|food|meal|lunch|dinner|breakfast|brunch|diner|burger|sandwich|kitchen/.test(t)) return "food";
  return "food";
}

/** When a pin naturally goes, from its category (opening hours refine it in the sheet). */
export function whenOf(cat: SpotCat): When {
  switch (cat) {
    case "cafe":
    case "bakery":
    case "market":
      return "morning";
    case "bar":
    case "view":
      return "evening";
    case "culture":
    case "park":
    case "shop":
    case "book":
    case "sweets":
    case "spa":
      return "afternoon";
    default:
      return "any";
  }
}

/* ------------------------------------------------------ the layers */

type Snap = Pick<Snapshot, "versions" | "regions" | "places" | "days" | "calendar" | "food_list">;

export const thePlan = (snap: Pick<Snapshot, "versions">): Version | null => snap.versions.find((v) => v.status === "plan") ?? null;

/** The route's days in a region, as the plan describes them. */
export function cityDays(region: string, snap: Snap): PlannedDay[] {
  const plan = thePlan(snap);
  return plan ? planDays(plan, snap).filter((d) => d.region === region) : [];
}

/** The stop numbers and date ranges for a region ("Stop 1 · 20–24 Dec and 7–9 Jan"). */
export function cityStays(region: string, snap: Pick<Snapshot, "versions">): { stop: number; from: string; to: string }[] {
  const plan = thePlan(snap);
  if (!plan) return [];
  const seen: string[] = [];
  return plan.stays
    .map((s) => {
      if (!seen.includes(s.region)) seen.push(s.region);
      return { stop: seen.indexOf(s.region) + 1, region: s.region, from: s.from, to: s.to };
    })
    .filter((s) => s.region === region)
    .map(({ stop, from, to }) => ({ stop, from, to }));
}

/** Plan pins: every library place on one of the region's days, with the day it is on. */
export function planPins(region: string, snap: Snap): Pin[] {
  const regionName = snap.regions.find((r) => r.id === region)?.name ?? region;
  const places = new Map(snap.places.map((p) => [p.id, p]));
  const out = new Map<string, Pin>();
  for (const d of cityDays(region, snap))
    for (const it of d.items) {
      const p = it.place_id ? places.get(it.place_id) : undefined;
      if (!p || out.has(p.id)) continue;
      out.set(p.id, {
        id: `plan:${p.id}`,
        layer: "plan",
        name: p.name,
        cat: catFromPlace(p),
        query: `${p.name}, ${regionName}, Japan`,
        line: p.why,
        area: null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        ref: { kind: "place", id: p.id },
        date: d.date,
      });
    }
  return [...out.values()];
}

export function catFromPlace(p: Pick<Place, "kind" | "name" | "food">): SpotCat {
  if (p.kind === "food") return catFromText(p.food?.type, p.name);
  return catFromText(p.kind, p.name);
}

/** Walk pins for a city: Tokyo has the Neighborhood Guide walks; other cities none yet. */
export function walkPins(region: string): Pin[] {
  if (region !== "tokyo") return [];
  return WALKS.flatMap((w) =>
    w.spots
      .filter((s) => s.cat !== "transit")
      .map((s): Pin => ({ id: `walk:${s.id}`, layer: "walk", name: s.name, cat: s.cat, query: s.query, line: s.note, area: HOODS[s.hood]?.name ?? null, walk: w.n, ref: { kind: "spot", id: s.id } })),
  );
}

export function walkPinFromSpot(s: Spot): Pin {
  return { id: `walk:${s.id}`, layer: "walk", name: s.name, cat: s.cat, query: s.query, line: s.note, area: HOODS[s.hood]?.name ?? null, walk: s.walk, ref: { kind: "spot", id: s.id } };
}

/** Food-guide pins: the deep guide's restaurants and shops for the region's guide cities. */
export function guidePins(region: string): Pin[] {
  const out: Pin[] = [];
  for (const city of citiesFor(region)) {
    const c: DeepCity | undefined = DEEP_CITIES[city];
    if (!c) continue;
    for (const p of c.places ?? [])
      out.push({ id: `guide:${city}/${slugify(p.name)}`, layer: "guide", name: p.name, cat: catFromText(p.genre, p.name), query: p.query ?? `${p.name}, ${c.name}, Japan`, line: p.glance ?? firstSentence(p.why), area: shortArea(p.area), ref: { kind: "deep", city, name: p.name } });
    for (const s of c.shops ?? [])
      out.push({ id: `shop:${city}/${slugify(s.name)}`, layer: "guide", name: s.name, cat: catFromText("shop", s.what, s.name), query: s.query ?? `${s.name}, ${c.name}, Japan`, line: firstSentence(s.what), area: null, ref: { kind: "shop", city, name: s.name } });
  }
  return out;
}

/** The family's own layer: the saved Google Maps list (Tokyo) and every tip for the city. */
export function ourPins(region: string, snap: Snap, tips: Tip[]): Pin[] {
  const out: Pin[] = [];
  if (region === "tokyo")
    for (const f of snap.food_list) out.push(listPin(f));
  for (const t of tips)
    if (t.city === region)
      out.push({
        id: `tip:${t.id}`,
        layer: "ours",
        name: t.name,
        cat: isCat(t.cat) ? t.cat : catFromText(t.type, t.name),
        query: t.name,
        line: t.note,
        area: null,
        lat: t.lat,
        lng: t.lng,
        photo: t.photo,
        ref: { kind: "tip", id: t.id },
        date: t.planned_for,
        author: t.author_id,
      });
  return out;
}

export function listPin(f: FoodListItem): Pin {
  const verify = /verify on map/i.test(f.area);
  return {
    id: `list:${slugify(f.n)}`,
    layer: "ours",
    name: f.n,
    cat: catFromText(f.cat, f.n),
    query: verify ? `${f.n} Tokyo` : `${f.n}, ${f.area}, Tokyo`,
    line: `${f.cat}${f.rating && f.rating !== "—" ? ` · ★ ${f.rating}` : ""}`,
    area: verify ? null : f.area,
    ref: { kind: "list", name: f.n },
  };
}

export function allPins(region: string, snap: Snap, tips: Tip[]): Pin[] {
  return [...planPins(region, snap), ...walkPins(region), ...guidePins(region), ...ourPins(region, snap, tips)];
}

/* ------------------------------------------------- hearts and notes */

/**
 * Hearts and notes live on the thing itself, so a walk spot saved on /tokyo
 * and a plan place saved on its page show here too; guide places and tips
 * get their own target.
 */
export function targetOf(pin: Pin): { type: Comment["target_type"]; id: string } {
  if (pin.ref.kind === "spot") return { type: "walk", id: pin.ref.id };
  if (pin.ref.kind === "place") return { type: "place", id: pin.ref.id };
  return { type: "pin", id: pin.id };
}

export const targetKey = (type: string, id: string) => `${type}:${id}`;

/** Who saved what, keyed by target: "walk:<spot>", "place:<id>", "pin:<pin id>". */
export function heartsByTarget(reactions: Reaction[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const r of reactions) {
    if (r.kind !== "heart") continue;
    const k = targetKey(r.target_type, r.target_id);
    const list = out.get(k) ?? [];
    if (!list.includes(r.traveller_id)) list.push(r.traveller_id);
    out.set(k, list);
  }
  return out;
}

export function savedBy(pin: Pin, hearts: Map<string, string[]>): string[] {
  const t = targetOf(pin);
  return hearts.get(targetKey(t.type, t.id)) ?? [];
}

/* ------------------------------------------------------ geography */

export interface CityArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** The walks through it (Tokyo). */
  walks: number[];
}

type NeighbourhoodFile = { stops: Record<string, { areas: { id: string; name: string; lat: number; lng: number }[] }> };

/** The named areas of a city: Tokyo's walk neighbourhoods plus the stay areas; other cities their stay areas. */
export function cityAreas(region: string): CityArea[] {
  const out = new Map<string, CityArea>();
  if (region === "tokyo") for (const h of Object.values(HOODS) as Hood[]) out.set(h.id, { id: h.id, name: h.name, lat: h.lat, lng: h.lng, walks: WALKS.filter((w) => w.hoods.includes(h.id)).map((w) => w.n) });
  const stop = (neighbourhoods as NeighbourhoodFile).stops[region];
  const known = (cityAreasData as unknown as Record<string, { id: string; name: string; lat: number; lng: number }[]>)[region] ?? [];
  for (const a of [...(stop?.areas ?? []), ...known]) {
    // An area that sits on one we already have keeps the first entry (a walk neighbourhood, a stay area).
    const near = [...out.values()].find((x) => distanceKm(x, a) < 0.6);
    if (!near) out.set(a.id, { id: a.id, name: a.name.split(/ \(|\//)[0].trim(), lat: a.lat, lng: a.lng, walks: [] });
  }
  return [...out.values()];
}

export function nearestArea(p: { lat: number; lng: number }, areas: CityArea[]): { area: CityArea; km: number } | null {
  let best: { area: CityArea; km: number } | null = null;
  for (const a of areas) {
    const km = distanceKm(p, a);
    if (!best || km < best.km) best = { area: a, km };
  }
  return best;
}

/* ------------------------------------------------------------ fit */

export interface Fit {
  /** Nearest named area, when within a short walk. */
  area: { name: string; km: number } | null;
  /** Walks through that area (Tokyo). */
  walks: number[];
  /** Plan days with something within walking distance: the day and the nearest thing on it. */
  days: { date: string; near: string; km: number }[];
  when: When;
}

const NEAR_KM = 1.2;

/**
 * Where a pin fits: the nearest area, the walks through it, and the plan
 * days with an item within walking distance (given those items' coordinates).
 */
export function fitOf(pin: Pin, coords: Record<string, { lat: number; lng: number }>, areas: CityArea[], days: PlannedDay[], placeCoords: Map<string, { lat: number; lng: number; name: string }>, pinsOnDays: Map<string, { lat: number; lng: number; name: string }[]> = new Map()): Fit {
  const at = pin.lat != null && pin.lng != null ? { lat: pin.lat, lng: pin.lng } : coords[pin.id];
  const when = whenOf(pin.cat);
  if (!at) return { area: null, walks: [], days: [], when };
  const near = nearestArea(at, areas);
  const area = near && near.km <= 1.6 ? { name: near.area.name, km: near.km } : null;
  const walks = near && near.km <= 1.6 ? near.area.walks : [];
  const out: Fit["days"] = [];
  for (const d of days) {
    let best: { near: string; km: number } | null = null;
    const things = [...d.items.map((it) => (it.place_id ? placeCoords.get(it.place_id) : undefined)).filter((x): x is { lat: number; lng: number; name: string } => !!x), ...(pinsOnDays.get(d.date) ?? [])];
    for (const t of things) {
      const km = distanceKm(at, t);
      if (km <= NEAR_KM && (!best || km < best.km)) best = { near: t.name, km };
    }
    if (best) out.push({ date: d.date, ...best });
  }
  return { area, walks, days: out, when };
}

/* ---------------------------------------------------------- helpers */

export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function firstSentence(t: string | undefined): string | null {
  if (!t) return null;
  const first = t.split(/(?<=[.!?])\s/)[0];
  return first.length > 110 ? first.slice(0, 108) + "…" : first;
}

function shortArea(area: string | undefined): string | null {
  if (!area) return null;
  const parts = area.split(" · ");
  return (parts.length > 1 ? parts.slice(1).join(" · ") : area).replace(/\s*\(.*\)$/, "");
}

/** Pull a searchable name out of a Google Maps link; short links need expanding first. */
export function nameFromMapsUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const place = u.pathname.match(/\/maps\/place\/([^/]+)/);
    if (place) return decodeURIComponent(place[1].replace(/\+/g, " "));
    const q = u.searchParams.get("q") ?? u.searchParams.get("query");
    if (q && !/^-?\d/.test(q)) return q;
    const search = u.pathname.match(/\/maps\/search\/([^/]+)/);
    if (search) return decodeURIComponent(search[1].replace(/\+/g, " "));
  } catch {}
  return null;
}

export function isMapsUrl(s: string): boolean {
  return /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(s.trim());
}

export function isInstagramUrl(s: string): boolean {
  return /^https?:\/\/(www\.)?instagram\.com\//i.test(s.trim());
}

/** Google Takeout "Saved" CSV: Title,Note,URL,Comment (one file per list). */
export function parseSavedCsv(text: string): { title: string; note: string | null; url: string | null }[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const ti = header.indexOf("title");
  const ni = header.indexOf("note");
  const ui = header.indexOf("url");
  const ci = header.indexOf("comment");
  const body = ti >= 0 ? rows.slice(1) : rows;
  return body
    .map((r) => ({ title: (r[ti >= 0 ? ti : 0] ?? "").trim(), note: [r[ni], r[ci]].filter((x) => x && x.trim()).join(" · ") || null, url: (ui >= 0 ? r[ui] : r.find((x) => /^https?:/.test(x ?? ""))) ?.trim() || null }))
    .filter((r) => r.title);
}

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) out.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) out.push(row);
  return out;
}
