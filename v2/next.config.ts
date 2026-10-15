import type { NextConfig } from "next";

/**
 * Browser-visible settings. Vercel can refuse NEXT_PUBLIC_ names for values
 * that look like keys, so the plain names are accepted too. The Supabase URL
 * and anon key are public by design (row-level security protects the data).
 */
const pick = (...names: string[]) => names.map((n) => process.env[n]).find(Boolean) ?? "";

const nextConfig: NextConfig = {
  // This app is its own project even though the repo root also has a lockfile.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: pick("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: pick("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"),
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: pick("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "GOOGLE_MAPS_API_KEY"),
    NEXT_PUBLIC_GOOGLE_MAP_ID: pick("NEXT_PUBLIC_GOOGLE_MAP_ID", "GOOGLE_MAP_ID"),
    NEXT_PUBLIC_GOOGLE_MAP_ID_DARK: pick("NEXT_PUBLIC_GOOGLE_MAP_ID_DARK", "GOOGLE_MAP_ID_DARK"),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
