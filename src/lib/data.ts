import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bundledTrip } from "./trip";
import type { Place, PlaceKind, Route, Trip } from "./types";

type Row = Record<string, unknown>;

/**
 * Load the trip from Supabase (as the signed-in user, so RLS applies), or
 * from the bundled JSON when Supabase is not configured.
 */
export async function loadTrip(sb: SupabaseClient | null): Promise<Trip> {
  const base = bundledTrip();
  if (!sb) return base;

  const [places, routes, stays, extras, modules, travellers] = await Promise.all([
    sb.from("places").select("*").order("sort"),
    sb.from("routes").select("*").order("sort"),
    sb.from("stays").select("*").order("sort"),
    sb.from("stay_daytrips").select("*").order("sort"),
    sb.from("trip_modules").select("*").order("sort"),
    sb.from("travellers").select("id,name,role").order("created_at"),
  ]);
  const err = [places, routes, stays, extras, modules, travellers].find((r) => r.error)?.error;
  if (err) throw new Error(`Supabase: ${err.message}`);
  // Not seeded yet, or RLS returned nothing: fall back so the page still renders.
  if (!places.data?.length || !routes.data?.length) return base;

  const slugById = new Map<string, string>();
  const outPlaces: Place[] = (places.data as Row[]).map((p) => {
    slugById.set(p.id as string, p.slug as string);
    return {
      id: p.id as string,
      slug: p.slug as string,
      name: p.name as string,
      query: p.query as string,
      lat: (p.lat as number) ?? null,
      lng: (p.lng as number) ?? null,
      region: p.region as string,
      kind: p.kind as PlaceKind,
      blurb: p.blurb as string,
      winter: p.winter as string,
      bump: p.bump as string,
      googlePlaceId: (p.google_place_id as string) ?? null,
      category: p.category as string | null,
      area: p.area as string | null,
      note: p.note as string | null,
      closedNote: p.closed_note as string | null,
      listRating: p.list_rating as string | null,
    };
  });

  const outRoutes: Route[] = (routes.data as Row[]).map((r) => ({
    id: r.id as string,
    code: r.code as string,
    name: r.name as string,
    title: r.title as string,
    color: r.color as string,
    exitAirport: r.exit_airport as string,
    isCandidate: r.is_candidate as boolean,
    stays: (stays.data as Row[])
      .filter((s) => s.route_id === r.id)
      .map((s) => {
        const mine = (extras.data as Row[]).filter((x) => x.stay_id === s.id);
        const slugs = (kind: string) =>
          mine.filter((x) => x.kind === kind).map((x) => slugById.get(x.place_id as string)!);
        return {
          id: s.id as string,
          place: slugById.get(s.place_id as string)!,
          startDate: s.start_date as string,
          nights: s.nights as number,
          legNote: (s.leg_note as string) ?? null,
          daytrips: slugs("daytrip"),
          via: slugs("via"),
        };
      }),
  }));

  return {
    ...base,
    places: outPlaces,
    routes: outRoutes,
    modules: (modules.data as Row[]).map((m) => slugById.get(m.place_id as string)!),
    travellers: (travellers.data as Row[]).map((t) => ({
      id: t.id as string,
      name: t.name as string,
      role: t.role as "planner" | "member",
    })),
  };
}
