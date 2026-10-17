/**
 * Import of trip-data.json (schema v2) or a partial file (PRD §8). Upserts by
 * id, never deletes unless the payload says so, never touches the plan, votes,
 * drops or comments. Shared by the seed script and POST /api/import.
 */
import { createHash } from "node:crypto";
import type { DB } from "./supabase/types";
import type { Closure, Deadline, Place, Region, TripData, Version } from "./types";

export interface ImportPayload extends Partial<Pick<TripData, "regions" | "places" | "versions" | "deadlines" | "generated">> {
  /** Ids to remove; the only way the import deletes anything. */
  delete?: { places?: string[]; regions?: string[]; closures?: string[] };
}

export interface ImportReport {
  regions: { added: string[]; changed: string[] };
  places: { added: string[]; changed: { id: string; fields: string[] }[] };
  closures: { updated: string[] };
  versions: { added: string[]; changed: string[]; skipped: string[] };
  deadlines: { added: number };
  deleted: { places: string[]; regions: string[]; closures: string[] };
  errors: string[];
}

type Row = Record<string, unknown>;

function check<T>(label: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return r.data as T;
}

export function regionRow(r: Region, checkedAt: string, actor: string): Row {
  return {
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    status: r.status,
    summary: r.summary,
    fit: r.fit,
    suggested_nights: r.suggested_nights,
    sources: r.sources ?? [],
    instagram_official: r.instagram_official,
    hashtags: r.hashtags ?? [],
    videos: r.videos ?? [],
    checked_at: r.checked_at ?? checkedAt,
    updated_by: r.updated_by ?? actor,
    updated_at: new Date().toISOString(),
  };
}

export function placeRow(p: Place, i: number, checkedAt: string, actor: string): Row {
  return {
    id: p.id,
    region_id: p.region,
    name: p.name,
    kind: p.kind,
    size: p.size,
    why: p.why,
    hours: p.hours,
    closed_weekdays: p.closed_weekdays ?? [],
    effort_for_her: p.effort_for_her ?? "low",
    effort_note: p.effort_note,
    status: p.status ?? null,
    price: p.price,
    booking: p.booking,
    links: p.links ?? {},
    food: p.food ?? null,
    source: p.source ?? p.links?.source ?? null,
    checked_at: p.checked_at ?? checkedAt,
    verified: p.verified ?? false,
    updated_by: p.updated_by ?? actor,
    sort: i,
    updated_at: new Date().toISOString(),
    // google_place_id / lat / lng are only written when the payload has them,
    // so re-imports never clear resolved ids.
    ...(p.google_place_id ? { google_place_id: p.google_place_id } : {}),
    ...(p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : {}),
  };
}

export function closureRow(c: Closure, placeId: string, k: number): Row {
  return { id: c.id ?? `${placeId}-c${k}`, place_id: placeId, start_date: c.start, end_date: c.end, note: c.note, source: c.source };
}

const COMPARE_FIELDS = ["name", "kind", "size", "why", "hours", "closed_weekdays", "effort_for_her", "effort_note", "status", "price", "booking", "links", "food", "source", "checked_at", "verified"];

