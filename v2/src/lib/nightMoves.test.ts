import { describe, expect, it } from "vitest";
import { tripData } from "./data/file";
import { nightOptions, nyeIndex } from "./nightMoves";
import { totalNights } from "./versions";

const data = tripData();
const plan = data.versions.find((v) => v.id === "plan")!.stays;
const start = data.trip.start;

describe("one more night here, one fewer there", () => {
  it("New Year's Eve is in Kyoto", () => {
    expect(plan[nyeIndex(plan)].region).toBe("kyoto");
  });

  it("one more night in Kyoto suggests Kawaguchiko, keeps 20 nights and New Year's Eve", () => {
    const kyoto = plan.findIndex((s) => s.region === "kyoto");
    const opts = nightOptions(plan, kyoto, "more", start);
    expect(opts[0].suggested).toBe(true);
    expect(opts[0].region).toBe("kawaguchiko");
    expect(totalNights(opts[0].stays)).toBe(20);
    expect(opts[0].stays[kyoto].nights).toBe(7);
    expect(opts[0].movesNye).toBeNull();
  });

  it("a choice that would move New Year's Eve says so and is never suggested", () => {
    // In the Gero route, New Year's Eve sits on the night of 31 Dec at Gero; taking a Kyoto night from Tokyo shifts it.
    const old = data.versions.find((v) => v.id === "gero-new-year")!.stays;
    const kyoto = old.findIndex((s) => s.region === "kyoto");
    const tokyo = nightOptions(old, kyoto, "more", start).find((o) => o.index === 0)!;
    expect(tokyo.movesNye).not.toBeNull();
    expect(tokyo.suggested).toBe(false);
  });

  it("a one-night stop cannot give a night", () => {
    const stays = plan.map((s, i) => (i === 5 ? { ...s, nights: 1 } : s));
    const opts = nightOptions(stays, 4, "more", start);
    expect(opts.find((o) => o.index === 5)?.blocked).toBe("already 1 night");
  });
});
