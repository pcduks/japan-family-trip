/**
 * Route validation: every rule the research made hard, as codes with PT-BR messages.
 * Pure: a Draft in, Violations out. Used by the builder and by the UI.
 */
import type { Catalog } from "./catalog/types";
import {
  baseOnDay,
  cardHours,
  effortCap,
  findLeg,
  her as findHer,
  indexCatalog,
  invalidOn,
  isParallel,
  midCost,
  mustNeeded,
  stayOnNight,
  walkCap,
  walkKm,
} from "./builder/common";
import { addDays, formatDay, stayEnd } from "./builder/dates";
import {
  BUDGET_PER_DAY_JPY,
  CALM_MOVE_DATES,
  EKIDEN_DATES,
  LAST_BASE_MAX_HND_MINUTES,
  LAST_NIGHT,
  NY_NIGHTS,
  PEAK_MOVE_DATES,
  TRIP_NIGHTS,
  TRIP_START,
  type BuilderTraveller,
  type ComfortRules,
  type Draft,
  type Facts,
  type TravellerId,
  type Violation,
} from "./builder/types";

export interface ValidateOptions {
  /** ISO date for deadline checks; defaults to the machine's date. */
  today?: string;
  facts?: Record<TravellerId, Facts>;
}

const NEAR_TOKYO_MAX_MINUTES = 150;

