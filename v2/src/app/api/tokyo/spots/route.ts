import { NextResponse, type NextRequest } from "next/server";
import { GoogleApiError, type SpotHit } from "@/lib/google/places";
import { inBatches, resolveSpot } from "@/lib/google/tokyoSpots";
import { getViewer } from "@/lib/supabase/server";
import { REST, walkByN } from "@/lib/tokyo";

/**
 * GET /api/tokyo/spots?walk=3 (0 for the rest-day list) → pins for the walk's
 * spots: place id, coordinates, Google's name and a first photo. Sign-in
 * required; the Places key stays server-side. Text Search Pro, once per spot
 * per month at most.
 */
export async function GET(req: NextRequest) {
  if (!(await getViewer())) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const n = Number(req.nextUrl.searchParams.get("walk"));
  const spots = n === 0 ? REST.spots : walkByN(n)?.spots;
  if (!spots) return NextResponse.json({ error: "Unknown walk" }, { status: 404 });
  try {
    const hits = await inBatches(spots, 6, async (s) => [s.id, await resolveSpot(s).catch(() => null)] as const);
    const out: Record<string, SpotHit> = {};
    for (const [id, hit] of hits) if (hit) out[id] = hit;
    return NextResponse.json({ spots: out }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
