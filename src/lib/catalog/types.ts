/**
 * The experience catalog: what Japan offers between 20 Dec 2026 and 9 Jan 2027,
 * researched and dated. Read-only JSON in data/, imported from docs/research.
 * Dates are ISO (YYYY-MM-DD) inside the trip window.
 */

export type Confidence = "A" | "B" | "C"; // A announced for 2026/27, B last year's pattern, C inferred
export type NyStatus = "open" | "reduced" | "closed" | "event" | "unknown";
export type Who = "her" | "parents" | "bros" | "pedro";

export interface ExperienceCard {
  id: string; // research id, e.g. "NW-KAN-01", "KS-08"
  name_pt: string;
  name_en: string;
  /** One line of plain promise, PT-BR, for the card. */
  promise_pt: string;
  region: string;
  /** Existing trip place slug when the card maps onto one, else null. */
  place_slug: string | null;
  /** Base slugs the card can be done from (sleeping there or as a day trip). */
  bases: string[];
  /** Validity inside the trip window. Missing from/to = whole window. */
  valid: { from?: string; to?: string; only?: string[]; weekdays?: number[]; closed?: string[] };
  /** Status by date for 28 Dec–5 Jan, from the closures research. */
  ny_status: Record<string, NyStatus>;
  /** 1 = not for her, 5 = effortless. */
  bump_ok: 1 | 2 | 3 | 4 | 5;
  /** When the card splits: rating for the fit four. */
  bump_ok_alt?: 1 | 2 | 3 | 4 | 5;
  effort: 1 | 2 | 3 | 4 | 5;
  indoor: "in" | "out" | "mixed";
  cost_pp_jpy: number | null;
  cost_note?: string;
  /** Hours on the day, or "overnight" for stays. */
  hours: number | "overnight";
  booking: { lead_days: number | null; deadline?: string; how?: string };
  uniqueness: 1 | 2 | 3 | 4 | 5;
  /** True when the card only works for part of the group. */
  split_group: boolean;
  suits_default: Who[];
  /** Anchors shape a day (≥3 h or uniqueness ≥4); fillers don't. */
  anchor: boolean;
  tags: string[]; // onsen, snow, food, ski, shrine, art, market, view, lights, ride…
  /** Card deck group for Desejos; null = not in the 36-card trunk. */
  deck_group: "noite-tranquila" | "dia-de-rua" | "natureza" | "comida" | "reveillon" | "neve" | null;
  deck_order?: number;
  photo_query?: string;
  confidence: Confidence;
  source: string;
  verified_at: string;
  needs_review: string[];
}

export interface Base {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  hospital: { name: string; minutes: number; perinatal: boolean };
  kitchen: boolean;
  /** 1 = apartment/large hotel still bookable for six, 2 = tight, 3 = effectively gone. */
  lodging_tier: 1 | 2 | 3;
  ny_tier?: 1 | 2 | 3;
  bus_dependent: boolean;
  airport: "HND" | "KIX" | "FUK" | "ITM" | null;
  /** Typical cost for six per night, JPY [low, high], outside NY surcharge. */
  cost_night_6: [number, number];
  /** Minutes to Haneda door-to-door, for the last block. */
  to_hnd_minutes: number | null;
  tags: string[];
  source: string;
}

export type TransitFlag = "LD" | "BUS" | "all_reserved" | "ekiden" | "flight";

export interface TransitLeg {
  from: string;
  to: string;
  mode: string;
  hours_d2d: number;
  transfers: number;
  /** 1 = never for her, 5 = easy. */
  bump: 1 | 2 | 3 | 4 | 5;
  yen_pp: number | null;
  flags: TransitFlag[];
  /** True for pairs that should never be routed directly. */
  no_route?: boolean;
  note?: string;
}

export interface Catalog {
  cards: ExperienceCard[];
  bases: Base[];
  transit: TransitLeg[];
  generated_at: string;
}
