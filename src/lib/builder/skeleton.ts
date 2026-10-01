/**
 * The calendar skeleton: which blocks exist, when the moves may happen and what
 * each block's base must satisfy. Pure data; candidates.ts assigns the bases.
 *
 *   A tokyo 20 Dec (4–5 nights) → move 24/25 Dec
 *   B pre-NY block → optional calm move 31 Dec / 1 Jan → C NY block → move 5 Jan
 *   D last block near Haneda (→ optional 8 Jan night in Tokyo when D is farther)
 *   fly 9 Jan. 20 nights in all.
 *
 * Because 27–30 Dec and 2–4 Jan are peak days, the only legal moves between
 * 26 Dec and 4 Jan are the calm ones; so B holds the 29–30 Dec nights whenever
 * B and C differ, and both must be perinatal cities.
 */
import { daysBetween } from "./dates";
import { CALM_MOVE_DATES, NY_NIGHTS, TRIP_END, TRIP_NIGHTS, TRIP_START } from "./types";

export type BlockKey = "A" | "B" | "C" | "D" | "E";

export interface Block {
  key: BlockKey;
  startDate: string;
  nights: number;
  /** Nights inside 29 Dec–3 Jan: the base must be a perinatal city. */
  ny: boolean;
  /** Holds the night of 31 Dec: the Réveillon base, forced by ny_choice when set. */
  reveillon: boolean;
  /** Block that must sleep within 90 min of Haneda (or ≤150 with an E night in Tokyo). */
  last: boolean;
  /** Fixed base (A and E are Tokyo). */
  fixed?: string;
}

export interface Skeleton {
  id: string;
  blocks: Block[];
  /** Move dates in order (one per boundary). */
  moves: string[];
}

export const A_MOVE_DATES = ["2026-12-24", "2026-12-25"];
export const C_MOVE_DATE = "2027-01-05";
export const E_MOVE_DATE = "2027-01-08";
export const REVEILLON_NIGHT = "2026-12-31";
export const NEAR_HND_MINUTES = 90;
export const NEAR_HND_MINUTES_WITH_E = 150;

function block(key: BlockKey, startDate: string, endDate: string, fixed?: string): Block {
  const nights = daysBetween(startDate, endDate);
  return {
    key,
    startDate,
    nights,
    ny: startDate <= NY_NIGHTS[1] && endDate > NY_NIGHTS[0],
    reveillon: startDate <= REVEILLON_NIGHT && endDate > REVEILLON_NIGHT,
    last: key === "D",
    ...(fixed ? { fixed } : {}),
  };
}

/** Every legal block layout, with dates. Bases are not chosen here. */
export function skeletons(): Skeleton[] {
  const out: Skeleton[] = [];
  for (const m1 of A_MOVE_DATES) {
    for (const m2 of [null, ...CALM_MOVE_DATES]) {
      for (const withE of [false, true]) {
        const blocks: Block[] = [block("A", TRIP_START, m1, "tokyo")];
        const moves = [m1];
        if (m2) {
          blocks.push(block("B", m1, m2), block("C", m2, C_MOVE_DATE));
          moves.push(m2);
        } else blocks.push(block("C", m1, C_MOVE_DATE));
        moves.push(C_MOVE_DATE);
        if (withE) {
          blocks.push(block("D", C_MOVE_DATE, E_MOVE_DATE), block("E", E_MOVE_DATE, TRIP_END, "tokyo"));
          moves.push(E_MOVE_DATE);
        } else blocks.push(block("D", C_MOVE_DATE, TRIP_END));
        const id = blocks.map((b) => `${b.key}${b.nights}`).join("-");
        out.push({ id, blocks, moves });
      }
    }
  }
  return out.filter((s) => s.blocks.reduce((a, b) => a + b.nights, 0) === TRIP_NIGHTS);
}
