import { describe, expect, it } from "vitest";
import { areaIds, areaInfo, FAMOUS_TILES, HEARD_OF, REGIONS, searchPlaces } from "./areas";
import { tripData } from "./data/file";
import { versionGuide } from "./guide";

const data = tripData();
const plan = data.versions.find((v) => v.id === "plan")!;
const BANNED = /research|report|methodolog|this app|fit four|you two|\brank|\bvote|three great onsen|twelve hundred/i;

describe("is it for us this trip", () => {
  it("every area has a verdict, a region and a short line on what you do there", () => {
    for (const id of areaIds()) {
      const a = areaInfo(id)!;
      expect(a.verdict, id).toBeDefined();
      expect(REGIONS[a.region ?? ""], id).toBeDefined();
      expect(a.verdict!.headline.split(/\s+/).length, id).toBeLessThanOrEqual(10);
      expect(`${a.verdict!.headline} ${a.verdict!.text} ${a.verdict!.fit} ${a.do_line}`, id).not.toMatch(BANNED);
    }
  });

  it("On our route means a stop of the route, and the route's stops all say so", () => {
    const stops = new Set(plan.stays.map((s) => s.region));
    for (const id of areaIds()) if (areaInfo(id)!.verdict!.state === "route") expect(stops.has(id) || id === "nara" || id === "shirakawago", id).toBe(true);
    for (const id of stops) expect(areaInfo(id)?.verdict?.state, id).toBe("route");
  });

  it("Could swap in names what it replaces, and any route it points to exists", () => {
    for (const id of areaIds()) {
      const v = areaInfo(id)!.verdict!;
      if (v.state === "swap") expect(v.fit, id).toMatch(/^Instead of/);
      if (v.route) expect(versionGuide(v.route), `${id} → ${v.route}`).not.toBeNull();
    }
  });
});

describe("heard of somewhere?", () => {
  const names = Object.fromEntries(data.regions.map((r) => [r.id, r.name]));
  it("finds places by the names people know them by", () => {
    expect(searchPlaces("Fushimi Inari", names).areas).toContain("kyoto");
    expect(searchPlaces("niseko", names).areas).toContain("hokkaido");
    expect(searchPlaces("snow monkeys", names).areas).toContain("yudanaka");
    expect(searchPlaces("Kyōto", names).areas).toContain("kyoto");
    expect(areaIds().reduce((n, id) => n + (areaInfo(id)?.aliases?.length ?? 0), 0)).toBeGreaterThanOrEqual(30);
  });

  it("answers famous names that are not areas with an honest line", () => {
    expect(HEARD_OF.length).toBeGreaterThanOrEqual(8);
    expect(searchPlaces("disney", names).heard.length).toBe(1);
    for (const h of HEARD_OF) expect(h.note, h.name).not.toMatch(BANNED);
  });

  it("every famous tile points at real areas", () => {
    for (const t of FAMOUS_TILES) for (const id of t.areas) expect(areaInfo(id), `${t.title} → ${id}`).not.toBeNull();
  });
});
