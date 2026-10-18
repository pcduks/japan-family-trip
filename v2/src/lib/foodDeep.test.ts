import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDeep, DEEP_CITIES, DEEP_FOR_TAB, DEEP_TOPICS } from "./foodDeep";

const DIR = join(__dirname, "..", "..", "data", "food-deep");

describe("deep food guide", () => {
  it("matches the schema", () => {
    expect(checkDeep()).toEqual([]);
  });
  it("indexes every file in data/food-deep", () => {
    const cities = readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
    expect(Object.keys(DEEP_CITIES).sort()).toEqual(cities.sort());
    const topics = readdirSync(join(DIR, "topics")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
    expect(Object.keys(DEEP_TOPICS).sort()).toEqual(topics.sort());
  });
  it("every tab points at a city that exists", () => {
    for (const slugs of Object.values(DEEP_FOR_TAB)) for (const s of slugs) expect(DEEP_CITIES[s], s).toBeTruthy();
  });
  it("says seven, not six, about the group", () => {
    const text = JSON.stringify(DEEP_CITIES) + JSON.stringify(DEEP_TOPICS);
    expect(text).not.toMatch(/\b(six of us|group of six|for the six|all six)\b/i);
  });
});
