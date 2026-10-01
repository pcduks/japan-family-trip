/**
 * From the family's wishes to rows the app stores: runs the pure builder and
 * shapes each draft into a `plans` row (source "generated"), its activities
 * and the booking deadlines. No I/O; the caller writes the rows, so this works
 * in demo mode (localStorage) and against Supabase alike.
 */
import { loadChapters, type Chapter } from "../catalog/chapters";
import type { Catalog, Who } from "../catalog/types";
import type { WishProfile, Wish as WishRow } from "../family";
import type { Activity, Booking, GeneratedPlan, LegMode, Plan, PlanStay } from "../plan";
import { newId } from "../plan";
import type { Traveller } from "../types";
import { indexCatalog, wishMap } from "./common";
import { buildRoutes, explainDraft } from "./index";
import type { NarrativeInput } from "./narrative";
import { DEFAULT_RULES, type BuilderTraveller, type ComfortRules, type Draft, type Facts } from "./types";

/** Catalog role per traveller, from the couple keys: "pedro" (planner + partner), "irmao", "pais". */
export function whoFor(travellers: Traveller[]): BuilderTraveller[] {
  const planner = travellers.find((t) => t.role === "planner");
  const plannerCouple = planner?.couple ?? "pedro";
  return travellers.map((t) => {
    const c = (t.couple ?? "").toLowerCase();
    let who: Who;
    if (t.id === planner?.id) who = "pedro";
    else if (c && c === plannerCouple) who = "her";
    else if (/pai|parent|mae|mãe/.test(c)) who = "parents";
    else if (/irm|bro|sis|cunh/.test(c)) who = "bros";
    else who = "bros";
    return { id: t.id, name: t.name, who };
  });
}

export function factsFor(profile: WishProfile | undefined): Facts {
  const f = profile?.facts ?? {};
  return {
    walk_km: f.walk_km ?? "cidade",
    stairs: f.stairs ?? true,
    midday_rest: f.midday_rest ?? "sometimes",
    food_limits: f.food_limits ?? [],
    early: f.early ?? false,
    ny_choice: f.ny_choice,
  };
}

/** The Réveillon base most people asked for; ties go to the planner's partner. */
export function nyChoiceFor(profiles: WishProfile[], travellers: BuilderTraveller[]): string | undefined {
  const count = new Map<string, number>();
  for (const p of profiles) if (p.facts.ny_choice) count.set(p.facts.ny_choice, (count.get(p.facts.ny_choice) ?? 0) + 1);
  if (!count.size) return undefined;
  const her = travellers.find((t) => t.who === "her");
  const hers = profiles.find((p) => p.id === her?.id)?.facts.ny_choice;
  return [...count.entries()].sort((a, b) => b[1] - a[1] || (a[0] === hers ? -1 : b[0] === hers ? 1 : 0) || a[0].localeCompare(b[0]))[0][0];
}

const LEG_MODE: Record<string, LegMode> = { train: "train", shinkansen: "train", rail: "train", limited_express: "train", bus: "bus", car: "drive", drive: "drive", taxi: "drive", ferry: "ferry", flight: "flight", plane: "flight" };

export interface GeneratedBundle {
  plan: Omit<Plan, "id"> & { id: string };
  activities: Activity[];
  bookings: Booking[];
  narrative: NarrativeInput;
}

export interface GenerateOptions {
  catalog: Catalog;
  /** Defaults to data/chapters.json; tests pass their own. */
  chapters?: Chapter[];
  travellers: Traveller[];
  wishes: WishRow[];
  profiles: WishProfile[];
  rules?: Partial<ComfortRules>;
  today: string;
}

const AXIS_NAME: Record<Draft["name_axis"], string> = { neve: "País da neve", sul: "Rumo ao sul", lenta: "Viagem lenta", cultura: "Cidades e templos" };
const AXIS_COLOR: Record<Draft["name_axis"], string> = { neve: "#2f5d8a", sul: "#c8452b", lenta: "#5b7a4e", cultura: "#7a4e7a" };

