/**
 * PRD §12 spike: run with `npm run spike`.
 *  (a) Places API (New) details + photos for Tokyo, Takayama and Kyoto
 *  (b) YouTube search + an embeddable video id
 *  (c) Does the Routes API return TRANSIT routes from Tokyo Station to Kyoto Station?
 */
import { loadEnv } from "./env";

loadEnv();
const places = process.env.GOOGLE_PLACES_API_KEY;
const yt = process.env.YOUTUBE_API_KEY;

async function a() {
  console.log("\n(a) Places API (New)");
  if (!places) return console.log("  skipped: GOOGLE_PLACES_API_KEY not set");
  for (const q of ["Asakusa Tokyo", "Takayama Sanmachi Suji", "Gion Kyoto"]) {
    const s = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": places, "X-Goog-FieldMask": "places.id" },
      body: JSON.stringify({ textQuery: q, languageCode: "en", regionCode: "JP" }),
    }).then((r) => r.json());
    const id = s.places?.[0]?.id;
    if (!id) {
      console.log(`  ✗ ${q}: ${s.error?.message ?? "no match"}`);
      continue;
    }
    const d = await fetch(`https://places.googleapis.com/v1/places/${id}?languageCode=en`, {
      headers: { "X-Goog-Api-Key": places, "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews,photos" },
    }).then((r) => r.json());
    if (d.error) {
      console.log(`  ✗ ${q}: ${d.error.message}`);
      continue;
    }
    let photo = "none";
    if (d.photos?.[0]) {
      const m = await fetch(`https://places.googleapis.com/v1/${d.photos[0].name}/media?maxWidthPx=800&skipHttpRedirect=true`, {
        headers: { "X-Goog-Api-Key": places },
      }).then((r) => r.json());
      photo = m.photoUri ? "photoUri ok" : `photo error: ${m.error?.message}`;
    }
    console.log(
      `  ✓ ${d.displayName?.text}: ★${d.rating} (${d.userRatingCount}), ${d.reviews?.length ?? 0} reviews, ${d.photos?.length ?? 0} photos, ${photo}`,
    );
  }
}

async function b() {
  console.log("\n(b) YouTube Data API");
  if (!yt) return console.log("  skipped: YOUTUBE_API_KEY not set");
  const qs = new URLSearchParams({ part: "snippet", type: "video", videoEmbeddable: "true", videoDuration: "medium", maxResults: "3", q: "Takayama winter walk", key: yt });
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${qs}`).then((x) => x.json());
  if (r.error) return console.log(`  ✗ ${r.error.message}`);
  for (const i of r.items ?? []) console.log(`  ✓ ${i.id.videoId} ${i.snippet.title}\n    embed: https://www.youtube.com/embed/${i.id.videoId}`);
}

async function c() {
  console.log("\n(c) Routes API, TRANSIT, Tokyo Station → Kyoto Station");
  if (!places) return console.log("  skipped: GOOGLE_PLACES_API_KEY not set (the server key needs Routes API enabled)");
  // Next Wednesday 09:00 JST.
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((10 - d.getUTCDay()) % 7 || 7));
  d.setUTCHours(0, 0, 0, 0);
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": places,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.legs.steps.travelMode,routes.legs.steps.transitDetails.transitLine.name,routes.legs.steps.transitDetails.transitLine.vehicle.type",
    },
    body: JSON.stringify({
      origin: { address: "Tokyo Station, Tokyo, Japan" },
      destination: { address: "Kyoto Station, Kyoto, Japan" },
      travelMode: "TRANSIT",
      departureTime: d.toISOString(),
      languageCode: "en",
    }),
  });
  const body = await res.json();
  if (!res.ok) return console.log(`  ✗ HTTP ${res.status}: ${body.error?.message}`);
  const route = body.routes?.[0];
  if (!route) return console.log("  ✗ No transit route returned. Use curated rail durations + Google Maps transit links (PRD P2.3).");
  const lines = route.legs
    .flatMap((l: { steps: { travelMode: string; transitDetails?: { transitLine?: { name?: string } } }[] }) => l.steps)
    .filter((s: { travelMode: string }) => s.travelMode === "TRANSIT")
    .map((s: { transitDetails?: { transitLine?: { name?: string } } }) => s.transitDetails?.transitLine?.name);
  console.log(`  ✓ TRANSIT supported: ${route.duration}, ${(route.distanceMeters / 1000).toFixed(0)} km via ${lines.join(" → ") || "(no line names)"}`);
}

(async () => {
  await a();
  await b();
  await c();
})();
