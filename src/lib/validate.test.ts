import { describe, expect, it } from "vitest";
import { findLeg, indexCatalog } from "./builder/common";
import { fixtureCatalog } from "./builder/fixtures/catalog";
import { fixtureFacts, fixtureTravellers } from "./builder/fixtures/family";
import { DEFAULT_RULES, type Coverage, type Deadline, type Draft, type DraftLeg, type DraftStay, type Placement, type TravellerId } from "./builder/types";
import { deadlineFor, tripCost, validate } from "./validate";

const ix = indexCatalog(fixtureCatalog);
const TODAY = "2026-10-01";
const ALL = fixtureTravellers.map((t) => t.id);

type PartialDraft = Pick<Draft, "stays" | "legs" | "placements" | "coverage" | "deadlines">;

/** Stays from [place, nights] pairs starting 20 Dec; legs looked up in the fixture matrix. */
function draft(blocks: [string, number][], placements: Placement[] = [], extra: { coverage?: Record<TravellerId, Coverage>; deadlines?: Deadline[]; legs?: DraftLeg[] } = {}): PartialDraft {
  const stays: DraftStay[] = [];
  let date = "2026-12-20";
  for (const [place, nights] of blocks) {
    stays.push({ place, startDate: date, nights, via: [], daytrips: [] });
    const [y, m, d] = date.split("-").map(Number);
    date = new Date(Date.UTC(y, m - 1, d + nights)).toISOString().slice(0, 10);
  }
  const legs: DraftLeg[] =
    extra.legs ??
    stays.slice(1).map((s, i) => {
      const leg = findLeg(ix, stays[i].place, s.place);
      if (!leg) throw new Error(`fixture has no leg ${stays[i].place}>${s.place}`);
      return { date: s.startDate, from: stays[i].place, to: s.place, leg };
    });
  return { stays, legs, placements, coverage: extra.coverage ?? {}, deadlines: extra.deadlines ?? [] };
}

const p = (date: string, card_id: string, who: TravellerId[] = ALL, more: Partial<Placement> = {}): Placement => ({ date, card_id, who, split_group: false, ...more });

const codes = (d: PartialDraft, opts = {}) => validate(d, fixtureCatalog, fixtureTravellers, DEFAULT_RULES, { today: TODAY, facts: fixtureFacts, ...opts }).map((v) => v.code);

/** A sound 20-night shape: Tokyo 4 → Kyoto 8 (calm move 1 Jan) → Kanazawa 4 → Tokyo 4. */
const GOOD: [string, number][] = [
  ["tokyo", 4],
  ["kyoto", 8],
  ["kanazawa", 4],
  ["tokyo", 4],
];

describe("validate: shape", () => {
  it("accepts a sound empty draft", () => {
    expect(codes(draft(GOOD))).toEqual([]);
  });
  it("nights≠20", () => {
    expect(codes(draft([["tokyo", 4], ["kyoto", 15]]))).toContain("nights≠20");
  });
  it("tokyo-ends when the trip does not start in Tokyo", () => {
    const d = draft([["kyoto", 12], ["tokyo", 8]], [], { legs: [] });
    expect(codes(d)).toContain("tokyo-ends");
  });
  it("tokyo-ends and last-base-far when the trip ends far from Haneda", () => {
    const d = draft([["tokyo", 4], ["kyoto", 16]]);
    const c = codes(d);
    expect(c).toContain("tokyo-ends");
    expect(c).toContain("last-base-far");
  });
  it("last-base-far for an 8 Jan night beyond 90 min, even near Tokyo", () => {
    const d = draft([["tokyo", 4], ["kyoto", 8], ["tokyo", 4], ["nikko", 4]]);
    const c = codes(d);
    expect(c).toContain("last-base-far");
    expect(c).not.toContain("tokyo-ends");
  });
});