/** Runs the builder and shapes up to three plans with their rows. */
export function generatePlans(o: GenerateOptions): GeneratedBundle[] {
  const travellers = whoFor(o.travellers);
  const facts: Record<string, Facts> = {};
  for (const t of travellers) facts[t.id] = factsFor(o.profiles.find((p) => p.id === t.id));
  const rules: ComfortRules = { ...DEFAULT_RULES, ...stripRules(o.rules) };
  const wishes = impliedWishes(
    o.wishes.map((w) => ({ traveller_id: w.traveller_id, card_id: w.card_id, answer: w.answer })),
    o.profiles,
    o.chapters ?? loadChapters(),
  );
  const drafts = buildRoutes({ catalog: o.catalog, travellers, wishes, facts, rules, today: o.today, nyChoice: nyChoiceFor(o.profiles, travellers) });
  const ix = indexCatalog(o.catalog);
  const wm = wishMap(wishes);
  const used = new Map<string, number>();
  const chapters = o.chapters ?? loadChapters();
  // The family's chapter order breaks ties in how the routes are presented: the route sleeping in higher-ranked chapters comes first.
  const points = new Map<string, number>();
  for (const p of o.profiles) (p.facts.chapter_rank ?? []).forEach((id, i) => points.set(id, (points.get(id) ?? 0) + (3 - i)));
  const affinity = (d: Draft) =>
    d.stays.reduce((acc, st) => {
      const ch = chapters.find((c) => c.bases.includes(st.place));
      return acc + (ch ? (points.get(ch.id) ?? 0) * st.nights : 0);
    }, 0);
  const ordered = [...drafts].sort((a, b) => affinity(b) - affinity(a) || b.score - a.score);
  return ordered.map((d) => {
    const n = (used.get(d.name_axis) ?? 0) + 1;
    used.set(d.name_axis, n);
    const planId = newId();
    const stays: PlanStay[] = d.stays.map((s, i) => {
      const leg = i > 0 ? d.legs.find((l) => l.to === s.place && l.date === s.startDate) ?? d.legs[i - 1] : undefined;
      return {
        id: newId(),
        place: s.place,
        nights: s.nights,
        legNote: leg ? `${ix.bases.get(leg.from)?.name ?? leg.from} → ${ix.bases.get(leg.to)?.name ?? leg.to}${leg.leg.note ? ` · ${leg.leg.note}` : ""}` : null,
        legHours: leg ? leg.leg.hours_d2d : null,
        legMode: leg ? (LEG_MODE[leg.leg.mode.toLowerCase()] ?? "train") : null,
        daytrips: [...s.daytrips],
        via: [...s.via],
      };
    });
    const stayOn = (date: string) => {
      let cursor = 0;
      for (const s of stays) {
        const start = d.stays[cursor].startDate;
        if (date >= start && date < addDays(start, s.nights)) return s;
        cursor++;
      }
      return stays[stays.length - 1];
    };
    const name = (slug: string) => ix.bases.get(slug)?.name ?? slug;
    const cardName = (id: string) => ix.cards.get(id)?.name_pt ?? id;
    const generated: GeneratedPlan = {
      axis: d.name_axis,
      pitch_pt: explainDraft(d, o.catalog, travellers, wm),
      per_person: Object.fromEntries(travellers.map((t) => [t.id, perPerson(d, t.id, wm, cardName)])),
      coverage: Object.fromEntries(Object.entries(d.coverage).map(([id, c]) => [id, { ...c, must: c.must.map((m) => ({ ...m, name_pt: cardName(m.card_id) })) }])),
      numbers: {
        ...d.numbers,
        nights_per_base: d.numbers.nights_per_base.map((b) => ({ ...b, name: name(b.base) })),
        ny_base_name: name(d.numbers.ny_base),
        ny_hospital_minutes: Number.isFinite(d.numbers.ny_hospital_minutes) ? d.numbers.ny_hospital_minutes : 999,
      },
      deadlines: d.deadlines.map((x) => ({ date: x.date, what: x.what })),
      placements: d.placements.map((p) => ({ ...p, name_pt: cardName(p.card_id) })),
      violations: d.violations.map((v) => ({ code: v.code, message_pt: v.message_pt })),
      score: d.score,
      generated_at: new Date().toISOString(),
    };
    const plan = {
      id: planId,
      name: n > 1 ? `${AXIS_NAME[d.name_axis]} ${n}` : AXIS_NAME[d.name_axis],
      color: AXIS_COLOR[d.name_axis],
      based_on: null,
      stays,
      is_chosen: false,
      source: "generated" as const,
      generated,
      is_candidate: false,
      created_at: new Date().toISOString(),
    };
    const sorted = [...d.placements].sort((a, b) => a.date.localeCompare(b.date));
    const activities: Activity[] = [];
    sorted.forEach((p, i) => {
      const card = ix.cards.get(p.card_id);
      const all = p.who.length >= travellers.length;
      activities.push({
        id: newId(),
        plan_id: planId,
        date: p.date,
        time: null,
        title: cardName(p.card_id),
        place_slug: card?.place_slug ?? null,
        query: card?.photo_query ?? card?.name_en ?? null,
        note: card?.promise_pt ?? null,
        split_group: all ? null : p.who.length <= 1 ? "em paralelo" : `${p.who.length} pessoas`,
        who: all ? [] : p.who,
        sort: i,
      });
      if (p.parallel_card_id) {
        const her = travellers.find((t) => t.who === "her");
        const pc = ix.cards.get(p.parallel_card_id);
        activities.push({
          id: newId(),
          plan_id: planId,
          date: p.date,
          time: null,
          title: cardName(p.parallel_card_id),
          place_slug: pc?.place_slug ?? null,
          query: pc?.photo_query ?? pc?.name_en ?? null,
          note: pc?.promise_pt ?? null,
          split_group: "em paralelo",
          who: her ? [her.id] : [],
          sort: i,
        });
      }
    });
    const bookings: Booking[] = d.deadlines.map((x) => {
      const card = x.card_id ? ix.cards.get(x.card_id) : undefined;
      const placed = d.placements.find((p) => p.card_id === x.card_id);
      return {
        id: newId(),
        plan_id: planId,
        stay_id: placed ? stayOn(placed.date).id : null,
        kind: "activity",
        name: x.what,
        url: null,
        price_jpy: card?.cost_pp_jpy != null ? card.cost_pp_jpy * (placed?.who.length ?? 6) : null,
        people: placed?.who.length ?? 6,
        date: placed?.date ?? null,
        cancel_by: x.date,
        status: "idea",
        confirmation: null,
        address: null,
        address_ja: null,
        phone: null,
        notes: `Prazo ${x.date}${card?.booking.how ? ` · ${card.booking.how}` : ""}`,
      };
    });
    const narrative: NarrativeInput = {
      axis: d.name_axis,
      bases: d.stays.map((s) => ({ name: name(s.place), nights: s.nights, from: s.startDate, to: addDays(s.startDate, s.nights) })),
      ny: { base: name(d.numbers.ny_base), hospital_minutes: generated.numbers.ny_hospital_minutes },
      placed: d.placements.map((p) => ({ card_id: p.card_id, name_pt: cardName(p.card_id), date: p.date, who: p.who.length >= travellers.length ? "all" : "split" })),
      people: travellers.map((t) => {
        const mine = wm.get(t.id) ?? new Map<string, "no" | "like" | "must">();
        const placedMine = (id: string) => d.placements.some((p) => p.card_id === id && p.who.includes(t.id));
        const likes = [...mine.entries()].filter(([, a]) => a === "like").map(([id]) => id);
        return {
          id: t.id,
          name: t.name,
          role: t.who,
          must: (d.coverage[t.id]?.must ?? []).map((m) => ({ card_id: m.card_id, name_pt: cardName(m.card_id), hit: m.hit })),
          like_hit: likes.filter(placedMine).map(cardName),
          like_missed: likes.filter((id) => !placedMine(id)).map(cardName),
        };
      }),
      violations: d.violations.map((v) => v.message_pt),
    };
    return { plan, activities, bookings, narrative };
  });
}

