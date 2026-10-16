/** Must / nice / skip per place, stored in each person's "mustdo" vote. */
import type { MustDoVote, Vote } from "./types";

export type Pref = "must" | "nice" | "skip";
export const PREF_LABEL: Record<Pref, string> = { must: "Must", nice: "Nice", skip: "Skip" };

type Value = MustDoVote["value"];

export function prefValue(votes: Vote[], travellerId: string | undefined): Value {
  const v = votes.find((x) => x.kind === "mustdo" && x.traveller_id === travellerId)?.value as Value | undefined;
  return { places: v?.places ?? [], nice: v?.nice ?? [], skip: v?.skip ?? [] };
}

export function myPref(votes: Vote[], travellerId: string | undefined, placeId: string): Pref | null {
  const v = prefValue(votes, travellerId);
  if (v.places.includes(placeId)) return "must";
  if (v.nice?.includes(placeId)) return "nice";
  if (v.skip?.includes(placeId)) return "skip";
  return null;
}

/** The next value after tapping `pref` on `placeId`; tapping the current one clears it. */
export function withPref(current: Value, placeId: string, pref: Pref | null): Value {
  const strip = (l?: string[]) => (l ?? []).filter((x) => x !== placeId);
  const next: Value = { places: strip(current.places), nice: strip(current.nice), skip: strip(current.skip) };
  if (pref === "must") next.places = [...next.places, placeId];
  if (pref === "nice") next.nice = [...(next.nice ?? []), placeId];
  if (pref === "skip") next.skip = [...(next.skip ?? []), placeId];
  return next;
}

/** How many people said must / nice / skip, with who. */
export function tally(votes: Vote[], placeId: string): Record<Pref, string[]> {
  const out: Record<Pref, string[]> = { must: [], nice: [], skip: [] };
  for (const v of votes) {
    if (v.kind !== "mustdo") continue;
    const val = v.value as Value;
    if (val.places?.includes(placeId)) out.must.push(v.traveller_id);
    else if (val.nice?.includes(placeId)) out.nice.push(v.traveller_id);
    else if (val.skip?.includes(placeId)) out.skip.push(v.traveller_id);
  }
  return out;
}

export function tallyText(t: Record<Pref, string[]>): string {
  const bits = (["must", "nice", "skip"] as Pref[]).filter((k) => t[k].length).map((k) => `${t[k].length} ${PREF_LABEL[k].toLowerCase()}`);
  return bits.join(" · ");
}
