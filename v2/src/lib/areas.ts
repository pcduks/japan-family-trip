/** Area editorial (data/areas.json) and the research catalogue cards (src/data/catalog.json). */
import areasJson from "../../data/areas.json";
import catalogJson from "../data/catalog.json";

export interface KnownFor {
  title: string;
  blurb: string;
  place?: string;
}
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

const A = areasJson as unknown as { tags: Record<string, string>; zones: Record<string, string>; areas: Record<string, AreaInfo> };
export const AREA_TAGS = A.tags;
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
