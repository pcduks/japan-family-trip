import { NextResponse } from "next/server";
import { GoogleApiError, placeDetails } from "@/lib/google/places";
import { getViewer } from "@/lib/supabase/server";
import { spotById } from "@/lib/tokyo";
import { resolveSpot } from "@/lib/google/tokyoSpots";

/**
 * GET /api/tokyo/spot/:id → Place Details for one guide spot: photos, rating,
 * reviews, opening hours, website. Only fetched when someone opens the spot,
 * and held in the data cache for PLACES_CACHE_SECONDS.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/tokyo/spot/[id]">) {
  const { id } = await ctx.params;
  if (!(await getViewer())) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const spot = spotById(decodeURIComponent(id));
  if (!spot) return NextResponse.json({ error: "Unknown spot" }, { status: 404 });
  try {
    const hit = await resolveSpot(spot);
    if (!hit) return NextResponse.json({ error: `No Google match for “${spot.query}”` }, { status: 404 });
    const details = await placeDetails(hit.placeId);
    return NextResponse.json(details, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
