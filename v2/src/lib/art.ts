/**
 * The woodblock illustrations made for the earlier app (Gemini, committed in
 * public/illustrations). One per region, chosen by what it shows: snow-roped
 * pines for Kanazawa, the New Year bell for the Gero ryokan, Fuji for Hakone…
 */
export const REGION_ART: Record<string, string> = {
  tokyo: "chapter-tokyo",
  kanazawa: "chapter-alpes",
  shirakawago: "route-B",
  takayama: "deck-neve",
  gero: "deck-reveillon",
  okuhida: "route-B",
  kyoto: "chapter-kyoto",
  nara: "chapter-kyoto",
  hakone: "chapter-fuji",
  yudanaka: "route-B",
  okayama: "chapter-setouchi",
  kinosaki: "chapter-tohoku",
  ginzan: "chapter-tohoku",
  shuzenji: "deck-natureza",
  kusatsu: "chapter-tohoku",
  nikko: "deck-reveillon",
  kamakura: "chapter-setouchi",
  "echigo-yuzawa": "route-B",
  hiroshima: "chapter-setouchi",
  hokkaido: "chapter-tohoku",
  "north-tohoku": "chapter-tohoku",
  koyasan: "deck-reveillon",
  kumano: "deck-reveillon",
  kyushu: "chapter-kyushu",
  shikoku: "chapter-setouchi",
  okinawa: "chapter-setouchi",
};

export const PACE_ART = { gentle: "deck-noite-tranquila", balanced: "deck-comida", full: "deck-dia-de-rua" } as const;

export function regionArt(id: string): string {
  return `/illustrations/${REGION_ART[id] ?? "route-A"}.webp`;
}

export function art(name: string): string {
  return `/illustrations/${name}.webp`;
}
