import { describe, expect, it } from "vitest";
import { bundledPlanDays, tripData } from "./data/file";
import { planDays } from "./days";
import { relayout } from "./versions";
import type { Version } from "./types";

const data = tripData();
const snap = { ...data, days: bundledPlanDays() };
const plan = data.versions.find((v) => v.id === "plan")!;
const NEW_YEAR = (d: string) => d >= "2026-12-29" && d <= "2027-01-03";

describe("the days follow the route", () => {
  it("the plan keeps its own written days, date for date", () => {
    const days = planDays(plan, snap);
    expect(days).toHaveLength(21);
    for (const d of days) expect(d.source, d.date).toBe("written");
    expect(days.map((d) => d.title)).toEqual(snap.days.map((d) => d.title));
  });

  it("every seeded route fills all 21 days, with nothing that needs an open museum over New Year", () => {
    const places = new Map(data.places.map((p) => [p.id, p]));
    for (const v of data.versions) {
      const days = planDays(v, snap);
      expect(days, v.id).toHaveLength(21);
      expect(days.filter((d) => d.source === "plain").map((d) => d.date), v.id).toEqual([]);
      for (const d of days.filter((x) => x.source === "plans")) {
        for (const it of d.items) {
          const p = it.place_id ? places.get(it.place_id) : undefined;
          const shut = p?.closures?.some((c) => d.date >= c.start && d.date <= c.end) || p?.closed_weekdays?.includes(new Date(d.date + "T00:00:00Z").toUTCString().slice(0, 3));
          expect(shut ? `${v.id} ${d.date} ${p!.id}` : null).toBeNull();
        }
      }
    }
  });

  it("a copy of a researched route keeps its days until a stop changes", () => {
    const snow = data.versions.find((v) => v.id === "deep-snow-country")!;
    const copy: Version = { ...snow, id: "copy", status: "personal", owner: "pedro", parent_version_id: snow.id };
    const before = planDays(copy, snap);
    expect(before.map((d) => d.title)).toEqual(planDays(snow, snap).map((d) => d.title));
    // One more night in Nagano, one fewer in Kanazawa: Takayama and Okuhida shift a day.
    const stays = copy.stays.map((s) => ({ ...s, nights: s.region === "nagano" ? s.nights + 1 : s.region === "kanazawa" ? s.nights - 1 : s.nights }));
    const after = planDays({ ...copy, stays: relayout(stays, data.trip.start) }, snap);
    expect(after).toHaveLength(21);
    expect(after.filter((d) => d.source === "plain")).toEqual([]);
    // Tokyo at the start is unchanged, so its days are as written.
    expect(after.slice(0, 3).map((d) => d.title)).toEqual(before.slice(0, 3).map((d) => d.title));
  });

  it("a changed plan swaps in day plans that suit the new dates", () => {
    // Kyoto a night longer, the lake a night shorter.
    const stays = plan.stays.map((s) => ({ ...s, nights: s.region === "kyoto" ? s.nights + 1 : s.region === "kawaguchiko" ? s.nights - 1 : s.nights }));
    const days = planDays({ ...plan, stays: relayout(stays, data.trip.start) }, snap);
    expect(days.filter((d) => d.source === "plain")).toEqual([]);
    expect(days.find((d) => d.date === "2027-01-05")?.region).toBe("kyoto");
    expect(new Set(days.map((d) => d.title)).size).toBe(21);
    expect(days.filter((d) => NEW_YEAR(d.date) && d.kind === "Day trip" && d.region !== "kyoto")).toEqual([]);
  });
});
