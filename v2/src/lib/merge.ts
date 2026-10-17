/**
 * Putting one person's changes on top of the route as it is now. A change is
 * what differs between the route it started from (base) and what they sent
 * (theirs); the route may have moved on since (now). Stops are matched by
 * place and occurrence, so the two Tokyo stays never blur together.
 */
import type { Stay, SuggestionDiff } from "./types";
import { relayout, totalNights } from "./versions";

export type MergeResult =
  | { kind: "clean"; stays: Stay[]; moved: boolean }
  | { kind: "already" }
  | { kind: "clash"; stops: string[] };

/** A stop's identity: its place, with ":2" for the second visit (Tokyo at the end). */
export function stopKeys(stays: Pick<Stay, "region">[]): string[] {
  const seen = new Map<string, number>();
  return stays.map((s) => {
    const n = (seen.get(s.region) ?? 0) + 1;
    seen.set(s.region, n);
    return n > 1 ? `${s.region}:${n}` : s.region;
  });
}

/** Same places, same order, same nights. */
export function sameRoute(a: Pick<Stay, "region" | "nights">[], b: Pick<Stay, "region" | "nights">[]): boolean {
  return a.length === b.length && a.every((s, i) => s.region === b[i].region && s.nights === b[i].nights);
}

function sameShape(a: Pick<Stay, "region">[], b: Pick<Stay, "region">[]): boolean {
  return a.length === b.length && a.every((s, i) => s.region === b[i].region);
}

function byKey(stays: Stay[]): Map<string, Stay> {
  const keys = stopKeys(stays);
  return new Map(stays.map((s, i) => [keys[i], s]));
}

/** The stops whose nights, lodging or presence differ between two versions of the route. */
export function changedStops(from: Stay[], to: Stay[]): string[] {
  const a = byKey(from);
  const b = byKey(to);
  const out: string[] = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(k);
    const y = b.get(k);
    if (!x || !y || x.nights !== y.nights || (x.lodging ?? null) !== (y.lodging ?? null)) out.push(k);
  }
  return out;
}

/**
 * Their changes on top of the route now. Clean when the stops they touched are
 * untouched since; "already" when the route already says what they asked for;
 * a clash, naming the stops, when both changed the same stop differently or the
 * nights no longer add up.
 */
export function mergeOnto(base: Stay[], theirs: Stay[], now: Stay[], tripStart: string): MergeResult {
  if (sameRoute(now, theirs)) return { kind: "already" };
  if (sameRoute(now, base)) return { kind: "clean", stays: relayout(theirs, tripStart), moved: false };
  const mine = changedStops(base, theirs);
  const since = changedStops(base, now);
  const theirsBy = byKey(theirs);
  const nowBy = byKey(now);
  const both = mine.filter((k) => since.includes(k));
  const clashing = both.filter((k) => {
    const x = theirsBy.get(k);
    const y = nowBy.get(k);
    return !x || !y || x.nights !== y.nights || (x.lodging ?? null) !== (y.lodging ?? null);
  });
  if (clashing.length) return { kind: "clash", stops: clashing };
  const theirsMoved = !sameShape(base, theirs);
  const nowMoved = !sameShape(base, now);
  if (theirsMoved && nowMoved && !sameShape(theirs, now)) return { kind: "clash", stops: mine };
  // Start from whichever side changed the order of stops, and lay the other side's changed stops over it.
  const [frame, over, overKeys] = theirsMoved ? [theirs, nowBy, since] : [now, theirsBy, mine];
  const keys = stopKeys(frame);
  const merged = frame.map((s, i) => (overKeys.includes(keys[i]) && over.get(keys[i]) ? { ...s, nights: over.get(keys[i])!.nights, lodging: over.get(keys[i])!.lodging } : s));
  if (overKeys.some((k) => over.get(k) && !keys.includes(k))) return { kind: "clash", stops: overKeys };
  if (totalNights(merged) !== totalNights(now)) return { kind: "clash", stops: mine };
  const stays = relayout(merged, tripStart);
  return sameRoute(stays, now) ? { kind: "already" } : { kind: "clean", stays, moved: true };
}

/** A route anyone may send: unbroken dates from the trip's first night to its last, every stop at least one night. */
export function validRoute(stays: Stay[], tripStart: string, nights: number): string | null {
  if (!stays.length) return "A route needs at least one stop.";
  if (stays.some((s) => s.nights < 1)) return "Every stop needs at least one night.";
  if (totalNights(stays) !== nights) return `The trip is ${nights} nights; this route has ${totalNights(stays)}.`;
  const laid = relayout(stays, tripStart);
  if (laid.some((s, i) => s.from !== stays[i].from || s.to !== stays[i].to)) return "The dates have a gap or an overlap.";
  return null;
}

/** "Kyoto and Tokyo at the end", from stop keys. */
export function stopNames(keys: string[], regions: { id: string; name: string }[]): string {
  const names = keys.map((k) => {
    const [id, n] = k.split(":");
    const name = (regions.find((r) => r.id === id)?.name ?? id).replace(/ \(.*\)$/, "");
    return `${name}${n ? " at the end" : ""}`;
  });
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "a stop");
}

/**
 * The route after a planner accepts a suggestion: null stays when the route already
 * says the same. A whole other route replaces it; a change goes on top of the route
 * as it is now, or is refused with the stops that clash.
 */
export function afterAccept(diff: SuggestionDiff, now: Stay[], trip: { start: string; nights: number }, regions: { id: string; name: string }[]): { ok: true; stays: Stay[] | null } | { ok: false; message: string } {
  const bad = validRoute(diff.stays, trip.start, trip.nights);
  if (bad) return { ok: false, message: bad };
  if (diff.whole) return { ok: true, stays: sameRoute(now, diff.stays) ? null : diff.stays };
  if (!diff.base) return sameRoute(now, diff.stays) ? { ok: true, stays: null } : { ok: false, message: "This was sent before the route kept track of changes. Open it to adjust." };
  const m = mergeOnto(diff.base, diff.stays, now, trip.start);
  if (m.kind === "already") return { ok: true, stays: null };
  if (m.kind === "clash") return { ok: false, message: `The route has changed since: ${stopNames(m.stops, regions)} ${m.stops.length > 1 ? "are" : "is"} different now. Open it to adjust.` };
  return { ok: true, stays: m.stays };
}
