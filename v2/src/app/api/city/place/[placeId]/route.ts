import { NextResponse } from "next/server";
import { GoogleApiError, placeDetails } from "@/lib/google/places";
import { getViewer } from "@/lib/supabase/server";

/** GET /api/city/place/:placeId → Place Details for any pin: photos, hours, rating, reviews, website. */
export async function GET(_req: Request, ctx: RouteContext<"/api/city/place/[placeId]">) {
  const { placeId } = await ctx.params;
  if (!(await getViewer())) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!/^[A-Za-z0-9_-]{10,}$/.test(placeId)) return NextResponse.json({ error: "Bad place id" }, { status: 400 });
  try {
    return NextResponse.json(await placeDetails(placeId), { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
