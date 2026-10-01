/**
 * Scoring, naming and diversity.
 *
 *   person_i = max(0.1, 1 + Σ like·uniqueness − 3·Σ no)   over placed cards (must counts as like)
 *   score    = Π_i person_i
 *            × fairness   (min share < 0.6·max share → ×0.5)
 *            × bookability (all bases tier 1 → 1; any tier 2 → 0.8; tier 3 → 0.5)
 *            × budget     (linear: 1 − overrun/¥275k per day, floor 0.05)
 *            × transit    (×0.9 per LD leg, ×0.9 per calm-date move, ×0.5 per peak-date move)
 */
import type { Catalog } from "../catalog/types";
import { tripCost } from "../validate";
import { indexCatalog, type Index, type WishMap } from "./common";
import { BUDGET_PER_DAY_JPY, CALM_MOVE_DATES, PEAK_MOVE_DATES, TRIP_NIGHTS, type BuilderTraveller, type Draft, type NameAxis, type TravellerId } from "./types";

export const FAIRNESS_MIN_SHARE = 0.6;
export const FAIRNESS_PENALTY = 0.5;
export const PERSON_FLOOR = 0.1;
export const DIVERSITY_MAX_JACCARD = 0.5;
export const SNOW_CARDS_FOR_NEVE = 3;

export interface ScoreBreakdown {
  persons: Record<TravellerId, number>;
  product: number;
  fairness: number;
  bookability: number;
  budget: number;
  transit: number;
  score: number;
}

export function personTerm(draft: Pick<Draft, "placements">, id: TravellerId, ix: Index, wishes: WishMap): number {
  const mine = wishes.get(id);
  let t = 1;
  if (!mine) return t;
  for (const p of draft.placements) {
    const a = mine.get(p.card_id);
    if (!a) continue;
    const card = ix.cards.get(p.card_id);
    if (!card) continue;
    if (a === "no") t -= 3;
    else if (p.who.includes(id)) t += card.uniqueness;
  }
  return Math.max(PERSON_FLOOR, t);
}

export function scoreDraft(
  draft: Pick<Draft, "stays" | "legs" | "placements">,
  catalog: Catalog,
  travellers: BuilderTraveller[],
  wishes: WishMap,
  ix: Index = indexCatalog(catalog),
): ScoreBreakdown {
  const persons: Record<TravellerId, number> = {};
  let product = 1;
  for (const t of travellers) {
    const v = personTerm(draft, t.id, ix, wishes);
    persons[t.id] = v;
    product *= v;
  }
  const terms = Object.values(persons);
  const sum = terms.reduce((a, b) => a + b, 0) || 1;
  const shares = terms.map((v) => v / sum);
  const fairness = Math.min(...shares) >= FAIRNESS_MIN_SHARE * Math.max(...shares) ? 1 : FAIRNESS_PENALTY;

  const tier = Math.max(1, ...draft.stays.map((s) => ix.bases.get(s.place)?.lodging_tier ?? 1));
  const bookability = tier === 1 ? 1 : tier === 2 ? 0.8 : 0.5;

  const perDay = tripCost(draft, catalog) / TRIP_NIGHTS;
  const budget = perDay <= BUDGET_PER_DAY_JPY ? 1 : Math.max(0.05, 1 - (perDay - BUDGET_PER_DAY_JPY) / BUDGET_PER_DAY_JPY);

  let transit = 1;
  for (const l of draft.legs) {
    if (l.leg.flags.includes("LD")) transit *= 0.9;
    if (PEAK_MOVE_DATES.includes(l.date)) transit *= 0.5;
    else if (CALM_MOVE_DATES.includes(l.date)) transit *= 0.9;
  }

  return { persons, product, fairness, bookability, budget, transit, score: product * fairness * bookability * budget * transit };
}

/* ------------------------------------------------------------ naming */

export function nameAxis(draft: Pick<Draft, "stays" | "placements" | "numbers">, ix: Index): NameAxis {
  const snow = draft.placements.filter((p) => ix.cards.get(p.card_id)?.tags.some((t) => t === "snow" || t === "ski")).length;
  if (snow >= SNOW_CARDS_FOR_NEVE) return "neve";
  const south = draft.stays.some((s) => /kyushu|kyūshū|setouchi|san'?yo/i.test(ix.bases.get(s.place)?.region ?? ""));
  if (south) return "sul";
  const bases = new Set(draft.stays.map((s) => s.place)).size;
  if (bases <= 3 && draft.numbers.rest_days >= 3) return "lenta";
  return "cultura";
}

/* --------------------------------------------------------- diversity */

export function jaccard(a: Iterable<string>, b: Iterable<string>): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 1;
}

/** Bases that were a choice: Tokyo starts (and often ends) every route, so it carries no information. */
export const chosenBases = (d: Pick<Draft, "stays">): Set<string> => new Set(d.stays.map((s) => s.place).filter((p) => p !== "tokyo"));
const baseSet = chosenBases;

/**
 * Up to `n` drafts from a score-sorted list: first strict (Jaccard of the
 * chosen bases < 0.5 and distinct axis), then relaxing the axis, then the base
 * overlap, so the family still sees up to three routes when the catalog is narrow.
 */
export function pickDiverse(sorted: Draft[], n = 3): Draft[] {
  const picked: Draft[] = [];
  const passes: ((d: Draft) => boolean)[] = [
    (d) => picked.every((p) => jaccard(baseSet(p), baseSet(d)) < DIVERSITY_MAX_JACCARD && p.name_axis !== d.name_axis),
    (d) => picked.every((p) => jaccard(baseSet(p), baseSet(d)) < DIVERSITY_MAX_JACCARD),
    (d) => picked.every((p) => jaccard(baseSet(p), baseSet(d)) < 0.75),
    (d) => picked.every((p) => p.id !== d.id && jaccard(baseSet(p), baseSet(d)) < 1),
  ];
  for (const ok of passes) {
    for (const d of sorted) {
      if (picked.length >= n) return picked;
      if (picked.includes(d)) continue;
      if (ok(d)) picked.push(d);
    }
  }
  return picked;
}