describe("validate: bases", () => {
  it("bus-bases>1", () => {
    const d = draft([["tokyo", 4], ["kanazawa", 2], ["takayama", 3], ["kanazawa", 2], ["yudanaka", 5], ["tokyo", 4]]);
    expect(codes(d)).toContain("bus-bases>1");
  });
  it("no-hospital-ny when a NY night sleeps in an onsen town", () => {
    const d = draft([["tokyo", 4], ["kyoto", 4], ["kinosaki", 8], ["tokyo", 4]]);
    expect(codes(d)).toContain("no-hospital-ny");
  });
  it("no-hospital-ny respects rules.hospital_minutes", () => {
    const d = draft(GOOD);
    const v = validate(d, fixtureCatalog, fixtureTravellers, { ...DEFAULT_RULES, hospital_minutes: 10 }, { today: TODAY });
    expect(v.map((x) => x.code)).toContain("no-hospital-ny");
  });
  it("ekiden for Hakone over 2–3 Jan", () => {
    const d = draft([["tokyo", 4], ["kyoto", 8], ["hakone", 4], ["tokyo", 4]]);
    const c = codes(d);
    expect(c).toContain("ekiden");
  });
});

describe("validate: legs", () => {
  it("peak-move on 28 Dec", () => {
    const d = draft([["tokyo", 4], ["kanazawa", 4], ["kyoto", 8], ["tokyo", 4]]);
    const c = codes(d);
    expect(c).toContain("peak-move");
  });
  it("calm move on 31 Dec passes only with an easy leg", () => {
    // kyoto>kanazawa: 2.5 h, bump 4 → fine
    expect(codes(draft([["tokyo", 4], ["kyoto", 7], ["kanazawa", 5], ["tokyo", 4]]))).not.toContain("peak-move");
    // kyoto>kinosaki: bump 3 → not for her on a calm day
    expect(codes(draft([["tokyo", 4], ["kyoto", 7], ["kinosaki", 5], ["tokyo", 4]]))).toContain("peak-move");
  });
  it("leg>4h", () => {
    const d = draft([["tokyo", 4], ["takayama", 8], ["tokyo", 8]]);
    expect(codes(d)).toContain("leg>4h");
  });
  it("no-route from the matrix flag and from a missing pair", () => {
    expect(codes(draft([["tokyo", 4], ["kinosaki", 8], ["tokyo", 8]]))).toContain("no-route");
    const d = draft([["tokyo", 4], ["nikko", 8], ["kyoto", 4], ["tokyo", 4]], [], { legs: [] });
    expect(codes(d)).toContain("no-route");
  });
  it("two-rail-legs-over-2h on the same day", () => {
    const good = draft(GOOD);
    const extra: DraftLeg = { date: good.legs[0].date, from: "kyoto", to: "osaka", leg: { ...findLeg(ix, "tokyo", "kyoto")!, from: "kyoto", to: "osaka" } };
    expect(codes({ ...good, legs: [...good.legs, extra] })).toContain("two-rail-legs-over-2h");
  });
});

