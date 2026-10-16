/**
 * Loads a Snapshot either from Supabase (as the signed-in user, RLS applies)
 * or from the bundled trip-data.json in demo mode. Isomorphic: no server-only
 * imports, so the browser can refresh it after realtime events.
 */
import type { DB } from "../supabase/types";
import { daysBetween } from "../dates";
import type { Comment, Day, Place, PlanHistoryEntry, Reaction, Region, Snapshot, Stay, Suggestion, Traveller, Version, Vote } from "../types";
import { bundledPlanDays, splitDayTitle, tripData } from "./file";

type Row = Record<string, unknown>;

function check<T>(label: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return r.data as T;
}

export function fileSnapshot(): Snapshot {
  const d = tripData();
  const travellers: Traveller[] = d.trip.travellers.map((t) => ({ id: t.id, role: t.role, notes: t.notes ?? null, name: t.name ?? DEMO_NAMES[t.id] ?? t.id }));
  return {
    trip: d.trip,
    pace: d.pace,
    calendar: d.calendar,
    deadlines: d.deadlines.map((x, i) => ({ ...x, id: x.id ?? `dl-${x.date}-${i}`, done: false })),
    regions: d.regions,
    places: d.places,
    versions: d.versions,
    legacy_routes: d.legacy_routes,
    travellers,
    votes: [],
    suggestions: [],
    comments: [],
    reactions: [],
    history: [],
    days: bundledPlanDays(),
    food_list: d.tokyo_personal_food_list,
    related_docs: d.related_docs,
    source: "file",
  };
}

export const DEMO_NAMES: Record<string, string> = {
  pedro: "Pedro",
  wife: "Partner",
  brother: "Brother",
  sister_in_law: "Sister-in-law",
  father: "Dad",
  mother: "Mum",
  sister: "Sister",
};

export function rowToStay(r: Row): Stay {
  return {
    id: r.id as string,
    region: r.region_id as string,
    from: r.start_date as string,
    to: r.end_date as string,
    nights: daysBetween(r.start_date as string, r.end_date as string),
    lodging: (r.lodging_type as Stay["lodging"]) ?? null,
    note: (r.note as string | null) ?? null,
  };
}

export function rowToVersion(r: Row, stays: Row[]): Version {
  return {
    id: r.id as string,
    name: r.name as string,
    pace: r.pace as Version["pace"],
    status: r.status as Version["status"],
    owner: (r.owner_id as string | null) ?? "planners",
    stays: stays
      .filter((s) => s.version_id === r.id)
      .sort((a, b) => (a.sort as number) - (b.sort as number))
      .map(rowToStay),
    travel_hours_est: (r.travel_hours_est as number | null) ?? null,
    gains: (r.gains as string | null) ?? null,
    gives_up: (r.gives_up as string | null) ?? null,
    parent_version_id: (r.parent_version_id as string | null) ?? null,
    shared: (r.shared as boolean) ?? true,
    created_at: (r.created_at as string) ?? null,
    updated_at: (r.updated_at as string) ?? null,
  };
}

export function rowToPlace(r: Row): Place {
  const closures = ((r.closures as Row[] | undefined) ?? []).map((c) => ({
    id: c.id as string,
    start: c.start_date as string,
    end: c.end_date as string,
    note: (c.note as string | null) ?? null,
    source: (c.source as string | null) ?? null,
  }));
  return {
    id: r.id as string,
    region: r.region_id as string,
    name: r.name as string,
    kind: r.kind as string,
    size: r.size as Place["size"],
    why: (r.why as string | null) ?? null,
    hours: (r.hours as string | null) ?? null,
    closures: closures.sort((a, b) => a.start.localeCompare(b.start)),
    closed_weekdays: (r.closed_weekdays as string[]) ?? [],
    effort_for_her: (r.effort_for_her as Place["effort_for_her"]) ?? "low",
    effort_note: (r.effort_note as string | null) ?? null,
    status: (r.status as Place["status"]) ?? null,
    price: (r.price as string | null) ?? null,
    booking: (r.booking as string | null) ?? null,
    links: (r.links as Place["links"]) ?? { source: null, map: null, photos: null, instagram: null, video: null },
    food: (r.food as Place["food"]) ?? null,
    google_place_id: (r.google_place_id as string | null) ?? null,
    lat: (r.lat as number | null) ?? null,
    lng: (r.lng as number | null) ?? null,
    source: (r.source as string | null) ?? null,
    checked_at: (r.checked_at as string | null) ?? null,
    verified: (r.verified as boolean) ?? false,
    updated_by: (r.updated_by as string | null) ?? null,
    created_from_drop_id: (r.created_from_drop_id as string | null) ?? null,
  };
}

