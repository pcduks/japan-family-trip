/** Feature flags derived from which keys are configured. */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  mapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "",
  mapIdDark: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID_DARK ?? "",
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasMaps = Boolean(env.mapsKey);

/** The Postgres schema every v2 table lives in. */
export const DB_SCHEMA = "trip";

/** Server-only keys. Never import these values into client components. */
export function serverEnv() {
  return {
    placesKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
    youtubeKey: process.env.YOUTUBE_API_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    connectorToken: process.env.CLAUDE_CONNECTOR_TOKEN ?? "",
    anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
    placesCacheSeconds: Number(process.env.PLACES_CACHE_SECONDS ?? 3600),
  };
}

/** Demo mode (no Supabase) is for local development only unless DEMO_MODE=1. */
export function demoAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1";
}
