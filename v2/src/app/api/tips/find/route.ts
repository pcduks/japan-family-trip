import { NextResponse, type NextRequest } from "next/server";
import type { DropImage } from "@/lib/anthropic/extract";
import { GoogleApiError } from "@/lib/google/places";
import { getViewer } from "@/lib/supabase/server";
import { findTips } from "@/lib/tips/find";

const MEDIA = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * POST /api/tips/find { city, text?, images?: [{ mediaType, base64 }], bias? }
 * → { items: [{ guess, candidates }], hint }. Nothing is saved: the person
 * confirms the candidates and then the app writes them as tips.
 */
export async function POST(req: NextRequest) {
  if (!(await getViewer())) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { city?: unknown; text?: unknown; images?: unknown; bias?: unknown; lines?: unknown } | null;
  const city = typeof body?.city === "string" ? body.city : "";
  if (!/^[a-z0-9-]{2,40}$/.test(city)) return NextResponse.json({ error: "A city is required" }, { status: 400 });
  const text = typeof body?.text === "string" ? body.text.slice(0, 6000) : "";
  const images = (Array.isArray(body?.images) ? body.images : [])
    .filter((i): i is DropImage => !!i && typeof i === "object" && MEDIA.includes((i as DropImage).mediaType) && typeof (i as DropImage).base64 === "string" && (i as DropImage).base64.length < 3_000_000)
    .slice(0, 4);
  const b = body?.bias as { lat?: unknown; lng?: unknown; radiusM?: unknown } | undefined;
  const bias = b && typeof b.lat === "number" && typeof b.lng === "number" ? { lat: b.lat, lng: b.lng, radiusM: typeof b.radiusM === "number" ? b.radiusM : undefined } : undefined;
  const lines = (Array.isArray(body?.lines) ? body.lines : []).filter((l): l is { title: string; note?: string | null; url?: string | null } => !!l && typeof l === "object" && typeof (l as { title?: unknown }).title === "string").slice(0, 60);
  if (!text && !images.length && !lines.length) return NextResponse.json({ error: "Paste something or add a screenshot" }, { status: 400 });
  try {
    return NextResponse.json(await findTips({ city, text, images, bias, lines }));
  } catch (e) {
    const status = e instanceof GoogleApiError ? e.status : 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
