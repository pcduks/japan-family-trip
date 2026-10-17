/**
 * The illustrated map: prefecture outlines from @svg-maps/japan (MIT) and a
 * linear fit from latitude/longitude to its 438×516 viewBox, calibrated on
 * fifteen prefecture centroids (residuals under 3 px). Okinawa is drawn as an
 * inset at the bottom left of that map, so it gets a fixed position.
 */
import japan from "@svg-maps/japan";

export const MAP = japan as { viewBox: string; locations: { id: string; name: string; path: string }[] };

export function project(lat: number, lng: number): { x: number; y: number } {
  if (lat < 27) return { x: 63, y: 468 }; // Okinawa inset
  return { x: 19.675 * lng - 2433.05, y: -25.682 * lat + 1173.5 };
}

/** Prefecture ids that light up for a region (for the map's hover halo). */
export const REGION_PREFECTURES: Record<string, string[]> = {
  tokyo: ["tokyo"], kanazawa: ["ishikawa"], shirakawago: ["gifu"], takayama: ["gifu"], gero: ["gifu"], okuhida: ["gifu"], kyoto: ["kyoto"], nara: ["nara"], hakone: ["kanagawa"], kawaguchiko: ["yamanashi"],
  yudanaka: ["nagano"], okayama: ["okayama", "kagawa"], kinosaki: ["hyogo"], ginzan: ["yamagata"], shuzenji: ["shizuoka"], kusatsu: ["gunma"], nikko: ["tochigi"], kamakura: ["kanagawa"], "echigo-yuzawa": ["niigata"],
  hiroshima: ["hiroshima"], hokkaido: ["hokkaido"], "north-tohoku": ["aomori", "akita", "iwate"], "south-tohoku": ["miyagi", "yamagata"], koyasan: ["wakayama"], kumano: ["wakayama"], kyushu: ["fukuoka", "oita", "kumamoto", "nagasaki", "miyazaki", "kagoshima", "saga"],
  shikoku: ["ehime", "kagawa", "tokushima", "kochi"], okinawa: ["okinawa"], osaka: ["osaka"], matsumoto: ["nagano"], karuizawa: ["nagano"],
  miyajima: ["hiroshima"],
  shirahama: ["wakayama"],
  nagano: ["nagano"],
  arima: ["hyogo"],
  matsue: ["shimane"],
  fukuoka: ["fukuoka"],
  nagoya: ["aichi"],
  atami: ["shizuoka"],
  "ise-shima": ["mie"],
  morioka: ["iwate"],
  tsunagi: ["iwate"],
};

/** A place's name short enough for a map label: "Hiroshima and Miyajima" → "Hiroshima", "Arima Onsen" → "Arima". */
export function shortRegionName(id: string, regions: { id: string; name: string }[]): string {
  const name = regions.find((r) => r.id === id)?.name;
  if (!name) return id;
  return name.replace(/ Onsen$/, "").replace(/ \(.*\)$/, "").split(/,| and /)[0].trim();
}
