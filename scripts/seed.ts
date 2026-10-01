/**
 * Idempotent seed (PRD F1): travellers, places (trip + Tokyo food list),
 * candidate routes, stays, day trips and add-ons. Resolves google_place_id
 * once per place with Text Search (IDs only) when GOOGLE_PLACES_API_KEY is set.
 *
 *   npm run seed                 # safe to re-run
 *   npm run seed -- --no-resolve # skip Google lookups
 *   npm run seed -- --reset-routes  # rewrite stays of candidate routes A–D
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { bundledTrip } from "../src/lib/trip";
import { loadEnv, need } from "./env";

loadEnv();
const args = new Set(process.argv.slice(2));
const sb = createClient(process.env.SUPABASE_URL || need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const trip = bundledTrip();

function check<T>(label: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return r.data as T;
}

async function travellers() {
  const file = existsSync("data/travellers.json") ? "data/travellers.json" : null;
  if (!file) {
    console.warn("! data/travellers.json not found; copy data/travellers.example.json and add the six emails. Skipping travellers.");
    return;
  }
  const list = JSON.parse(readFileSync(file, "utf8")) as { name: string; email: string; role: "planner" | "member"; docs_access?: boolean; couple?: string }[];
  const rows = list.map((t) => ({ name: t.name, role: t.role, docs_access: !!t.docs_access, couple: t.couple ?? null, email: t.email.trim().toLowerCase() }));
  check("travellers", await sb.from("travellers").upsert(rows, { onConflict: "email" }));
  // Pre-create auth users so magic links work with sign-ups disabled.
  for (const t of rows) {
    const { error } = await sb.auth.admin.createUser({ email: t.email, email_confirm: true });
    if (error && !/already|registered|exists/i.test(error.message)) throw new Error(`auth user ${t.email}: ${error.message}`);
  }
  console.log(`✓ ${rows.length} travellers`);
}

async function places() {
  const rows = trip.places.map((p, i) => ({
    slug: p.slug,
    name: p.name,
    query: p.query,
    lat: p.lat,
    lng: p.lng,
    region: p.region,
    kind: p.kind,
    blurb: p.blurb,
    winter: p.winter,
    bump: p.bump,
    category: p.category ?? null,
    area: p.area ?? null,
    note: p.note ?? null,
    closed_note: p.closedNote ?? null,
    list_rating: p.listRating ?? null,
    sort: i,
  }));
  // google_place_id is left out so re-runs never clear a resolved id.
  check("places", await sb.from("places").upsert(rows, { onConflict: "slug" }));
  console.log(`✓ ${rows.length} places`);
}

async function resolvePlaceIds() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (args.has("--no-resolve") || !key) {
    console.log(key ? "- skipped Google place id lookup" : "- GOOGLE_PLACES_API_KEY not set; place ids resolve on first view");
    return;
  }
  const todo = check("places", await sb.from("places").select("id,slug,query").is("google_place_id", null));
  let ok = 0;
  for (const p of todo) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
      body: JSON.stringify({ textQuery: p.query, languageCode: "en", regionCode: "JP", pageSize: 1 }),
    });
    const body = await res.json();
    const id = body.places?.[0]?.id;
    if (!res.ok || !id) {
      console.warn(`! ${p.slug}: ${body.error?.message ?? "no match"} (query “${p.query}”)`);
      continue;
    }
    check("place id", await sb.from("places").update({ google_place_id: id }).eq("id", p.id));
    ok++;
  }
  console.log(`✓ resolved ${ok}/${todo.length} Google place ids`);
}

async function routes() {
  const placeRows = check("places", await sb.from("places").select("id,slug"));
  const pid = new Map(placeRows.map((p) => [p.slug, p.id as string]));

  const routeRows = trip.routes.map((r, i) => ({
    code: r.code,
    name: r.name,
    title: r.title,
    color: r.color,
    exit_airport: r.exitAirport,
    is_candidate: true,
    sort: i,
  }));
  const saved = check("routes", await sb.from("routes").upsert(routeRows, { onConflict: "code" }).select("id,code"));

  for (const r of trip.routes) {
    const routeId = saved.find((x) => x.code === r.code)!.id;
    const existing = check("stays", await sb.from("stays").select("id").eq("route_id", routeId));
    if (existing.length && !args.has("--reset-routes")) continue;
    if (existing.length) check("delete stays", await sb.from("stays").delete().eq("route_id", routeId));
    for (const [i, s] of r.stays.entries()) {
      const stay = check<{ id: string }>(
        "stay",
        await sb
          .from("stays")
          .insert({ route_id: routeId, place_id: pid.get(s.place), start_date: s.startDate, nights: s.nights, leg_note: s.legNote, sort: i })
          .select("id")
          .single(),
      );
      const extras = [
        ...s.via.map((slug, k) => ({ stay_id: stay.id, place_id: pid.get(slug), kind: "via", sort: k })),
        ...s.daytrips.map((slug, k) => ({ stay_id: stay.id, place_id: pid.get(slug), kind: "daytrip", sort: k })),
      ];
      if (extras.length) check("stay_daytrips", await sb.from("stay_daytrips").insert(extras));
    }
  }
  const modules = trip.modules.map((slug, i) => ({ place_id: pid.get(slug), sort: i }));
  check("modules", await sb.from("trip_modules").upsert(modules, { onConflict: "place_id" }));
  console.log(`✓ ${trip.routes.length} routes, ${modules.length} add-ons`);
}

async function main() {
  await travellers();
  await places();
  await routes();
  await resolvePlaceIds();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
