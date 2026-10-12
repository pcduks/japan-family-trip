/**
 * PRD §16 spike. Run with `npm run spike` (keys from .env.local or the environment).
 *
 *  (a) Places API (New): Text Search → Place Details → one photo URL, for
 *      Kenroku-en, Takayama Jinya and Kyoto National Museum.
 *  (b) YouTube: find an embeddable video and print the IFrame embed URL.
 *  (c) Anthropic API: one screenshot → structured place JSON (tool use).
 *  (d) Routes API: does TRANSIT work between Tokyo Station and Kanazawa Station?
 *
 * Nothing here writes anywhere. Each section prints ✓ / ✗ / skipped.
 */
import { readFileSync, existsSync } from "node:fs";
import { loadEnv } from "./env";

loadEnv();
const placesKey = process.env.GOOGLE_PLACES_API_KEY;
const ytKey = process.env.YOUTUBE_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const results: Record<string, string> = {};

async function a() {
  console.log("\n(a) Places API (New): details and photos");
  if (!placesKey) return (results.places = "skipped: GOOGLE_PLACES_API_KEY not set");
  const targets: [string, { lat: number; lng: number }][] = [
    ["Kenroku-en, Kanazawa", { lat: 36.56, lng: 136.65 }],
    ["Takayama Jinya", { lat: 36.14, lng: 137.25 }],
    ["Kyoto National Museum", { lat: 35.01, lng: 135.77 }],
  ];
  let ok = 0;
  for (const [q, bias] of targets) {
    const s = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": placesKey, "X-Goog-FieldMask": "places.id,places.displayName,places.location" },
      body: JSON.stringify({
        textQuery: q,
        languageCode: "en",
        regionCode: "JP",
        pageSize: 1,
        locationBias: { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 20000 } },
      }),
    }).then((r) => r.json());
    const id = s.places?.[0]?.id;
    if (!id) {
      console.log(`  ✗ ${q}: ${s.error?.message ?? "no match"}`);
      continue;
    }
    const d = await fetch(`https://places.googleapis.com/v1/places/${id}?languageCode=en`, {
      headers: {
        "X-Goog-Api-Key": placesKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,regularOpeningHours.weekdayDescriptions,reviews,photos,googleMapsUri",
      },
    }).then((r) => r.json());
    if (d.error) {
      console.log(`  ✗ ${q}: ${d.error.message}`);
      continue;
    }
    let photo = "no photos";
    if (d.photos?.[0]) {
      const m = await fetch(`https://places.googleapis.com/v1/${d.photos[0].name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
        headers: { "X-Goog-Api-Key": placesKey },
      }).then((r) => r.json());
      const by = d.photos[0].authorAttributions?.[0]?.displayName ?? "?";
      photo = m.photoUri ? `photo ok (by ${by})` : `photo error: ${m.error?.message}`;
    }
    ok++;
    console.log(
      `  ✓ ${d.displayName?.text} [${id}] ★${d.rating} (${d.userRatingCount}) · ${d.reviews?.length ?? 0} reviews · ${d.photos?.length ?? 0} photos · ${photo}`,
    );
    console.log(`    hours: ${(d.regularOpeningHours?.weekdayDescriptions ?? []).slice(0, 2).join("; ") || "n/a"}`);
  }
  results.places = `${ok}/3 places resolved with details and photos`;
}

async function b() {
  console.log("\n(b) YouTube IFrame embed");
  if (!ytKey) return (results.youtube = "skipped: YOUTUBE_API_KEY not set (an embed URL needs no key: https://www.youtube.com/embed/<id>)");
  const qs = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    videoDuration: "medium",
    maxResults: "2",
    q: "Kenrokuen Kanazawa winter",
    key: ytKey,
  });
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${qs}`).then((x) => x.json());
  if (r.error) return (results.youtube = `✗ ${r.error.message}`);
  const first = r.items?.[0];
  if (!first) return (results.youtube = "✗ no results");
  const v = await fetch(`https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: "status", id: first.id.videoId, key: ytKey })}`).then((x) => x.json());
  const embeddable = v.items?.[0]?.status?.embeddable;
  console.log(`  ✓ ${first.id.videoId} “${first.snippet.title}” embeddable=${embeddable}`);
  console.log(`    <iframe src="https://www.youtube.com/embed/${first.id.videoId}" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe>`);
  results.youtube = embeddable ? `embeddable video found (${first.id.videoId}); IFrame player works` : "video found but not embeddable";
}