/**
 * Chapter answers stand in for card answers the person did not give: "Me chama"
 * likes every card of that chapter, "Não é pra mim" says no to them, and a card
 * the person answered explicitly always wins. Nothing becomes a must this way.
 */
export function impliedWishes(explicit: { traveller_id: string; card_id: string; answer: "no" | "like" | "must" }[], profiles: WishProfile[], chapters: Chapter[]): typeof explicit {
  const out = [...explicit];
  const seen = new Set(explicit.map((w) => `${w.traveller_id}:${w.card_id}`));
  for (const p of profiles) {
    const answers = p.facts.chapters ?? {};
    for (const ch of chapters) {
      const a = answers[ch.id];
      if (a !== "yes" && a !== "no") continue;
      for (const card_id of ch.cards) {
        const key = `${p.id}:${card_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ traveller_id: p.id, card_id, answer: a === "yes" ? "like" : "no" });
      }
    }
  }
  return out;
}

function perPerson(d: Draft, id: string, wm: ReturnType<typeof wishMap>, cardName: (id: string) => string) {
  const mine = wm.get(id) ?? new Map<string, "no" | "like" | "must">();
  const placed = d.placements.filter((p) => p.who.includes(id)).map((p) => p.card_id);
  const ganha = placed.filter((c) => mine.get(c) === "must" || mine.get(c) === "like").slice(0, 3).map(cardName);
  const abre_mao = [...mine.entries()]
    .filter(([c, a]) => (a === "must" || a === "like") && !placed.includes(c))
    .sort((a, b) => (a[1] === "must" ? -1 : 0) - (b[1] === "must" ? -1 : 0))
    .slice(0, 2)
    .map(([c]) => cardName(c));
  return { ganha, abre_mao };
}

/** Only the keys the builder knows (the settings row also carries the budget in S$). */
function stripRules(r: Partial<ComfortRules> | undefined): Partial<ComfortRules> {
  if (!r) return {};
  const out: Partial<ComfortRules> = {};
  for (const k of Object.keys(DEFAULT_RULES) as (keyof ComfortRules)[]) {
    const v = r[k];
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
