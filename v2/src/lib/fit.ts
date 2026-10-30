/**
 * How a part of Japan fits the route we are taking, worked out from the route,
 * the journeys between places and the day plans, never written by hand.
 */
import { fmtDay, fmtRange } from "./dates";
import { legBetween } from "./legs";
import type { Region, Stay } from "./types";

export type Fit = "route" | "daytrip" | "change" | "elsewhere";

export const FIT_LABEL: Record<Fit, string> = {
  route: "On our route",
  daytrip: "A day out",
  change: "Would mean a change",
  elsewhere: "Another trip",
};

/** A day out is this far each way at most (Nikko from Tokyo, Hiroshima from Kyoto); a stop worth a change, this far from the route. */
const DAY_OUT_HOURS = 2;
const CHANGE_HOURS = 4.5;
/** Places reached by plane or ferry from the route; no train time makes them a change. */
const FLY = new Set(["hokkaido", "okinawa", "kyushu", "shikoku"]);

export interface AreaFit {
  fit: Fit;
  /** One plain line: where and when, or what it would take. */
  line: string;
  /** The stop it is nearest to (the base for a day out, the neighbour for a change). */
  near?: string;
  hours?: number;
  /** False when the journey time is a rough estimate from the distance. */
  checked?: boolean;
}

const short = (id: string, regions: Region[]) => (regions.find((r) => r.id === id)?.name ?? id).split(",")[0].replace(/ \(.*\)$/, "");
const fmtHours = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.floor(h)} h${h % 1 ? ` ${Math.round((h % 1) * 60)}` : ""}`);

/**
 * @param dayOuts region → the dates our day plans go there (Shirakawa-go on 28 Dec, Nara on 4 Jan).
 */
export function fitOf(regionId: string, stays: Stay[], regions: Region[], dayOuts: Map<string, string[]>): AreaFit {
  const i = stays.findIndex((s) => s.region === regionId);
  if (i >= 0) {
    const s = stays[i];
    return { fit: "route", line: `Stop ${i + 1} · ${s.nights} ${s.nights === 1 ? "night" : "nights"} · ${fmtRange(s.from, s.to)}` };
  }
  const days = dayOuts.get(regionId);
  if (days?.length) {
    const base = stays.find((s) => s.from <= days[0] && s.to > days[0]);
    const when = days.length > 2 ? `${fmtDay(days[0], false)} – ${fmtDay(days[days.length - 1], false)}` : days.map((d) => fmtDay(d, days.length === 1)).join(" and ");
    return { fit: "route", line: `A day out${base ? ` from ${short(base.region, regions)}` : ""}, ${when}`, near: base?.region };
  }
  if (FLY.has(regionId)) return { fit: "elsewhere", line: "Another trip: a flight away" };
  // The stop it is closest to. A checked journey beats a distance estimate, which mountains and fast trains both fool.
  const legs = Array.from(new Set(stays.map((s) => s.region))).map((r) => ({ r, ...legBetween(r, regionId, regions) }));
  const pool = legs.some((l) => l.curated) ? legs.filter((l) => l.curated) : legs;
  const nearest = pool.sort((a, b) => a.hours - b.hours)[0];
  if (!nearest) return { fit: "elsewhere", line: "Another trip" };
  const from = short(nearest.r, regions);
  const about = `${nearest.curated ? "about" : "roughly"} ${fmtHours(nearest.hours)}`;
  const base = { near: nearest.r, hours: nearest.hours, checked: nearest.curated };
  if (nearest.hours <= DAY_OUT_HOURS) return { fit: "daytrip", line: `A day out from ${from}, ${about} each way`, ...base };
  if (nearest.hours <= CHANGE_HOURS) return { fit: "change", line: `${about.charAt(0).toUpperCase() + about.slice(1)} from ${from}: two nights here means two fewer somewhere else`, ...base };
  return { fit: "elsewhere", line: `Another trip: ${about} from ${from}, the nearest stop`, ...base };
}

/** Where our day plans go beyond the stop we sleep at: region → dates. */
export function dayOutsOf(days: { date: string; region: string; items: { place_id?: string | null }[] }[], placeRegion: Map<string, string>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const d of days)
    for (const it of d.items) {
      const r = it.place_id ? placeRegion.get(it.place_id) : undefined;
      if (!r || r === d.region) continue;
      const list = out.get(r) ?? [];
      if (!list.includes(d.date)) list.push(d.date);
      out.set(r, list);
    }
  return out;
}
