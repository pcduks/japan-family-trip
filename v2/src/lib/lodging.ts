/**
 * Where to stay, base by base, from data/lodging.json, plus search links that
 * open a booking site with our dates and six guests already filled in.
 */
import lodging from "../../data/lodging.json";
import type { Lodging, Region, Stay } from "./types";

export interface LodgingCandidate {
  name: string;
  url: string;
  tier: "budget" | "mid" | "top";
  area: string;
  what: string;
  price: string;
  fit: string;
  verified: boolean;
}

export interface RegionLodging {
  type: Lodging;
  why: string;
  fit: string;
  outlook: string;
  tiers: Record<"budget" | "mid" | "top", [number, number]>;
  candidates: LodgingCandidate[];
}

export const LODGING_GROUND_RULES = lodging.ground_rules as { title: string; text: string }[];
export const LODGING_TYPES = lodging.types as Record<Lodging, { label: string; blurb: string }>;
export const LODGING_RESEARCHED = lodging.researched;

export function lodgingFor(regionId: string): RegionLodging | null {
  return ((lodging.regions as Record<string, unknown>)[regionId] as RegionLodging | undefined) ?? null;
}

export const TIER_LABEL = { budget: "Budget", mid: "Mid", top: "Top" } as const;

export interface SearchLink {
  label: string;
  url: string;
  /** What the site is best for, in a few words. */
  note: string;
}

/** Booking and research links for a stay: dates and six guests pre-filled where the site allows it. */
export function searchLinks(stay: Pick<Stay, "region" | "from" | "to" | "lodging">, region: Region | undefined): SearchLink[] {
  const name = (region?.name ?? stay.region).replace(/,.*$/, "").replace(/ Onsen$/, " Onsen");
  const q = encodeURIComponent(`${name} Japan`);
  const plain = encodeURIComponent(name);
  const { lodging: type } = stay.lodging ? { lodging: stay.lodging } : { lodging: null };
  const out: SearchLink[] = [
    { label: "Booking.com", note: "free cancellation, English", url: `https://www.booking.com/searchresults.html?ss=${q}&checkin=${stay.from}&checkout=${stay.to}&group_adults=6&no_rooms=${type === "rental" ? 1 : 3}&group_children=0` },
    { label: "Google Hotels", note: "every site's price side by side", url: `https://www.google.com/travel/search?q=${encodeURIComponent(`${type === "ryokan" ? "ryokan" : type === "rental" ? "vacation rental" : "hotels"} in ${name}`)}&checkin=${stay.from}&checkout=${stay.to}&adults=6` },
  ];
  if (type === "rental" || type === null) {
    out.push({ label: "Airbnb", note: "whole houses; check the licence number", url: `https://www.airbnb.com/s/${plain}--Japan/homes?checkin=${stay.from}&checkout=${stay.to}&adults=6` });
  }
  if (type === "ryokan" || type === null) {
    out.push({ label: "Ikyu", note: "ryokan plans with meals, in English", url: `https://www.google.com/search?q=${encodeURIComponent(`site:ikyu.com/en-us ${name}`)}` });
    out.push({ label: "Rakuten Travel", note: "about 10% cheaper than Booking", url: `https://travel.rakuten.com/hotel/search/?f_keyword=${plain}` });
    out.push({ label: "Japanese Guest Houses", note: "agency that places two-room requests by email", url: `https://www.japaneseguesthouses.com/ryokan-search/?keyword=${plain}` });
  }
  out.push({ label: "Google Maps", note: "see where each one is", url: `https://www.google.com/maps/search/${encodeURIComponent(`${type === "ryokan" ? "ryokan" : "hotels"} ${name}`)}` });
  return out;
}
