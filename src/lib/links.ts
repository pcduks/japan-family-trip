import type { Place } from "./types";

const enc = encodeURIComponent;

/** Google Maps URLs (Maps URLs API; no key needed). */
export function mapsSearchUrl(p: Pick<Place, "query" | "googlePlaceId">): string {
  const id = p.googlePlaceId ? `&query_place_id=${enc(p.googlePlaceId)}` : "";
  return `https://www.google.com/maps/search/?api=1&query=${enc(p.query + ", Japan")}${id}`;
}

export function directionsUrl(
  from: Pick<Place, "query" | "googlePlaceId">,
  to: Pick<Place, "query" | "googlePlaceId">,
  mode: "transit" | "driving" = "transit",
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: from.query + ", Japan",
    destination: to.query + ", Japan",
    travelmode: mode,
  });
  if (from.googlePlaceId) params.set("origin_place_id", from.googlePlaceId);
  if (to.googlePlaceId) params.set("destination_place_id", to.googlePlaceId);
  return `https://www.google.com/maps/dir/?${params}`;
}

export function youtubeSearchUrl(q: string): string {
  return `https://www.youtube.com/results?search_query=${enc(q)}`;
}
