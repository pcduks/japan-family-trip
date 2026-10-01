import { describe, expect, it } from "vitest";
import { validate } from "../validate";
import { enumerateCandidates, MAX_CANDIDATES, daytripsFor } from "./candidates";
import { indexCatalog, isParallel, wishMap } from "./common";
import { dayShapes, fill } from "./fill";
import { fixtureCatalog } from "./fixtures/catalog";
import { fixtureFacts, fixtureTravellers, fixtureWishes } from "./fixtures/family";
import { buildRoutes, coverageFor, draftFromCandidate, explainDraft } from "./index";
import { chosenBases, jaccard, nameAxis, pickDiverse, scoreDraft } from "./score";
import { skeletons } from "./skeleton";
import { CALM_MOVE_DATES, DEFAULT_RULES, NY_NIGHTS, TRIP_NIGHTS, TRIP_START, type BuildInput, type Draft, type Wish } from "./types";

const ix = indexCatalog(fixtureCatalog);
const wm = wishMap(fixtureWishes);
const input: BuildInput = { catalog: fixtureCatalog, travellers: fixtureTravellers, wishes: fixtureWishes, facts: fixtureFacts, rules: DEFAULT_RULES, today: "2026-10-01" };
const her = fixtureTravellers.find((t) => t.who === "her")!;

describe("skeleton", () => {
  const all = skeletons();
  it("every layout has 20 nights, starts in Tokyo on 20 Dec and moves only on legal dates", () => {
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      expect(s.blocks.reduce((a, b) => a + b.nights, 0)).toBe(TRIP_NIGHTS);
      expect(s.blocks[0]).toMatchObject({ key: "A", startDate: TRIP_START, fixed: "tokyo" });
      expect([4, 5]).toContain(s.blocks[0].nights);
      for (const m of s.moves) expect(["2026-12-24", "2026-12-25", ...CALM_MOVE_DATES, "2027-01-05", "2027-01-08"]).toContain(m);
      const c = s.blocks.find((b) => b.key === "C")!;
      expect(c.ny).toBe(true);
      expect(c.startDate <= "2027-01-01").toBe(true);
      expect(s.blocks.filter((b) => b.reveillon).length).toBe(1);
      expect(s.blocks.find((b) => b.key === "D")!.last).toBe(true);
      const e = s.blocks.find((b) => b.key === "E");
      if (e) expect(e).toMatchObject({ startDate: "2027-01-08", nights: 1, fixed: "tokyo" });
    }
  });
  it("marks B as a NY block whenever B and C differ (it holds 29–30 Dec)", () => {
    for (const s of all) {
      const b = s.blocks.find((x) => x.key === "B");
      if (b) expect(b.ny).toBe(true);
    }
  });
});

