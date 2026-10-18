import { describe, expect, it } from "vitest";
import { fileSnapshot } from "./data/loader";
import { planDays } from "./days";
import { dayOutsOf, fitOf } from "./fit";
import { swapInRegion } from "./versions";

const snap = fileSnapshot();
const plan = snap.versions.find((v) => v.status === "plan")!;
const outs = dayOutsOf(planDays(plan, snap), new Map(snap.places.map((p) => [p.id, p.region])));
const fit = (id: string) => fitOf(id, plan.stays, snap.regions, outs);

describe("how a place fits the route, worked out", () => {
  it("stops and planned days out are on the route", () => {
    expect(fit("kanazawa").fit).toBe("route");
    expect(fit("kanazawa").line).toMatch(/^Stop 3 · 3 nights/);
    expect(fit("shirakawago")).toMatchObject({ fit: "route", line: "A day out from Kanazawa, Mon 28 Dec" });
  });

  it("a checked journey beats a distance estimate", () => {
    // By distance Takayama looks two hours from Yudanaka; the checked bus from Kanazawa is two and a half.
    expect(fit("takayama")).toMatchObject({ fit: "change", near: "kanazawa", hours: 2.5, checked: true });
    expect(fit("osaka")).toMatchObject({ fit: "daytrip", near: "kyoto", hours: 0.5 });
  });

  it("islands and the far north are another trip", () => {
    for (const id of ["okinawa", "hokkaido", "kyushu"]) expect(fit(id).fit, id).toBe("elsewhere");
  });

  it("follows the route: drop Kanazawa and it is no longer a stop", () => {
    const stays = plan.stays.map((s) => (s.region === "kanazawa" ? { ...s, region: "takayama" } : s));
    expect(fitOf("kanazawa", stays, snap.regions, new Map()).fit).not.toBe("route");
    expect(fitOf("takayama", stays, snap.regions, new Map()).fit).toBe("route");
  });
});

describe("what it would take to bring a place in", () => {
  it("adds two nights where they cost the least travel and keeps New Year's Eve where it is", () => {
    const koyasan = snap.regions.find((r) => r.id === "koyasan")!;
    const { version, how } = swapInRegion(plan, koyasan, snap.versions, "father", snap.trip.start, snap.regions);
    const ids = version.stays.map((s) => s.region);
    const at = ids.indexOf("koyasan");
    expect(at).toBeGreaterThan(0);
    expect([ids[at - 1], ids[at + 1]]).toContain("kyoto");
    expect(version.stays.reduce((a, s) => a + s.nights, 0)).toBe(20);
    const nye = version.stays.find((s) => s.from <= "2026-12-31" && s.to > "2026-12-31");
    expect(nye?.region).toBe("kyoto");
    expect(how).toMatch(/Added 2 nights in Koya/);
  });

  it("follows the research when it names the stop to swap", () => {
    const kinosaki = snap.regions.find((r) => r.id === "kinosaki")!;
    const ids = swapInRegion(plan, kinosaki, snap.versions, "father", snap.trip.start, snap.regions).version.stays.map((s) => s.region);
    expect(ids).toContain("kinosaki");
    expect(ids).not.toContain("kawaguchiko");
  });

  it("uses a ready-made change when one already has the place", () => {
    const takayama = snap.regions.find((r) => r.id === "takayama")!;
    expect(swapInRegion(plan, takayama, snap.versions, "father", snap.trip.start, snap.regions).version.stays.map((s) => s.region)).toContain("takayama");
  });
});