export function rowToRegion(r: Row): Region {
  return {
    id: r.id as string,
    name: r.name as string,
    lat: r.lat as number,
    lng: r.lng as number,
    status: r.status as Region["status"],
    summary: (r.summary as string | null) ?? null,
    fit: (r.fit as string | null) ?? null,
    suggested_nights: (r.suggested_nights as Region["suggested_nights"]) ?? null,
    sources: (r.sources as string[]) ?? [],
    instagram_official: (r.instagram_official as string | null) ?? null,
    hashtags: (r.hashtags as string[]) ?? [],
    videos: (r.videos as string[]) ?? [],
    checked_at: (r.checked_at as string | null) ?? null,
    updated_by: (r.updated_by as string | null) ?? null,
  };
}

export async function loadSnapshot(sb: DB | null): Promise<Snapshot> {
  const base = fileSnapshot();
  if (!sb) return base;
  const [travellers, regions, places, versions, stays, votes, suggestions, comments, reactions, history, deadlines, days] = await Promise.all([
    sb.from("travellers").select("id,name,role,notes").neq("id", "claude").order("id"),
    sb.from("regions").select("*"),
    sb.from("places").select("*, closures(*)").order("sort"),
    sb.from("versions").select("*").order("created_at"),
    sb.from("stays").select("*"),
    sb.from("votes").select("traveller_id,kind,value,updated_at"),
    sb.from("suggestions").select("*").order("created_at", { ascending: false }),
    sb.from("comments").select("*").order("created_at"),
    sb.from("reactions").select("*"),
    sb.from("plan_history").select("*").order("at", { ascending: false }).limit(50),
    sb.from("deadlines").select("*").order("date"),
    sb.from("days").select("*, day_items(*)").order("date"),
  ]);
  const regionRows = check<Row[]>("regions", regions);
  const placeRows = check<Row[]>("places", places);
  const versionRows = check<Row[]>("versions", versions);
  const stayRows = check<Row[]>("stays", stays);
  const order = new Map(base.trip.travellers.map((t, i) => [t.id, i]));
  const travellerRows = check<Row[]>("travellers", travellers)
    .map((t) => ({ id: t.id as string, name: t.name as string, role: t.role as Traveller["role"], notes: (t.notes as string | null) ?? null }))
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  const statusOrder: Record<string, number> = { plan: 0, alternative: 1, personal: 2, legacy: 3 };
  const seededOrder = new Map(base.versions.map((v, i) => [v.id, i]));
  return {
    ...base,
    regions: regionRows.length ? regionRows.map(rowToRegion) : base.regions,
    places: placeRows.length ? placeRows.map(rowToPlace) : base.places,
    versions: versionRows.length
      ? versionRows
          .map((v) => rowToVersion(v, stayRows))
          .sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || (seededOrder.get(a.id) ?? 99) - (seededOrder.get(b.id) ?? 99) || (a.created_at ?? "").localeCompare(b.created_at ?? ""))
      : base.versions,
    travellers: travellerRows.length ? travellerRows : base.travellers,
    votes: check<Vote[]>("votes", votes),
    suggestions: check<Suggestion[]>("suggestions", suggestions),
    comments: check<Comment[]>("comments", comments),
    reactions: check<Reaction[]>("reactions", reactions),
    history: check<PlanHistoryEntry[]>("history", history),
    deadlines: (() => {
      const rows = check<Row[]>("deadlines", deadlines);
      return rows.length ? rows.map((d) => ({ id: d.id as string, date: d.date as string, item: d.item as string, source: (d.source as string | null) ?? null, done: (d.done as boolean) ?? false })) : base.deadlines;
    })(),
    days: (() => {
      const rows = check<Row[]>("days", days);
      if (!rows.length) return base.days;
      return rows.map((r): Day => {
        const { kind, title } = splitDayTitle((r.title as string | null) ?? null);
        return {
          id: r.id as string,
          version_id: r.version_id as string,
          date: r.date as string,
          kind,
          title,
          items: ((r.day_items as Row[] | undefined) ?? [])
            .sort((a, b) => (a.sort as number) - (b.sort as number))
            .map((it) => ({ id: it.id as string, place_id: (it.place_id as string | null) ?? null, slot: it.slot as Day["items"][number]["slot"], crew: it.crew as Day["items"][number]["crew"], note: (it.note as string | null) ?? null, sort: it.sort as number })),
        };
      });
    })(),
    source: "supabase",
  };
}
