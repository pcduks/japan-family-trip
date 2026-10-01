/**
 * Route builder contract. Pure data: no I/O, no React, runs in the browser
 * (demo mode) and in a route handler alike.
 */
import type { Catalog, TransitLeg, Who } from "../catalog/types";

export type TravellerId = string;

/** The six travellers as the builder sees them: an id plus the catalog role. */
export interface BuilderTraveller {
  id: TravellerId;
  name: string;
  who: Who;
}

export type WishAnswer = "no" | "like" | "must";

export interface Wish {
  traveller_id: TravellerId;
  card_id: string;
  answer: WishAnswer;
}

export interface Facts {
  walk_km: "bairro" | "cidade" | "trilha";
  stairs: boolean;
  midday_rest: "need" | "sometimes" | "no";
  food_limits: string[];
  early: boolean;
  /** Preferred Réveillon base (slug); when set, the NY block is forced to it. */
  ny_choice?: string;
}

/** Trip-wide comfort rules, entered by the planner. */
export interface ComfortRules {
  max_transit_hours: number;
  max_rail_legs_over_2h: number;
  rest_day_after_hours: number;
  max_walk_km: number;
  hospital_minutes: number;
  ny_perinatal_city: boolean;
}

export const DEFAULT_RULES: ComfortRules = {
  max_transit_hours: 4,
  max_rail_legs_over_2h: 1,
  rest_day_after_hours: 3,
  max_walk_km: 9,
  hospital_minutes: 30,
  ny_perinatal_city: true,
};

export type NameAxis = "neve" | "sul" | "lenta" | "cultura";

/** PlanStay-compatible: `planFromRoute`-style stays can be derived 1:1. */
export interface DraftStay {
  place: string;
  startDate: string;
  nights: number;
  via: string[];
  daytrips: string[];
}

export interface DraftLeg {
  date: string;
  from: string;
  to: string;
  leg: TransitLeg;
}

export interface Placement {
  date: string;
  card_id: string;
  who: TravellerId[];
  split_group: boolean;
  /** Card placed the same day for "her" while the others do this one. */
  parallel_card_id?: string;
}

export interface Coverage {
  must: { card_id: string; hit: boolean }[];
  like: number;
  no: number;
}

export interface DraftNumbers {
  nights_per_base: { base: string; nights: number }[];
  rest_days: number;
  longest_leg_hours: number;
  heaviest_walk_km: number;
  cost_per_couple_jpy: number;
  ny_base: string;
  ny_hospital_minutes: number;
}

export interface Deadline {
  date: string;
  what: string;
  card_id?: string;
}

export type ViolationCode =
  | "closed-on-date"
  | "outside-valid-window"
  | "anchors>2"
  | "duplicate-card"
  | "her-bump"
  | "her-hours"
  | "her-effort"
  | "no-rest-after-long-leg"
  | "leg>4h"
  | "two-rail-legs-over-2h"
  | "peak-move"
  | "bus-bases>1"
  | "no-hospital-ny"
  | "must-uncovered"
  | "budget"
  | "nights≠20"
  | "deadline-passed"
  | "no-route"
  | "last-base-far"
  | "ekiden"
  | "tokyo-ends";

export interface Violation {
  code: ViolationCode;
  date?: string;
  card_id?: string;
  who?: TravellerId;
  message_pt: string;
}

export interface Draft {
  id: string;
  name_axis: NameAxis;
  stays: DraftStay[];
  legs: DraftLeg[];
  placements: Placement[];
  coverage: Record<TravellerId, Coverage>;
  numbers: DraftNumbers;
  deadlines: Deadline[];
  violations: Violation[];
  score: number;
}

export interface BuildInput {
  catalog: Catalog;
  travellers: BuilderTraveller[];
  wishes: Wish[];
  facts: Record<TravellerId, Facts>;
  rules: ComfortRules;
  /** ISO date, for deadline checks. */
  today: string;
  /** Forced Réveillon base (slug) from the family's choice. */
  nyChoice?: string;
}

/* ------------------------------------------------------------ constants */

export const TRIP_START = "2026-12-20";
export const TRIP_END = "2027-01-09";
export const TRIP_NIGHTS = 20;
/** Six people all-in, per day. */
export const BUDGET_PER_DAY_JPY = 275_000;
/** Nights that must sleep in a perinatal city. */
export const NY_NIGHTS: [string, string] = ["2026-12-29", "2027-01-03"];
export const PEAK_MOVE_DATES = ["2026-12-27", "2026-12-28", "2026-12-29", "2026-12-30", "2027-01-02", "2027-01-03", "2027-01-04"];
export const CALM_MOVE_DATES = ["2026-12-31", "2027-01-01"];
export const EKIDEN_DATES = ["2027-01-02", "2027-01-03"];
export const LAST_NIGHT = "2027-01-08";
export const LAST_BASE_MAX_HND_MINUTES = 90;
