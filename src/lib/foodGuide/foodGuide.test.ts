import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkCity, checkTopic } from "./check";
import { CITY_LOADERS, FOOD_CITIES, FOOD_TOPICS, TOPIC_LOADERS } from "./generated";
import type { FoodCity, FoodTopic } from "./types";

const DIR = join(__dirname, "..", "..", "..", "data", "food-guide");
const json = (p: string) => JSON.parse(readFileSync(p, "utf8"));

describe("food guide data", () => {
  it("every city file matches the schema", () => {
    for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json"))) expect(checkCity(json(join(DIR, f)) as FoodCity, f)).toEqual([]);
  });
  it("every topic file matches the schema", () => {
    for (const f of readdirSync(join(DIR, "topics")).filter((f) => f.endsWith(".json")))
      expect(checkTopic(json(join(DIR, "topics", f)) as FoodTopic, `topics/${f}`)).toEqual([]);
  });
  it("the generated index is up to date (run npx tsx scripts/food-guide-index.ts)", () => {
    const cities = readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
    expect(FOOD_CITIES.map((c) => c.slug).sort()).toEqual(cities.sort());
    expect(Object.keys(CITY_LOADERS).sort()).toEqual(cities.sort());
    const topics = readdirSync(join(DIR, "topics")).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
    expect(FOOD_TOPICS.map((t) => t.slug).sort()).toEqual(topics.sort());
    expect(Object.keys(TOPIC_LOADERS).sort()).toEqual(topics.sort());
  });
  it("catches bad data", () => {
    const bad = { slug: "x", name: "X", places: [{ name: "P", tabelog: { score: 7, url: "https://maps.google.com" } }], meibutsu: [{ name_pt: "a", what_pt: "b", pregnancy: "talvez" }] };
    expect(checkCity(bad as unknown as FoodCity, "x.json")).toHaveLength(3);
  });
});
