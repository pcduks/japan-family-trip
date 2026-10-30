import { NextResponse, type NextRequest } from "next/server";
import { allPins, biasFor, cityAreas } from "@/lib/city";
import { loadSnapshot } from "@/lib/data/loader";
import { GoogleApiError, type SpotHit } from "@/lib/google/places";
import { inBatches, resolvePin } from "@/lib/google/resolve";
import { adminSupabase, getViewer } from "@/lib/supabase/server";

const MAX = 80;

/**
 * POST /api/city/resolve { region, ids: [pin id] } → { pins: { [id]: SpotHit | null } }.
 * Finds the named pins on Google (Text Search Pro, biased to each pin's area,
 * cached 30 days). The queries come from the page's own pin list, never from
 * the browser, so a caller can only ask for what the page shows. A miss comes
 * back as null so the browser stops asking.
 */
export async function POST(req: NextRequest) {
  if (!(await getViewer())) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { region?: unknown; ids?: unknown } | null;
  const region = typeof body?.region === "string" ? body.region : "";
  if (!/^[a-z0-9-]{2,40}$/.test(region)) return NextResponse.json({ error: "A region is required" }, { status: 400 });
  const ids = [...new Set((Array.isArray(body?.ids) ? body.ids : []).filter((x): x is string => typeof x === "string"))].slice(0, MAX);
  if (!ids.length) return NextResponse.json({ error: "ids are required" }, { status: 400 });
  try {
    const snap = await loadSnapshot(adminSupabase());
    const centre = snap.regions.find((r) => r.id === region);
    if (!centre) return NextResponse.json({ error: "Unknown region" }, { status: 404 });
    const areas = cityAreas(region);
    const known = new Map(allPins(region, snap, []).map((p) => [p.id, p]));
    const asks = ids.map((id) => known.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
    const found = await inBatches(asks, 4, async (p) => [p.id, await resolvePin(p.id, p.query, biasFor(p, areas, centre)).catch(() => null)] as const);
    const pins: Record<string, SpotHit | null> = {};
    for (const [id, hit] of found) pins[id] = hit;
    return NextResponse.json({ pins }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
