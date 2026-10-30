/** The bundled trip-data.json (copied from the repo root by scripts/sync-data.mjs), typed. Used by the seed and by demo mode. */
import planDays from "../../../data/plan-days.json";
import raw from "../../data/trip-data.json";
import type { Day, Region, TripData, Version } from "../types";

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

/** The plan's day-by-day from the plan doc, as Day rows for the plan version. */
export function bundledPlanDays(): Day[] {
  const d = planDays as { version: string; days: { date: string; kind: string; title: string; items: { place_id: string | null; slot: Day["items"][number]["slot"]; crew: Day["items"][number]["crew"]; note?: string }[] }[] };
  return d.days.map((day) => ({
    version_id: d.version,
    date: day.date,
    kind: day.kind,
    title: day.title,
    items: day.items.map((it, i) => ({ place_id: it.place_id, slot: it.slot, crew: it.crew, note: it.note ?? null, sort: i })),
  }));
}

/** Stored as "Kind · title" in trip.days.title; split it back. */
export function splitDayTitle(title: string | null): { kind: string | null; title: string | null } {
  const m = title?.match(/^([^·]{2,20}) · ([\s\S]*)$/);
  return m ? { kind: m[1].trim(), title: m[2] } : { kind: null, title };
}
