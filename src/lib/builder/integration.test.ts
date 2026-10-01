/**
 * Runs the builder on the real catalog in data/ once the research agent has
 * filled it; skips while the files are still `[]` placeholders.
 */
import { describe, expect, it } from "vitest";
import { deckCards, loadCatalog } from "../catalog";
import { buildRoutes, explainDraft } from "./index";
import { fixtureFacts, fixtureTravellers } from "./fixtures/family";
import { DEFAULT_RULES, type Wish } from "./types";

const catalog = loadCatalog();
const ready = catalog.cards.length > 0 && catalog.bases.length > 0 && catalog.transit.length > 0;

describe.skipIf(!ready)("buildRoutes on data/*.json", () => {
  it("returns at least two routes from spread-out wishes, failing only on musts no single route can reach", () => {
    // Deterministic wishes over the 36-card deck the family actually answers: each traveller likes a slice and musts the three most unique, suitable cards of it.
    const cards = [...deckCards(catalog)].sort((a, b) => a.id.localeCompare(b.id));
    const wishes: Wish[] = [];
    fixtureTravellers.forEach((t, i) => {
      const mine = cards.filter((_, k) => k % fixtureTravellers.length === i && (t.who !== "her" || cards[k].bump_ok >= 3));
      const musts = [...mine].sort((a, b) => b.uniqueness - a.uniqueness || a.id.localeCompare(b.id)).slice(0, 3);
      for (const c of mine) wishes.push({ traveller_id: t.id, card_id: c.id, answer: musts.includes(c) ? "must" : "like" });
    });
    const drafts = buildRoutes({ catalog, travellers: fixtureTravellers, wishes, facts: fixtureFacts, rules: DEFAULT_RULES, today: "2026-10-01" });
    expect(drafts.length).toBeGreaterThanOrEqual(2);
    for (const d of drafts) {
      // Musts picked by uniqueness alone land in Kyushu, Nagano and Tōhoku at once; no 20-night route reaches them all.
      expect(d.violations.map((v) => v.code).filter((c) => c !== "must-uncovered")).toEqual([]);
      expect(d.stays.reduce((a, s) => a + s.nights, 0)).toBe(20);
      expect(d.placements.length).toBeGreaterThan(8);
      expect(explainDraft(d, catalog, fixtureTravellers)).toContain("ganha:");
    }
    expect(new Set(drafts.map((d) => d.stays.map((s) => s.place).join(">"))).size).toBe(drafts.length);
  });
});
