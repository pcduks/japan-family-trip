import { describe, expect, it } from "vitest";
import { tripData } from "./data/file";
import { suggestNights } from "./nights";
import { checkDays, checkStays, checkVersion, countBySeverity, type RulesContext } from "./rules";
import { copyVersion, describeDiff, relayout, statsOf, swapInRegion } from "./versions";

const data = tripData();
const ctx: RulesContext = { trip: data.trip, calendar: data.calendar, pace: data.pace, regions: data.regions, places: data.places };
const plan = data.versions.find((v) => v.id === "plan")!;
const full = data.versions.find((v) => v.id === "full")!;

describe("rules on the seeded versions", () => {
  it("the plan passes with only info findings", () => {
    const f = checkVersion(plan, ctx);
    expect(f.filter((x) => x.severity === "error")).toEqual([]);
    expect(f.filter((x) => x.severity === "warn")).toEqual([]);
    // The 30 Dec hop Takayama → Gero is a peak day but under an hour.
    expect(f.find((x) => x.rule === "no_peak_moves")?.severity).toBe("info");
  });

  it("every seeded version covers the 20 nights", () => {
    for (const v of data.versions) {
      const errors = checkVersion(v, ctx).filter((x) => x.severity === "error");
      expect(errors, v.id).toEqual([]);
    }
  });

  it("Full breaks the two-night minimum and moves on peak days", () => {
    const f = checkVersion(full, ctx);
    expect(f.some((x) => x.rule === "min_two_nights")).toBe(true);
    const peak = f.filter((x) => x.rule === "no_peak_moves" && x.severity === "warn");
    expect(peak.map((x) => x.date)).toEqual(["2026-12-30", "2027-01-04"]);
  });

  it("flags gaps, overlaps and the wrong total", () => {
    const stays = plan.stays.map((s) => ({ ...s }));
    stays[1] = { ...stays[1], nights: 3, to: "2026-12-27" };
    const f = checkStays(stays, "balanced", ctx);
    expect(f.some((x) => x.rule === "twenty_nights" && /gap/.test(x.message))).toBe(true);
    const short = relayout(stays, data.trip.start);
    const g = checkStays(short, "balanced", ctx);
    expect(g.filter((x) => x.rule === "twenty_nights").map((x) => x.message)).toEqual(["19 nights planned; the trip has 20. Add 1 night."]);
  });

  it("says when New Year's Eve is not at a ryokan", () => {
    const gentle = data.versions.find((v) => v.id === "gentle")!;
    expect(checkVersion(gentle, ctx).some((x) => x.rule === "new_years_eve_dinner")).toBe(false);
    const v = { ...plan, stays: plan.stays.map((s) => (s.region === "gero" ? { ...s, lodging: "hotel" as const } : s)) };
    expect(checkVersion(v, ctx).find((x) => x.rule === "new_years_eve_dinner")?.message).toMatch(/not a ryokan/);
  });

  it("day items: closures, pregnancy flags and pace overload", () => {
    const f = checkDays(
      [
        { date: "2026-12-30", place_id: "kz-21c", slot: "morning", crew: "everyone" }, // closed over New Year
        { date: "2026-12-30", place_id: "kz-myoryuji", slot: "afternoon", crew: "everyone" }, // avoid for her
        { date: "2027-01-02", place_id: "ky-higashiyama", slot: "morning", crew: "everyone" },
        { date: "2027-01-02", place_id: "ky-arashiyama", slot: "afternoon", crew: "everyone" },
      ],
      "balanced",
      ctx,
    );
    expect(f.some((x) => x.rule === "closure_check")).toBe(true);
    expect(f.some((x) => x.rule === "pregnancy_flags")).toBe(true);
    expect(f.filter((x) => x.rule === "pace_overload" && /main outings/.test(x.message)).length).toBe(1);
    expect(countBySeverity(f).warn).toBeGreaterThan(0);
  });
});

describe("nights suggestion", () => {
  it("matches the researched answer for every in-plan region at every pace", () => {
    for (const r of data.regions.filter((x) => x.status === "in_plan")) {
      for (const pace of ["gentle", "balanced", "full"] as const) {
        const s = suggestNights(r, pace, data.places, data.pace, plan.stays.find((x) => x.region === r.id));
        const researched = r.suggested_nights?.[pace];
        const expected = typeof researched === "string" ? Number(researched.split("-")[0]) : researched;
        expect(s.nights, `${r.id} ${pace}`).toBe(expected);
        expect(s.reason).toMatch(/night/);
      }
    }
  });

  it("the computed count is within one night of the research for the big bases", () => {
    for (const id of ["tokyo", "kyoto", "kanazawa"]) {
      const r = data.regions.find((x) => x.id === id)!;
      const s = suggestNights(r, "balanced", data.places, data.pace);
      expect(Math.abs(s.computed - (s.nights ?? 0)), id).toBeLessThanOrEqual(1);
    }
  });

  it("explains in plain language", () => {
    const kz = data.regions.find((x) => x.id === "kanazawa")!;
    const s = suggestNights(kz, "balanced", data.places, data.pace, plan.stays[1]);
    expect(s.reason).toContain("main outing");
    expect(s.reason).toContain("Mon 28 Dec");
  });
});

describe("version helpers", () => {
  it("stats of the plan match the doc", () => {
    const st = statsOf(plan, data);
    expect(st.nights).toBe(20);
    expect(st.moves).toBe(6);
    expect(st.shortestStay).toBe(2);
    expect(st.fuji).toBe(true);
    expect(st.newYearsEve?.region).toBe("gero");
    expect(st.travelHours).toBeGreaterThan(10);
  });

  it("copy + diff", () => {
    const mine = copyVersion(plan, "mother", "Mum's version", data.trip.start);
    expect(mine.status).toBe("personal");
    mine.stays[1].nights = 3;
    mine.stays[2].nights = 3;
    const re = relayout(mine.stays, data.trip.start);
    expect(describeDiff(plan.stays, re, data.regions)).toEqual(["Kanazawa 4 → 3 nights", "Takayama 2 → 3 nights"]);
  });

  it("swap in a candidate region", () => {
    const kinosaki = data.regions.find((r) => r.id === "kinosaki")!;
    const a = swapInRegion(plan, kinosaki, data.versions, "father", data.trip.start);
    expect(a.version.stays.some((s) => s.region === "kinosaki")).toBe(true);
    const shuzenji = data.regions.find((r) => r.id === "shuzenji")!;
    const b = swapInRegion(plan, shuzenji, data.versions, "father", data.trip.start);
    expect(b.version.stays.find((s) => s.region === "shuzenji")?.from).toBe("2027-01-05");
    expect(checkVersion(b.version, ctx).filter((f) => f.severity === "error")).toEqual([]);
  });
});
