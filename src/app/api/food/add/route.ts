import { NextResponse, type NextRequest } from "next/server";
import { parseMapsUrl } from "@/lib/family";
import { serverEnv } from "@/lib/env";
import { getViewer, serverSupabase } from "@/lib/supabase/server";
import { slugify } from "@/lib/trip";

const SHORT = /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i;

/** Follow a maps.app.goo.gl short link to the full Google Maps URL. */
async function expand(url: string): Promise<string> {
  let current = url;
  for (let i = 0; i < 5 && SHORT.test(current); i++) {
    const res = await fetch(current, { redirect: "manual", cache: "no-store" });
    const next = res.headers.get("location");
    if (!next) break;
    current = new URL(next, current).toString();
  }
  return current;
}

interface Found {
  placeId: string | null;
  name: string;
  area: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
}

async function lookup(text: string, lat: number | null, lng: number | null): Promise<Found | null> {
  const key = serverEnv().placesKey;
  if (!key) return null;
  const body: Record<string, unknown> = { textQuery: text, languageCode: "en", regionCode: "JP", pageSize: 1 };
  if (lat != null && lng != null) body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 500 } };
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.primaryTypeDisplayName,places.addressComponents",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const p = (await res.json()).places?.[0];
  if (!p) return null;
  const comps = (p.addressComponents ?? []) as { longText: string; types: string[] }[];
  const area =
    comps.find((c) => c.types.includes("sublocality_level_2"))?.longText ??
    comps.find((c) => c.types.includes("sublocality_level_1"))?.longText ??
    comps.find((c) => c.types.includes("locality"))?.longText ??
    null;
  return {
    placeId: p.id,
    name: p.displayName?.text ?? text,
    area,
    category: p.primaryTypeDisplayName?.text ?? null,
    lat: p.location?.latitude ?? lat,
    lng: p.location?.longitude ?? lng,
  };
}

/** POST {link, note} → add a restaurant to the shared food list. */
export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Entre primeiro" }, { status: 401 });
  const sb = await serverSupabase();
  if (!sb || viewer === "demo") return NextResponse.json({ error: "Adicionar lugares precisa do Supabase (não funciona no modo demonstração)." }, { status: 400 });

  const { link, note } = (await req.json().catch(() => ({}))) as { link?: string; note?: string | null };
  const input = (link ?? "").trim().slice(0, 2000);
  if (!input) return NextResponse.json({ error: "Cole um link ou o nome do lugar." }, { status: 400 });

  let name: string | null = input;
  let lat: number | null = null;
  let lng: number | null = null;
  if (/^https?:\/\//i.test(input)) {
    const full = await expand(input).catch(() => input);
    const parsed = parseMapsUrl(full);
    name = parsed.name;
    lat = parsed.lat;
    lng = parsed.lng;
    if (!name) return NextResponse.json({ error: "Não achei o nome do lugar nesse link. Tente colar o nome." }, { status: 400 });
  }

  const found = await lookup(`${name} Tokyo`, lat, lng).catch(() => null);
  const finalName = found?.name ?? name!;
  const slug = "food-" + slugify(finalName);
  const { data: existing } = await sb.from("places").select("slug").eq("slug", slug).maybeSingle();
  if (existing) return NextResponse.json({ name: finalName, slug, existed: true });

  const { error } = await sb.from("places").insert({
    slug,
    name: finalName,
    query: found?.area ? `${finalName}, ${found.area}, Tokyo` : `${finalName} Tokyo`,
    lat: found?.lat ?? lat,
    lng: found?.lng ?? lng,
    region: "Tokyo",
    kind: "food",
    category: found?.category ?? "Restaurante",
    area: found?.area ?? null,
    note: note?.slice(0, 500) || null,
    google_place_id: found?.placeId ?? null,
    sort: 1000,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ name: finalName, slug });
}
