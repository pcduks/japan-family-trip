/**
 * Route builder entry: wishes + facts + catalog → up to three validated drafts.
 * Pure; runs in the browser (demo mode) and in a route handler.
 */
import type { Catalog } from "../catalog/types";
import { deadlineFor, tripCost, validate } from "../validate";
import { enumerateCandidates, type Candidate } from "./candidates";
import { indexCatalog, musts, stayOnNight, walkKm, wishMap, type Index, type WishMap } from "./common";
import { formatDay, tripDates } from "./dates";
import { fill } from "./fill";
import { nameAxis, pickDiverse, scoreDraft } from "./score";
import { TRIP_END, type BuildInput, type BuilderTraveller, type Coverage, type Deadline, type Draft, type DraftNumbers, type Placement, type TravellerId } from "./types";

export type { BuildInput, Draft } from "./types";
export { validate } from "../validate";

export const MAX_DRAFTS = 3;

/* ---------------------------------------------------------- coverage */

export function coverageFor(placements: Placement[], travellers: BuilderTraveller[], wishes: WishMap): Record<TravellerId, Coverage> {
  const out: Record<TravellerId, Coverage> = {};
  for (const t of travellers) {
    const mine = wishes.get(t.id) ?? new Map<string, "no" | "like" | "must">();
    const must = musts(wishes, t.id).map((card_id) => ({ card_id, hit: placements.some((p) => p.card_id === card_id && p.who.includes(t.id)) }));
    let like = 0;
    let no = 0;
    for (const p of placements) {
      const a = mine.get(p.card_id);
      if (a === "like" && p.who.includes(t.id)) like++;
      else if (a === "no") no++;
    }
    out[t.id] = { must, like, no };
  }
  return out;
}

/* ----------------------------------------------------------- numbers */

export function numbersFor(c: Pick<Candidate, "stays" | "legs">, placements: Placement[], catalog: Catalog, travellers: BuilderTraveller[], ix: Index): DraftNumbers {
  const her = travellers.find((t) => t.who === "her");
  const nights = new Map<string, number>();
  for (const s of c.stays) nights.set(s.place, (nights.get(s.place) ?? 0) + s.nights);
  const herByDay = new Map<string, { km: number; n: number; anchors: number }>();
  for (const p of placements) {
    if (!her || !p.who.includes(her.id)) continue;
    const card = ix.cards.get(p.card_id);
    if (!card) continue;
    const d = herByDay.get(p.date) ?? { km: 0, n: 0, anchors: 0 };
    d.km += walkKm(card);
    d.n += 1;
    if (card.anchor) d.anchors += 1;
    herByDay.set(p.date, d);
  }
  // A rest day: no move, and she has at most one light (non-anchor) card.
  const moveDates = new Set(c.legs.map((l) => l.date));
  const rest_days = tripDates()
    .filter((d) => d !== TRIP_END && !moveDates.has(d))
    .filter((d) => {
      const h = herByDay.get(d);
      return !h || (h.n <= 1 && h.anchors === 0);
    }).length;
  const nyStay = stayOnNight(c.stays, "2026-12-31");
  const nyBase = nyStay ? ix.bases.get(nyStay.place) : undefined;
  return {
    nights_per_base: [...nights.entries()].map(([base, n]) => ({ base, nights: n })),
    rest_days,
    longest_leg_hours: Math.max(0, ...c.legs.map((l) => l.leg.hours_d2d)),
    heaviest_walk_km: Math.round(Math.max(0, ...[...herByDay.values()].map((d) => d.km)) * 10) / 10,
    cost_per_couple_jpy: Math.round(tripCost({ stays: c.stays, legs: c.legs, placements }, catalog) / 3),
    ny_base: nyStay?.place ?? "",
    ny_hospital_minutes: nyBase?.hospital.minutes ?? Infinity,
  };
}

export function deadlinesFor(placements: Placement[], ix: Index): Deadline[] {
  const out: Deadline[] = [];
  for (const p of placements) {
    const card = ix.cards.get(p.card_id);
    if (!card) continue;
    const date = deadlineFor(card.booking, p.date);
    if (date) out.push({ date, what: `Reservar ${card.name_pt}${card.booking.how ? ` (${card.booking.how})` : ""}`, card_id: card.id });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.card_id ?? "").localeCompare(b.card_id ?? ""));
}

/* ------------------------------------------------------------- build */

