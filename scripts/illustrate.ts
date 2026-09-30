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
  const out = `public/illustrations/route-${code}.${ext}`;
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