describe("candidates", () => {
  const cands = enumerateCandidates(ix, { rules: DEFAULT_RULES, wishes: wm });
  it("exist, are capped and unique", () => {
    expect(cands.length).toBeGreaterThan(10);
    expect(cands.length).toBeLessThanOrEqual(MAX_CANDIDATES);
    expect(new Set(cands.map((c) => c.id)).size).toBe(cands.length);
  });
  it("respect transit, lodging, bus, hospital and Haneda rules", () => {
    for (const c of cands) {
      expect(c.stays.reduce((a, s) => a + s.nights, 0)).toBe(TRIP_NIGHTS);
      expect(c.legs.length).toBe(c.stays.length - 1);
      for (const l of c.legs) {
        expect(l.leg.no_route).toBeFalsy();
        expect(l.leg.hours_d2d).toBeLessThanOrEqual(DEFAULT_RULES.max_transit_hours);
        expect(l.leg.bump).toBeGreaterThanOrEqual(3);
        if (l.leg.flags.includes("flight")) expect(l).toMatchObject({ date: "2027-01-05", to: "tokyo" });
        if (CALM_MOVE_DATES.includes(l.date)) {
          expect(l.leg.bump).toBeGreaterThanOrEqual(4);
          expect(l.leg.hours_d2d).toBeLessThanOrEqual(3);
        }
      }
      const bases = c.stays.map((s) => ix.bases.get(s.place)!);
      expect(new Set(bases.filter((b) => b.bus_dependent).map((b) => b.slug)).size).toBeLessThanOrEqual(1);
      for (const b of bases) expect(b.lodging_tier).toBeLessThanOrEqual(2);
      for (const s of c.stays) {
        const b = ix.bases.get(s.place)!;
        const end = new Date(s.startDate).getTime() + s.nights * 86_400_000;
        const ny = s.startDate <= NY_NIGHTS[1] && end > new Date(NY_NIGHTS[0]).getTime();
        if (ny) {
          expect(b.hospital.perinatal).toBe(true);
          expect(b.hospital.minutes).toBeLessThanOrEqual(DEFAULT_RULES.hospital_minutes);
          expect(b.slug).not.toBe("hakone");
        }
        for (let i = 1; i < c.stays.length; i++) expect(c.stays[i].place).not.toBe(c.stays[i - 1].place);
      }
      const last = c.stays[c.stays.length - 1];
      expect(ix.bases.get(last.place)!.to_hnd_minutes!).toBeLessThanOrEqual(90);
      const d = c.stays.find((s) => s.startDate === "2027-01-05")!;
      expect(ix.bases.get(d.place)!.to_hnd_minutes!).toBeLessThanOrEqual(150);
      expect(validate({ stays: c.stays, legs: c.legs, placements: [], coverage: {}, deadlines: [] }, fixtureCatalog, fixtureTravellers, DEFAULT_RULES, { today: input.today })).toEqual([]);
    }
  });
  it("includes a domestic flight home on 5 Jan and a Nikko-then-Tokyo ending", () => {
    expect(cands.some((c) => c.legs.some((l) => l.leg.flags.includes("flight")))).toBe(true);
    expect(cands.some((c) => c.stays.some((s) => s.place === "nikko") && c.stays[c.stays.length - 1].place === "tokyo")).toBe(true);
  });
  it("forces the Réveillon base when nyChoice is set", () => {
    const forced = enumerateCandidates(ix, { rules: DEFAULT_RULES, wishes: wm, nyChoice: "kanazawa" });
    expect(forced.length).toBeGreaterThan(0);
    for (const c of forced) {
      const ny = c.stays.find((s) => s.startDate <= "2026-12-31" && new Date(s.startDate).getTime() + s.nights * 86_400_000 > new Date("2026-12-31").getTime())!;
      expect(ny.place).toBe("kanazawa");
    }
  });
  it("picks at most two day trips per block, by demand", () => {
    for (const c of cands) for (const s of c.stays) expect(s.daytrips.length).toBeLessThanOrEqual(2);
    expect([...daytripsFor(ix, "kyoto", wm)].sort()).toEqual(["nara", "osaka"]);
    expect(daytripsFor(ix, "tokyo", wm)).toContain("hakone");
  });
});

