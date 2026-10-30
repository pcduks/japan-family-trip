/**
 * How a route would feel, in a few plain measures that can sit side by side:
 * how often we pack, hours on trains, the busiest week, nights a place cannot
 * fill, time outdoors for Fernanda, and how many checks it fails.
 */
import { addDays } from "./dates";
import { planDays } from "./days";
import { avgOutdoorHours } from "./exposure";
import { checkVersion, nightsItCanFill, type RulesContext } from "./rules";
import type { Snapshot, Version } from "./types";
import { statsOf } from "./versions";

export interface Feel {
  /** Check-ins after the first night: each one is a morning of packing. */
  pack: number;
  trainHours: number;
  /** The most moves inside any seven days. */
  busiestWeek: number;
  /** Nights beyond what the places can fill. */
  unfilled: number;
  /** Hours outdoors on an average planned day. */
  outdoor: number | null;
  /** Warnings from the checks. */
  checks: number;
}

export function feelOf(v: Version, snap: Snapshot, rules: RulesContext): Feel {
  const st = statsOf(v, snap);
  const moveDates = v.stays.slice(1).filter((s, k) => s.region !== v.stays[k].region).map((s) => s.from);
  const busiestWeek = moveDates.reduce((most, d) => Math.max(most, moveDates.filter((x) => x >= d && x <= addDays(d, 6)).length), 0);
  const unfilled = v.stays.reduce((a, s) => a + Math.max(0, s.nights - (nightsItCanFill(s.region, v.stays)?.cap ?? s.nights)), 0);
  const places = new Map(snap.places.map((p) => [p.id, p]));
  const outdoor = avgOutdoorHours(planDays(v, snap).map((d) => d.items.flatMap((it) => (it.place_id && places.get(it.place_id) ? [places.get(it.place_id)!] : []))));
  return {
    pack: st.moves,
    trainHours: st.travelHours,
    busiestWeek,
    unfilled,
    outdoor,
    checks: checkVersion(v, rules).filter((f) => f.severity !== "info").length,
  };
}

export const FEEL_ROWS: { key: keyof Feel; label: string; note: string; fmt: (n: number) => string }[] = [
  { key: "pack", label: "Times we pack", note: "Each move is a morning of packing and a check-in.", fmt: (n) => `${n}` },
  { key: "trainHours", label: "Hours between bases", note: "Door to door, all the moves added up.", fmt: (n) => `${Math.round(n * 2) / 2} h` },
  { key: "busiestWeek", label: "Moves in the busiest week", note: "Three or fewer in any seven days is kinder for Fernanda.", fmt: (n) => `${n}` },
  { key: "unfilled", label: "Nights a place can't fill", note: "Nights beyond what a small place has to do on our dates.", fmt: (n) => `${n}` },
  { key: "outdoor", label: "Hours outdoors a day", note: "On an average planned day, in the cold.", fmt: (n) => `${n} h` },
  { key: "checks", label: "Warnings", note: "From the checks: long days, busy travel days, hospitals, empty days.", fmt: (n) => `${n}` },
];
