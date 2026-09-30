import { describe, expect, it } from "vitest";
import {
  bundledTrip,
  compareRows,
  parseLegHours,
  previousStop,
  slugify,
  stayOnNight,
  totalNights,
  tripDates,
} from "./trip";

const trip = bundledTrip();

describe("bundled data", () => {
  it("has four candidate routes of 20 nights each with continuous dates", () => {
    expect(trip.routes).toHaveLength(4);
    for (const r of trip.routes) {
      expect(totalNights(r)).toBe(20);
      let d = "2026-12-20";
      for (const s of r.stays) {
        expect(s.startDate).toBe(d);
        const dt = new Date(d + "T00:00:00Z");
        dt.setUTCDate(dt.getUTCDate() + s.nights);
        d = dt.toISOString().slice(0, 10);
      }
      expect(d).toBe("2027-01-09");
    }
  });

  it("references only known places", () => {
    const slugs = new Set(trip.places.map((p) => p.slug));
    for (const r of trip.routes)
      for (const s of r.stays) for (const x of [s.place, ...s.via, ...s.daytrips]) expect(slugs.has(x)).toBe(true);
    for (const m of trip.modules) expect(slugs.has(m)).toBe(true);
  });

  it("gives every food place a unique slug", () => {
    const food = trip.places.filter((p) => p.kind === "food");
    expect(food.length).toBe(56);
    expect(new Set(food.map((p) => p.slug)).size).toBe(food.length);
  });
});

describe("helpers", () => {
  it("parses leg durations", () => {
    expect(parseLegHours("Train to Matsumoto + bus, ~5–6 h")).toBe(6);
    expect(parseLegHours("Hokuriku shinkansen + Thunderbird via Tsuruga, ~2 h 15 (peak day)")).toBe(2.25);
    expect(parseLegHours("Romancecar from Shinjuku, ~85 min")).toBeCloseTo(85 / 60);
    expect(parseLegHours("Hida express + shinkansen via Nagoya, ~3.5 h")).toBe(3.5);
    expect(parseLegHours("Nohi bus with 2–3 h stop in Shirakawa-go")).toBe(3);
    expect(parseLegHours(null)).toBeNull();
  });

  it("finds the New Year's Eve base", () => {
    const code = (c: string) => trip.routes.find((r) => r.code === c)!;
    expect(stayOnNight(code("A"), "2026-12-31")?.place).toBe("kyoto");
    expect(stayOnNight(code("B"), "2026-12-31")?.place).toBe("takayama");
    expect(stayOnNight(code("C"), "2026-12-31")?.place).toBe("yufuin");
    expect(stayOnNight(code("D"), "2026-12-31")?.place).toBe("koyasan");
  });

  it("finds the previous stop, including via stops and day-trip bases", () => {
    const a = trip.routes[0];
    expect(previousStop(a, "takayama")).toBe("matsumoto");
    expect(previousStop(a, "matsumoto")).toBe("kawaguchiko");
    expect(previousStop(a, "kamakura")).toBe("tokyo");
    expect(previousStop(a, "tokyo")).toBeNull();
  });

  it("covers 21 calendar days", () => {
    expect(tripDates()).toHaveLength(21);
  });

  it("slugifies non-Latin names", () => {
    expect(slugify("Ebisu Yokochō")).toBe("ebisu-yokocho");
    expect(slugify("장군커피")).toMatch(/^p-[0-9a-f]+$/);
  });

  it("builds compare rows for every route", () => {
    const rows = compareRows(trip, trip.routes);
    const longest = rows.find((r) => r.key === "longest")!;
    expect(longest.cells.A.value).toBe(6);
    const peak = rows.find((r) => r.key === "peakMoves")!;
    expect(peak.cells.A.value).toBe(2); // 30 Dec to Kyoto, 4 Jan to Koyasan
  });
});
