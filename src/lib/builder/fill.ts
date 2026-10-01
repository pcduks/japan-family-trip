/**
 * Day filling: places cards on the candidate's days. Every feasible "must"
 * first, then the best-valued cards day by day, under her limits and the
 * day-shape rules (≤2 anchors + ≤2 fillers, rest after a long leg, split
 * cards get a parallel card for her or are skipped). No card twice.
 */
import type { ExperienceCard } from "../catalog/types";
import { deadlineFor } from "../validate";
import { cardHours, effortCap, invalidOn, musts, stayOnNight, walkCap, walkKm, type Index, type WishMap } from "./common";
import { addDays, tripDates } from "./dates";
import { TRIP_END, TRIP_START, type BuilderTraveller, type ComfortRules, type DraftLeg, type DraftStay, type Facts, type Placement, type TravellerId } from "./types";

export interface FillInput {
  ix: Index;
  stays: DraftStay[];
  legs: DraftLeg[];
  travellers: BuilderTraveller[];
  wishes: WishMap;
  facts: Record<TravellerId, Facts>;
  rules: ComfortRules;
  today: string;
}

export interface DayShape {
  date: string;
  base: string;
  /** Places cards may be at: the base plus its chosen day trips. */
  allowed: Set<string>;
  anchors: number;
  fillers: number;
  /** Rest day (after a ≥3 h leg) or move day: light cards only. */
  light: boolean;
  move: boolean;
}

export const HER_MAX_HOURS = 8;
export const HER_MAX_HOURS_REST_NEED = 6;
export const MOVE_DAY_FILLER_MAX_HOURS = 2.5;

/** The shape of every day 20 Dec … 8 Jan (9 Jan is the flight home). */
export function dayShapes(stays: DraftStay[], legs: DraftLeg[], rules: ComfortRules): DayShape[] {
  const out: DayShape[] = [];
  for (const date of tripDates()) {
    if (date === TRIP_END) continue;
    const stay = stayOnNight(stays, date);
    if (!stay) continue;
    const leg = legs.find((l) => l.date === date);
    const prevLeg = legs.find((l) => l.date === addDays(date, -1));
    const rest = !!prevLeg && prevLeg.leg.hours_d2d >= rules.rest_day_after_hours;
    const arrival = date === TRIP_START;
    let anchors = 2;
    let fillers = 2;
    if (leg) {
      anchors = 0;
      fillers = leg.leg.hours_d2d <= MOVE_DAY_FILLER_MAX_HOURS ? 1 : 0;
    } else if (rest || arrival) {
      anchors = 0;
      fillers = 1;
    }
    out.push({ date, base: stay.place, allowed: new Set([stay.place, ...stay.daytrips]), anchors, fillers, light: rest || arrival || !!leg, move: !!leg });
  }
  return out;
}

interface HerDay {
  hours: number;
  km: number;
  n: number;
}

interface State {
  used: Set<string>;
  placements: Placement[];
  her: Map<string, HerDay>;
  anchorsLeft: Map<string, number>;
  fillersLeft: Map<string, number>;
  /** The one place a day's cards share (base or a single day trip), once fixed. */
  placeOf: Map<string, string>;
}

/** Group value of a card: must 3·u, like u, no −3 (over everyone who answered). */
export function cardValue(card: ExperienceCard, wishes: WishMap): number {
  let v = 0;
  for (const m of wishes.values()) {
    const a = m.get(card.id);
    if (a === "must") v += 3 * card.uniqueness;
    else if (a === "like") v += card.uniqueness;
    else if (a === "no") v -= 3;
  }
  return v;
}

