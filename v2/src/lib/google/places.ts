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

export interface TextSearchHit {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

/**
 * Text Search biased to a point (a region centre or the nearest base). With
 * only ids it bills as "IDs Only"; with name/location it is the Pro SKU, so
 * callers that only need an id pass `idsOnly`.
 */
export async function textSearch(
  query: string,
  bias?: { lat: number; lng: number; radiusM?: number },
  opts: { idsOnly?: boolean; pageSize?: number } = {},
): Promise<TextSearchHit[]> {
  const fields = opts.idsOnly ? "places.id" : "places.id,places.displayName,places.formattedAddress,places.location";
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key(), "X-Goog-FieldMask": fields },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "en",
      regionCode: "JP",
      pageSize: opts.pageSize ?? 1,
      ...(bias ? { locationBias: { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: bias.radiusM ?? 25000 } } } : {}),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw await googleError(res);
  const body = (await res.json()) as { places?: { id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number } }[] };
  return (body.places ?? []).map((p) => ({ id: p.id, name: p.displayName?.text ?? "", address: p.formattedAddress, lat: p.location?.latitude, lng: p.location?.longitude }));
}

/** A guide spot found by Text Search: enough to pin it and show a thumbnail. Bills as Text Search Pro. */
export interface SpotHit {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  type?: string;
  googleMapsUri?: string;
  photo?: string;
}

const SPOT_FIELDS = ["places.id", "places.displayName", "places.location", "places.formattedAddress", "places.primaryTypeDisplayName", "places.googleMapsUri", "places.photos"].join(",");
/** Google allows place ids to be stored indefinitely and coordinates for 30 days. */
const SPOT_CACHE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Resolve a free-text query to one place with coordinates and a first photo,
 * biased to a small circle (a neighbourhood centre) so "Alaska" finds the
 * thrift shop in Shimokitazawa. Kept in the data cache for 30 days.
 */
export async function searchSpot(query: string, bias?: { lat: number; lng: number; radiusM?: number }): Promise<SpotHit | null> {
  const body: Record<string, unknown> = { textQuery: query, languageCode: "en", regionCode: "JP", pageSize: 1 };
  if (bias) body.locationBias = { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: bias.radiusM ?? 1500 } };
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key(), "X-Goog-FieldMask": SPOT_FIELDS },
    body: JSON.stringify(body),
    // POST requests are only cached when asked to; this one is safe to keep.
    cache: "force-cache",
    next: { revalidate: SPOT_CACHE_SECONDS },
  });
  if (!res.ok) throw await googleError(res);
  const data = (await res.json()) as { places?: Record<string, unknown>[] };
  const p = data.places?.[0];
  const loc = p?.location as { latitude: number; longitude: number } | undefined;
  if (!p || !loc) return null;
  return {
    placeId: p.id as string,
    name: (p.displayName as { text?: string })?.text ?? query,
    lat: loc.latitude,
    lng: loc.longitude,
    address: p.formattedAddress as string | undefined,
    type: (p.primaryTypeDisplayName as { text?: string })?.text,
    googleMapsUri: p.googleMapsUri as string | undefined,
    photo: ((p.photos as { name: string }[] | undefined) ?? [])[0]?.name,
  };
}

/** Up to `n` candidates for a free-text query, for a person to pick from (Text Search Pro, not cached: queries are one-offs). */
export async function searchCandidates(query: string, bias?: { lat: number; lng: number; radiusM?: number }, n = 3): Promise<SpotHit[]> {
  const body: Record<string, unknown> = { textQuery: query, languageCode: "en", regionCode: "JP", pageSize: Math.min(Math.max(n, 1), 5) };
  if (bias) body.locationBias = { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: bias.radiusM ?? 20000 } };
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key(), "X-Goog-FieldMask": SPOT_FIELDS },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw await googleError(res);
  const data = (await res.json()) as { places?: Record<string, unknown>[] };
  return (data.places ?? []).flatMap((p) => {
    const loc = p.location as { latitude: number; longitude: number } | undefined;
    if (!loc) return [];
    return [
      {
        placeId: p.id as string,
        name: (p.displayName as { text?: string })?.text ?? query,
        lat: loc.latitude,
        lng: loc.longitude,
        address: p.formattedAddress as string | undefined,
        type: (p.primaryTypeDisplayName as { text?: string })?.text,
        googleMapsUri: p.googleMapsUri as string | undefined,
        photo: ((p.photos as { name: string }[] | undefined) ?? [])[0]?.name,
      },
    ];
  });
}

/** One place by id, as a pin: for a Maps link that names a place id or coordinates. */
export async function spotById(placeId: string): Promise<SpotHit | null> {
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers: { "X-Goog-Api-Key": key(), "X-Goog-FieldMask": SPOT_FIELDS.replace(/places\./g, "") },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw await googleError(res);
  const p = (await res.json()) as Record<string, unknown>;
  const loc = p.location as { latitude: number; longitude: number } | undefined;
  if (!loc) return null;
  return {
    placeId: p.id as string,
    name: (p.displayName as { text?: string })?.text ?? "",
    lat: loc.latitude,
    lng: loc.longitude,
    address: p.formattedAddress as string | undefined,
    type: (p.primaryTypeDisplayName as { text?: string })?.text,
    googleMapsUri: p.googleMapsUri as string | undefined,
    photo: ((p.photos as { name: string }[] | undefined) ?? [])[0]?.name,
  };
}

/** Essentials-tier details: just the coordinates (cheap; used once at seed time). */
export async function placeLocation(placeId: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": key(), "X-Goog-FieldMask": "location" },
    cache: "no-store",
  });
  if (!res.ok) throw await googleError(res);
  const p = (await res.json()) as { location?: { latitude: number; longitude: number } };
  return p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null;
}

type RawAttribution = { displayName?: string; uri?: string; photoUri?: string };
const attribution = (a: RawAttribution | undefined): GoogleAttribution => ({
  displayName: a?.displayName ?? "Google user",
  uri: a?.uri,
  photoUri: a?.photoUri,
});

const DETAILS_FIELDS = ["id", "displayName", "formattedAddress", "location", "rating", "userRatingCount", "googleMapsUri", "websiteUri", "priceLevel", "regularOpeningHours", "editorialSummary", "photos", "reviews"].join(",");

const PRICE: Record<string, number> = { PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };

/**
 * Place Details (New). Held in the Next.js data cache for PLACES_CACHE_SECONDS
 * (default one hour), within Google's caching terms: only the place_id is
 * stored permanently.
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
    weekdayHours: p.regularOpeningHours?.weekdayDescriptions,
    openNow: p.regularOpeningHours?.openNow,
    location: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : undefined,
    website: p.websiteUri,
    priceLevel: PRICE[p.priceLevel as string],
    summary: p.editorialSummary?.text,
    photos: (p.photos ?? []).slice(0, 8).map((ph: Record<string, unknown>) => ({
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
    fetchedAt: new Date().toISOString(),
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
