import { NextResponse } from "next/server";
import { GoogleApiError, placeDetails, textSearchPlaceId } from "@/lib/google/places";
import { adminSupabase, getViewer, serverSupabase } from "@/lib/supabase/server";
import { bundledTrip } from "@/lib/trip";

// Demo mode (no Supabase) resolves ids per server instance.
const demoIds = new Map<string, string>();

/** GET /api/places/:slug → normalised Google rating, reviews and photo refs. */
export async function GET(_req: Request, ctx: RouteContext<"/api/places/[slug]">) {
  const { slug } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  let place: { id: string; query: string; googlePlaceId: string | null } | undefined;
  const sb = await serverSupabase();
  if (sb) {
    const { data } = await sb.from("places").select("id,query,google_place_id").eq("slug", slug).maybeSingle();
    if (data) place = { id: data.id, query: data.query, googlePlaceId: data.google_place_id };
  } else {
    const p = bundledTrip().places.find((x) => x.slug === slug);
    if (p) place = { id: p.id, query: p.query, googlePlaceId: demoIds.get(slug) ?? null };
  }
  if (!place) return NextResponse.json({ error: "Unknown place" }, { status: 404 });

  try {
    let placeId = place.googlePlaceId;
    if (!placeId) {
      placeId = await textSearchPlaceId(place.query);
      if (!placeId) return NextResponse.json({ error: `No Google match for “${place.query}”` }, { status: 404 });
      // Place ids may be stored indefinitely (PRD §8); save it once.
      const admin = adminSupabase();
      if (admin) await admin.from("places").update({ google_place_id: placeId }).eq("id", place.id);
      else demoIds.set(slug, placeId);
    }
    const details = await placeDetails(placeId);
    return NextResponse.json(details, {
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
