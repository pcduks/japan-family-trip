import { describe, expect, it } from "vitest";
import { fileSnapshot } from "./data/loader";
import { feelOf } from "./feel";
import type { RulesContext } from "./rules";

const snap = fileSnapshot();
const rules: RulesContext = { trip: snap.trip, calendar: snap.calendar, pace: snap.pace, regions: snap.regions, places: snap.places };
const v = (id: string) => snap.versions.find((x) => x.id === id)!;

describe("how a route feels", () => {
  it("our route: five packings, three moves at most in a week, no nights a place can't fill", () => {
    const f = feelOf(v("plan"), snap, rules);
    expect(f).toMatchObject({ pack: 5, busiestWeek: 3, unfilled: 0 });
    expect(f.outdoor).toBeGreaterThan(0);
  });

  it("Takayama back in: one more packing and four moves in a week", () => {
    expect(feelOf(v("kyoto-new-year-takayama"), snap, rules)).toMatchObject({ pack: 6, busiestWeek: 4, unfilled: 0 });
  });

  it("the old Gero route shows the nights Kanazawa and Gero could not fill", () => {
    expect(feelOf(v("gero-new-year"), snap, rules).unfilled).toBe(2);
  });
});
