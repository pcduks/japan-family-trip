import { describe, expect, it } from "vitest";
import { deckCards, legBetween, loadCatalog } from "./index";

const catalog = loadCatalog();
const { cards, bases, transit } = catalog;
const slugs = new Set(bases.map((b) => b.slug));
const WINDOW_FROM = "2026-12-20";
const WINDOW_TO = "2027-01-09";
const NY_DATES = ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03", "2027-01-04", "2027-01-05"];
const GROUPS = ["noite-tranquila", "dia-de-rua", "natureza", "comida", "reveillon", "neve"] as const;
const inWindow = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= WINDOW_FROM && d <= WINDOW_TO;

describe("experience cards", () => {
  it("has cards and no duplicate ids", () => {
    expect(cards.length).toBeGreaterThan(100);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
  });

  it("excludes Hokkaido", () => {
    expect(cards.filter((c) => c.id.startsWith("HK-"))).toHaveLength(0);
    expect(slugs.has("sapporo")).toBe(false);
  });

  it("every card has at least one existing base", () => {
    for (const c of cards) {
      expect(c.bases.length, c.id).toBeGreaterThan(0);
      for (const b of c.bases) expect(slugs.has(b), `${c.id} base ${b}`).toBe(true);
    }
  });

  it("validity dates sit inside the trip window", () => {
    for (const c of cards) {
      const { from, to, only, closed, weekdays } = c.valid;
      if (from) expect(inWindow(from), `${c.id} from`).toBe(true);
      if (to) expect(inWindow(to), `${c.id} to`).toBe(true);
      if (from && to) expect(from <= to, `${c.id} from<=to`).toBe(true);
      for (const d of [...(only ?? []), ...(closed ?? [])]) expect(inWindow(d), `${c.id} ${d}`).toBe(true);
      for (const w of weekdays ?? []) expect(w >= 0 && w <= 6, `${c.id} weekday`).toBe(true);
    }
  });

  it("ny_status covers all nine dates with known values", () => {
    const allowed = new Set(["open", "reduced", "closed", "event", "unknown"]);
    for (const c of cards) {
      expect(Object.keys(c.ny_status).sort(), c.id).toEqual(NY_DATES);
      for (const d of NY_DATES) expect(allowed.has(c.ny_status[d]), `${c.id} ${d}`).toBe(true);
    }
  });

  it("ratings are in range and confidence is set", () => {
    for (const c of cards) {
      expect([1, 2, 3, 4, 5], `${c.id} bump`).toContain(c.bump_ok);
      if (c.bump_ok_alt !== undefined) expect([1, 2, 3, 4, 5], `${c.id} bump_alt`).toContain(c.bump_ok_alt);
      expect([1, 2, 3, 4, 5], `${c.id} effort`).toContain(c.effort);
      expect([1, 2, 3, 4, 5], `${c.id} uniqueness`).toContain(c.uniqueness);
      expect(["A", "B", "C"], `${c.id} confidence`).toContain(c.confidence);
      expect(["in", "out", "mixed"], `${c.id} indoor`).toContain(c.indoor);
      expect(c.hours === "overnight" || (typeof c.hours === "number" && c.hours > 0), `${c.id} hours`).toBe(true);
      expect(c.promise_pt.length, `${c.id} promise`).toBeLessThanOrEqual(90);
      expect(c.promise_pt.length, `${c.id} promise`).toBeGreaterThan(0);
      expect(c.verified_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("anchor follows the ≥3 h / uniqueness ≥4 rule", () => {
    for (const c of cards) {
      const expected = c.hours === "overnight" || c.hours >= 3 || c.uniqueness >= 4;
      expect(c.anchor, c.id).toBe(expected);
    }
  });

  it("research cuts are tagged", () => {
    for (const id of ["KS-10", "KY-08", "KY-11", "KS-12", "NW-NII-05", "NW-FUJ-12", "NW-KUS-07", "NW-KAN-11", "NW-TOH-04"]) {
      const c = cards.find((x) => x.id === id);
      expect(c, id).toBeDefined();
      expect(c?.tags, id).toContain("cut");
    }
  });
});

describe("deck", () => {
  it("has exactly 36 cards, 6 per group, unique order per group", () => {
    const deck = deckCards(catalog);
    expect(deck).toHaveLength(36);
    for (const g of GROUPS) {
      const inGroup = deck.filter((c) => c.deck_group === g);
      expect(inGroup, g).toHaveLength(6);
      const orders = inGroup.map((c) => c.deck_order).sort();
      expect(orders, g).toEqual([1, 2, 3, 4, 5, 6]);
    }
    for (const c of deck) expect(c.tags, c.id).not.toContain("cut");
  });
});

describe("bases", () => {
  it("have unique slugs, coordinates, hospitals and tiers", () => {
    expect(new Set(bases.map((b) => b.slug)).size).toBe(bases.length);
    for (const b of bases) {
      expect(b.lat, b.slug).toBeGreaterThan(24);
      expect(b.lat, b.slug).toBeLessThan(46);
      expect(b.lng, b.slug).toBeGreaterThan(123);
      expect(b.lng, b.slug).toBeLessThan(146);
      expect(b.hospital.name.length, b.slug).toBeGreaterThan(0);
      expect(b.hospital.minutes, b.slug).toBeGreaterThan(0);
      expect([1, 2, 3], b.slug).toContain(b.lodging_tier);
      if (b.ny_tier) expect([1, 2, 3], b.slug).toContain(b.ny_tier);
      expect(b.cost_night_6[0], b.slug).toBeLessThanOrEqual(b.cost_night_6[1]);
    }
  });

  it("includes the required base list", () => {
    const required = "tokyo hakone kawaguchiko nikko kamakura kusatsu karuizawa matsumoto nagano yudanaka nozawa hakuba takayama shirakawago kanazawa kinosaki kyoto osaka nara koyasan himeji hiroshima miyajima naoshima okayama kurashiki fukuoka yufuin beppu kurokawa nagasaki kumamoto sendai matsushima zao ginzan".split(" ");
    for (const s of required) expect(slugs.has(s), s).toBe(true);
    expect(bases.find((b) => b.slug === "kinosaki")?.hospital.perinatal).toBe(true);
  });
});

describe("transit", () => {
  it("legs reference existing bases, once per pair, with valid ratings", () => {
    const seen = new Set<string>();
    for (const l of transit) {
      expect(slugs.has(l.from), `${l.from}`).toBe(true);
      expect(slugs.has(l.to), `${l.to}`).toBe(true);
      expect(l.from).not.toBe(l.to);
      const key = [l.from, l.to].sort().join("|");
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      expect([1, 2, 3, 4, 5]).toContain(l.bump);
      expect(l.hours_d2d).toBeGreaterThan(0);
      if (l.hours_d2d > 4 && !l.no_route) expect(l.flags, key).toContain("LD");
    }
  });

  it("is symmetric through legBetween and marks never-pairs", () => {
    expect(legBetween(catalog, "kyoto", "tokyo")?.mode).toContain("Nozomi");
    expect(legBetween(catalog, "tokyo", "hakone")?.flags).toContain("ekiden");
    expect(legBetween(catalog, "kinosaki", "koyasan")?.no_route).toBe(true);
    expect(legBetween(catalog, "fukuoka", "tokyo")?.flags).toContain("flight");
  });
});
