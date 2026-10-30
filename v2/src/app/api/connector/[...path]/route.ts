import { NextResponse, type NextRequest } from "next/server";
import { connectorActor } from "@/lib/connector";
import { importTripData } from "@/lib/import";
import { adminSupabase } from "@/lib/supabase/server";
import type { Place } from "@/lib/types";

/**
 * Claude connector API (PRD §8), token-scoped. Authorization: Bearer <CLAUDE_CONNECTOR_TOKEN>.
 *
 *   GET  /api/connector/versions          versions with stays
 *   GET  /api/connector/days?version=id   days and day items
 *   GET  /api/connector/places[?region=]  the library
 *   GET  /api/connector/regions
 *   POST /api/connector/places            { places: Place[] }  (upsert by id)
 *   POST /api/connector/notes             { target_type: "place"|"day"|"version", target_id, body }
 *   POST /api/connector/drops             { author_id, caption?, text?, url? }
 *
 * It cannot edit the plan, votes or bookings: those tables are simply not reachable here.
 */
const CLAUDE_TRAVELLER = "claude";

async function ensureClaudeTraveller(admin: NonNullable<ReturnType<typeof adminSupabase>>) {
  await admin.from("travellers").upsert({ id: CLAUDE_TRAVELLER, email: "claude@connector.invalid", name: "Claude", role: "member", notes: "API connector" }, { onConflict: "id", ignoreDuplicates: true });
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/connector/[...path]">) {
  const who = await connectorActor(req);
  if (!who) return NextResponse.json({ error: "Connector token or planner session required" }, { status: 401 });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { path } = await ctx.params;
  const q = req.nextUrl.searchParams;
  switch (path[0]) {
    case "versions": {
      const { data, error } = await admin.from("versions").select("*, stays(*)").order("created_at");
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
    }
    case "days": {
      let query = admin.from("days").select("*, day_items(*)").order("date");
      if (q.get("version")) query = query.eq("version_id", q.get("version")!);
      const { data, error } = await query;
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
    }
    case "places": {
      let query = admin.from("places").select("*, closures(*)").order("sort");
      if (q.get("region")) query = query.eq("region_id", q.get("region")!);
      const { data, error } = await query;
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
    }
    case "regions": {
      const { data, error } = await admin.from("regions").select("*");
      return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json(data);
    }
    default:
      return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/connector/[...path]">) {
  const who = await connectorActor(req);
  if (!who) return NextResponse.json({ error: "Connector token or planner session required" }, { status: 401 });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const { path } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  try {
    switch (path[0]) {
      case "places": {
        const places = body.places as Place[] | undefined;
        if (!Array.isArray(places) || !places.length) return NextResponse.json({ error: "places[] required" }, { status: 400 });
        const report = await importTripData(admin, { places: places.map((p) => ({ ...p, updated_by: p.updated_by ?? who.actor })) }, who.actor);
        return NextResponse.json({ ok: true, report });
      }
      case "notes": {
        const { target_type, target_id, body: text } = body as { target_type?: string; target_id?: string; body?: string };
        if (!target_type || !target_id || !text) return NextResponse.json({ error: "target_type, target_id and body required" }, { status: 400 });
        await ensureClaudeTraveller(admin);
        const { error } = await admin.from("comments").insert({ author_id: who.kind === "claude" ? CLAUDE_TRAVELLER : who.actor, target_type, target_id, body: text });
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }
      case "drops": {
        const { author_id, caption, text, url } = body as { author_id?: string; caption?: string; text?: string; url?: string };
        await ensureClaudeTraveller(admin);
        const { data, error } = await admin
          .from("drops")
          .insert({ author_id: author_id ?? CLAUDE_TRAVELLER, caption: caption ?? null, text: text ?? null, url: url ?? null, processing_status: "pending" })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true, id: data.id });
      }
      default:
        return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
