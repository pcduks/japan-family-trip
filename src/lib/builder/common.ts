/**
 * Lookups shared by validate, fill and score. Pure functions over the catalog.
 */
import type { Base, Catalog, ExperienceCard, TransitLeg } from "../catalog/types";
import { stayEnd, weekdayOf } from "./dates";
import type { BuilderTraveller, DraftStay, Facts, Placement, TravellerId, Wish } from "./types";

export interface Index {
  cards: Map<string, ExperienceCard>;
  bases: Map<string, Base>;
  transit: Map<string, TransitLeg>;
}

export function indexCatalog(catalog: Catalog): Index {
  const transit = new Map<string, TransitLeg>();
  for (const leg of catalog.transit) {
    transit.set(`${leg.from}>${leg.to}`, leg);
    // The matrix may be given one way only; the reverse is assumed symmetric.
    const rev = `${leg.to}>${leg.from}`;
    if (!transit.has(rev)) transit.set(rev, { ...leg, from: leg.to, to: leg.from });
  }
  // Explicit entries win over the inferred reverse.
  for (const leg of catalog.transit) transit.set(`${leg.from}>${leg.to}`, leg);
  return {
    cards: new Map(catalog.cards.map((c) => [c.id, c])),
    bases: new Map(catalog.bases.map((b) => [b.slug, b])),
    transit,
  };
}

/** The leg between two bases, or null when the matrix has none (= no route). */
export function findLeg(ix: Index, from: string, to: string): TransitLeg | null {
  return ix.transit.get(`${from}>${to}`) ?? null;
}

export const her = (travellers: BuilderTraveller[]): BuilderTraveller | undefined => travellers.find((t) => t.who === "her");

/** The stay whose night covers `date` (sleeping there that night). */
export function stayOnNight(stays: DraftStay[], date: string): DraftStay | undefined {
  return stays.find((s) => date >= s.startDate && date < stayEnd(s));
}

/** The base a traveller is at on a given day: the stay sleeping that night, else the last stay (departure day). */
export function baseOnDay(stays: DraftStay[], date: string): string | undefined {
  return stayOnNight(stays, date)?.place ?? (stays.length && date >= stayEnd(stays[stays.length - 1]) ? stays[stays.length - 1].place : undefined);
}

/* ------------------------------------------------------ card validity */

export type Invalidity = "closed-on-date" | "outside-valid-window" | null;

/** Why a card cannot happen on this date, or null when it can. */
export function invalidOn(card: ExperienceCard, date: string): Invalidity {
  const v = card.valid ?? {};
  if (v.from && date < v.from) return "outside-valid-window";
  if (v.to && date > v.to) return "outside-valid-window";
  if (v.only && v.only.length && !v.only.includes(date)) return "outside-valid-window";
  if (v.closed && v.closed.includes(date)) return "closed-on-date";
  if (v.weekdays && v.weekdays.length && !v.weekdays.includes(weekdayOf(date))) return "closed-on-date";
  if (card.ny_status?.[date] === "closed") return "closed-on-date";
  return null;
}

export const cardHours = (card: ExperienceCard): number => (card.hours === "overnight" ? 0 : card.hours);

/**
 * Walking estimate: cards carry no km, so effort × hours stands in
 * (effort 1 ≈ 0.4 km/h seated-ish … effort 5 ≈ 2 km/h on your feet), capped at 8 km per card.
 */
export function walkKm(card: ExperienceCard): number {
  const perHour = [0, 0.4, 0.8, 1.2, 1.6, 2.0][card.effort] ?? 1;
  return Math.min(8, Math.round(perHour * Math.min(cardHours(card), 8) * 10) / 10);
}

/** Her daily walking cap: her own tolerance, never above the trip rule. */
export function walkCap(facts: Facts | undefined, ruleMax: number): number {
  const own = facts ? { bairro: 4, cidade: 8, trilha: 12 }[facts.walk_km] : ruleMax;
  return Math.min(own, ruleMax);
}

/** Her maximum effort on a card: trail walkers take 4, city walkers 3, neighbourhood walkers 2. */
export function effortCap(facts: Facts | undefined): number {
  if (!facts) return 3;
  return { bairro: 2, cidade: 3, trilha: 4 }[facts.walk_km];
}

export const isParallel = (p: Placement, all: Placement[]): boolean => all.some((q) => q !== p && q.parallel_card_id === p.card_id && q.date === p.date);

/* ----------------------------------------------------------- wishes */

export type WishMap = Map<TravellerId, Map<string, Wish["answer"]>>;

export function wishMap(wishes: Wish[]): WishMap {
  const m: WishMap = new Map();
  for (const w of wishes) {
    if (!m.has(w.traveller_id)) m.set(w.traveller_id, new Map());
    m.get(w.traveller_id)!.set(w.card_id, w.answer);
  }
  return m;
}

export function musts(wm: WishMap, id: TravellerId): string[] {
  return [...(wm.get(id) ?? new Map()).entries()].filter(([, a]) => a === "must").map(([c]) => c);
}

/** Minimum must-hits a person needs: 2 of 3, both of 2, the one of 1. */
export const mustNeeded = (count: number) => Math.min(count, 2);

export function midCost(b: Base): number {
  return (b.cost_night_6[0] + b.cost_night_6[1]) / 2;
}
