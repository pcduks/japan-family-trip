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
  mode: "transit" | "driving" | "walking" = "transit",
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

/** One Google Maps route through several places (a day's walk), with the middle ones as waypoints. */
export function routeDirectionsUrl(queries: string[], mode: "walking" | "transit" = "walking"): string {
  const stops = queries.map((q) => `${q}, Japan`);
  if (stops.length < 2) return mapsSearchUrl({ query: queries[0] ?? "Tokyo", googlePlaceId: null });
  const params = new URLSearchParams({ api: "1", origin: stops[0], destination: stops[stops.length - 1], travelmode: mode });
  if (stops.length > 2) params.set("waypoints", stops.slice(1, -1).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}
