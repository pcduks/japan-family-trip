import { describe, expect, it } from "vitest";
import { fileSnapshot } from "./data/loader";
import { ALL_SPOTS, HOODS, REST, WALKS, datesOfWalk, distanceKm, footprint, heartsBySpot, nearbyHoods, nyNote, pinsFromSetting, routeUrl, spotById, tokyoDays, withPin } from "./tokyo";

const snap = fileSnapshot();
const plan = snap.versions.find((v) => v.status === "plan")!;
const NY = snap.calendar.new_year_closures;

describe("the dataset", () => {
  it("has ten walks through known neighbourhoods, and every spot id is unique", () => {
    expect(WALKS).toHaveLength(10);
    for (const w of WALKS) {
      expect(w.hoods.length).toBeGreaterThanOrEqual(2);
      for (const h of w.hoods) expect(HOODS[h], h).toBeDefined();
      expect(w.blocks.map((b) => b.when)).toEqual(["morning", "afternoon", "evening"]);
    }
    const ids = ALL_SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ALL_SPOTS.length).toBeGreaterThan(350);
    expect(REST.spots).toHaveLength(7);
  });

  it("keeps the same name in two neighbourhoods apart", () => {
    expect(spotById("onibus-nakameguro")?.walk).toBe(1);
    expect(spotById("onibus-jiyugaoka")?.walk).toBe(7);
    expect(spotById("iyoshi-cola-asakusa")?.query).toBe("Iyoshi Cola Asakusa");
  });

  it("titles walks from their neighbourhoods", () => {
    expect(WALKS[0].title).toBe("Nakameguro → Daikanyama → Ebisu");
    expect(WALKS[7].title).toBe("Aoyama → Roppongi");
  });
});

describe("geography", () => {
  it("measures Nakameguro to Daikanyama as a short walk", () => {
    const km = distanceKm(HOODS.nakameguro, HOODS.daikanyama);
    expect(km).toBeGreaterThan(0.4);
    expect(km).toBeLessThan(1);
  });

  it("finds the neighbourhoods you can chain onto a walk", () => {
    const near = nearbyHoods("daikanyama", 1.8, 1);
    const ids = near.map((n) => n.hood.id);
    expect(ids).not.toContain("nakameguro");
    expect(ids).not.toContain("ebisu");
    expect(ids).toContain("shibuya");
    expect(near.find((n) => n.hood.id === "shibuya")?.walks).toContain(2);
    expect(near.every((n, i) => i === 0 || n.km >= near[i - 1].km)).toBe(true);
  });

  it("summarises a walk and links the whole day in Google Maps", () => {
    const f = footprint(WALKS[0]);
    expect(f.spots).toBeGreaterThan(30);
    expect(f.eat).toBeGreaterThan(5);
    expect(f.km).toBeGreaterThan(1);
    const url = routeUrl(["Nakameguro Station", "Daikanyama Station", "Ebisu Station"]);
    expect(url).toContain("travelmode=walking");
    expect(url).toContain("waypoints=Daikanyama");
  });
});

describe("the route", () => {
  it("lists the plan's Tokyo days as the plan describes them, first stay and return", () => {
    const days = tokyoDays(plan, snap);
    expect(days.map((d) => d.date)).toEqual(["2026-12-20", "2026-12-21", "2026-12-22", "2026-12-23", "2027-01-07", "2027-01-08", "2027-01-09"]);
    expect(days[0].kind).toBe("Arrive");
    expect(days[0].partial).toBe(true);
    expect(days[1].partial).toBe(false);
    expect(days[1].title).toMatch(/Tsukiji/);
    expect(days[4].returnVisit).toBe(true);
    expect(days[6].kind).toMatch(/fly/i);
  });

  it("is empty without a plan, or when the route skips Tokyo", () => {
    expect(tokyoDays(null, snap)).toEqual([]);
    expect(tokyoDays({ id: "x", stays: [{ region: "kyoto", from: "2026-12-20", to: "2027-01-09", nights: 20, lodging: null, note: null }] }, snap)).toEqual([]);
  });
});

describe("pins and hearts", () => {
  it("reads only well-formed pins from the setting", () => {
    expect(pinsFromSetting({ pins: { "2026-12-21": 3, bad: 2, "2026-12-22": "x", "2026-12-23": 0 } })).toEqual({ "2026-12-21": 3, "2026-12-23": 0 });
    expect(pinsFromSetting(null)).toEqual({});
  });

  it("pins, swaps and clears, and groups dates per walk", () => {
    let pins = withPin({}, "2026-12-21", 1);
    pins = withPin(pins, "2026-12-22", 1);
    pins = withPin(pins, "2026-12-21", 3);
    expect(pins).toEqual({ "2026-12-21": 3, "2026-12-22": 1 });
    expect(datesOfWalk(pins).get(1)).toEqual(["2026-12-22"]);
    expect(withPin(pins, "2026-12-22", null)).toEqual({ "2026-12-21": 3 });
  });

  it("counts hearts per spot from walk reactions only", () => {
    const m = heartsBySpot([
      { id: "a", traveller_id: "pedro", target_type: "walk", target_id: "fuglen-asakusa", kind: "heart" },
      { id: "b", traveller_id: "mother", target_type: "walk", target_id: "fuglen-asakusa", kind: "heart" },
      { id: "c", traveller_id: "pedro", target_type: "food", target_id: "fuglen-asakusa", kind: "heart" },
    ]);
    expect(m.get("fuglen-asakusa")).toEqual(["pedro", "mother"]);
  });
});

describe("New Year notes", () => {
  it("warns about museums and markets over New Year, and crowds at shrines", () => {
    expect(nyNote({ cat: "culture", name: "Tokyo National Museum" }, "2027-01-01", NY)?.level).toBe("warn");
    expect(nyNote({ cat: "culture", name: "Meiji Jingu Shrine" }, "2027-01-02", NY)?.level).toBe("info");
    expect(nyNote({ cat: "market", name: "Tsukiji" }, "2027-01-01", NY)?.text).toMatch(/Markets/);
    expect(nyNote({ cat: "market", name: "Tsukiji" }, "2026-12-29", NY)?.level).toBe("info");
    expect(nyNote({ cat: "cafe", name: "Fuglen" }, "2027-01-01", NY)).toBeNull();
    expect(nyNote({ cat: "culture", name: "MOT" }, "2026-12-22", NY)).toBeNull();
  });
});
