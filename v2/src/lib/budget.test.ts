import { describe, expect, it } from "vitest";
import { budgetOf, farePerPerson, inferLodging, stayCost } from "./budget";
import { tripData } from "./data/file";
import { lodgingFor, searchLinks } from "./lodging";

const data = tripData();
const plan = data.versions.find((v) => v.id === "plan")!;

describe("budget per couple", () => {
  it("the plan lands under the S$15k target without flights", () => {
    const b = budgetOf(plan, data.regions);
    expect(b.perCoupleSgd).toBeGreaterThan(9000);
    expect(b.perCoupleSgd).toBeLessThan(15000);
    expect(b.headroomSgd).toBeGreaterThan(0);
    expect(b.days).toBe(21);
    expect(b.ryokanDays).toBe(4);
    expect(b.moves).toBe(6);
  });

  it("every seeded version has a budget and Full costs more than Gentle", () => {
    const by = Object.fromEntries(data.versions.map((v) => [v.id, budgetOf(v, data.regions).perCoupleSgd]));
    for (const v of data.versions) expect(by[v.id], v.id).toBeGreaterThan(5000);
    expect(by.full).toBeGreaterThan(by.gentle);
  });

  it("New Year nights at a ryokan carry the uplift", () => {
    const gero = plan.stays.find((s) => s.region === "gero")!;
    const c = stayCost(gero);
    expect(c.lodging).toBe("ryokan");
    expect(c.upliftNights).toBe(2); // nights of 30 and 31 Dec
    expect(c.total).toBeGreaterThan(c.perNight * 2);
  });

  it("infers a ryokan in onsen towns and a hotel elsewhere when nothing is set", () => {
    expect(inferLodging({ region: "hakone", lodging: null }).lodging).toBe("ryokan");
    expect(inferLodging({ region: "hiroshima", lodging: null }).lodging).toBe("hotel");
    expect(inferLodging({ region: "kyoto", lodging: "rental" }).inferred).toBe(false);
  });

  it("fares use the table in both directions and fall back to hours", () => {
    expect(farePerPerson("tokyo", "kanazawa", data.regions)).toBe(14380);
    expect(farePerPerson("kanazawa", "tokyo", data.regions)).toBe(14380);
    expect(farePerPerson("kyoto", "ginzan", data.regions)).toBeGreaterThan(10000);
  });
});

describe("lodging data", () => {
  it("every base in a seeded version has lodging guidance", () => {
    const regions = new Set(data.versions.flatMap((v) => v.stays.map((s) => s.region)));
    for (const r of regions) expect(lodgingFor(r), r).not.toBeNull();
  });

  it("search links carry the dates and six guests", () => {
    const stay = plan.stays.find((s) => s.region === "kanazawa")!;
    const links = searchLinks(stay, data.regions.find((r) => r.id === "kanazawa"));
    const booking = links.find((l) => l.label === "Booking.com")!;
    expect(booking.url).toContain("checkin=2026-12-24");
    expect(booking.url).toContain("group_adults=6");
    expect(links.some((l) => l.label === "Airbnb")).toBe(true);
  });
});
