import { NextResponse } from "next/server";
import { loadSnapshot } from "@/lib/data/loader";
import { adminSupabase, getViewer } from "@/lib/supabase/server";

/** The whole shared state for the signed-in family member. The browser polls this. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sb = viewer === "demo" ? null : adminSupabase();
  try {
    const [snapshot, settings] = await Promise.all([loadSnapshot(sb), sb ? sb.from("settings").select("value").eq("key", "votes").maybeSingle() : Promise.resolve({ data: null })]);
    const rankRevealed = Boolean(((settings as { data: { value?: { rank_revealed?: boolean } } | null }).data?.value as { rank_revealed?: boolean } | undefined)?.rank_revealed);
    return NextResponse.json({ snapshot, rankRevealed }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
