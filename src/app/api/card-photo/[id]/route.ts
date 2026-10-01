import { NextResponse, type NextRequest } from "next/server";
import { loadCatalog } from "@/lib/catalog";
import { loadChapters } from "@/lib/catalog/chapters";
import { GoogleApiError, photoUri, placeDetails, textSearchPlaceId } from "@/lib/google/places";
import { getViewer } from "@/lib/supabase/server";

/** Resolved photo names per query, per server instance; Google allows caching place ids. */
const resolved = new Map<string, string[]>();

/** The text query a card or chapter photo comes from. Chapters use "chapter:<id>:<n>" for the n-th example. */
function queryFor(id: string): string | null {
  if (id.startsWith("chapter:")) {
    const [, cid, n] = id.split(":");
    const ch = loadChapters().find((c) => c.id === cid);
    const q = ch?.photo_queries?.[Number(n) || 0];
    return q ?? null;
  }
  const card = loadCatalog().cards.find((c) => c.id === id);
  return card?.photo_query ?? (card ? `${card.name_en} Japan` : null);
}

/**
 * GET /api/card-photo/:id?i=0&w=800 → redirects to a Google photo of the place behind an
 * experience card (its photo_query). Sign-in required; the key stays server-side.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/card-photo/[id]">) {
  const { id } = await ctx.params;
  if (!(await getViewer())) return new NextResponse("Sign in first", { status: 401 });
  const q = queryFor(decodeURIComponent(id));
  if (!q) return new NextResponse("Unknown card", { status: 404 });
  const i = Math.max(0, Number(req.nextUrl.searchParams.get("i")) || 0);
  const w = Math.min(Math.max(Number(req.nextUrl.searchParams.get("w")) || 800, 100), 1600);
  try {
    let names = resolved.get(q);
    if (!names) {
      const placeId = await textSearchPlaceId(q);
      if (!placeId) return new NextResponse("No photo", { status: 404 });
      names = (await placeDetails(placeId)).photos.map((p) => p.name);
      resolved.set(q, names);
    }
    const name = names[Math.min(i, names.length - 1)];
    if (!name) return new NextResponse("No photo", { status: 404 });
    return NextResponse.redirect(await photoUri(name, w), { status: 302, headers: { "Cache-Control": "private, max-age=1800" } });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return new NextResponse((e as Error).message, { status });
  }
}
