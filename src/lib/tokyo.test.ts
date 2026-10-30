import { describe, expect, it } from "vitest";
import type { Activity, Plan } from "./plan";
import {
  ACTIVITY_ROUTE,
  ACTIVITY_SPOT,
  ALL_SPOTS,
  HOODS,
  REST,
  ROUTES,
  distanceKm,
  markSlug,
  nearbyHoods,
  nyNote,
  routeActivity,
  routeAssignments,
  routeFootprint,
  spotActivity,
  spotAssignments,
  spotById,
  spotIdFromMark,
  tokyoDays,
} from "./tokyo";

const plan = (stays: [string, number][]): Plan => ({
  id: "plan-1",
  name: "Teste",
  color: "#000",
  based_on: null,
  is_chosen: true,
  stays: stays.map(([place, nights], i) => ({ id: `s${i}`, place, nights, legNote: null, legHours: null, legMode: null, daytrips: [], via: [] })),
});

describe("the dataset", () => {
  it("has ten routes through known neighbourhoods, and every spot id is unique", () => {
    expect(ROUTES).toHaveLength(10);
    for (const r of ROUTES) {
      expect(r.hoods.length).toBeGreaterThanOrEqual(2);
      for (const h of r.hoods) expect(HOODS[h], h).toBeDefined();
      expect(r.blocks.map((b) => b.when)).toEqual(["manha", "tarde", "noite"]);
    }
    const ids = ALL_SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL_SPOTS.length).toBeGreaterThan(350);
    expect(REST.spots).toHaveLength(7);
  });

  it("keeps the same name in two neighbourhoods apart", () => {
    expect(spotById("onibus-nakameguro")?.route).toBe(1);
    expect(spotById("onibus-jiyugaoka")?.route).toBe(7);
    expect(spotById("iyoshi-cola-asakusa")?.query).toBe("Iyoshi Cola Asakusa");
  });

  it("titles routes from their neighbourhoods", () => {
    expect(ROUTES[0].title).toBe("Nakameguro → Daikanyama → Ebisu");
    expect(ROUTES[7].title).toBe("Aoyama → Roppongi");
  });
});

describe("geography", () => {
  it("measures Nakameguro to Daikanyama as a short walk", () => {
    const km = distanceKm(HOODS.nakameguro, HOODS.daikanyama);
    expect(km).toBeGreaterThan(0.4);
    expect(km).toBeLessThan(1);
  });

  it("finds the neighbourhoods you can chain onto a route", () => {
    const near = nearbyHoods("daikanyama", 1.8, 1);
    const ids = near.map((n) => n.hood.id);
    expect(ids).not.toContain("nakameguro"); // same route
    expect(ids).not.toContain("ebisu");
    expect(ids).toContain("shibuya");
    expect(near.find((n) => n.hood.id === "shibuya")?.routes).toContain(2);
    expect(near.every((n, i) => i === 0 || n.km >= near[i - 1].km)).toBe(true);
  });

  it("summarises a route", () => {
    const f = routeFootprint(ROUTES[0]);
    expect(f.spots).toBeGreaterThan(30);
    expect(f.eat).toBeGreaterThan(5);
    expect(f.km).toBeGreaterThan(1);
  });
});

describe("the plan", () => {
  it("lists every night in Tokyo plus the morning we move on", () => {
    const days = tokyoDays(plan([["tokyo", 4], ["kawaguchiko", 2], ["kyoto", 14]]));
    expect(days.map((d) => d.date)).toEqual(["2026-12-20", "2026-12-21", "2026-12-22", "2026-12-23", "2026-12-24"]);
    expect(days[0].arrival).toBe(true);
    expect(days[4].departure).toBe(true);
    expect(days[1].arrival).toBe(false);
  });

  it("follows a plan that returns to Tokyo at the end, without a departure day after the flight home", () => {
    const days = tokyoDays(plan([["tokyo", 3], ["kyoto", 15], ["tokyo", 2]]));
    expect(days.filter((d) => d.returnVisit).map((d) => d.date)).toEqual(["2027-01-07", "2027-01-08"]);
    expect(days.at(-1)?.departure).toBe(false);
  });

  it("is empty with no plan or no Tokyo", () => {
    expect(tokyoDays(null)).toEqual([]);
    expect(tokyoDays(plan([["kyoto", 20]]))).toEqual([]);
  });
});

describe("activities", () => {
  const act = (over: Partial<Activity>): Activity => ({ id: "a", plan_id: "plan-1", date: "2026-12-21", time: null, title: "", place_slug: null, query: null, note: null, split_group: null, who: [], sort: 0, ...over });

  it("pins a route to a day through a tagged activity, and reads it back", () => {
    const row = routeActivity(ROUTES[2], "plan-1", "2026-12-21", 0);
    expect(row.place_slug).toBe(`${ACTIVITY_ROUTE}3`);
    expect(row.title).toContain("Asakusa → Yanaka → Ueno Park");
    expect(row.query).toBe("Asakusa Station, Tokyo");
    const map = routeAssignments([act({ id: "x", ...row }), act({ id: "y", place_slug: "kyoto" }), act({ id: "z", ...row, plan_id: "other" })], "plan-1");
    expect(map.get("2026-12-21")?.n).toBe(3);
    expect(map.size).toBe(1);
  });

  it("puts a spot on a day with a Maps query and a time by block", () => {
    const spot = spotById("fuglen-asakusa")!;
    const row = spotActivity(spot, "plan-1", "2026-12-22", 2);
    expect(row.place_slug).toBe(`${ACTIVITY_SPOT}fuglen-asakusa`);
    expect(row.time).toBe("10:00");
    expect(row.query).toBe("Fuglen Asakusa, Tokyo");
    expect(row.note).toBe("Café · Asakusa · Café e waffles; estética escandinava");
    const by = spotAssignments([act({ id: "q", ...row })], "plan-1");
    expect(by.get("fuglen-asakusa")?.[0].date).toBe("2026-12-22");
  });
});

describe("marks and closures", () => {
  it("round-trips the mark slug", () => {
    expect(spotIdFromMark(markSlug("fuglen-asakusa"))).toBe("fuglen-asakusa");
    expect(spotIdFromMark("food-x")).toBeNull();
  });

  it("warns about museums and markets over New Year, and crowds at shrines", () => {
    expect(nyNote({ cat: "culture", name: "Tokyo National Museum" }, "2027-01-01")?.level).toBe("warn");
    expect(nyNote({ cat: "culture", name: "Meiji Jingu Shrine" }, "2027-01-02")?.level).toBe("info");
    expect(nyNote({ cat: "market", name: "Tsukiji" }, "2027-01-01")?.text).toMatch(/Mercados/);
    expect(nyNote({ cat: "market", name: "Tsukiji" }, "2026-12-29")?.level).toBe("info");
    expect(nyNote({ cat: "cafe", name: "Fuglen" }, "2027-01-01")).toBeNull();
    expect(nyNote({ cat: "culture", name: "MOT" }, "2026-12-22")).toBeNull();
  });
});
