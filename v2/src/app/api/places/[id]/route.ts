import { NextResponse, type NextRequest } from "next/server";
import { tripData } from "@/lib/data/file";
import { GoogleApiError, placeDetails, textSearch } from "@/lib/google/places";
import { adminSupabase, getViewer, serverSupabase } from "@/lib/supabase/server";

/**
 * GET /api/places/{id}          → Google Place Details (cached server-side)
 * GET /api/places/{id}?photo=1  → just the first photo's name and author
 * Resolves and stores google_place_id on first use when the seed did not.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/places/[id]">) {
  const { id } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const sb = viewer === "demo" ? null : await serverSupabase();
  let place: { id: string; name: string; region_id: string; google_place_id: string | null } | null = null;
  if (sb) {
    const { data } = await sb.from("places").select("id,name,region_id,google_place_id").eq("id", id).maybeSingle();
    place = data;
  } else {
    const p = tripData().places.find((x) => x.id === id);
    place = p ? { id: p.id, name: p.name, region_id: p.region, google_place_id: p.google_place_id } : null;
  }
  if (!place) return NextResponse.json({ error: "No such place" }, { status: 404 });
  try {
    let placeId = place.google_place_id;
    if (!placeId) {
      const region = tripData().regions.find((r) => r.id === place!.region_id);
      const hit = (await textSearch(`${place.name}, ${region?.name ?? ""}, Japan`, region ? { lat: region.lat, lng: region.lng } : undefined, { idsOnly: true }))[0];
      if (!hit) return NextResponse.json({ error: "Not found on Google" }, { status: 404 });
      placeId = hit.id;
      const admin = adminSupabase();
      if (admin) await admin.from("places").update({ google_place_id: placeId }).eq("id", id);
    }
    const d = await placeDetails(placeId);
    if (req.nextUrl.searchParams.get("photo")) {
      const ph = d.photos[0];
      return NextResponse.json({ photo: ph ? { name: ph.name, author: ph.authorAttributions[0] } : null }, { headers: { "Cache-Control": "private, max-age=1800" } });
    }
    return NextResponse.json(d, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
