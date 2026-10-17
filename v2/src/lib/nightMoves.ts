/**
 * One more night here, one fewer there: the trip keeps its nights, so a night
 * always comes from (or goes to) another stop, and the dates in between shift.
 */
import type { Stay } from "./types";
import { relayout } from "./versions";

const NYE = "2026-12-31";

/** The stop where we sleep on New Year's Eve. */
export function nyeIndex(stays: Pick<Stay, "from" | "to">[]): number {
  return stays.findIndex((s) => s.from <= NYE && s.to > NYE);
}

/** Give stop `to` one more night, taken from stop `from`. */
export function moveNight(stays: Stay[], to: number, from: number, tripStart: string): Stay[] {
  return relayout(
    stays.map((s, i) => (i === to ? { ...s, nights: s.nights + 1 } : i === from ? { ...s, nights: s.nights - 1 } : s)),
    tripStart,
  );
}

export interface NightOption {
  /** The other stop that gives or gets the night. */
  index: number;
  region: string;
  from: number;
  to: number;
  /** Why it cannot: a stop needs at least one night. */
  blocked: string | null;
  /** Where New Year's Eve would land, when this moves it. */
  movesNye: string | null;
  suggested: boolean;
  stays: Stay[];
}

/**
 * The choices for one more (or one fewer) night at stop i: every other stop, the
 * nearest later one that keeps New Year's Eve where it is suggested first.
 */
export function nightOptions(stays: Stay[], i: number, dir: "more" | "fewer", tripStart: string): NightOption[] {
  const nye = stays[nyeIndex(stays)]?.region ?? null;
  const opts = stays
    .map((s, j): NightOption | null => {
      if (j === i) return null;
      const giver = dir === "more" ? j : i;
      const next = dir === "more" ? moveNight(stays, i, j, tripStart) : moveNight(stays, j, i, tripStart);
      const after = next[nyeIndex(next)]?.region ?? null;
      return {
        index: j,
        region: s.region,
        from: s.nights,
        to: dir === "more" ? s.nights - 1 : s.nights + 1,
        blocked: stays[giver].nights <= 1 ? "already 1 night" : null,
        movesNye: after !== nye ? after : null,
        suggested: false,
        stays: next,
      };
    })
    .filter((o): o is NightOption => !!o);
  // Later stops first (the dates before stay put), nearest first; never one that moves New Year's Eve.
  const rank = (o: NightOption) => (o.index > i ? o.index - i : 100 + (i - o.index));
  const best = opts.filter((o) => !o.blocked && !o.movesNye).sort((a, b) => rank(a) - rank(b))[0];
  if (best) best.suggested = true;
  return opts.sort((a, b) => Number(b.suggested) - Number(a.suggested) || Number(!!a.blocked) - Number(!!b.blocked) || rank(a) - rank(b));
}
