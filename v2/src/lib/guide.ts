/** The story behind each version (data/versions-guide.json): theme, feel, activities, why, and a note per stay. */
import guide from "../../data/versions-guide.json";
import type { Stay } from "./types";

export interface VersionGuide {
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

/** The trade-off for a stay: the version's own when it has one, else the plan's for a stay of the same length. */
export function stayTradeoff(versionId: string, stays: Stay[], index: number): Tradeoff | null {
  const key = stayKey(stays, index);
  const own = VERSIONS[versionId]?.tradeoffs?.[key];
  if (own) return own;
  const plan = VERSIONS.plan?.tradeoffs?.[key];
  if (!plan) return null;
  const planStay = (guide as unknown as { plan_nights?: Record<string, number> }).plan_nights?.[key];
  return planStay === undefined || planStay === stays[index].nights ? plan : null;
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
  if (!plan) return null;
  // Only reuse the plan's note when the stay has the same length, else it would argue for the wrong number.
  const planStay = (guide as unknown as { plan_nights?: Record<string, number> }).plan_nights?.[key];
  return planStay === undefined || planStay === stay.nights ? plan : null;
}
