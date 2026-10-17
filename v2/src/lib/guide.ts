/** The story behind each version (data/versions-guide.json): theme, feel, activities, why, and a note per stay. */
import stayGuide from "../../data/stay-guide.json";
import guide from "../../data/versions-guide.json";
import type { Stay } from "./types";

export interface VersionGuide {
  style?: string;
  theme: string;
  tagline: string;
  feel: string;
  activities: string[];
  why: string;
  suits: string;
  trade: string;
  stay_notes: Record<string, string>;
  tradeoffs?: Record<string, Tradeoff>;
}

/** Stay longer or move on: what one more night buys, what one fewer costs, and an honest idle-day flag. */
export interface Tradeoff {
  longer: string;
  shorter: string;
  idle: "none" | "some" | "real";
  note: string;
}

export const IDLE_LABEL: Record<Tradeoff["idle"], string> = { none: "Every day fills", some: "One quiet day", real: "Idle day risk" };

function stayKey(stays: Stay[], index: number): string {
  const stay = stays[index];
  const occurrence = stays.slice(0, index + 1).filter((s) => s.region === stay.region).length;
  return occurrence > 1 ? `${stay.region}:${occurrence}` : stay.region;
}

/** What a stay of a given length gives in a region, whatever the route (data/stay-guide.json). */
export interface StayGuideEntry extends Tradeoff {
  why: string;
}
const STAY_GUIDE = (stayGuide as unknown as { regions: Record<string, { best?: string; date_notes?: string[]; nights: Record<string, StayGuideEntry> }> }).regions;

export function stayGuideFor(region: string, nights: number): StayGuideEntry | null {
  const g = STAY_GUIDE[region];
  if (!g) return null;
  if (g.nights[String(nights)]) return g.nights[String(nights)];
  // Longer than written: use the longest entry we have; its "longer" line still holds.
  const keys = Object.keys(g.nights).map(Number).sort((a, b) => a - b);
  const top = keys.filter((k) => k <= nights).pop();
  return top ? g.nights[String(top)] : null;
}

export function regionBestNights(region: string): string | null {
  return STAY_GUIDE[region]?.best ?? null;
}

export function regionStayGuide(region: string): { best?: string; date_notes?: string[]; nights: Record<string, StayGuideEntry> } | null {
  return STAY_GUIDE[region] ?? null;
}

/** The trade-off for a stay: the version's own, else the plan's for a stay of the same length, else what that many nights gives in that place. */
export function stayTradeoff(versionId: string, stays: Stay[], index: number): Tradeoff | null {
  const key = stayKey(stays, index);
  const own = VERSIONS[versionId]?.tradeoffs?.[key];
  if (own) return own;
  const plan = VERSIONS.plan?.tradeoffs?.[key];
  const planStay = (guide as unknown as { plan_nights?: Record<string, number> }).plan_nights?.[key];
  if (plan && (planStay === undefined || planStay === stays[index].nights)) return plan;
  const g = stayGuideFor(stays[index].region, stays[index].nights);
  return g ? { longer: g.longer, shorter: g.shorter, idle: g.idle, note: g.note } : null;
}

const VERSIONS = guide.versions as Record<string, VersionGuide>;

export function versionGuide(id: string): VersionGuide | null {
  return VERSIONS[id] ?? null;
}

/**
 * The note for a stay: the version's own note when it has one, else the plan's,
 * keyed by region, with ":2" for a second stay in the same region (Tokyo at the end).
 */
export function stayNote(versionId: string, stays: Stay[], index: number): string | null {
  const stay = stays[index];
  const occurrence = stays.slice(0, index + 1).filter((s) => s.region === stay.region).length;
  const key = occurrence > 1 ? `${stay.region}:${occurrence}` : stay.region;
  const own = VERSIONS[versionId]?.stay_notes[key];
  if (own) return own;
  const plan = VERSIONS.plan?.stay_notes[key];
  // Only reuse the plan's note when the stay has the same length, else it would argue for the wrong number.
  const planStay = (guide as unknown as { plan_nights?: Record<string, number> }).plan_nights?.[key];
  if (plan && (planStay === undefined || planStay === stay.nights)) return plan;
  return stayGuideFor(stay.region, stay.nights)?.why ?? null;
}
