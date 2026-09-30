import type { MapLine, MapMarker } from "@/components/RouteMap";
import { routePlaces, routeSequence } from "./trip";
import type { Place, Route } from "./types";

export function routeLine(route: Route, places: Map<string, Place>, color: string, active = true): MapLine {
  return {
    code: route.id,
    color,
    active,
    path: routeSequence(route)
      .map((s) => places.get(s))
      .filter((p): p is Place => p?.lat != null && p?.lng != null)
      .map((p) => ({ lat: p.lat!, lng: p.lng! })),
  };
}

export function routeMarkers(route: Route, places: Map<string, Place>, hearted: Set<string> = new Set()): MapMarker[] {
  const baseNum = new Map<string, number>();
  route.stays.forEach((s, i) => !baseNum.has(s.place) && baseNum.set(s.place, i + 1));
  const out: MapMarker[] = [];
  for (const slug of routePlaces(route)) {
    const p = places.get(slug);
    if (!p || p.lat == null || p.lng == null) continue;
    const num = baseNum.get(slug);
    out.push({ slug, name: p.name, lat: p.lat, lng: p.lng, kind: num ? "base" : "stop", num, hearted: hearted.has(p.id) });
  }
  return out;
}
