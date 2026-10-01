/**
 * One-off: generate the route cover illustrations with Gemini and save them
 * to public/illustrations/. Run with GEMINI_API_KEY set:
 *   npx tsx scripts/illustrate.ts [A B C D]
 * The images are committed, so the app never calls Gemini at runtime.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const STYLE =
  "A wide horizontal illustration in the style of a vintage Japanese woodblock print (shin-hanga) crossed with a travel poster. " +
  "Limited palette only: warm washi paper cream (#f4efe4) background, deep indigo (#2d4a7a), pine green (#2e6a4e), plum (#7b3a5c), vermilion (#bb3b27) and amber (#86591a). " +
  "Flat colour areas, fine ink outlines, visible paper grain, generous empty sky. Winter, late December. No text, no letters, no signatures, no people's faces in close-up, no borders.";

const SCENES: Record<string, string> = {
  A: "Mount Fuji snow-capped at dawn seen across Lake Kawaguchi, a small red pagoda among bare trees in the foreground, a shinkansen line faint in the distance, then the snowy Japanese Alps.",
  B: "Snow country: a steaming outdoor onsen in deep snow, snow monkeys resting in the hot water, thatched gassho-zukuri farmhouses under heavy snow behind, gentle evening lantern light.",
  C: "Southwest Japan in winter: the vermilion floating torii of Miyajima at high tide, a small onsen town with rising steam in the hills of Kyushu, soft mist over the Seto Inland Sea.",
  D: "Sacred mountains: a moss and snow temple path on Koyasan lined with stone lanterns and tall cedars, a quiet post-town street of wooden houses, New Year's shimenawa rope on a gate.",
  M: "A calm winter scene of a Japanese old town street at dusk with paper lanterns and light snow.",
  // Desejos deck groups (data/experiences.json deck_group), 16:9 covers.
  "deck-noite-tranquila": "A quiet ryokan room at night: futon laid out, a low table with a tea set, paper screens glowing, snow falling outside the window over a small garden with a stone lantern.",
  "deck-dia-de-rua": "A lively old Tokyo shopping street in winter at dusk: lanterns, a temple gate at the end of the street, shoppers in coats, steam from a food stall, a tram in the distance.",
  "deck-natureza": "Mount Fuji above a still lake at winter dawn, a small boat on the shore, bare trees with frost, mist on the water, snowy peaks on the horizon.",
  "deck-comida": "A winter feast on a Japanese table seen from above: a steaming nabe hot pot, a plate of snow crab, grilled oysters, mikan oranges, cups of hot sake, chopsticks.",
  "deck-reveillon": "A great temple bell being rung at midnight on New Year's Eve, a crowd with paper lanterns in a snowy courtyard, a pine and bamboo kadomatsu decoration at the gate, first light on the horizon.",
  "deck-neve": "A snow-covered mountain village of thatched gassho farmhouses at twilight, warm windows, deep snow on the roofs, a hot spring steaming at the edge of the village, snow monkeys bathing.",
  // Chapters (data/chapters.json), the top-down step before the deck.
  "chapter-alpes": "The Japanese Alps in deep winter: thatched gassho farmhouses of Shirakawa-go under heavy snow at twilight, snow monkeys in a steaming hot spring in the foreground, Kenroku-en's pine trees held by yukitsuri rope cones, warm lantern light.",
  "chapter-kyoto": "Kyoto in winter at dusk: a quiet temple garden with a thin dusting of snow on moss and stone lanterns, a wooden teahouse street with paper lanterns, the great bell of a temple ready for New Year's Eve, deer resting under a pagoda in the distance.",
  "chapter-kyushu": "Warm southern Kyushu in winter: steaming open-air onsen pools in a river gorge with paper lanterns hung along the water, street food stalls with glowing lanterns by a city river at night, camellias in bloom, mild mist.",
  "chapter-setouchi": "The Seto Inland Sea in winter: the vermilion floating torii of Miyajima at high tide at dawn, white canal-side storehouses of Kurashiki with willows, a bright white castle on a hill, small islands in soft mist.",
  "chapter-fuji": "Mount Fuji snow-capped above a still lake at winter sunset with the sun touching the summit, a holiday house with warm windows on the shore, a red torii by the water, bare trees with frost, a small ropeway in the hills.",
  "chapter-tohoku": "Deep snow country of Tohoku: an old wooden onsen town of tall ryokan along a river with gas lamps glowing in falling snow, frost-covered 'snow monster' trees on a mountain ridge under a cable car, an icy forest stream lit at night.",
  "chapter-tokyo": "Tokyo over the New Year: the outer market at dawn with steam from food stalls, the imperial palace moat with pines and a stone bridge, a kabuki theatre facade with lanterns, a shrine gate crowded with first-visit lanterns, the city skyline soft in winter light.",
};

async function generate(code: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${STYLE}\n\nScene: ${SCENES[code]}` }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${code}: ${json.error?.message ?? res.status}`);
  const part = json.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData);
  if (!part) throw new Error(`${code}: no image returned`);
  const ext = part.inlineData.mimeType.includes("jpeg") ? "jpg" : "png";
  const out = `public/illustrations/${code.startsWith("deck-") || code.startsWith("chapter-") ? code : `route-${code}`}.${ext}`;
  writeFileSync(out, Buffer.from(part.inlineData.data, "base64"));
  console.log("wrote", out);
}

async function main() {
  mkdirSync("public/illustrations", { recursive: true });
  const codes = process.argv.slice(2).length ? process.argv.slice(2) : ["A", "B", "C", "D"];
  for (const c of codes) await generate(c);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