export function validate(
  draft: Pick<Draft, "stays" | "legs" | "placements" | "coverage" | "deadlines">,
  catalog: Catalog,
  travellers: BuilderTraveller[],
  rules: ComfortRules,
  opts: ValidateOptions = {},
): Violation[] {
  const ix = indexCatalog(catalog);
  const out: Violation[] = [];
  const her = findHer(travellers);
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const { stays, legs, placements } = draft;
  const baseName = (slug: string) => ix.bases.get(slug)?.name ?? slug;
  const cardName = (id: string) => ix.cards.get(id)?.name_pt ?? id;

  /* ---- shape: nights, ends */
  const nights = stays.reduce((a, s) => a + s.nights, 0);
  if (nights !== TRIP_NIGHTS)
    out.push({ code: "nights≠20", message_pt: `A soma dá ${nights} noites; a viagem tem ${TRIP_NIGHTS}.` });
  const first = stays[0];
  const last = stays[stays.length - 1];
  if (!first || first.place !== "tokyo" || first.startDate !== TRIP_START)
    out.push({ code: "tokyo-ends", date: TRIP_START, message_pt: "A viagem começa em Tokyo em 20 dez (voo fixo)." });
  if (last) {
    const lb = ix.bases.get(last.place);
    const minutes = lb?.to_hnd_minutes ?? Infinity;
    if (last.place !== "tokyo" && minutes > NEAR_TOKYO_MAX_MINUTES)
      out.push({ code: "tokyo-ends", date: LAST_NIGHT, message_pt: `A viagem termina em Tokyo ou perto (≤${NEAR_TOKYO_MAX_MINUTES} min de Haneda); ${baseName(last.place)} fica longe.` });
  }
  const lastNight = stayOnNight(stays, LAST_NIGHT);
  if (lastNight) {
    const minutes = ix.bases.get(lastNight.place)?.to_hnd_minutes;
    if (minutes == null || minutes > LAST_BASE_MAX_HND_MINUTES)
      out.push({
        code: "last-base-far",
        date: LAST_NIGHT,
        message_pt: `Noite de 8 jan em ${baseName(lastNight.place)}: mais de ${LAST_BASE_MAX_HND_MINUTES} min de Haneda num sábado de feriadão.`,
      });
  }

  /* ---- bases */
  const busBases = stays.filter((s) => ix.bases.get(s.place)?.bus_dependent).map((s) => s.place);
  if (new Set(busBases).size > 1)
    out.push({ code: "bus-bases>1", message_pt: `Mais de uma base que depende de ônibus reservado: ${[...new Set(busBases)].map(baseName).join(", ")}.` });

  for (const s of stays) {
    const b = ix.bases.get(s.place);
    const end = stayEnd(s);
    const inNy = s.startDate <= NY_NIGHTS[1] && end > NY_NIGHTS[0];
    if (!inNy) continue;
    const ok = b && b.hospital.minutes <= rules.hospital_minutes && (!rules.ny_perinatal_city || b.hospital.perinatal);
    if (!ok)
      out.push({
        code: "no-hospital-ny",
        date: s.startDate < NY_NIGHTS[0] ? NY_NIGHTS[0] : s.startDate,
        message_pt: `${baseName(s.place)} entre 29 dez e 3 jan sem hospital com obstetrícia 24 h a ≤${rules.hospital_minutes} min (clínicas fechadas no Ano-Novo).`,
      });
  }
  for (const s of stays) {
    const end = stayEnd(s);
    if (s.place === "hakone" && EKIDEN_DATES.some((d) => d >= s.startDate && d < end))
      out.push({ code: "ekiden", date: EKIDEN_DATES[0], message_pt: "Hakone em 2–3 jan: Ekiden, estradas fechadas e hospedagem esgotada." });
  }

  /* ---- legs */
  for (let i = 1; i < stays.length; i++) {
    const s = stays[i];
    const leg = legs.find((l) => l.date === s.startDate && l.to === s.place);
    if (!leg) {
      const t = findLeg(ix, stays[i - 1].place, s.place);
      if (!t || t.no_route)
        out.push({ code: "no-route", date: s.startDate, message_pt: `Sem trajeto razoável de ${baseName(stays[i - 1].place)} para ${baseName(s.place)}.` });
    }
  }
  for (const l of legs) {
    const t = l.leg;
    if (t.no_route)
      out.push({ code: "no-route", date: l.date, message_pt: `Sem trajeto razoável de ${baseName(l.from)} para ${baseName(l.to)}.` });
    if (t.hours_d2d > rules.max_transit_hours)
      out.push({ code: "leg>4h", date: l.date, message_pt: `${formatDay(l.date)}: ${baseName(l.from)} → ${baseName(l.to)} leva ~${t.hours_d2d} h porta a porta (limite ${rules.max_transit_hours} h).` });
    if (PEAK_MOVE_DATES.includes(l.date))
      out.push({ code: "peak-move", date: l.date, message_pt: `Mudança em ${formatDay(l.date)}, dia de pico nos trens (27–30 dez, 2–4 jan).` });
    else if (CALM_MOVE_DATES.includes(l.date) && (t.bump < 4 || t.hours_d2d > 3))
      out.push({ code: "peak-move", date: l.date, message_pt: `Mudança em ${formatDay(l.date)} só vale num trajeto fácil para ela (≤3 h, bump ≥4).` });
    if (EKIDEN_DATES.includes(l.date) && (t.flags.includes("ekiden") || l.to === "hakone" || l.from === "hakone"))
      out.push({ code: "ekiden", date: l.date, message_pt: `Trajeto por Hakone em ${formatDay(l.date)}: Ekiden.` });
  }
  const byDate = new Map<string, number>();
  for (const l of legs) {
    const rail = !l.leg.flags.includes("flight") && !/bus|car|drive|ferry|flight/i.test(l.leg.mode);
    if (rail && l.leg.hours_d2d > 2) byDate.set(l.date, (byDate.get(l.date) ?? 0) + 1);
  }
  for (const [date, n] of byDate)
    if (n > rules.max_rail_legs_over_2h)
      out.push({ code: "two-rail-legs-over-2h", date, message_pt: `${formatDay(date)}: ${n} trechos de trem com mais de 2 h no mesmo dia.` });

  /* ---- placements: validity, duplicates, anchors */
  const seen = new Set<string>();
  const anchorsByDate = new Map<string, number>();
  for (const p of placements) {
    const card = ix.cards.get(p.card_id);
    if (!card) continue;
    if (seen.has(p.card_id))
      out.push({ code: "duplicate-card", date: p.date, card_id: p.card_id, message_pt: `${cardName(p.card_id)} aparece duas vezes no roteiro.` });
    seen.add(p.card_id);
    const why = invalidOn(card, p.date);
    if (why === "closed-on-date")
      out.push({ code: why, date: p.date, card_id: p.card_id, message_pt: `${cardName(p.card_id)} está fechado em ${formatDay(p.date)}.` });
    else if (why === "outside-valid-window")
      out.push({ code: why, date: p.date, card_id: p.card_id, message_pt: `${cardName(p.card_id)} não acontece em ${formatDay(p.date)}.` });
    if (card.anchor && !isParallel(p, placements)) anchorsByDate.set(p.date, (anchorsByDate.get(p.date) ?? 0) + 1);
    if (EKIDEN_DATES.includes(p.date) && card.place_slug === "hakone")
      out.push({ code: "ekiden", date: p.date, card_id: p.card_id, message_pt: `${cardName(p.card_id)} em Hakone em ${formatDay(p.date)}: Ekiden.` });
    const dl = deadlineFor(card.booking, p.date);
    if (dl && dl < today)
      out.push({ code: "deadline-passed", date: dl, card_id: p.card_id, message_pt: `${cardName(p.card_id)}: prazo de reserva (${formatDay(dl)}) já passou.` });
  }
  for (const [date, n] of anchorsByDate)
    if (n > 2) out.push({ code: "anchors>2", date, message_pt: `${formatDay(date)} tem ${n} âncoras; o máximo é 2.` });

  /* ---- her days */
  if (her) {
    const hf = opts.facts?.[her.id];
    const cap = walkCap(hf, rules.max_walk_km);
    const eCap = effortCap(hf);
    const days = new Map<string, { hours: number; km: number; n: number; heavy: string[] }>();
    for (const p of placements) {
      const card = ix.cards.get(p.card_id);
      if (!card || !p.who.includes(her.id)) continue;
      if (card.bump_ok <= 2 && !p.parallel_card_id)
        out.push({ code: "her-bump", date: p.date, card_id: p.card_id, who: her.id, message_pt: `${cardName(p.card_id)} não é para ela (bump ${card.bump_ok}) e não tem alternativa paralela.` });
      const d = days.get(p.date) ?? { hours: 0, km: 0, n: 0, heavy: [] };
      d.hours += cardHours(card);
      d.km += walkKm(card);
      d.n += 1;
      if (card.effort > eCap) d.heavy.push(p.card_id);
      days.set(p.date, d);
    }
    for (const [date, d] of days) {
      if (d.hours > 8) out.push({ code: "her-hours", date, who: her.id, message_pt: `${formatDay(date)}: ${d.hours} h de programa para ela (máximo 8 h).` });
      if (d.km > cap)
        out.push({ code: "her-effort", date, who: her.id, message_pt: `${formatDay(date)}: ~${d.km.toFixed(1)} km a pé para ela (limite ${cap} km).` });
      for (const c of d.heavy)
        out.push({ code: "her-effort", date, card_id: c, who: her.id, message_pt: `${cardName(c)} pede esforço ${ix.cards.get(c)?.effort} — acima do que ela aguenta.` });
    }
    for (const l of legs) {
      if (l.leg.hours_d2d < rules.rest_day_after_hours) continue;
      const next = addDays(l.date, 1);
      const hersNext = placements.filter((p) => p.date === next && p.who.includes(her.id));
      const heavy = hersNext.length > 1 || hersNext.some((p) => (ix.cards.get(p.card_id)?.effort ?? 0) > 2 || ix.cards.get(p.card_id)?.anchor);
      if (heavy)
        out.push({ code: "no-rest-after-long-leg", date: next, who: her.id, message_pt: `${formatDay(next)} devia ser dia de descanso depois de ~${l.leg.hours_d2d} h de viagem (nada antes das 11:00, no máximo um programa leve).` });
    }
  }

  /* ---- must coverage */
  for (const t of travellers) {
    const cov = draft.coverage[t.id];
    if (!cov || !cov.must.length) continue;
    const hits = cov.must.filter((m) => m.hit).length;
    if (hits < mustNeeded(cov.must.length))
      out.push({
        code: "must-uncovered",
        who: t.id,
        message_pt: `${t.name} fica só com ${hits} de ${cov.must.length} "tem que acontecer": falta ${cov.must.filter((m) => !m.hit).map((m) => cardName(m.card_id)).join(", ")}.`,
      });
  }

  /* ---- budget */
  const total = tripCost(draft, catalog);
  if (total > BUDGET_PER_DAY_JPY * TRIP_NIGHTS)
    out.push({ code: "budget", message_pt: `Custo estimado ¥${Math.round(total / TRIP_NIGHTS).toLocaleString("pt-BR")}/dia para os seis; o teto é ¥${BUDGET_PER_DAY_JPY.toLocaleString("pt-BR")}.` });

  /* ---- deadlines passed in the draft's own list */
  for (const d of draft.deadlines ?? [])
    if (d.date < today && !out.some((v) => v.code === "deadline-passed" && v.card_id === d.card_id && d.card_id))
      out.push({ code: "deadline-passed", date: d.date, card_id: d.card_id, message_pt: `${d.what}: prazo (${formatDay(d.date)}) já passou.` });

  return out;
}

/** Booking deadline for a card placed on `date`: explicit deadline, else date − lead_days. */
export function deadlineFor(booking: { lead_days: number | null; deadline?: string }, date: string): string | null {
  if (booking?.deadline) return booking.deadline;
  if (booking?.lead_days != null && booking.lead_days > 0) return addDays(date, -booking.lead_days);
  return null;
}

/** Six all-in: nights at the base's mid price + card costs × people on it + legs × 6. */
export function tripCost(draft: Pick<Draft, "stays" | "legs" | "placements">, catalog: Catalog): number {
  const ix = indexCatalog(catalog);
  let total = 0;
  for (const s of draft.stays) {
    const b = ix.bases.get(s.place);
    if (b) total += s.nights * midCost(b);
  }
  for (const p of draft.placements) {
    const c = ix.cards.get(p.card_id);
    if (c?.cost_pp_jpy) total += c.cost_pp_jpy * p.who.length;
  }
  for (const l of draft.legs) total += (l.leg.yen_pp ?? 0) * 6;
  return total;
}

export { baseOnDay };
