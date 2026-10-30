import "server-only";
import { searchSpot, type SpotHit } from "./places";

export interface Bias {
  lat: number;
  lng: number;
  radiusM?: number;
}

/** Resolved pins per id, per server instance (the fetch cache keeps the Google answers for 30 days too). */
const memo = new Map<string, Promise<SpotHit | null>>();

/** Find any pin on Google by its query, biased to its neighbourhood or city so short names land on the right shop. */
export function resolvePin(id: string, query: string, bias?: Bias): Promise<SpotHit | null> {
  const key = `${id}\n${query}`;
  let p = memo.get(key);
  if (!p) {
    p = searchSpot(query, bias).catch((e: unknown) => {
      memo.delete(key);
      throw e;
    });
    memo.set(key, p);
  }
  return p;
}

/** A few at a time, so a page's hundred pins don't open a hundred connections at once. */
export async function inBatches<T, R>(items: T[], size: number, f: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(f))));
  return out;
}