export function fill(input: FillInput): Placement[] {
  const { ix, travellers, wishes, rules, today } = input;
  const her = travellers.find((t) => t.who === "her");
  const herFacts = her ? input.facts[her.id] : undefined;
  const herHoursCap = herFacts?.midday_rest === "need" ? HER_MAX_HOURS_REST_NEED : HER_MAX_HOURS;
  const herKmCap = walkCap(herFacts, rules.max_walk_km);
  const herEffortCap = effortCap(herFacts);
  const days = dayShapes(input.stays, input.legs, rules);
  const state: State = {
    used: new Set(),
    placements: [],
    her: new Map(),
    anchorsLeft: new Map(days.map((d) => [d.date, d.anchors])),
    fillersLeft: new Map(days.map((d) => [d.date, d.fillers])),
    placeOf: new Map(),
  };
  const answer = (id: TravellerId, card: string) => wishes.get(id)?.get(card);

  /** A card sits on a day only at the day's single place (base or one day trip). */
  const placeOk = (card: ExperienceCard, day: DayShape): boolean => {
    if (!card.bases.includes(day.base)) return false;
    if (!card.place_slug) return true;
    const fixed = state.placeOf.get(day.date);
    return fixed ? card.place_slug === fixed : day.allowed.has(card.place_slug);
  };

  const eligible = (card: ExperienceCard, day: DayShape): boolean => {
    if (state.used.has(card.id)) return false;
    if (!placeOk(card, day)) return false;
    if (invalidOn(card, day.date)) return false;
    if (day.light && (card.anchor || card.effort > 2)) return false;
    const dl = deadlineFor(card.booking, day.date);
    if (dl && dl < today) return false;
    const slot = card.anchor ? state.anchorsLeft : state.fillersLeft;
    return (slot.get(day.date) ?? 0) > 0;
  };

  const herDay = (date: string): HerDay => state.her.get(date) ?? { hours: 0, km: 0, n: 0 };

  const herFits = (card: ExperienceCard, day: DayShape): boolean => {
    if (!her) return false;
    if (card.bump_ok <= 2 || card.effort > herEffortCap) return false;
    if (answer(her.id, card.id) === "no") return false;
    const d = herDay(day.date);
    if (day.light && d.n >= 1) return false;
    return d.hours + cardHours(card) <= herHoursCap && d.km + walkKm(card) <= herKmCap;
  };

  const addHer = (card: ExperienceCard, date: string) => {
    const d = herDay(date);
    state.her.set(date, { hours: d.hours + cardHours(card), km: d.km + walkKm(card), n: d.n + 1 });
  };

  /** Best parallel card for her on a day: indoor or effort ≤2, suitable, unused. */
  const parallelFor = (day: DayShape, main: ExperienceCard): ExperienceCard | null => {
    let best: ExperienceCard | null = null;
    let bestV = -Infinity;
    for (const card of ix.cards.values()) {
      if (card.id === main.id || state.used.has(card.id)) continue;
      if (!(card.indoor === "in" || card.effort <= 2)) continue;
      if (day.light && (card.anchor || card.effort > 2)) continue;
      if (!placeOk(card, day) || (card.place_slug && main.place_slug && card.place_slug !== main.place_slug)) continue;
      if (invalidOn(card, day.date)) continue;
      if (!herFits(card, day)) continue;
      const a = her ? answer(her.id, card.id) : undefined;
      const v = (a === "must" ? 3 : a === "like" ? 1 : 0) * card.uniqueness - card.effort * 0.1;
      if (v > bestV || (v === bestV && best && card.id < best.id)) {
        best = card;
        bestV = v;
      }
    }
    return best;
  };

  /** Try to place a card on a day; returns true when placed. */
  const place = (card: ExperienceCard, day: DayShape): boolean => {
    if (!eligible(card, day)) return false;
    const goers = travellers.filter((t) => answer(t.id, card.id) !== "no").map((t) => t.id);
    let who = goers;
    let split = card.split_group;
    let parallel: ExperienceCard | null = null;
    if (her && goers.includes(her.id)) {
      if (card.split_group || !herFits(card, day)) {
        who = goers.filter((id) => id !== her.id);
        split = true;
        parallel = parallelFor(day, card);
        if (!parallel) return false;
      }
    } else if (her && card.split_group && goers.length) {
      split = true; // she said no; the fit four go, no parallel needed
    }
    if (!who.length) return false;
    const slot = card.anchor ? state.anchorsLeft : state.fillersLeft;
    slot.set(day.date, (slot.get(day.date) ?? 0) - 1);
    state.used.add(card.id);
    const placeToday = card.place_slug ?? parallel?.place_slug;
    if (placeToday) state.placeOf.set(day.date, placeToday);
    const p: Placement = { date: day.date, card_id: card.id, who, split_group: split };
    if (parallel && her) {
      p.parallel_card_id = parallel.id;
      state.used.add(parallel.id);
      state.placements.push({ date: day.date, card_id: parallel.id, who: [her.id], split_group: true });
      addHer(parallel, day.date);
    } else if (her && who.includes(her.id)) addHer(card, day.date);
    state.placements.push(p);
    return true;
  };

  /* ---- phase 1: every feasible must */
  const mustCount = new Map<string, number>();
  for (const t of travellers) for (const id of musts(wishes, t.id)) mustCount.set(id, (mustCount.get(id) ?? 0) + 1);
  const mustCards = [...mustCount.keys()]
    .map((id) => ix.cards.get(id))
    .filter((c): c is ExperienceCard => !!c)
    .sort((a, b) => (mustCount.get(b.id) ?? 0) - (mustCount.get(a.id) ?? 0) || b.uniqueness - a.uniqueness || a.id.localeCompare(b.id));
  const room = (d: DayShape) => (state.anchorsLeft.get(d.date) ?? 0) + (state.fillersLeft.get(d.date) ?? 0);
  for (const card of mustCards) {
    // Full days first, then the emptiest, then the earliest; a date-locked card has few options anyway.
    const order = [...days].sort((a, b) => Number(a.light) - Number(b.light) || room(b) - room(a) || a.date.localeCompare(b.date));
    for (const day of order) if (place(card, day)) break;
  }

  /* ---- phase 2: best value, one card per day per round so the good ones spread */
  const ranked = [...ix.cards.values()]
    .map((card) => ({ card, v: cardValue(card, wishes) }))
    .filter((x) => x.v >= 0)
    .sort((a, b) => b.v - a.v || b.card.uniqueness - a.card.uniqueness || a.card.id.localeCompare(b.card.id));
  for (let round = 0; round < 4; round++) {
    for (const day of days) {
      if (room(day) <= 0) continue;
      for (const { card } of ranked) if (place(card, day)) break;
    }
  }

  return state.placements.sort((a, b) => a.date.localeCompare(b.date) || a.card_id.localeCompare(b.card_id));
}
