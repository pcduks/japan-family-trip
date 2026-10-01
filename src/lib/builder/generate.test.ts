import { describe, expect, it } from "vitest";
import type { Traveller } from "../types";
import { fixtureCatalog } from "./fixtures/catalog";
import { fixtureFacts, fixtureTravellers, fixtureWishes } from "./fixtures/family";
import { generatePlans, nyChoiceFor, whoFor } from "./generate";

const COUPLE: Record<string, string> = { pedro: "pedro", her: "pedro", parents: "pais", bros: "irmao" };
const travellers: Traveller[] = fixtureTravellers.map((t) => ({ id: t.id, name: t.name, role: t.who === "pedro" ? "planner" : "member", couple: COUPLE[t.who] }));
const profiles = fixtureTravellers.map((t) => ({ id: t.id, facts: { ...fixtureFacts[t.id] }, finished_at: "2026-10-01T00:00:00Z" }));

describe("whoFor", () => {
  it("maps couples to catalog roles: planner, partner, parents, siblings", () => {
    const who = Object.fromEntries(whoFor(travellers).map((t) => [t.id, t.who]));
    for (const t of fixtureTravellers) expect(who[t.id]).toBe(t.who);
  });
});

describe("nyChoiceFor", () => {
  it("takes the most-asked base and breaks ties toward her", () => {
    const [her] = fixtureTravellers.filter((t) => t.who === "her");
    const ps = profiles.map((p) => ({ ...p, facts: { ...p.facts, ny_choice: p.id === her.id ? "kanazawa" : "kyoto" } }));
    expect(nyChoiceFor(ps, fixtureTravellers)).toBe("kyoto");
    const pedro = fixtureTravellers.find((t) => t.who === "pedro")!;
    const tie = [
      { id: her.id, facts: { ny_choice: "kanazawa" }, finished_at: null },
      { id: pedro.id, facts: { ny_choice: "kyoto" }, finished_at: null },
    ];
    expect(nyChoiceFor(tie, fixtureTravellers)).toBe("kanazawa");
    expect(nyChoiceFor([], fixtureTravellers)).toBeUndefined();
  });
});

describe("generatePlans", () => {
  const bundles = generatePlans({ catalog: fixtureCatalog, travellers, wishes: fixtureWishes.map((w) => ({ id: `${w.traveller_id}:${w.card_id}`, ...w })), profiles, today: "2026-10-01" });
  it("returns up to three plans with 20 nights, generated facts, activities per placement and deadline bookings", () => {
    expect(bundles.length).toBeGreaterThan(0);
    expect(bundles.length).toBeLessThanOrEqual(3);
    for (const b of bundles) {
      expect(b.plan.source).toBe("generated");
      expect(b.plan.is_candidate).toBe(false);
      expect(b.plan.stays.reduce((a, s) => a + s.nights, 0)).toBe(20);
      expect(b.plan.stays[0].legNote).toBeNull();
      for (const s of b.plan.stays.slice(1)) expect(s.legHours).toBeGreaterThan(0);
      const g = b.plan.generated!;
      expect(g.pitch_pt.length).toBeGreaterThan(40);
      expect(g.numbers.ny_base_name).not.toBe("");
      expect(g.placements.every((p) => p.name_pt && !/^[A-Z]{2}-/.test(p.name_pt))).toBe(true);
      expect(b.activities.length).toBeGreaterThanOrEqual(g.placements.length);
      for (const a of b.activities) expect(a.plan_id).toBe(b.plan.id);
      expect(b.bookings.length).toBe(g.deadlines.length);
      for (const k of b.bookings) expect(k.status).toBe("idea");
      expect(b.narrative.people).toHaveLength(6);
      expect(Object.keys(g.per_person)).toHaveLength(6);
    }
  });
  it("gives plans distinct names", () => {
    expect(new Set(bundles.map((b) => b.plan.name)).size).toBe(bundles.length);
  });
});
