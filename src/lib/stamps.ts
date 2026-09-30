import type { Motif } from "@/components/EkiStamp";

/** Each place's station stamp: a motif and an ink. */
const PLACE: Record<string, [Motif, string]> = {
  tokyo: ["tower", "var(--vermilion)"],
  kamakura: ["torii", "var(--pine)"],
  kawaguchiko: ["fuji", "var(--indigo)"],
  hakone: ["onsen", "var(--pine)"],
  matsumoto: ["castle", "var(--ink)"],
  takayama: ["snow", "var(--indigo)"],
  shirakawago: ["gassho", "var(--pine)"],
  kanazawa: ["leaf", "var(--amber)"],
  yudanaka: ["onsen", "var(--plum)"],
  jigokudani: ["snow", "var(--pine)"],
  nagano: ["bell", "var(--amber)"],
  kyoto: ["torii", "var(--vermilion)"],
  uji: ["leaf", "var(--pine)"],
  nara: ["deer", "var(--pine)"],
  koyasan: ["lantern", "var(--plum)"],
  osaka: ["castle", "var(--indigo)"],
  himeji: ["castle", "var(--plum)"],
  hiroshima: ["bell", "var(--indigo)"],
  miyajima: ["wave", "var(--vermilion)"],
  yufuin: ["onsen", "var(--indigo)"],
  beppu: ["onsen", "var(--vermilion)"],
  nagasaki: ["wave", "var(--indigo)"],
  fukuoka: ["bowl", "var(--amber)"],
  dazaifu: ["torii", "var(--plum)"],
  yanagawa: ["wave", "var(--pine)"],
  tsumago: ["lantern", "var(--amber)"],
  ise: ["torii", "var(--indigo)"],
  kawayu: ["onsen", "var(--pine)"],
  kinosaki: ["onsen", "var(--plum)"],
  sapporo: ["snow", "var(--indigo)"],
  ginzan: ["lantern", "var(--vermilion)"],
  nikko: ["pagoda", "var(--vermilion)"],
  naoshima: ["wave", "var(--amber)"],
};

export function placeStamp(slug: string, kind?: string): { motif: Motif; ink: string } {
  const hit = PLACE[slug];
  if (hit) return { motif: hit[0], ink: hit[1] };
  if (kind === "food") return { motif: "bowl", ink: "var(--amber)" };
  return { motif: "torii", ink: "var(--ink)" };
}

/** Route inks: A indigo, B pine, C vermilion, D plum; plans keep their own colour. */
export const ROUTE_INK: Record<string, string> = {
  A: "var(--indigo)",
  B: "var(--pine)",
  C: "var(--vermilion)",
  D: "var(--plum)",
  M: "var(--amber)",
};

export const ROUTE_MOTIF: Record<string, Motif> = { A: "fuji", B: "snow", C: "onsen", D: "lantern" };

/** Short romanised rim label that fits a stamp. */
export function stampLabel(name: string): string {
  return name
    .replace(/^Lake /, "")
    .replace(/ \(.*\)$/, "")
    .replace(/ \/.*$/, "")
    .replace(/ & .*$/, "")
    .replace(/ Snow Monkeys$/, "")
    .replace(/ Onsen$/, "")
    .replace(/ Castle$/, "");
}
