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

/** Server-only keys. Never import these values into client components. */
export function serverEnv() {
  return {
    placesKey: process.env.GOOGLE_PLACES_API_KEY ?? "",
    youtubeKey: process.env.YOUTUBE_API_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    placesCacheSeconds: Number(process.env.PLACES_CACHE_SECONDS ?? 3600),
  };
}
