import { NextResponse, type NextRequest } from "next/server";
import { GoogleApiError } from "@/lib/google/places";
import { searchVideos } from "@/lib/google/youtube";
import { isPlannerRequest } from "@/lib/supabase/server";

/** GET /api/videos/search?q= (planner only; costs ~201 YouTube quota units). */
export async function GET(req: NextRequest) {
  if (!(await isPlannerRequest())) return NextResponse.json({ error: "Planner only" }, { status: 403 });
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });
  try {
    return NextResponse.json(await searchVideos(q.slice(0, 200)));
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
