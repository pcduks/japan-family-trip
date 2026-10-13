import { NextResponse } from "next/server";

/** Which settings this deployment has (names only, never values). Public on purpose. */
export function GET() {
  const has = (...names: string[]) => names.some((n) => Boolean(process.env[n]));
  return NextResponse.json(
    {
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      supabaseUrl: has("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
      supabaseAnonKey: has("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"),
      serviceRoleKey: has("SUPABASE_SERVICE_ROLE_KEY"),
      mapsKey: has("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "GOOGLE_MAPS_API_KEY"),
      mapId: has("NEXT_PUBLIC_GOOGLE_MAP_ID", "GOOGLE_MAP_ID"),
      placesKey: has("GOOGLE_PLACES_API_KEY"),
      youtubeKey: has("YOUTUBE_API_KEY"),
      anthropicKey: has("ANTHROPIC_API_KEY"),
      connectorToken: has("CLAUDE_CONNECTOR_TOKEN"),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
