import { NextResponse, type NextRequest } from "next/server";
import { GoogleApiError, photoUri } from "@/lib/google/places";
import { getViewer } from "@/lib/supabase/server";

/**
 * GET /api/photo/places/{placeId}/photos/{photoId}?w=800
 * Redirects to Google's short-lived photo URL so the Places key stays server-side.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/photo/[...name]">) {
  const { name } = await ctx.params;
  if (!(await getViewer())) return new NextResponse("Sign in first", { status: 401 });
  const w = Math.min(Math.max(Number(req.nextUrl.searchParams.get("w")) || 800, 100), 1600);
  try {
    const uri = await photoUri(name.join("/"), w);
    return NextResponse.redirect(uri, {
      status: 302,
      headers: { "Cache-Control": "private, max-age=1800" },
    });
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return new NextResponse((e as Error).message, { status });
  }
}
