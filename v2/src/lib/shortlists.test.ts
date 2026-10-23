import { describe, expect, it } from "vitest";
import { fileSnapshot } from "./data/loader";
import { stopKeys } from "./merge";
import { shortlistFor } from "./shortlists";

const snap = fileSnapshot();
const plan = snap.versions.find((v) => v.status === "plan")!;

describe("places to stay", () => {
  it("every stop of our route has a shortlist with places we can book", () => {
    for (const k of stopKeys(plan.stays)) {
      const list = shortlistFor(k);
      expect(list, k).not.toBeNull();
      expect(list!.candidates.length, k).toBeGreaterThanOrEqual(5);
      expect(list!.enquiry.en, k).toContain("[PLACE]");
      expect(list!.enquiry.ja.length, k).toBeGreaterThan(50);
      const ids = new Set<string>();
      for (const p of list!.candidates) {
        expect(ids.has(p.id), `${k} ${p.id} twice`).toBe(false);
        ids.add(p.id);
        expect(["budget", "mid", "splurge"], `${k} ${p.id}`).toContain(p.tier);
        expect(p.book.length, `${k} ${p.id}`).toBeGreaterThan(0);
        for (const l of p.book) expect(l.url, `${k} ${p.id}`).toMatch(/^https:\/\//);
      }
    }
  });
});
