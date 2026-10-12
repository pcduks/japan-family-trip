import { NextResponse, type NextRequest } from "next/server";
import { connectorActor } from "@/lib/connector";
import { importTripData, type ImportPayload } from "@/lib/import";
import { adminSupabase } from "@/lib/supabase/server";

/**
 * POST /api/import  (Authorization: Bearer <CLAUDE_CONNECTOR_TOKEN>, or a planner session)
 * Body: a trip-data.json (schema v2) or a partial one {regions?, places?, versions?, deadlines?, delete?}.
 * Upserts by id; never touches the plan, votes, drops or comments. Returns a change report.
 */
export async function POST(req: NextRequest) {
  const who = await connectorActor(req);
  if (!who) return NextResponse.json({ error: "Planner session or connector token required" }, { status: 401 });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const payload = (await req.json().catch(() => null)) as ImportPayload | null;
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  if ("schema_version" in payload && (payload as { schema_version?: number }).schema_version !== 2) return NextResponse.json({ error: "schema_version must be 2" }, { status: 400 });
  try {
    const report = await importTripData(admin, payload, who.actor);
    return NextResponse.json({ ok: true, actor: who.actor, report });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
