import "server-only";
import { serverEnv } from "../env";
import type { GoogleAttribution, PlaceDetails } from "../types";

const BASE = "https://places.googleapis.com/v1";

export class GoogleApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function key(): string {
  const k = serverEnv().placesKey;
  if (!k) throw new GoogleApiError("GOOGLE_PLACES_API_KEY is not set", 503);
  return k;
}

async function googleError(res: Response): Promise<GoogleApiError> {
  let msg = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    msg = body?.error?.message ?? msg;
  } catch {}
  return new GoogleApiError(`Places API: ${msg}`, res.status);
}

/**
 * Resolve a free-text query to a Google place id. Requests only `places.id`,
 * which bills as Text Search Essentials (IDs Only).
 */
export async function textSearchPlaceId(query: string): Promise<string | null> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key(),
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "en", regionCode: "JP", pageSize: 1 }),
    cache: "no-store",
  });
  if (!res.ok) throw await googleError(res);
  const body = (await res.json()) as { places?: { id: string }[] };
  return body.places?.[0]?.id ?? null;
}

type RawAttribution = { displayName?: string; uri?: string; photoUri?: string };
const attribution = (a: RawAttribution | undefined): GoogleAttribution => ({
  displayName: a?.displayName ?? "Google user",
  uri: a?.uri,
  photoUri: a?.photoUri,
});

const DETAILS_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "photos",
  "reviews",
].join(",");

/**
 * Place Details (New). Results are held in the Next.js data cache for
 * PLACES_CACHE_SECONDS; check Google's current caching terms before raising it.
 */
export async function placeDetails(placeId: string): Promise<PlaceDetails> {
  const cacheSeconds = serverEnv().placesCacheSeconds;
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers: { "X-Goog-Api-Key": key(), "X-Goog-FieldMask": DETAILS_FIELDS },
    ...(cacheSeconds > 0 ? { next: { revalidate: cacheSeconds } } : { cache: "no-store" as const }),
  });
  if (!res.ok) throw await googleError(res);
  const p = await res.json();
  return {
    placeId: p.id,
    displayName: p.displayName?.text ?? "",
    address: p.formattedAddress,
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    googleMapsUri: p.googleMapsUri,
    photos: (p.photos ?? []).slice(0, 10).map((ph: Record<string, unknown>) => ({
      name: ph.name as string,
      widthPx: ph.widthPx as number,
      heightPx: ph.heightPx as number,
      authorAttributions: ((ph.authorAttributions as RawAttribution[]) ?? []).map(attribution),
    })),
    reviews: (p.reviews ?? []).slice(0, 5).map((r: Record<string, unknown>) => ({
      rating: r.rating as number,
      text: ((r.text as { text?: string })?.text ?? (r.originalText as { text?: string })?.text ?? "") as string,
      relativeTime: (r.relativePublishTimeDescription as string) ?? "",
      publishTime: r.publishTime as string | undefined,
      author: attribution(r.authorAttribution as RawAttribution),
      googleMapsUri: r.googleMapsUri as string | undefined,
    })),
  };
}

export const PHOTO_NAME_RE = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

/** Short-lived googleusercontent URL for a photo; the key never leaves the server. */
export async function photoUri(name: string, maxWidthPx: number): Promise<string> {
  if (!PHOTO_NAME_RE.test(name)) throw new GoogleApiError("Bad photo name", 400);
  const url = `${BASE}/${name}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`;
  const res = await fetch(url, { headers: { "X-Goog-Api-Key": key() }, cache: "no-store" });
  if (!res.ok) throw await googleError(res);
  const body = (await res.json()) as { photoUri?: string };
  if (!body.photoUri) throw new GoogleApiError("No photoUri returned", 502);
  return body.photoUri;
}
