/**
 * Which part of town to stay in, stop by stop (data/neighbourhoods.json), and
 * search links that land in that part of town with our dates and seven guests.
 */
import data from "../../data/neighbourhoods.json";
import type { Stay } from "./types";

export interface Neighbourhood {
  id: string;
  name: string;
  /** What to type into a booking site to land in this area. */
  search: string;
  lat: number;
  lng: number;
  what_its_like: string;
  good_for_us: string[];
  watch_out: string[];
  to_the_plans: string;
  station: string;
  price: "lower" | "middle" | "higher";
}

export interface StopAreas {
  pick: string;
  why_pick: string;
  areas: Neighbourhood[];
  tips: string[];
  sources: { label: string; url: string }[];
}

const STOPS = (data as { stops: Record<string, StopAreas> }).stops;
export const NEIGHBOURHOODS_RESEARCHED = (data as { researched: string }).researched;

/** By stop key ("tokyo", "tokyo:2"); a later visit to a town falls back to the first one's advice. */
export function areasFor(stopKey: string): StopAreas | null {
  return STOPS[stopKey] ?? STOPS[stopKey.split(":")[0]] ?? null;
}

export function pickOf(s: StopAreas): Neighbourhood | undefined {
  return s.areas.find((a) => a.id === s.pick) ?? s.areas[0];
}

/** Booking.com, Airbnb and Google Maps, aimed at one part of town. */
export function areaLinks(a: Neighbourhood, stay: Pick<Stay, "from" | "to" | "lodging">): { label: string; url: string }[] {
  const q = encodeURIComponent(a.search);
  const rooms = stay.lodging === "rental" ? 1 : 4;
  const out = [{ label: "Hotels here", url: `https://www.booking.com/searchresults.html?ss=${q}&checkin=${stay.from}&checkout=${stay.to}&group_adults=7&no_rooms=${rooms}&group_children=0` }];
  if (stay.lodging !== "ryokan") out.push({ label: "Houses here", url: `https://www.airbnb.com/s/${encodeURIComponent(a.search.replace(/,\s*/g, "--"))}/homes?checkin=${stay.from}&checkout=${stay.to}&adults=7` });
  out.push({ label: "On the map", url: `https://www.google.com/maps/search/${encodeURIComponent(stay.lodging === "ryokan" ? "ryokan" : "hotels")}/@${a.lat},${a.lng},16z` });
  return out;
}