describe("validate: placements", () => {
  it("closed-on-date for a museum on 1 Jan and outside-valid-window for lights after 25 Dec", () => {
    const d = draft(GOOD, [p("2027-01-01", "KY-09"), p("2026-12-26", "TK-02")]);
    const c = codes(d);
    expect(c).toContain("closed-on-date");
    expect(c).toContain("outside-valid-window");
  });
  it("duplicate-card", () => {
    expect(codes(draft(GOOD, [p("2026-12-21", "TK-01"), p("2026-12-22", "TK-01")]))).toContain("duplicate-card");
  });
  it("anchors>2, parallels not counted", () => {
    const three = [p("2026-12-25", "KY-01"), p("2026-12-25", "KY-03"), p("2026-12-25", "KY-06")];
    expect(codes(draft(GOOD, three))).toContain("anchors>2");
    const withParallel = [p("2026-12-25", "KY-01"), p("2026-12-25", "KY-03", ALL.filter((x) => x !== "her"), { split_group: true, parallel_card_id: "KY-09" }), p("2026-12-25", "KY-09", ["her"], { split_group: true })];
    expect(codes(draft(GOOD, withParallel))).not.toContain("anchors>2");
  });
  it("her-bump unless a parallel card exists", () => {
    expect(codes(draft(GOOD, [p("2027-01-06", "TK-12")]))).toContain("her-bump");
    const split = [p("2027-01-06", "TK-12", ALL.filter((x) => x !== "her"), { split_group: true, parallel_card_id: "TK-05" }), p("2027-01-06", "TK-05", ["her"], { split_group: true })];
    expect(codes(draft(GOOD, split))).not.toContain("her-bump");
  });
  it("her-hours over 8 h", () => {
    const d = draft(GOOD, [p("2026-12-26", "KY-03"), p("2026-12-26", "KY-06"), p("2026-12-26", "KY-02")]);
    expect(codes(d)).toContain("her-hours");
  });
  it("her-effort when a card is above her effort cap", () => {
    const d = draft(GOOD, [p("2026-12-26", "KY-08")]);
    // KY-08 is 31 Dec only; use a valid heavy card instead: HR-04 effort 3 is within cap, YD-02 effort 5 → over
    const e = draft([["tokyo", 4], ["kyoto", 8], ["kanazawa", 4], ["yudanaka", 3], ["tokyo", 1]], [p("2027-01-06", "YD-02")]);
    expect(codes(e)).toContain("her-effort");
    expect(codes(d)).toContain("outside-valid-window");
  });
  it("no-rest-after-long-leg", () => {
    const d = draft(GOOD, [p("2026-12-25", "KY-03")]); // tokyo>kyoto is 2.8 h: no rest needed
    expect(codes(d)).not.toContain("no-rest-after-long-leg");
    const e = draft([["tokyo", 4], ["osaka", 8], ["kanazawa", 4], ["tokyo", 4]], [p("2026-12-25", "OS-02")]); // tokyo>osaka 3 h
    expect(codes(e)).toContain("no-rest-after-long-leg");
  });
  it("ekiden for a Hakone card on 2 Jan", () => {
    const d = draft([["tokyo", 4], ["kyoto", 8], ["tokyo", 8]], [p("2027-01-02", "HK-01")]);
    expect(codes(d)).toContain("ekiden");
  });
  it("deadline-passed from the card's booking and from the draft's own list", () => {
    const d = draft(GOOD, [p("2027-01-05", "TK-09")]);
    expect(codes(d, { today: "2026-12-10" })).toContain("deadline-passed");
    expect(codes(d, { today: "2026-11-01" })).not.toContain("deadline-passed");
    const e = draft(GOOD, [], { deadlines: [{ date: "2026-09-01", what: "Nintendo" }] });
    expect(codes(e)).toContain("deadline-passed");
  });
});

describe("validate: people and money", () => {
  it("must-uncovered below 2 of 3", () => {
    const cov = { pedro: { must: [{ card_id: "KY-01", hit: true }, { card_id: "TK-03", hit: false }, { card_id: "HR-01", hit: false }], like: 0, no: 0 } };
    const v = validate(draft(GOOD, [], { coverage: cov }), fixtureCatalog, fixtureTravellers, DEFAULT_RULES, { today: TODAY });
    expect(v.find((x) => x.code === "must-uncovered")?.who).toBe("pedro");
    const ok = { pedro: { must: [{ card_id: "KY-01", hit: true }, { card_id: "TK-03", hit: true }, { card_id: "HR-01", hit: false }], like: 0, no: 0 } };
    expect(codes(draft(GOOD, [], { coverage: ok }))).not.toContain("must-uncovered");
  });
  it("budget over ¥275k/day", () => {
    const d = draft([["tokyo", 4], ["kyoto", 8], ["kinosaki", 4], ["tokyo", 4]], Array.from({ length: 6 }, (_, i) => p(`2026-12-2${i + 1}`, "KY-07")));
    // force the cost up with an expensive leg list
    const pricey = { ...d, legs: d.legs.map((l) => ({ ...l, leg: { ...l.leg, yen_pp: 400_000 } })) };
    expect(codes(pricey)).toContain("budget");
    expect(codes(draft(GOOD))).not.toContain("budget");
  });
  it("tripCost sums nights, cards × people and legs × 6", () => {
    const d = draft([["tokyo", 20]], [p("2026-12-21", "TK-01", ["her", "pedro"])]);
    expect(tripCost(d, fixtureCatalog)).toBe(20 * 80_000 + 2 * 3_800);
  });
  it("deadlineFor prefers the explicit date, else lead days", () => {
    expect(deadlineFor({ lead_days: 30, deadline: "2026-12-05" }, "2027-01-05")).toBe("2026-12-05");
    expect(deadlineFor({ lead_days: 14 }, "2027-01-05")).toBe("2026-12-22");
    expect(deadlineFor({ lead_days: null }, "2027-01-05")).toBeNull();
  });
});
