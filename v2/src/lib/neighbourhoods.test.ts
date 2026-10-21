import { describe, expect, it } from "vitest";
import { fileSnapshot } from "./data/loader";
import { stopKeys } from "./merge";
import { areaLinks, areasFor, pickOf } from "./neighbourhoods";

const snap = fileSnapshot();

describe("which part of town", () => {
  it("every stop of our route and its ready-made changes has a pick, with places to search", () => {
    for (const v of snap.versions.filter((x) => x.status === "plan" || x.status === "alternative"))
      stopKeys(v.stays).forEach((k, i) => {
        const w = areasFor(k);
        expect(w, `${v.id} ${k}`).not.toBeNull();
        const pick = pickOf(w!)!;
        expect(pick.id, `${v.id} ${k}`).toBe(w!.pick);
        expect(pick.lat).toBeGreaterThan(30);
        expect(pick.lng).toBeGreaterThan(130);
        expect(areaLinks(pick, v.stays[i]).map((l) => l.label)).toContain("On the map");
      });
  });

  it("the two Tokyo stays get their own advice", () => {
    expect(areasFor("tokyo")?.pick).not.toBe(areasFor("tokyo:2")?.pick);
  });

  it("Kyoto's pick keeps a taxi to the door on New Year's Eve", () => {
    expect(areasFor("kyoto")?.pick).not.toBe("higashiyama");
  });
});
