/**
 * Idempotent seed/import (PRD step 2). Safe to re-run.
 *
 *   npm run seed                  # travellers + trip-data.json + place ids
 *   npm run seed -- --no-resolve  # skip the Google place-id lookups
 *   npm run seed -- --file=path   # import another schema-v2 file (partial is fine)
 *
 * The plan version is created the first time and never overwritten after that.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { DB } from "../src/lib/supabase/types";
import { importTripData, type ImportPayload } from "../src/lib/import";
import type { Region, Traveller } from "../src/lib/types";
import { loadEnv, need } from "./env";

loadEnv();
const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

const sb = createClient(process.env.SUPABASE_URL || need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  db: { schema: "trip" },
  auth: { persistSession: false },
}) as DB;

function check<T>(label: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return r.data as T;
}

async function travellers() {
  const file = existsSync("data/travellers.json") ? "data/travellers.json" : null;
  if (!file) {
    console.warn("! data/travellers.json not found; copy data/travellers.example.json and add the real names and emails. Skipping travellers.");
    return;
  }
  const list = JSON.parse(readFileSync(file, "utf8")) as (Traveller & { email: string })[];
  const rows = list.map((t) => ({ id: t.id, name: t.name, role: t.role, notes: t.notes ?? null, email: t.email.trim().toLowerCase() }));
  check("travellers", await sb.from("travellers").upsert(rows, { onConflict: "id" }));
  // Pre-create auth users so magic links and codes work with sign-ups disabled.
  if (!flag("--no-auth-users")) {
    for (const t of rows) {
      const { error } = await sb.auth.admin.createUser({ email: t.email, email_confirm: true });
      if (error && !/already|registered|exists/i.test(error.message)) console.warn(`! auth user ${t.email}: ${error.message}`);
    }
  }
  console.log(`✓ ${rows.length} travellers`);
}

async function importData() {
  const file = opt("file") ?? "src/data/trip-data.json";
  const payload = JSON.parse(readFileSync(file, "utf8")) as ImportPayload;
  const report = await importTripData(sb, payload, "seed");
  console.log(
    `✓ import from ${file}: regions +${report.regions.added.length}/~${report.regions.changed.length}, places +${report.places.added.length}/~${report.places.changed.length}, ` +
      `closures ${report.closures.updated.length} places, versions +${report.versions.added.length}/~${report.versions.changed.length} (skipped ${report.versions.skipped.join(", ") || "none"}), deadlines ${report.deadlines.added}`,
  );
  if (report.places.changed.length) for (const c of report.places.changed.slice(0, 20)) console.log(`  ~ ${c.id}: ${c.fields.join(", ")}`);
}

/** Resolve google_place_id and coordinates with Text Search biased to the region's centre. */
async function resolvePlaceIds() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (flag("--no-resolve") || !key) {
    console.log(key ? "- skipped Google place id lookup" : "- GOOGLE_PLACES_API_KEY not set; place ids are resolved on first view");
    return;
  }
  const regions = check<Region[]>("regions", await sb.from("regions").select("id,name,lat,lng"));
  const todo = check<{ id: string; name: string; region_id: string; google_place_id: string | null; lat: number | null }[]>(
    "places",
    await sb.from("places").select("id,name,region_id,google_place_id,lat").or("google_place_id.is.null,lat.is.null"),
  );
  let ok = 0;
  for (const p of todo) {
    const region = regions.find((r) => r.id === p.region_id);
    try {
      let id = p.google_place_id;
      if (!id) {
        const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
          body: JSON.stringify({
            textQuery: `${p.name}, ${region?.name ?? ""}, Japan`,
            languageCode: "en",
            regionCode: "JP",
            pageSize: 1,
            ...(region ? { locationBias: { circle: { center: { latitude: region.lat, longitude: region.lng }, radius: 25000 } } } : {}),
          }),
        });
        const body = await res.json();
        id = body.places?.[0]?.id ?? null;
        if (!res.ok || !id) {
          console.warn(`! ${p.id}: ${body.error?.message ?? "no match"}`);
          continue;
        }
      }
      const loc = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location" },
      }).then((r) => r.json());
      check("place id", await sb.from("places").update({ google_place_id: id, lat: loc.location?.latitude ?? null, lng: loc.location?.longitude ?? null }).eq("id", p.id));
      ok++;
    } catch (e) {
      console.warn(`! ${p.id}: ${(e as Error).message}`);
    }
  }
  console.log(`✓ resolved ${ok}/${todo.length} Google place ids`);
}

async function main() {
  await travellers();
  await importData();
  await resolvePlaceIds();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
