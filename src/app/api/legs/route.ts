import { NextResponse, type NextRequest } from "next/server";
import { GoogleApiError } from "@/lib/google/places";
import { computeLeg } from "@/lib/google/routes";
import { isPlannerRequest } from "@/lib/supabase/server";
import { bundledTrip } from "@/lib/trip";

/**
 * GET /api/legs?from=kyoto&to=koyasan&mode=drive|transit&date=YYYY-MM-DD
 * Planner only. Returns Google's duration, or 404 when Google has no route
 * (e.g. no transit data), so the curated time stays.
 */
export async function GET(req: NextRequest) {
  if (!(await isPlannerRequest())) return NextResponse.json({ error: "Planner only" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const places = bundledTrip().places;
  const from = places.find((p) => p.slug === sp.get("from"));
  const to = places.find((p) => p.slug === sp.get("to"));
  if (!from || !to) return NextResponse.json({ error: "Unknown place" }, { status: 400 });
  const mode = sp.get("mode") === "transit" ? "TRANSIT" : "DRIVE";
  const date = sp.get("date");
  // Transit needs a departure time: 09:00 JST on the travel day (or a week from now if that's past).
  let departure: string | undefined;
  if (mode === "TRANSIT") {
    const planned = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
    const d = planned && planned.getTime() > Date.now() ? planned : new Date(Date.now() + 7 * 86_400_000);
    d.setUTCHours(0, 0, 0, 0);
    departure = d.toISOString();
  }
  try {
    const leg = await computeLeg(`${from.query}, Japan`, `${to.query}, Japan`, mode, departure);
    if (!leg) return NextResponse.json({ error: mode === "TRANSIT" ? "Google has no transit route here; keep the curated time." : "No route found" }, { status: 404 });
    return NextResponse.json(leg);
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