async function c() {
  console.log("\n(c) Anthropic API: screenshot → structured place JSON");
  if (!anthropicKey) return (results.anthropic = "skipped: ANTHROPIC_API_KEY not set");
  const sample = ["scripts/spike-sample.png", "scripts/spike-sample.jpg"].find(existsSync);
  const { extractPlacesFromDrop } = await import("../src/lib/anthropic/extract");
  const input = sample
    ? { images: [{ mediaType: sample.endsWith(".png") ? ("image/png" as const) : ("image/jpeg" as const), base64: readFileSync(sample).toString("base64") }] }
    : {
        text:
          "@kyotofoodie: Best bowls this week 🍜 1) Menbakaichidai (fire ramen!) near Nijo — go early, ¥1,200. " +
          "2) Omen by Ginkaku-ji, udon with veg, big tables. 3) Kagizen Yoshifusa in Gion for kuzukiri, closed Mon.",
      };
  console.log(`  using ${sample ?? "sample text (no scripts/spike-sample.png found)"} with model ${model}`);
  const out = await extractPlacesFromDrop(input);
  console.log(JSON.stringify(out, null, 2).split("\n").map((l) => "  " + l).join("\n"));
  results.anthropic = `${out.places.length} places extracted as JSON by ${model}`;
}

async function d() {
  console.log("\n(d) Routes API: TRANSIT Tokyo Station → Kanazawa Station");
  if (!placesKey) return (results.routes = "skipped: GOOGLE_PLACES_API_KEY not set (the server key also needs Routes API)");
  // Thu 24 Dec 2026 09:00 JST, the plan's actual move.
  const departure = "2026-12-24T00:00:00Z";
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": placesKey,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.legs.steps.travelMode,routes.legs.steps.transitDetails.transitLine.name,routes.legs.steps.transitDetails.transitLine.vehicle.type",
    },
    body: JSON.stringify({
      origin: { address: "Tokyo Station, Tokyo, Japan" },
      destination: { address: "Kanazawa Station, Kanazawa, Ishikawa, Japan" },
      travelMode: "TRANSIT",
      departureTime: departure,
      languageCode: "en",
    }),
  });
  const body = await res.json();
  if (!res.ok) return (results.routes = `✗ HTTP ${res.status}: ${body.error?.message}`);
  const route = body.routes?.[0];
  if (!route) return (results.routes = "✗ no TRANSIT route returned; keep curated rail times + Google Maps transit links");
  const lines = route.legs
    .flatMap((l: { steps: { travelMode: string; transitDetails?: { transitLine?: { name?: string; vehicle?: { type?: string } } } }[] }) => l.steps)
    .filter((s: { travelMode: string }) => s.travelMode === "TRANSIT")
    .map((s: { transitDetails?: { transitLine?: { name?: string; vehicle?: { type?: string } } } }) => `${s.transitDetails?.transitLine?.name} (${s.transitDetails?.transitLine?.vehicle?.type})`);
  const hours = (Number(String(route.duration).replace("s", "")) / 3600).toFixed(1);
  console.log(`  ✓ TRANSIT works: ${hours} h, ${(route.distanceMeters / 1000).toFixed(0)} km via ${lines.join(" → ")}`);
  results.routes = `TRANSIT supported: ${hours} h via ${lines.join(" → ")}`;
}

(async () => {
  for (const step of [a, b, c, d]) {
    try {
      await step();
    } catch (e) {
      const name = step.name;
      results[name] = `✗ ${(e as Error).message}`;
      console.log(`  ✗ ${(e as Error).message}`);
    }
  }
  console.log("\nSummary");
  for (const [k, v] of Object.entries(results)) console.log(`  ${k.padEnd(10)} ${v}`);
})();
