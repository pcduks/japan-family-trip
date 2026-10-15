import { NextResponse, type NextRequest } from "next/server";
import { ActionError, runAction } from "@/lib/actions";
import { tripData } from "@/lib/data/file";
import { adminSupabase, getViewer } from "@/lib/supabase/server";

/** One endpoint for every write: { action, ...payload }. See src/lib/actions.ts. */
export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (viewer === "demo") return NextResponse.json({ error: "Demo mode keeps changes in the browser" }, { status: 400 });
  const sb = adminSupabase();
  if (!sb) return NextResponse.json({ error: "No database" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { action?: string } & Record<string, unknown>;
  if (!body?.action) return NextResponse.json({ error: "action is required" }, { status: 400 });
  try {
    const { data } = await sb.from("regions").select("id,name");
    const regions = ((data ?? []) as { id: string; name: string }[]).length ? (data as { id: string; name: string }[]) : tripData().regions;
    await runAction(sb, viewer, body.action, body, regions);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const status = e instanceof ActionError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
