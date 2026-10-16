/** Indoors, mixed or outdoors, and a rough number of hours outside, per place. Winter is cold; this is what the family asked to see. */
import type { Place } from "./types";

export type Exposure = "indoors" | "mixed" | "outdoors";
export const EXPOSURE_LABEL: Record<Exposure, string> = { indoors: "Indoors", mixed: "In and out", outdoors: "Outdoors" };

const BY_KIND: Record<string, Exposure> = { museum: "indoors", food: "indoors", experience: "indoors", onsen: "indoors", garden: "outdoors", sight: "outdoors", nature: "outdoors", viewpoint: "outdoors", event: "mixed", market: "mixed" };
const OVERRIDES: Record<string, Exposure> = {
  "tokyo-tsukiji": "outdoors",
  "tokyo-toyosu-auction": "indoors",
  "tokyo-meiji": "outdoors",
  "tokyo-tmg": "indoors",
  "tokyo-illuminations": "outdoors",
  "tokyo-kabuki": "indoors",
  "tokyo-sumo": "indoors",
  "tokyo-asageiko": "indoors",
  "kz-higashi": "mixed",
  "kz-nomura": "mixed",
  "kz-castle": "outdoors",
  "kz-omicho": "mixed",
  "kz-kaga": "indoors",
  "tk-jinya": "mixed",
  "tk-kusakabe": "indoors",
  "tk-floats": "indoors",
  "tk-breweries": "mixed",
  "tk-markets": "outdoors",
  "tk-furukawa": "outdoors",
  "ok-ropeway": "mixed",
  "gr-baths": "mixed",
  "gr-gassho": "mixed",
  "ky-nijo": "mixed",
  "ky-nishiki": "mixed",
  "ky-newyear": "outdoors",
  "ky-bunraku": "indoors",
  "ky-himeji": "mixed",
  "nara-todaiji": "mixed",
  "hk-loop": "mixed",
  "hk-oam": "outdoors",
  "kw-ropeway": "mixed",
  "kw-cruise": "mixed",
  "kw-onsen-foot": "mixed",
};

export function exposure(p: Pick<Place, "id" | "kind">): Exposure {
  return OVERRIDES[p.id] ?? BY_KIND[p.kind] ?? "mixed";
}

/** Hours outside for one visit: a half day outdoors is about three hours in the cold. */
export function outdoorHours(p: Pick<Place, "id" | "kind" | "size">): number {
  const base = p.size === "day_trip" ? 5 : p.size === "main" ? 3 : p.size === "short" ? 1.5 : p.size === "evening" ? 1 : 0;
  const e = exposure(p);
  return e === "outdoors" ? base : e === "mixed" ? base / 2 : 0;
}

/** Average hours outside per day for a list of days, each a list of places. */
export function avgOutdoorHours(days: Pick<Place, "id" | "kind" | "size">[][]): number | null {
  const full = days.filter((d) => d.length);
  if (!full.length) return null;
  const total = full.reduce((a, d) => a + d.reduce((b, p) => b + outdoorHours(p), 0), 0);
  return Math.round((total / full.length) * 2) / 2;
}
