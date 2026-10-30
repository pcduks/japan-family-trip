import { NextResponse, type NextRequest } from "next/server";
import { GoogleApiError, type SpotHit } from "@/lib/google/places";
import { inBatches, resolvePin, type Bias } from "@/lib/google/resolve";
import { getViewer } from "@/lib/supabase/server";

interface Ask {
  id: string;
  query: string;
  bias?: Bias;
}

const MAX = 150;

/**
 * POST /api/city/resolve { pins: [{ id, query, bias? }] } → { pins: { [id]: SpotHit } }.
 * Finds each pin on Google (Text Search Pro, biased to its area, cached for
 * 30 days) so the city page can draw it. Sign-in required; the key stays here.
 */
export async function POST(req: NextRequest) {
  if (!(await getViewer())) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { pins?: unknown } | null;
  const asks = (Array.isArray(body?.pins) ? body.pins : [])
    .filter((p): p is Ask => !!p && typeof p === "object" && typeof (p as Ask).id === "string" && typeof (p as Ask).query === "string" && (p as Ask).query.trim().length > 0)
    .slice(0, MAX);
  if (!asks.length) return NextResponse.json({ error: "pins are required" }, { status: 400 });
  try {
    const found = await inBatches(asks, 6, async (a) => {
      const bias = a.bias && typeof a.bias.lat === "number" && typeof a.bias.lng === "number" ? { lat: a.bias.lat, lng: a.bias.lng, radiusM: typeof a.bias.radiusM === "number" ? Math.min(Math.max(a.bias.radiusM, 200), 50000) : undefined } : undefined;
      return [a.id, await resolvePin(a.id, a.query.trim().slice(0, 200), bias).catch(() => null)] as const;
    });
    const pins: Record<string, SpotHit> = {};
    for (const [id, hit] of found) if (hit) pins[id] = hit;
    return NextResponse.json({ pins }, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