describe("fill", () => {
  const cands = enumerateCandidates(ix, { rules: DEFAULT_RULES, wishes: wm });
  it("never repeats a card, keeps ≤2 anchors and ≤2 fillers a day and one place per day", () => {
    for (const c of cands.slice(0, 40)) {
      const placements = fill({ ix, stays: c.stays, legs: c.legs, travellers: fixtureTravellers, wishes: wm, facts: fixtureFacts, rules: DEFAULT_RULES, today: input.today });
      expect(new Set(placements.map((p) => p.card_id)).size).toBe(placements.length);
      const byDate = new Map<string, typeof placements>();
      for (const p of placements) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
      for (const [, ps] of byDate) {
        const main = ps.filter((p) => !isParallel(p, placements));
        expect(main.filter((p) => ix.cards.get(p.card_id)!.anchor).length).toBeLessThanOrEqual(2);
        expect(main.filter((p) => !ix.cards.get(p.card_id)!.anchor).length).toBeLessThanOrEqual(2);
        const places = new Set(ps.map((p) => ix.cards.get(p.card_id)!.place_slug).filter(Boolean));
        expect(places.size).toBeLessThanOrEqual(1);
      }
    }
  });
  it("keeps her off bump ≤2 cards and gives split cards a parallel card for her", () => {
    for (const c of cands.slice(0, 40)) {
      const placements = fill({ ix, stays: c.stays, legs: c.legs, travellers: fixtureTravellers, wishes: wm, facts: fixtureFacts, rules: DEFAULT_RULES, today: input.today });
      for (const p of placements) {
        const card = ix.cards.get(p.card_id)!;
        if (p.who.includes(her.id)) expect(card.bump_ok).toBeGreaterThanOrEqual(3);
        if (card.split_group && wm.get(her.id)?.get(card.id) !== "no") {
          expect(p.parallel_card_id).toBeDefined();
          const par = placements.find((q) => q.card_id === p.parallel_card_id && q.date === p.date)!;
          expect(par.who).toEqual([her.id]);
          expect(ix.cards.get(par.card_id)!.bump_ok).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
  it("places every feasible must and leaves rest days after long legs light", () => {
    const c = cands.find((x) => x.id === "A4-B8-C4-D4:tokyo>kanazawa>osaka>hakone")!;
    const placements = fill({ ix, stays: c.stays, legs: c.legs, travellers: fixtureTravellers, wishes: wm, facts: fixtureFacts, rules: DEFAULT_RULES, today: input.today });
    const ids = new Set(placements.map((p) => p.card_id));
    for (const id of ["TK-01", "KZ-01", "KZ-02", "KZ-05", "OS-01", "HK-02", "TK-03"]) expect(ids.has(id)).toBe(true);
    const shapes = dayShapes(c.stays, c.legs, DEFAULT_RULES);
    expect(shapes.find((d) => d.date === "2026-12-25")!.light).toBe(true); // after tokyo>kanazawa 3 h
    expect(shapes.find((d) => d.date === "2027-01-09")).toBeUndefined();
    expect(placements.filter((p) => p.date === "2026-12-25").length).toBeLessThanOrEqual(1);
  });
  it("honours a card deadline that already passed", () => {
    const c = cands.find((x) => x.stays.some((s) => s.place === "tokyo" && s.startDate === "2027-01-05"))!;
    const late = fill({ ix, stays: c.stays, legs: c.legs, travellers: fixtureTravellers, wishes: wm, facts: fixtureFacts, rules: DEFAULT_RULES, today: "2026-12-20" });
    expect(late.some((p) => p.card_id === "TK-09")).toBe(false);
  });
});

describe("score", () => {
  it("jaccard", () => {
    expect(jaccard(["a", "b"], ["a", "b"])).toBe(1);
    expect(jaccard(["tokyo", "kyoto", "kanazawa"], ["tokyo", "kyoto", "osaka"])).toBe(0.5);
    expect(jaccard(["tokyo", "kyoto"], ["tokyo", "osaka", "hakone"])).toBeCloseTo(0.25);
  });
  it("halves the score when one person gets far less than another", () => {
    const stays = [{ place: "tokyo", startDate: TRIP_START, nights: 20, via: [], daytrips: [] }];
    const wishes: Wish[] = [
      { traveller_id: "pedro", card_id: "TK-01", answer: "like" },
      { traveller_id: "pedro", card_id: "TK-05", answer: "like" },
      { traveller_id: "pedro", card_id: "TK-11", answer: "like" },
      { traveller_id: "bro", card_id: "TK-01", answer: "like" },
    ];
    const placements = ["TK-01", "TK-05", "TK-11"].map((card_id, i) => ({ date: `2026-12-2${i + 1}`, card_id, who: ["pedro", "bro"], split_group: false }));
    const unfair = scoreDraft({ stays, legs: [], placements }, fixtureCatalog, fixtureTravellers, wishMap(wishes));
    expect(unfair.fairness).toBe(0.5);
    const fair = scoreDraft({ stays, legs: [], placements }, fixtureCatalog, fixtureTravellers, wishMap([...wishes, { traveller_id: "bro", card_id: "TK-05", answer: "like" }]));
    expect(fair.product).toBeGreaterThan(unfair.product);
  });
  it("penalises a strong no, tier-2 lodging, overspend and long-distance legs", () => {
    const base = { stays: [{ place: "tokyo", startDate: TRIP_START, nights: 20, via: [], daytrips: [] }], legs: [], placements: [{ date: "2026-12-21", card_id: "TK-07", who: ["pedro"], split_group: false }] };
    const s = scoreDraft(base, fixtureCatalog, fixtureTravellers, wm);
    expect(s.persons.bro).toBeCloseTo(0.1); // 1 − 3 floored
    expect(s.bookability).toBe(1);
    const tier2 = scoreDraft({ ...base, stays: [{ ...base.stays[0], place: "kamakura" }] }, fixtureCatalog, fixtureTravellers, wm);
    expect(tier2.bookability).toBe(0.8);
    const pricey = scoreDraft({ ...base, stays: [{ ...base.stays[0], place: "kinosaki" }, { place: "tokyo", startDate: "2027-01-09", nights: 0, via: [], daytrips: [] }], legs: [{ date: "2027-01-09", from: "kinosaki", to: "tokyo", leg: { from: "kinosaki", to: "tokyo", mode: "x", hours_d2d: 1, transfers: 0, bump: 5, yen_pp: 400_000, flags: ["LD"] } }] }, fixtureCatalog, fixtureTravellers, wm);
    expect(pricey.budget).toBeLessThan(1);
    expect(pricey.transit).toBeCloseTo(0.9);
  });
  it("names the axis", () => {
    const d = (places: string[], rest: number, snow: string[]) => ({
      stays: places.map((place, i) => ({ place, startDate: TRIP_START, nights: i ? 5 : 5, via: [], daytrips: [] })),
      placements: snow.map((card_id, i) => ({ date: `2026-12-2${i + 1}`, card_id, who: ["bro"], split_group: false })),
      numbers: { nights_per_base: [], rest_days: rest, longest_leg_hours: 0, heaviest_walk_km: 0, cost_per_couple_jpy: 0, ny_base: "", ny_hospital_minutes: 0 },
    });
    expect(nameAxis(d(["tokyo", "kanazawa"], 0, ["KZ-01", "KZ-05", "YD-01"]), ix)).toBe("neve");
    expect(nameAxis(d(["tokyo", "kyoto", "hiroshima"], 0, []), ix)).toBe("sul");
    expect(nameAxis(d(["tokyo", "kyoto"], 3, []), ix)).toBe("lenta");
    expect(nameAxis(d(["tokyo", "kyoto", "osaka", "hakone"], 3, []), ix)).toBe("cultura");
  });
  it("pickDiverse prefers different base sets and axes, then relaxes", () => {
    const mk = (id: string, bases: string[], axis: Draft["name_axis"], score: number): Draft => ({
      id,
      name_axis: axis,
      stays: bases.map((place) => ({ place, startDate: TRIP_START, nights: 5, via: [], daytrips: [] })),
      legs: [],
      placements: [],
      coverage: {},
      numbers: { nights_per_base: [], rest_days: 0, longest_leg_hours: 0, heaviest_walk_km: 0, cost_per_couple_jpy: 0, ny_base: "", ny_hospital_minutes: 0 },
      deadlines: [],
      violations: [],
      score,
    });
    const sorted = [mk("1", ["tokyo", "kyoto", "kanazawa"], "neve", 10), mk("2", ["tokyo", "kyoto", "kanazawa", "osaka"], "cultura", 9), mk("3", ["tokyo", "hiroshima", "fukuoka"], "sul", 8), mk("4", ["tokyo", "hakone"], "lenta", 7)];
    expect(pickDiverse(sorted).map((d) => d.id)).toEqual(["1", "3", "4"]);
    expect(pickDiverse(sorted.slice(0, 2)).map((d) => d.id)).toEqual(["1", "2"]);
    expect(pickDiverse([sorted[0], mk("5", ["tokyo", "kyoto", "osaka"], "neve", 5), sorted[2]]).map((d) => d.id)).toEqual(["1", "3", "5"]);
  });
});

describe("buildRoutes", () => {
  const drafts = buildRoutes(input);
  it("returns 2–3 validated, diverse drafts on the good fixture", () => {
    expect(drafts.length).toBeGreaterThanOrEqual(2);
    expect(drafts.length).toBeLessThanOrEqual(3);
    for (const d of drafts) {
      expect(d.violations).toEqual([]);
      expect(d.stays.reduce((a, s) => a + s.nights, 0)).toBe(TRIP_NIGHTS);
      expect(d.score).toBeGreaterThan(0);
      expect(d.numbers.ny_base).not.toBe("");
      expect(d.numbers.ny_hospital_minutes).toBeLessThanOrEqual(DEFAULT_RULES.hospital_minutes);
      for (const t of fixtureTravellers) {
        const cov = d.coverage[t.id];
        expect(cov.must.filter((m) => m.hit).length).toBeGreaterThanOrEqual(2);
      }
    }
    const sets = drafts.map(chosenBases);
    expect(jaccard(sets[0], sets[1])).toBeLessThan(0.5);
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) expect(jaccard(sets[i], sets[j])).toBeLessThan(1);
    expect(new Set(drafts.map((d) => d.name_axis)).size).toBe(drafts.length);
  });
  it("is deterministic", () => {
    const again = buildRoutes(input);
    expect(again.map((d) => d.id)).toEqual(drafts.map((d) => d.id));
    expect(again[0].placements).toEqual(drafts[0].placements);
  });
  it("lists deadlines from placed cards, sorted", () => {
    const withDl = drafts.find((d) => d.deadlines.length);
    expect(withDl).toBeDefined();
    const dates = withDl!.deadlines.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
    for (const d of withDl!.deadlines) expect(d.card_id).toBeDefined();
  });
  it("honours nyChoice and falls back to best-with-violations when nothing passes", () => {
    const forced = buildRoutes({ ...input, nyChoice: "kanazawa" });
    expect(forced.length).toBeGreaterThan(0);
    for (const d of forced) expect(d.numbers.ny_base).toBe("kanazawa");
    const impossible = buildRoutes({ ...input, wishes: [...fixtureWishes, { traveller_id: "pai", card_id: "KN-01", answer: "must" }, { traveller_id: "pai", card_id: "FK-01", answer: "must" }], facts: fixtureFacts });
    // pai now needs 2 of {KN-01, FK-01, KZ-02, HK-01, KY-03}: still feasible, so routes stay clean…
    expect(impossible.every((d) => d.violations.length === 0)).toBe(true);
    const hopeless = buildRoutes({ ...input, rules: { ...DEFAULT_RULES, hospital_minutes: 5 } });
    expect(hopeless.length).toBe(0); // no base qualifies → no candidates
    const tight = buildRoutes({ ...input, wishes: fixtureWishes.map((w) => (w.traveller_id === "cunhada" && w.answer === "must" ? { ...w, card_id: w.card_id === "KZ-05" ? "YD-02" : w.card_id === "KW-01" ? "FK-03" : "KN-01" } : w)) });
    expect(tight.length).toBeGreaterThan(0);
    expect(tight.every((d) => d.violations.some((v) => v.code === "must-uncovered" && v.who === "cunhada"))).toBe(true);
  });
  it("explainDraft gives every person a ganha / abre mão de line, deterministically", () => {
    const text = explainDraft(drafts[0], fixtureCatalog, fixtureTravellers, wm);
    for (const t of fixtureTravellers) expect(text).toMatch(new RegExp(`^${t.name} ganha: .+; abre mão de: .+\\.$`, "m"));
    expect(text).toMatch(/Réveillon em /);
    expect(explainDraft(drafts[0], fixtureCatalog, fixtureTravellers, wm)).toBe(text);
  });
  it("coverage counts hits only when the person goes", () => {
    const cov = coverageFor([{ date: "2026-12-21", card_id: "TK-01", who: ["pedro"], split_group: false }], fixtureTravellers, wm);
    expect(cov.her.must.find((m) => m.card_id === "TK-01")?.hit).toBe(false);
    expect(cov.her.like).toBe(0);
  });
  it("draftFromCandidate wires placements, numbers and violations", () => {
    const c = enumerateCandidates(ix, { rules: DEFAULT_RULES, wishes: wm })[0];
    const d = draftFromCandidate(c, input, ix, wm);
    expect(d.placements.length).toBeGreaterThan(5);
    expect(d.numbers.nights_per_base.reduce((a, n) => a + n.nights, 0)).toBe(TRIP_NIGHTS);
    expect(d.numbers.longest_leg_hours).toBeGreaterThan(0);
    expect(d.numbers.cost_per_couple_jpy).toBeGreaterThan(0);
  });
  it("builds 60+ cards × 14 bases in under 2 s", () => {
    const t0 = performance.now();
    buildRoutes(input);
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(fixtureCatalog.cards.length).toBeGreaterThanOrEqual(60);
    expect(fixtureCatalog.bases.length).toBeGreaterThanOrEqual(12);
  });
});
