/** What each researched place is famous for, what to expect, and reference links (data/places-guide.json). */
import guideJson from "../../data/places-guide.json";

export interface PlaceGuide {
  famous_for: string;
  expect: string;
  reputation: string;
  links: { label: string; url: string }[];
}

const G = guideJson as unknown as { reputations: Record<string, string>; places: Record<string, PlaceGuide> };

/** Long label for a reputation key, e.g. "Famous online and worth it". */
export const REPUTATION: Record<string, string> = G.reputations;

/** Short label for chips. */
export const REPUTATION_SHORT: Record<string, string> = {
  classic: "A classic",
  real: "The real thing",
  photo: "Famous online",
  both: "Famous online, worth it",
  food: "Well regarded",
};

export function placeGuide(id: string): PlaceGuide | null {
  return G.places[id] ?? null;
}
