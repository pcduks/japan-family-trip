/**
 * Nights suggestion (PRD §7): nights = arrival day + full days for the main
 * outings at this pace + rest days. The library is a menu, not a plan, so the
 * count uses the top picks (at most 3 main outings and 1 extra day of short
 * visits); the researched answer in regions[].suggested_nights wins when it
 * exists, and the reason says both.
 */
import { addDays, dateRange, fmtDay, weekday } from "./dates";
import type { Pace, PaceModel, Place, Region, Stay } from "./types";

export const MAX_MAINS = 3;
export const MAX_EXTRA_SHORT_DAYS = 1;

export interface NightsSuggestion {
  nights: number | null;
  researched: number | string | null;
  computed: number;
  reason: string;
  mains: Place[];
  shorts: Place[];
}

function parseResearched(v: number | string | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const m = v.match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

export function suggestNights(
  region: Region,
  pace: Pace,
  places: Place[],
  model: PaceModel,
  stay?: Pick<Stay, "from" | "to"> | null,
  /** Must-dos or planned places in this region, which replace the top-picks guess. */
  chosen?: string[],
): NightsSuggestion {
  const level = model.levels[pace];
  const inRegion = places.filter((p) => p.region === region.id);
  const chosenSet = new Set(chosen ?? []);
  const pickMains = inRegion.filter((p) => p.size === "main" && (!chosenSet.size || chosenSet.has(p.id)));
  const mains = (chosenSet.size ? pickMains : pickMains.slice(0, MAX_MAINS)).slice(0, chosenSet.size ? undefined : MAX_MAINS);
  const shorts = inRegion.filter((p) => p.size === "short" && (!chosenSet.size || chosenSet.has(p.id)));

  const fullDays = Math.ceil(mains.length / Math.max(1, level.main_per_day));
  let extraShortDays = 0;
  if (shorts.length) {
    if (level.short_per_day > 0) {
      const leftover = Math.max(0, shorts.length - fullDays * level.short_per_day);
      extraShortDays = Math.min(MAX_EXTRA_SHORT_DAYS, Math.ceil(leftover / level.short_per_day));
    } else {
      // Gentle: one thing a day, so a morning of short visits is its own day.
      extraShortDays = Math.min(MAX_EXTRA_SHORT_DAYS, shorts.length);
    }
  }
  const activeDays = fullDays + extraShortDays;
  const restDays = level.rest_day_every ? Math.floor(activeDays / level.rest_day_every) : 0;
  const computed = activeDays === 0 ? 0 : 1 + activeDays + restDays;
  const researchedRaw = region.suggested_nights?.[pace];
  const researched = parseResearched(researchedRaw);
  const nights = researched ?? (computed || null);

  const paceWord = pace.charAt(0).toUpperCase() + pace.slice(1);
  const bits: string[] = [];
  if (activeDays === 0) bits.push("nothing in the library needs a full day here");
  else {
    bits.push(`${mains.length} main outing${mains.length === 1 ? "" : "s"} at ${paceWord} (${level.main_per_day} a day) = ${fullDays} full day${fullDays === 1 ? "" : "s"}`);
    if (shorts.length)
      bits.push(
        extraShortDays
          ? `${shorts.length} short visits, ${extraShortDays} extra day for the ones that don't fit the afternoons`
          : `${shorts.length} short visit${shorts.length === 1 ? "" : "s"} fill the afternoons`,
      );
    bits.push("plus the arrival day");
    if (restDays) bits.push(`${restDays} rest day${restDays === 1 ? "" : "s"}`);
  }
  // Calendar notes: closures and Monday-closed museums on the stay's dates.
  const notes: string[] = [];
  if (stay?.from && stay?.to) {
    // Include the departure day: a morning outing before the move still counts.
    const days = [...dateRange(stay.from, stay.to), stay.to];
    const monday = days.find((d) => weekday(d) === "Mon");
    const mondayClosed = inRegion.filter((p) => p.closed_weekdays.includes("Mon")).length;
    if (monday && mondayClosed >= 2) notes.push(`${mondayClosed} places close Mon ${fmtDay(monday, false)}`);
    const nyClosed = inRegion.filter((p) => p.closures.some((c) => days.some((d) => d >= c.start && d <= c.end)));
    if (nyClosed.length >= 2) notes.push(`${nyClosed.length} places closed for New Year on these dates`);
  }
  let reason = `${nights ?? computed} night${nights === 1 ? "" : "s"}: ${bits.join(", ")}`;
  if (researched != null && researched !== computed) {
    reason += `. Counting the library's top picks gives ${computed}; the research settled on ${researchedRaw} because the doc groups nearby places into one outing and allows for the calendar`;
  }
  if (notes.length) reason += `. ${notes.join("; ")}`;
  return { nights, researched: researchedRaw ?? null, computed, reason: reason + ".", mains, shorts };
}

/** The date a stay would end with the suggested nights. */
export function suggestedEnd(from: string, nights: number): string {
  return addDays(from, nights);
}
