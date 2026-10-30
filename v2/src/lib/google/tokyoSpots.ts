import "server-only";
import { HOODS, type Spot } from "../tokyo";
import { searchSpot, type SpotHit } from "./places";

/** Resolved pins per spot id, per server instance (the fetch cache keeps them for 30 days too). */
const memo = new Map<string, Promise<SpotHit | null>>();

/** Find a guide spot on Google, biased to its neighbourhood so short names resolve to the right shop. */
export function resolveSpot(spot: Spot): Promise<SpotHit | null> {
  let p = memo.get(spot.id);
  if (!p) {
    const hood = HOODS[spot.hood];
    p = searchSpot(spot.query, hood ? { lat: hood.lat, lng: hood.lng, radiusM: 1800 } : undefined).catch((e: unknown) => {
      memo.delete(spot.id);
      throw e;
    });
    memo.set(spot.id, p);
  }
  return p;
}

/** A few at a time, so a walk's forty spots don't open forty connections at once. */
export async function inBatches<T, R>(items: T[], size: number, f: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(f))));
  return out;
}
