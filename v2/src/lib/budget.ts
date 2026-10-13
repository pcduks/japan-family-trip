/**
 * The per-couple budget of a version, in SGD, flights excluded. Every rate
 * comes from data/budget.json so the family can read the assumptions and the
 * planners can change one number and see every version move.
 */
import rates from "../../data/budget.json";
import { dateRange } from "./dates";
import { legBetween } from "./legs";
import type { Lodging, Pace, Region, Stay, Version } from "./types";

type Rates = typeof rates;
export const BUDGET_RATES: Rates = rates;

export interface StayCost {
  region: string;
  lodging: Lodging;
  /** True when the stay had no lodging set and the type was inferred. */
  inferred: boolean;
  nights: number;
  /** Plain nightly rate for six, before the New Year uplift. */
  perNight: number;
  /** Total for six, uplift included. */
  total: number;
  /** Nights that carry a New Year surcharge. */
  upliftNights: number;
}

export interface Budget {
  currency: { jpyPerSgd: number; asOf: string };
  targetPerCoupleSgd: number;
  /** Per couple, in JPY. */
  lodging: number;
  food: number;
  activities: number;
  localTransport: number;
  fares: number;
  luggage: number;
  extras: number;
  totalJpy: number;
  totalSgd: number;
  perCoupleSgd: number;
  /** Positive = under the target. */
  headroomSgd: number;
  stays: StayCost[];
  days: number;
  ryokanDays: number;
  moves: number;
}

/** What a stay with no lodging set would most likely be: a ryokan in an onsen town, else a hotel. */
export function inferLodging(stay: Pick<Stay, "region" | "lodging">): { lodging: Lodging; inferred: boolean } {
  if (stay.lodging) return { lodging: stay.lodging, inferred: false };
  return { lodging: (rates.onsen_regions as string[]).includes(stay.region) ? "ryokan" : "hotel", inferred: true };
}

export function nightlyRate(region: string, lodging: Lodging): number {
  const table = (rates.lodging_per_night_for_six as Record<string, Record<Lodging, number>>)[region];
  return table?.[lodging] ?? rates.default_lodging_per_night_for_six[lodging];
}

function upliftFor(date: string, lodging: Lodging): number {
  const { full, half } = rates.new_year_uplift;
  if (full.dates.includes(date)) return full[lodging];
  if (half.dates.includes(date)) return half[lodging];
  return 0;
}

export function stayCost(stay: Stay): StayCost {
  const { lodging, inferred } = inferLodging(stay);
  const perNight = nightlyRate(stay.region, lodging);
  const nights = dateRange(stay.from, stay.to);
  let total = 0;
  let upliftNights = 0;
  for (const night of nights) {
    const u = upliftFor(night, lodging);
    if (u > 0) upliftNights++;
    total += perNight * (1 + u);
  }
  return { region: stay.region, lodging, inferred, nights: nights.length, perNight, total: Math.round(total), upliftNights };
}

export function farePerPerson(from: string, to: string, regions: Region[]): number {
  const table = rates.fares_per_person as Record<string, number>;
  const direct = table[`${from}>${to}`] ?? table[`${to}>${from}`];
  if (direct) return direct;
  return Math.round(legBetween(from, to, regions).hours * rates.fare_per_hour_fallback);
}

export function jpyToSgd(jpy: number): number {
  return Math.round(jpy / rates.currency.jpy_per_sgd);
}

/** The budget for one couple on this version: lodging split three ways, everything else for two. */
export function budgetOf(v: Pick<Version, "stays" | "pace">, regions: Region[]): Budget {
  const stays = v.stays.map(stayCost);
  const couples = rates.couples;
  const lodging = Math.round(stays.reduce((a, s) => a + s.total, 0) / couples);

  const nightsTotal = stays.reduce((a, s) => a + s.nights, 0);
  const days = nightsTotal + 1;
  const ryokanDays = stays.filter((s) => s.lodging === "ryokan").reduce((a, s) => a + s.nights, 0);
  const pace: Pace = v.pace;
  const foodDay = rates.food_per_person_per_day[pace];
  const food = 2 * ((days - ryokanDays) * foodDay + ryokanDays * rates.food_per_person_on_a_ryokan_day);
  const activities = 2 * days * rates.activities_per_person_per_day[pace];
  const localTransport = 2 * days * rates.local_transport_per_person_per_day;

  let fares = 0;
  let moves = 0;
  for (let i = 1; i < v.stays.length; i++) {
    const a = v.stays[i - 1].region;
    const b = v.stays[i].region;
    if (a === b) continue;
    moves++;
    fares += 2 * farePerPerson(a, b, regions);
  }
  // Arrival and departure airport legs (Narita Express or the Keikyu line): roughly the same for every version.
  fares += 2 * 2 * 3000;
  const luggage = moves * rates.cases_per_couple * rates.luggage_per_case_per_move;
  const extras = rates.extras_per_couple.jpy;

  const totalJpy = lodging + food + activities + localTransport + fares + luggage + extras;
  const perCoupleSgd = jpyToSgd(totalJpy);
  return {
    currency: { jpyPerSgd: rates.currency.jpy_per_sgd, asOf: rates.currency.as_of },
    targetPerCoupleSgd: rates.target_per_couple_sgd,
    lodging,
    food,
    activities,
    localTransport,
    fares,
    luggage,
    extras,
    totalJpy,
    totalSgd: perCoupleSgd * couples,
    perCoupleSgd,
    headroomSgd: rates.target_per_couple_sgd - perCoupleSgd,
    stays,
    days,
    ryokanDays,
    moves,
  };
}

export function fmtSgd(n: number): string {
  return `S$${Math.round(n).toLocaleString("en-SG")}`;
}

export function fmtJpy(n: number): string {
  return `¥${Math.round(n).toLocaleString("en-US")}`;
}

/** "¥110k" for tight spaces. */
export function fmtJpyShort(n: number): string {
  return n >= 1000 ? `¥${Math.round(n / 1000)}k` : fmtJpy(n);
}
