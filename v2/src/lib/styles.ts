/** Route styles, in the order the pickers show them. A seeded route's style is in data/versions-guide.json. */
import guide from "../../data/versions-guide.json";

export const STYLE_LABEL: Record<string, string> = {
  classic: "Classic",
  cities: "Cities",
  snow: "Snow",
  onsen: "Onsen",
  slow: "Slow",
  full: "See more",
  art: "Art",
  food: "Food",
  coast: "Coast",
  west: "West",
  north: "North",
  wildcard: "Wildcard",
  yours: "Yours",
};

const STYLES = Object.fromEntries(Object.entries((guide as unknown as { versions: Record<string, { style?: string }> }).versions).map(([id, g]) => [id, g.style ?? "classic"]));

export function styleOf(versionId: string): string {
  return STYLES[versionId] ?? "yours";
}
