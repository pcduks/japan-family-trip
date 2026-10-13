import { NextResponse, type NextRequest } from "next/server";
import { tripData } from "@/lib/data/file";
import { GoogleApiError, placeDetails, textSearch } from "@/lib/google/places";
import { adminSupabase, getViewer, serverSupabase } from "@/lib/supabase/server";

/**
 * GET /api/regions/{id}/cover → the region's postcard: the first photo of its
 * best-known place (a main outing first). Details are cached server-side.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/regions/[id]/cover">) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const sb = viewer === "demo" ? null : await serverSupabase();
  type Row = { id: string; name: string; size: string; google_place_id: string | null; sort?: number };
  let places: Row[] = [];
  if (sb) {
    const { data } = await sb.from("places").select("id,name,size,google_place_id,sort").eq("region_id", id).order("sort");
    places = (data ?? []) as Row[];
  } else {
    places = tripData().places.filter((p) => p.region === id).map((p) => ({ id: p.id, name: p.name, size: p.size, google_place_id: p.google_place_id }));
  }
  const region = tripData().regions.find((r) => r.id === id);
  const order = ["main", "short", "day_trip", "evening", "meal"];
  const candidates = places.filter((p) => p.size !== "meal").sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size));
  const queries: { place?: Row; query: string }[] = [...candidates.slice(0, 3).map((p) => ({ place: p, query: `${p.name}, ${region?.name ?? ""}, Japan` })), { query: `${region?.name ?? id}, Japan` }];
  try {
    for (const c of queries) {
      let placeId = c.place?.google_place_id ?? null;
      if (!placeId) {
        const hit = (await textSearch(c.query, region ? { lat: region.lat, lng: region.lng } : undefined, { idsOnly: true }))[0];
        if (!hit) continue;
        placeId = hit.id;
        const admin = adminSupabase();
        if (admin && c.place) await admin.from("places").update({ google_place_id: placeId }).eq("id", c.place.id);
      }
      const d = await placeDetails(placeId);
      const ph = d.photos[0];
      if (ph) return NextResponse.json({ place: c.place?.name ?? d.displayName, photo: { name: ph.name, author: ph.authorAttributions[0] } }, { headers: { "Cache-Control": "private, max-age=3600" } });
    }
    return NextResponse.json({ photo: null }, { status: 404 });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
