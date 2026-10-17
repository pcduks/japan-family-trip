import { describe, expect, it } from "vitest";
import { tripData } from "./data/file";
import { changedStops, mergeOnto, sameRoute, stopKeys, validRoute } from "./merge";
import type { Stay } from "./types";
import { relayout } from "./versions";

const data = tripData();
const start = data.trip.start;
const base = data.versions.find((v) => v.id === "plan")!.stays;
/** The route with some stops' nights changed, dates laid out again. */
const withNights = (stays: Stay[], change: Record<string, number>) => {
  const keys = stopKeys(stays);
  return relayout(stays.map((s, i) => (keys[i] in change ? { ...s, nights: change[keys[i]] } : s)), start);
};

describe("putting a suggestion on top of the route as it is now", () => {
  it("names the two Tokyo stays apart", () => {
    expect(stopKeys(base)).toEqual(["tokyo", "kanazawa", "takayama", "gero", "kyoto", "kawaguchiko", "tokyo:2"]);
  });

  it("applies as sent when the route has not changed", () => {
    const carlos = withNights(base, { kyoto: 5, kawaguchiko: 1 });
    const r = mergeOnto(base, carlos, base, start);
    expect(r.kind).toBe("clean");
    if (r.kind === "clean") expect(sameRoute(r.stays, carlos)).toBe(true);
  });

  it("keeps a planner's change to other stops made since", () => {
    const carlos = withNights(base, { kyoto: 5, kawaguchiko: 1 });
    const pedro = withNights(base, { takayama: 3, gero: 1 });
    const r = mergeOnto(base, carlos, pedro, start);
    expect(r.kind).toBe("clean");
    if (r.kind !== "clean") return;
    expect(changedStops(base, r.stays).sort()).toEqual(["gero", "kawaguchiko", "kyoto", "takayama"]);
    expect(validRoute(r.stays, start, data.trip.nights)).toBeNull();
  });

  it("never gives Kyoto six nights when two people asked for five", () => {
    const carlos = withNights(base, { kyoto: 5, kawaguchiko: 1 });
    const nadirSame = withNights(base, { kyoto: 5, kawaguchiko: 1 });
    expect(mergeOnto(base, nadirSame, carlos, start).kind).toBe("already");
    const nadirOther = withNights(base, { kyoto: 5, "tokyo:2": 1 });
    expect(mergeOnto(base, nadirOther, carlos, start).kind).toBe("clash");
  });

  it("calls it a clash when the same stop was changed to something else", () => {
    const carlos = withNights(base, { kyoto: 5, kawaguchiko: 1 });
    const fernanda = withNights(base, { kyoto: 3, kawaguchiko: 3 });
    const r = mergeOnto(base, carlos, fernanda, start);
    expect(r.kind).toBe("clash");
    if (r.kind === "clash") expect(r.stops).toContain("kyoto");
  });

  it("refuses a route that is not 20 unbroken nights", () => {
    expect(validRoute(base, start, data.trip.nights)).toBeNull();
    expect(validRoute(withNights(base, { kyoto: 5 }), start, data.trip.nights)).toMatch(/20 nights/);
    const gap = base.map((s, i) => (i === 2 ? { ...s, from: s.to } : s));
    expect(validRoute(gap, start, data.trip.nights)).toMatch(/gap/);
  });
});
