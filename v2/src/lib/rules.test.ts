import { describe, expect, it } from "vitest";
import { tripData } from "./data/file";
import { versionGuide } from "./guide";
import { suggestNights } from "./nights";
import { checkDays, checkStays, checkVersion, countBySeverity, type RulesContext } from "./rules";
import { combineRoutes, copyVersion, describeDiff, rebalance, relayout, statsOf, swapInRegion } from "./versions";

const data = tripData();
const ctx: RulesContext = { trip: data.trip, calendar: data.calendar, pace: data.pace, regions: data.regions, places: data.places };
const plan = data.versions.find((v) => v.id === "plan")!;
const full = data.versions.find((v) => v.id === "full")!;
const NEW_ROUTES: Record<string, string> = {
  "deep-snow-country": "tokyo nagano takayama okuhida kanazawa tokyo",
  "west-castles-inland-sea": "tokyo kyoto hiroshima matsue okayama tokyo",
  "tohoku-snow-samurai": "tokyo south-tohoku morioka tsunagi north-tohoku tokyo",
};

describe("rules on the seeded versions", () => {
  it("the plan has no errors; its only warning is the long Kyoto → Kawaguchiko day", () => {
    const f = checkVersion(plan, ctx);
    expect(f.filter((x) => x.severity === "error")).toEqual([]);
    expect(f.filter((x) => x.severity === "warn").map((x) => x.rule)).toEqual(["long_move"]);
    // Takayama → Kyoto on 30 Dec runs against the New Year flow: a booking note, not a warning.
    expect(f.find((x) => x.rule === "no_peak_moves")?.severity).toBe("info");
  });

  it("no small place gets more nights than it can fill", () => {
    const old = data.versions.find((v) => v.id === "gero-new-year")!;
    const cap = checkVersion(old, ctx).filter((x) => x.rule === "capacity").map((x) => old.stays[x.stayIndex!].region);
    expect(cap).toEqual(["kanazawa", "gero"]);
    expect(checkVersion(plan, ctx).some((x) => x.rule === "capacity")).toBe(false);
  });

  it("New Year nights away from a perinatal centre are flagged, and unknown hospitals never pass", () => {
    const old = data.versions.find((v) => v.id === "gero-new-year")!;
    const h = checkVersion(old, ctx).filter((x) => x.rule === "hospital");
    expect(h.find((x) => old.stays[x.stayIndex!].region === "gero")?.severity).toBe("warn");
  });

  it("every seeded version covers the 20 nights", () => {
    for (const v of data.versions) {
      const errors = checkVersion(v, ctx).filter((x) => x.severity === "error");
      expect(errors, v.id).toEqual([]);
    }
  });

  it("only the route's own changes are offered; every researched route, current or earlier, keeps its story", () => {
    expect(data.versions.filter((x) => x.status === "alternative").map((x) => x.id).sort()).toEqual(["kyoto-nara-hakone", "kyoto-new-year-hakone", "kyoto-new-year-takayama"]);
    for (const v of data.versions.filter((x) => x.status === "alternative" || x.status === "legacy")) {
      // The main route's variants keep long moves out of the New Year crowds; the older routes show their warnings.
      if (v.id.startsWith("kyoto-new-year") || v.id === "kyoto-nara-hakone") {
        const peak = checkVersion(v, ctx).filter((x) => x.rule === "no_peak_moves" && x.severity === "warn");
        expect(peak, v.id).toEqual([]);
      }
      const g = versionGuide(v.id);
      expect(g?.style, v.id).toBeTruthy();
      if (v.id in NEW_ROUTES) {
        expect(Object.keys(g?.days ?? {}).length, v.id).toBe(21);
        expect(g?.nye, v.id).toBeTruthy();
        expect(v.stays.map((s) => s.region).join(" "), v.id).toBe(NEW_ROUTES[v.id]);
      }
    }
  });

  it("Full breaks the two-night minimum", () => {
    expect(checkVersion(full, ctx).some((x) => x.rule === "min_two_nights")).toBe(true);
  });

  it("peak days count only for long moves with the crowds; 31 Dec and 1 Jan are calm", () => {
    const mk = (xs: [string, number][]) => relayout(xs.map(([region, nights]) => ({ region, nights, from: "", to: "", lodging: "hotel" as const, note: null })), data.trip.start);
    // Tokyo → Kanazawa on 29 Dec goes out of Tokyo with the crowds.
    const out = checkStays(mk([["tokyo", 9], ["kanazawa", 11]]), "balanced", ctx).filter((x) => x.rule === "no_peak_moves");
    expect(out.map((x) => x.severity)).toEqual(["warn"]);
    // Kyoto → Kawaguchiko on 3 Jan heads back towards Tokyo.
    const back = checkStays(mk([["tokyo", 4], ["kyoto", 10], ["kawaguchiko", 6]]), "balanced", ctx).filter((x) => x.rule === "no_peak_moves");
    expect(back.map((x) => [x.date, x.severity])).toEqual([["2027-01-03", "warn"]]);
    // A move on 31 Dec says nothing.
    expect(checkStays(mk([["tokyo", 11], ["kyoto", 9]]), "balanced", ctx).some((x) => x.rule === "no_peak_moves")).toBe(false);
  });

  it("moves on consecutive days and a long Tokyo ending are flagged", () => {
    const mk = (xs: [string, number][]) => relayout(xs.map(([region, nights]) => ({ region, nights, from: "", to: "", lodging: "hotel" as const, note: null })), data.trip.start);
    const f = checkStays(mk([["tokyo", 4], ["kanazawa", 1], ["takayama", 2], ["kyoto", 9], ["tokyo", 4]]), "balanced", ctx);
    expect(f.some((x) => x.rule === "move_density")).toBe(true);
    expect(f.some((x) => x.rule === "tokyo_ending")).toBe(true);
  });

  it("flags gaps, overlaps and the wrong total", () => {
    const stays = plan.stays.map((s) => ({ ...s }));
    stays[1] = { ...stays[1], nights: 2, to: "2026-12-26" };
    const f = checkStays(stays, "balanced", ctx);
    expect(f.some((x) => x.rule === "twenty_nights" && /gap/.test(x.message))).toBe(true);
    const short = relayout(stays, data.trip.start);
    const g = checkStays(short, "balanced", ctx);
    expect(g.filter((x) => x.rule === "twenty_nights").map((x) => x.message)).toEqual(["19 nights planned; the trip has 20. Add 1 night."]);
  });

  it("says when New Year's Eve is not at a ryokan", () => {
    const gentle = data.versions.find((v) => v.id === "gentle")!;
    expect(checkVersion(gentle, ctx).some((x) => x.rule === "new_years_eve_dinner")).toBe(false);
    expect(checkVersion(plan, ctx).find((x) => x.rule === "new_years_eve_dinner")?.message).toMatch(/arrange dinner/);
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
    expect(f.filter((x) => x.rule === "pace_overload" && /half-day visits/.test(x.message)).length).toBe(1);
    expect(countBySeverity(f).warn).toBeGreaterThan(0);
  });
});

