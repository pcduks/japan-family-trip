import { describe, expect, it } from "vitest";
import { badBooking, encodeNotes, FOOD_DEADLINES, rowToFoodBooking, slug, withFoodDeadlines } from "./food";
import { DEEP_CITIES } from "./foodDeep";
import { critic, openOn, routeNights, stopNumber } from "./foodView";
import { tripData } from "./data/file";

describe("food places and dates", () => {
  it("slugs names the same way every time", () => {
    expect(slug("Otome Zushi")).toBe("otome-zushi");
    expect(slug("Ōmichō Ikiiki-tei")).toBe("omicho-ikiiki-tei");
  });
  it("every food date points at a place that exists", () => {
    for (const d of FOOD_DEADLINES) {
      expect(d.id, d.item).toMatch(/^food-/);
      if (!d.place) continue;
      const [city, s] = d.place.split("/");
      expect(DEEP_CITIES[city]?.places?.some((p) => slug(p.name) === s), d.place).toBe(true);
    }
  });
  it("place ids are unique within a city", () => {
    for (const c of Object.values(DEEP_CITIES)) {
      const ids = (c.places ?? []).map((p) => slug(p.name));
      expect(new Set(ids).size, c.slug).toBe(ids.length);
    }
  });
  it("adds the food dates once and keeps a stored done flag", () => {
    const merged = withFoodDeadlines([{ id: "food-otome-zushi", date: "2026-10-28", item: "x", done: true }, { id: "dl-1", date: "2026-11-01", item: "rail pass" }]);
    expect(merged.filter((d) => d.id === "food-otome-zushi")).toHaveLength(1);
    expect(merged.find((d) => d.id === "food-otome-zushi")).toMatchObject({ done: true, place: "kanazawa/otome-zushi" });
    expect(merged).toHaveLength(FOOD_DEADLINES.length + 1);
  });
  it("round-trips a booking through the notes column", () => {
    const b = rowToFoodBooking({ id: "1", target_id: "kanazawa/otome-zushi", name: "Otome Zushi", status: "booked", url: null, notes: encodeNotes({ date: "2026-12-28", meal: "dinner", time: "18:30", party: 7, ref: "48213", note: null }) });
    expect(b).toMatchObject({ date: "2026-12-28", meal: "dinner", time: "18:30", party: 7, ref: "48213", status: "booked" });
    expect(rowToFoodBooking({ id: "2", target_id: "a/b", name: "x", status: "weird", notes: "free text" })).toMatchObject({ status: "idea", note: "free text", date: null });
  });
  it("refuses a malformed booking", () => {
    expect(badBooking({ target_id: "kanazawa/otome-zushi", name: "Otome", status: "held" })).toBeNull();
    expect(badBooking({ target_id: "../x", name: "x", status: "held" })).not.toBeNull();
    expect(badBooking({ target_id: "a/b", name: "x", status: "booked", date: "28 Dec" })).not.toBeNull();
    expect(badBooking({ target_id: "a/b", name: "x", status: "booked", url: "javascript:alert(1)" })).not.toBeNull();
  });
});

describe("food view", () => {
  it("knows when a place is closed on our date", () => {
    expect(openOn({ closed_weekdays: ["Sun"] }, "2026-12-27")).toBe("closed");
    expect(openOn({ closed_weekdays: ["Sun"] }, "2026-12-28")).toBe("open");
    expect(openOn({ closed_dates: ["2026-12-29"] }, "2026-12-29")).toBe("closed");
    expect(openOn({ closed_weekdays: [] }, "2027-01-01")).toBe("check");
    expect(openOn({}, "2026-12-28")).toBe("check");
  });
  it("numbers the route's stops, with Nagano under Yudanaka and Tokyo kept at 1", () => {
    const plan = tripData().versions.find((v) => v.status === "plan")!;
    expect(stopNumber(plan.stays, "tokyo")).toBe(1);
    expect(stopNumber(plan.stays, "nagano")).toBe(stopNumber(plan.stays, "yudanaka"));
    expect(stopNumber(plan.stays, "hiroshima")).toBeNull();
    expect(routeNights(plan.stays)).toHaveLength(tripData().trip.nights);
  });
  it("reads critics' names", () => {
    expect(critic("@jwang815 (Jason Wang)")).toMatchObject({ name: "Jason Wang", initials: "JW", handle: "@jwang815" });
    expect(critic("@we.are.hungry.tourists (The Hungry Tourist / David Califa)").name).toBe("David Califa");
  });
});
