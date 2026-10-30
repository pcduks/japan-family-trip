/** Area editorial (data/areas.json) and the research catalogue cards (src/data/catalog.json). */
import areasJson from "../../data/areas.json";
import catalogJson from "../data/catalog.json";

export interface KnownFor {
  title: string;
  blurb: string;
  place?: string;
}
/** Is it for us this trip: on our route, a day trip from a stop, a swap for one stop, or another time. */
export interface Verdict {
  state: "route" | "daytrip" | "swap" | "later";
  /** Ten words or fewer, in plain words. */
  headline: string;
  /** Two or three sentences: what is lovely first, then the honest reason. */
  text: string;
  /** How it fits: the stop and dates, the trip out, or when it would be its own trip. */
  fit: string;
  /** The route that does it, when one exists. */
  route?: string;
}
export const VERDICT_LABEL: Record<Verdict["state"], string> = { route: "On our route", daytrip: "A day out", swap: "Would mean a change", later: "Another trip" };

export interface AreaInfo {
  prefecture: string;
  tags: string[];
  known_for: KnownFor[];
  window: string[];
  feel: string;
  getting_there: string;
  for_her: string;
  /** route | near | north | alps | west | south */
  zone: string;
  /** tokyo-fuji | alps | kansai | west | north | south */
  region?: string;
  /** What you do there, in a few words. */
  do_line?: string;
  verdict?: Verdict;
  /** Other names people know it by: Fushimi Inari for Kyoto, Niseko for Hokkaido. */
  aliases?: string[];
  /** One of the places most first trips to Japan go. */
  famous?: boolean;
}
export interface RegionMeta {
  name: string;
  /** What this part of Japan is like. */
  line: string;
  /** Our take: how much of the trip is here. */
  our_take: string;
}
export interface HeardOf {
  name: string;
  note: string;
  area: string | null;
}
export interface CatalogCard {
  id: string;
  name: string;
  name_pt: string;
  area: string;
  base: string;
  dates: string;
  suits: string;
  bump: number | null;
  effort: number | null;
  indoor: string;
  cost: string;
  hours: string;
  lead: string;
  ny: string;
  uniqueness: number | null;
  source: string;
}

export interface FamousTile {
  title: string;
  areas: string[];
  caption: string;
  also?: { label: string; area: string };
}
const A = areasJson as unknown as { tags: Record<string, string>; zones: Record<string, string>; areas: Record<string, AreaInfo>; regions_meta?: Record<string, RegionMeta>; heard_of?: HeardOf[]; famous_tiles?: FamousTile[]; intro?: string };
export const AREA_TAGS = A.tags;
/** The six parts of Japan, in the order we travel through them. */
export const REGIONS: Record<string, RegionMeta> = A.regions_meta ?? {};
/** Famous names that are not areas of their own, each with an honest line. */
export const HEARD_OF: HeardOf[] = A.heard_of ?? [];
/** The places most first trips to Japan go, as tiles on the Places home. */
export const FAMOUS_TILES: FamousTile[] = A.famous_tiles ?? [];
export const PLACES_INTRO = A.intro ?? "";

/** Lower case, no accents: "Kyōto" finds Kyoto. */
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Heard of somewhere? Areas by name, id or another name people know them by, then famous names that are not areas. */
export function searchPlaces(q: string, names: Record<string, string>): { areas: string[]; heard: HeardOf[] } {
  const t = fold(q.trim());
  if (t.length < 2) return { areas: [], heard: [] };
  const areas = Object.keys(A.areas).filter((id) => [names[id] ?? id, id, ...(A.areas[id].aliases ?? [])].some((n) => fold(n).includes(t)));
  const heard = (A.heard_of ?? []).filter((h) => fold(h.name).includes(t));
  return { areas, heard };
}
/** Zone id → heading, in display order. */
export const ZONES: [string, string][] = Object.entries(A.zones);
export const CATALOG = catalogJson as CatalogCard[];

export function areaInfo(id: string): AreaInfo | null {
  return A.areas[id] ?? null;
}
export function cardsFor(id: string): CatalogCard[] {
  return CATALOG.filter((c) => c.area === id);
}
export function areaIds(): string[] {
  return Object.keys(A.areas);
}
/** A link for a catalogue source string, which is a bare domain or URL. */
export function sourceHref(s: string): string | null {
  const m = s.match(/[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?/i);
  if (!m) return null;
  return m[0].startsWith("http") ? m[0] : `https://${m[0]}`;
}
