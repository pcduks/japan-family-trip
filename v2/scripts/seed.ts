/**
 * Idempotent seed/import (PRD step 2). Safe to re-run.
 *
 *   npm run seed                  # travellers + trip-data.json + place ids
 *   npm run seed -- --no-resolve  # skip the Google place-id lookups
 *   npm run seed -- --file=path   # import another schema-v2 file (partial is fine)
 *
 * The plan version is created the first time and never overwritten after that;
 * its day by day follows data/plan-days.json (see planDays).
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { DB } from "../src/lib/supabase/types";
import { DEMO_NAMES } from "../src/lib/data/loader";
import { bundledPlanDays, tripData } from "../src/lib/data/file";
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
  let rows: { id: string; name: string; role: Traveller["role"]; notes: string | null; email: string | null }[];
  if (file) {
    const list = JSON.parse(readFileSync(file, "utf8")) as (Traveller & { email?: string })[];
    rows = list.map((t) => ({ id: t.id, name: t.name, role: t.role, notes: t.notes ?? null, email: t.email?.trim().toLowerCase() || null }));
  } else {
    // Beta: the seven slots with placeholder names; each person types their own on first visit.
    rows = tripData().trip.travellers.map((t) => ({ id: t.id, name: t.name ?? DEMO_NAMES[t.id] ?? t.id, role: t.role, notes: t.notes ?? null, email: null }));
  }
  // Never overwrite a name someone has already typed in the app.
  const { data: existing } = await sb.from("travellers").select("id,name");
  const named = new Set(((existing ?? []) as { id: string; name: string }[]).filter((t) => t.name && t.name !== (DEMO_NAMES[t.id] ?? t.id)).map((t) => t.id));
  const fresh = rows.filter((r) => !named.has(r.id) || file);
  if (fresh.length) check("travellers", await sb.from("travellers").upsert(fresh, { onConflict: "id" }));
  console.log(`✓ ${rows.length} travellers${file ? "" : " (placeholder names; people name themselves in the app)"}`);
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

/**
 * The plan's day-by-day (data/plan-days.json). The first run inserts every day.
 * Later runs bring each date in line with the file when it differs: no screen
 * edits days yet, so the file is still their only source. When one does, this
 * must only touch days nobody has changed.
 */
async function planDays() {
  const { data: plan } = await sb.from("versions").select("id").eq("status", "plan").maybeSingle();
  if (!plan) return console.log("- no plan version yet; skipping days");
  type Item = { place_id: string | null; slot: string; crew: string; note: string | null; sort: number };
  const existing = check<{ id: string; date: string; title: string | null; day_items: Item[] }[]>(
    "days",
    await sb.from("days").select("id,date,title,day_items(place_id,slot,crew,note,sort)").eq("version_id", plan.id),
  );
  const byDate = new Map(existing.map((d) => [d.date, d]));
  const itemsOf = (list: Item[]) => JSON.stringify([...list].sort((a, b) => a.sort - b.sort).map((it) => [it.place_id, it.slot, it.crew, it.note ?? null]));
  let added = 0;
  let updated = 0;
  let items = 0;
  for (const d of bundledPlanDays()) {
    const title = `${d.kind} · ${d.title}`;
    const want = d.items.map((it, i) => ({ place_id: it.place_id, slot: it.slot, crew: it.crew, note: it.note ?? null, sort: i }));
    const have = byDate.get(d.date);
    if (have && have.title === title && itemsOf(have.day_items) === itemsOf(want)) continue;
    let dayId: string;
    if (have) {
      check("day", await sb.from("days").update({ title }).eq("id", have.id));
      check("day items", await sb.from("day_items").delete().eq("day_id", have.id));
      dayId = have.id;
      updated++;
      console.log(`  ~ ${d.date}: ${title.slice(0, 70)}`);
    } else {
      dayId = check<{ id: string }>("day", await sb.from("days").insert({ version_id: plan.id, date: d.date, title }).select("id").single()).id;
      added++;
    }
    if (want.length) {
      check("day items", await sb.from("day_items").insert(want.map((it) => ({ ...it, day_id: dayId }))));
      items += want.length;
    }
  }
  console.log(`✓ plan day by day: ${added} added, ${updated} updated, ${existing.length - updated} unchanged (${items} items written)`);
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
  await planDays();
  await resolvePlaceIds();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
