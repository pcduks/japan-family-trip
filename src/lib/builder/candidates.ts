/**
 * Base assignments consistent with the skeleton and the transit matrix.
 * Each candidate is stays + legs, with up to two day trips per block chosen by
 * wish demand. Capped at MAX_CANDIDATES by a cheap demand heuristic.
 */
import type { Base, ExperienceCard } from "../catalog/types";
import { findLeg, type Index, type WishMap } from "./common";
import { C_MOVE_DATE, NEAR_HND_MINUTES, NEAR_HND_MINUTES_WITH_E, skeletons, type Block, type Skeleton } from "./skeleton";
import { CALM_MOVE_DATES, EKIDEN_DATES, type ComfortRules, type DraftLeg, type DraftStay } from "./types";
import { addDays } from "./dates";

export const MAX_CANDIDATES = 400;
export const MAX_DAYTRIPS_PER_BLOCK = 2;
/** Her legs: never below this bump. */
export const MIN_LEG_BUMP = 3;
/** Calm-day moves (31 Dec / 1 Jan): easy legs only. */
export const CALM_MIN_BUMP = 4;
export const CALM_MAX_HOURS = 3;
export const MAX_BUS_BASES = 1;
export const MAX_LODGING_TIER = 2;

export interface Candidate {
  id: string;
  skeleton: Skeleton;
  stays: DraftStay[];
  legs: DraftLeg[];
  /** Distinct base slugs in order. */
  bases: string[];
}

export interface CandidateOptions {
  rules: ComfortRules;
  /** Forced Réveillon base. */
  nyChoice?: string;
  wishes: WishMap;
}

/* ----------------------------------------------------------- demand */

/** How much the family wants a card: must 3, like 1, no −1, × uniqueness. */
export function cardDemand(card: ExperienceCard, wishes: WishMap): number {
  let d = 0;
  for (const m of wishes.values()) {
    const a = m.get(card.id);
    if (a === "must") d += 3 * card.uniqueness;
    else if (a === "like") d += card.uniqueness;
    else if (a === "no") d -= card.uniqueness;
  }
  return d;
}

/** Day-trip slugs reachable from a base, ranked by demand, positive only. */
export function daytripsFor(ix: Index, base: string, wishes: WishMap, max = MAX_DAYTRIPS_PER_BLOCK): string[] {
  const demand = new Map<string, number>();
  for (const card of ix.cards.values()) {
    if (!card.place_slug || card.place_slug === base || !card.bases.includes(base)) continue;
    demand.set(card.place_slug, (demand.get(card.place_slug) ?? 0) + cardDemand(card, wishes));
  }
  return [...demand.entries()]
    .filter(([, d]) => d > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([slug]) => slug);
}

/** Demand reachable from a set of bases (each card counted once). */
export function routeDemand(ix: Index, stays: DraftStay[], wishes: WishMap): number {
  let total = 0;
  const allowed = new Map<string, Set<string>>();
  for (const s of stays) {
    const set = allowed.get(s.place) ?? new Set<string>([s.place]);
    for (const d of s.daytrips) set.add(d);
    allowed.set(s.place, set);
  }
  for (const card of ix.cards.values()) {
    const ok = card.bases.some((b) => allowed.has(b) && (!card.place_slug || allowed.get(b)!.has(card.place_slug)));
    if (ok) total += Math.max(0, cardDemand(card, wishes));
  }
  return total;
}

/* ------------------------------------------------------- eligibility */

function blockOk(block: Block, base: Base, rules: ComfortRules, nyChoice: string | undefined, hasE: boolean): boolean {
  if (block.fixed) return base.slug === block.fixed;
  if (base.lodging_tier > MAX_LODGING_TIER) return false;
  if (block.ny) {
    if (base.hospital.minutes > rules.hospital_minutes) return false;
    if (rules.ny_perinatal_city && !base.hospital.perinatal) return false;
    if (!(base.kitchen || base.ny_tier === 1)) return false;
    if (base.slug === "hakone") return false; // Ekiden 2–3 Jan
    if (block.reveillon && nyChoice && base.slug !== nyChoice) return false;
  }
  if (block.last) {
    const m = base.to_hnd_minutes;
    if (m == null) return false;
    if (hasE) {
      if (m <= NEAR_HND_MINUTES || m > NEAR_HND_MINUTES_WITH_E) return false;
    } else if (m > NEAR_HND_MINUTES) return false;
    const end = addDays(block.startDate, block.nights);
    if (base.slug === "hakone" && EKIDEN_DATES.some((d) => d >= block.startDate && d < end)) return false;
  }
  return true;
}

function legOk(ix: Index, from: string, to: string, date: string, rules: ComfortRules): DraftLeg | null {
  const leg = findLeg(ix, from, to);
  if (!leg || leg.no_route) return null;
  if (leg.hours_d2d > rules.max_transit_hours) return null;
  if (leg.bump < MIN_LEG_BUMP) return null;
  if (leg.flags.includes("flight") && !(date === C_MOVE_DATE && to === "tokyo")) return null;
  if (CALM_MOVE_DATES.includes(date) && (leg.bump < CALM_MIN_BUMP || leg.hours_d2d > CALM_MAX_HOURS)) return null;
  return { date, from, to, leg };
}

/* ------------------------------------------------------- enumeration */

export function enumerateCandidates(ix: Index, opts: CandidateOptions): Candidate[] {
  const bases = [...ix.bases.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  const out: Candidate[] = [];
  const daytripCache = new Map<string, string[]>();
  const trips = (slug: string) => {
    let t = daytripCache.get(slug);
    if (!t) daytripCache.set(slug, (t = daytripsFor(ix, slug, opts.wishes)));
    return t;
  };

  for (const sk of skeletons()) {
    const hasE = sk.blocks.some((b) => b.key === "E");
    const choices = sk.blocks.map((block) => bases.filter((b) => blockOk(block, b, opts.rules, opts.nyChoice, hasE)));
    const walk = (i: number, picked: Base[], legs: DraftLeg[], busCount: number) => {
      if (i === sk.blocks.length) {
        const stays: DraftStay[] = sk.blocks.map((block, k) => ({
          place: picked[k].slug,
          startDate: block.startDate,
          nights: block.nights,
          via: [],
          daytrips: block.key === "E" ? [] : trips(picked[k].slug),
        }));
        const slugs = [...new Set(picked.map((b) => b.slug))];
        out.push({ id: `${sk.id}:${picked.map((b) => b.slug).join(">")}`, skeleton: sk, stays, legs, bases: slugs });
        return;
      }
      const block = sk.blocks[i];
      for (const base of choices[i]) {
        const prev = picked[i - 1];
        if (prev && prev.slug === base.slug) continue;
        const bus = busCount + (base.bus_dependent && !picked.some((p) => p.slug === base.slug) ? 1 : 0);
        if (bus > MAX_BUS_BASES) continue;
        let leg: DraftLeg | null = null;
        if (prev) {
          leg = legOk(ix, prev.slug, base.slug, block.startDate, opts.rules);
          if (!leg) continue;
        }
        walk(i + 1, [...picked, base], leg ? [...legs, leg] : legs, bus);
      }
    };
    walk(0, [], [], 0);
  }

  if (out.length <= MAX_CANDIDATES) return out;
  const scored = out.map((c) => ({ c, d: routeDemand(ix, c.stays, opts.wishes) }));
  scored.sort((a, b) => b.d - a.d || a.c.id.localeCompare(b.c.id));
  return scored.slice(0, MAX_CANDIDATES).map((s) => s.c);
}
