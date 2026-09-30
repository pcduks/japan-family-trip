import type { NextConfig } from "next";

/**
 * Browser-visible settings. Vercel can refuse NEXT_PUBLIC_ names for values
 * that look like keys, so the plain names are accepted too. Both Supabase
 * values are public by design (row-level security protects the data); the
 * service-role key is never listed here.
 */
const pick = (...names: string[]) => names.map((n) => process.env[n]).find(Boolean) ?? "";

const nextConfig: NextConfig = {
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
      {
        // The service worker must always be fresh so fixes reach phones.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