/** Stable stringify (sorted keys) so jsonb round-trips compare equal. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .filter((k) => o[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

function changedFields(before: Row | undefined, after: Row): string[] {
  if (!before) return [];
  return COMPARE_FIELDS.filter((f) => stable(before[f] ?? null) !== stable(after[f] ?? null));
}

export function payloadHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

export async function importTripData(sb: DB, payload: ImportPayload, actor: string): Promise<ImportReport> {
  const report: ImportReport = {
    regions: { added: [], changed: [] },
    places: { added: [], changed: [] },
    closures: { updated: [] },
    versions: { added: [], changed: [], skipped: [] },
    deadlines: { added: 0 },
    deleted: { places: [], regions: [], closures: [] },
    errors: [],
  };
  const checkedAt = payload.generated ?? new Date().toISOString().slice(0, 10);

  if (payload.regions?.length) {
    const existing = new Set(check<{ id: string }[]>("regions", await sb.from("regions").select("id")).map((r) => r.id));
    const rows = payload.regions.map((r) => regionRow(r, checkedAt, actor));
    check("regions upsert", await sb.from("regions").upsert(rows, { onConflict: "id" }));
    for (const r of rows) (existing.has(r.id as string) ? report.regions.changed : report.regions.added).push(r.id as string);
  }

  if (payload.places?.length) {
    const before = new Map(check<Row[]>("places", await sb.from("places").select("*")).map((r) => [r.id as string, r]));
    const rows = payload.places.map((p, i) => placeRow(p, i, checkedAt, actor));
    for (let i = 0; i < rows.length; i += 50) check("places upsert", await sb.from("places").upsert(rows.slice(i, i + 50), { onConflict: "id" }));
    for (const r of rows) {
      const prev = before.get(r.id as string);
      if (!prev) report.places.added.push(r.id as string);
      else {
        const fields = changedFields(prev, r);
        if (fields.length) report.places.changed.push({ id: r.id as string, fields });
      }
    }
    // Closures: replace the set for each imported place.
    const ids = payload.places.map((p) => p.id);
    const closures = payload.places.flatMap((p) => (p.closures ?? []).map((c, k) => closureRow(c, p.id, k)));
    check("closures delete", await sb.from("closures").delete().in("place_id", ids));
    if (closures.length) check("closures insert", await sb.from("closures").insert(closures));
    report.closures.updated = Array.from(new Set(closures.map((c) => c.place_id as string)));
  }

  if (payload.versions?.length) {
    const existing = new Map(check<{ id: string; status: string }[]>("versions", await sb.from("versions").select("id,status")).map((v) => [v.id, v.status]));
    for (const v of payload.versions as Version[]) {
      if (v.status === "personal") {
        report.versions.skipped.push(v.id);
        continue;
      }
      const status = existing.get(v.id);
      // The plan is never overwritten by an import once it exists.
      if (status === "plan" || (v.status === "plan" && Array.from(existing.values()).includes("plan") && status !== "plan")) {
        report.versions.skipped.push(v.id);
        continue;
      }
      check(
        "version upsert",
        await sb.from("versions").upsert(
          {
            id: v.id,
            name: v.name,
            owner_id: null,
            pace: v.pace,
            status: v.status,
            parent_version_id: v.parent_version_id ?? null,
            gains: v.gains,
            gives_up: v.gives_up,
            travel_hours_est: v.travel_hours_est ?? null,
            shared: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        ),
      );
      check("stays delete", await sb.from("stays").delete().eq("version_id", v.id));
      check(
        "stays insert",
        await sb.from("stays").insert(
          v.stays.map((s, i) => ({ version_id: v.id, region_id: s.region, start_date: s.from, end_date: s.to, lodging_type: s.lodging, note: s.note, sort: i })),
        ),
      );
      (status ? report.versions.changed : report.versions.added).push(v.id);
    }
  }

  if (payload.deadlines?.length) {
    const rows = (payload.deadlines as Deadline[]).map((d, i) => ({ id: d.id ?? `dl-${d.date}-${i}`, date: d.date, item: d.item, source: d.source ?? null }));
    // The file is the list: a tick survives only on the same item, and dates no longer in the file go.
    const have = check<{ id: string; item: string }[]>("deadlines", await sb.from("deadlines").select("id,item"));
    const same = new Map(have.map((d) => [d.id, d.item]));
    check("deadlines", await sb.from("deadlines").upsert(rows.map((r) => (same.get(r.id) === r.item ? r : { ...r, done: false })), { onConflict: "id", ignoreDuplicates: false }));
    const stale = have.map((d) => d.id).filter((id) => !rows.some((r) => r.id === id));
    if (stale.length) check("deadlines delete", await sb.from("deadlines").delete().in("id", stale));
    report.deadlines.added = rows.length;
  }

  if (payload.delete) {
    const d = payload.delete;
    if (d.closures?.length) {
      check("delete closures", await sb.from("closures").delete().in("id", d.closures));
      report.deleted.closures = d.closures;
    }
    if (d.places?.length) {
      check("delete places", await sb.from("places").delete().in("id", d.places));
      report.deleted.places = d.places;
    }
    if (d.regions?.length) {
      check("delete regions", await sb.from("regions").delete().in("id", d.regions));
      report.deleted.regions = d.regions;
    }
  }

  check("imports log", await sb.from("imports").insert({ actor, payload_hash: payloadHash(payload), report }));
  return report;
}
