/**
 * Apply supabase/migrations/*.sql to a Supabase project through the Management
 * API, so no local Supabase CLI or Docker is needed.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_… SUPABASE_PROJECT_REF=abcd… npm run db:push
 *
 * Every migration is idempotent, so re-running is safe.
 */
import { readdirSync, readFileSync } from "node:fs";
import { loadEnv, need } from "./env";

loadEnv();
const token = need("SUPABASE_ACCESS_TOKEN");
const ref = need("SUPABASE_PROJECT_REF");

async function run() {
  const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const query = readFileSync(`supabase/migrations/${f}`, "utf8");
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`✗ ${f}: ${res.status} ${body}`);
      process.exit(1);
    }
    console.log(`✓ ${f}`);
  }
  console.log("Now check Dashboard → Settings → API → Exposed schemas includes `trip`.");
}

run();