export function draftFromCandidate(c: Candidate, input: BuildInput, ix: Index, wishes: WishMap): Draft {
  const { catalog, travellers, rules, today } = input;
  const placements = fill({ ix, stays: c.stays, legs: c.legs, travellers, wishes, facts: input.facts, rules, today });
  const coverage = coverageFor(placements, travellers, wishes);
  const numbers = numbersFor(c, placements, catalog, travellers, ix);
  const deadlines = deadlinesFor(placements, ix);
  const partial = { id: c.id, stays: c.stays, legs: c.legs, placements, coverage, numbers, deadlines };
  const violations = validate(partial, catalog, travellers, rules, { today, facts: input.facts });
  const score = scoreDraft(partial, catalog, travellers, wishes, ix).score;
  const name_axis = nameAxis(partial, ix);
  return { ...partial, name_axis, violations, score };
}

/** Up to three validated drafts; when none passes, the best three with their violations attached. */
export function buildRoutes(input: BuildInput): Draft[] {
  const ix = indexCatalog(input.catalog);
  const wishes = wishMap(input.wishes);
  const nyChoice = input.nyChoice ?? Object.values(input.facts).find((f) => f.ny_choice)?.ny_choice;
  const candidates = enumerateCandidates(ix, { rules: input.rules, nyChoice, wishes });
  const drafts = candidates.map((c) => draftFromCandidate(c, input, ix, wishes));
  const clean = drafts.filter((d) => d.violations.length === 0);
  const pool = (clean.length ? clean : drafts).sort((a, b) => a.violations.length - b.violations.length || b.score - a.score || a.id.localeCompare(b.id));
  return pickDiverse(pool, MAX_DRAFTS);
}

/* ----------------------------------------------------------- explain */

const AXIS_PT: Record<Draft["name_axis"], string> = { neve: "País da neve", sul: "Rumo ao sul", lenta: "Viagem lenta", cultura: "Cidades e templos" };

const listPt = (items: string[]): string => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

/** Deterministic PT-BR rationale: the fallback pitch when no model writes one. */
export function explainDraft(draft: Draft, catalog: Catalog, travellers: BuilderTraveller[], wishes?: WishMap): string {
  const ix = indexCatalog(catalog);
  const name = (slug: string) => ix.bases.get(slug)?.name ?? slug;
  const cardName = (id: string) => ix.cards.get(id)?.name_pt ?? id;
  const lines: string[] = [];
  const bases = draft.numbers.nights_per_base.map((n) => `${name(n.base)} (${n.nights} ${n.nights === 1 ? "noite" : "noites"})`);
  lines.push(`${AXIS_PT[draft.name_axis]}: ${listPt(bases)}.`);
  const nyMin = draft.numbers.ny_hospital_minutes;
  lines.push(
    `Réveillon em ${name(draft.numbers.ny_base)}${Number.isFinite(nyMin) ? `, hospital a ${nyMin} min` : ""}. ` +
      `Trecho mais longo ${draft.numbers.longest_leg_hours} h porta a porta; ${draft.numbers.rest_days} dias de descanso; ` +
      `dia mais pesado para ela ~${draft.numbers.heaviest_walk_km} km a pé; ~¥${draft.numbers.cost_per_couple_jpy.toLocaleString("pt-BR")} por casal.`,
  );
  for (const t of travellers) {
    const cov = draft.coverage[t.id];
    const mine = wishes?.get(t.id);
    const placed = draft.placements.filter((p) => p.who.includes(t.id));
    const wins = placed
      .map((p) => ({ p, card: ix.cards.get(p.card_id) }))
      .filter(({ p, card }) => card && (cov?.must.some((m) => m.card_id === p.card_id && m.hit) || mine?.get(p.card_id) === "like"))
      .sort((a, b) => (b.card?.uniqueness ?? 0) - (a.card?.uniqueness ?? 0) || a.p.card_id.localeCompare(b.p.card_id))
      .slice(0, 3)
      .map(({ p }) => cardName(p.card_id));
    const losses = (cov?.must ?? [])
      .filter((m) => !m.hit)
      .map((m) => cardName(m.card_id))
      .concat(mine ? [...mine.entries()].filter(([id, a]) => a === "like" && !placed.some((p) => p.card_id === id)).map(([id]) => cardName(id)) : [])
      .slice(0, 2);
    lines.push(`${t.name} ganha: ${wins.length ? listPt(wins) : "o ritmo do grupo"}; abre mão de: ${losses.length ? listPt(losses) : "nada do que pediu"}.`);
  }
  const hers = travellers.find((t) => t.who === "her");
  if (hers) {
    const splits = draft.placements.filter((p) => p.parallel_card_id).length;
    if (splits) lines.push(`${splits} ${splits === 1 ? "dia dividido" : "dias divididos"}: os quatro fazem o programa pesado e ela tem um programa paralelo na mesma base.`);
  }
  if (draft.deadlines.length) lines.push(`Primeiro prazo: ${formatDay(draft.deadlines[0].date)} (${draft.deadlines[0].what}).`);
  if (draft.violations.length) lines.push(`Pendências: ${draft.violations.map((v) => v.message_pt).join(" ")}`);
  return lines.join("\n");
}
