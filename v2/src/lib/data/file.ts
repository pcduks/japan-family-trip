/** The bundled trip-data.json (copied from the repo root by scripts/sync-data.mjs), typed. Used by the seed and by demo mode. */
import raw from "../../data/trip-data.json";
import type { Region, TripData, Version } from "../types";

export function tripData(): TripData {
  const d = raw as unknown as TripData;
  return {
    ...d,
    regions: d.regions.map((r): Region => ({ ...r, checked_at: r.checked_at ?? d.generated, updated_by: r.updated_by ?? "claude" })),
    places: d.places.map((p) => ({
      ...p,
      status: p.status ?? null,
      food: p.food ?? null,
      checked_at: p.checked_at ?? d.generated,
      updated_by: p.updated_by ?? "claude",
      verified: p.verified ?? false,
      source: p.source ?? p.links?.source ?? null,
    })),
    versions: d.versions.map((v): Version => ({ ...v, shared: true, stays: v.stays.map((s, i) => ({ ...s, id: s.id ?? `${v.id}-${i}` })) })),
  };
}