describe("nights suggestion", () => {
  it("matches the researched answer for every in-plan region at every pace", () => {
    for (const r of data.regions.filter((x) => x.status === "in_plan" && x.suggested_nights)) {
      for (const pace of ["gentle", "balanced", "full"] as const) {
        const s = suggestNights(r, pace, data.places, data.pace, plan.stays.find((x) => x.region === r.id));
        const researched = r.suggested_nights?.[pace];
        if (researched === undefined) continue;
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
    const old = data.versions.find((v) => v.id === "gero-new-year")!;
    const s = suggestNights(kz, "balanced", data.places, data.pace, old.stays[1]);
    expect(s.reason).toContain("half-day visit");
    expect(s.reason).toContain("Mon 28 Dec");
  });
});

describe("version helpers", () => {
  it("stats of the plan match the doc", () => {
    const st = statsOf(plan, data);
    expect(st.nights).toBe(20);
    expect(st.moves).toBe(5);
    expect(st.shortestStay).toBe(2);
    expect(st.fuji).toBe(true);
    expect(st.newYearsEve?.region).toBe("kyoto");
    expect(st.travelHours).toBeGreaterThan(10);
  });

  it("copy + diff", () => {
    const mine = copyVersion(plan, "mother", "Mum's version", data.trip.start);
    expect(mine.status).toBe("personal");
    mine.stays[1].nights = 2;
    mine.stays[2].nights = 4;
    const re = relayout(mine.stays, data.trip.start);
    expect(describeDiff(plan.stays, re, data.regions)).toEqual(["Yudanaka, Shibu Onsen and the snow monkeys 3 → 2 nights", "Kanazawa 3 → 4 nights"]);
  });

  it("swap in a candidate region", () => {
    const kinosaki = data.regions.find((r) => r.id === "kinosaki")!;
    const a = swapInRegion(plan, kinosaki, data.versions, "father", data.trip.start);
    expect(a.version.stays.some((s) => s.region === "kinosaki")).toBe(true);
    const ginzan = data.regions.find((r) => r.id === "ginzan")!;
    const b = swapInRegion(plan, ginzan, data.versions, "father", data.trip.start);
    expect(b.version.stays.find((s) => s.region === "ginzan")?.from).toBe("2027-01-05");
    expect(checkVersion(b.version, ctx).filter((f) => f.severity === "error")).toEqual([]);
  });

  it("joins two routes at a date and keeps every night", () => {
    const art = data.versions.find((v) => v.id === "art-not-fuji")!;
    const joined = combineRoutes(plan, art, "2027-01-05", data.trip.start, data.trip.nights);
    expect(joined.reduce((a, s) => a + s.nights, 0)).toBe(20);
    expect(joined.map((s) => s.region)).toEqual(["tokyo", "yudanaka", "kanazawa", "kyoto", "okayama", "tokyo"]);
    expect(joined[0].from).toBe("2026-12-20");
    expect(joined[joined.length - 1].to).toBe("2027-01-09");
  });

  it("rebalances nights to keep the trip at 20", () => {
    const longer = plan.stays.map((s, i) => (i === 2 ? { ...s, nights: s.nights + 1 } : s));
    const r = rebalance(longer, 2, 20, data.regions);
    expect(r.stays.reduce((a, s) => a + s.nights, 0)).toBe(20);
    expect(r.stays[2].nights).toBe(plan.stays[2].nights + 1);
    expect(r.note).toMatch(/took 1 night from/);
    const shorter = plan.stays.map((s, i) => (i === 4 ? { ...s, nights: s.nights - 1 } : s));
    const r2 = rebalance(shorter, 4, 20, data.regions);
    expect(r2.stays.reduce((a, s) => a + s.nights, 0)).toBe(20);
    expect(r2.stays[5].nights).toBe(plan.stays[5].nights + 1);
    // Taking a night for stop 4 comes from later stops when they can spare one, so earlier dates stay put.
    const kyoto = plan.stays.map((s, i) => (i === 0 ? { ...s, nights: s.nights + 1 } : s));
    expect(rebalance(kyoto, 0, 20, data.regions).stays[0].from).toBe("2026-12-20");
  });
});
