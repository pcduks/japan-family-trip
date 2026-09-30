import { describe, expect, it } from "vitest";
import {
  addMonths,
  inferLegMode,
  planBudget,
  planDays,
  planFromRoute,
  planLegs,
  planToRoute,
  planWarnings,
  railReminders,
  staysNeedingLodging,
  upcoming,
  deadlineReminders,
  type Activity,
  type Booking,
  type Plan,
} from "./plan";
import { bundledTrip, placeMap } from "./trip";

const trip = bundledTrip();
const P = placeMap(trip);
const route = (c: string) => trip.routes.find((r) => r.code === c)!;
const plan = (c: string): Plan => ({ id: "p-" + c, ...planFromRoute(route(c)) });

const booking = (over: Partial<Booking>): Booking => ({
  id: "b" + Math.random(),
  plan_id: "p-A",
  stay_id: null,
  kind: "lodging",
  name: "x",
  url: null,
  price_jpy: null,
  people: 6,
  date: null,
  cancel_by: null,
  status: "idea",
  confirmation: null,
  address: null,
  address_ja: null,
  phone: null,
  notes: null,
  ...over,
});

describe("plans", () => {
  it("round-trips a candidate route with continuous dates", () => {
    const r = planToRoute(plan("A"));
    expect(r.stays.map((s) => s.startDate)).toEqual(route("A").stays.map((s) => s.startDate));
  });

  it("recomputes dates when stays are reordered or resized", () => {
    const p = plan("A");
    p.stays[0].nights = 3;
    p.stays[1].nights = 3;
    const r = planToRoute(p);
    expect(r.stays[1].startDate).toBe("2026-12-23");
    expect(r.stays[2].startDate).toBe("2026-12-26");
  });

  it("infers leg modes", () => {
    expect(inferLegMode("Fuji Excursion, ~2 h; pick up van 25 Dec")).toBe("train");
    expect(inferLegMode("Drive ~3 h")).toBe("drive");
    expect(inferLegMode("Nohi bus with 2–3 h stop in Shirakawa-go")).toBe("bus");
    expect(inferLegMode("Shinkansen + ferry, ~2 h (peak day)")).toBe("train");
    expect(inferLegMode("~15 min")).toBeNull();
  });
});

describe("rules engine", () => {
  it("passes a clean 20-night plan apart from peak moves", () => {
    const w = planWarnings(plan("A"), P);
    expect(w.some((x) => x.level === "error")).toBe(false);
    const peaks = w.filter((x) => x.code === "peak-move");
    expect(peaks.map((x) => x.date)).toEqual(["2026-12-30", "2027-01-04"]);
    expect(w.some((x) => x.code === "long-leg" && x.date === "2026-12-26")).toBe(true);
  });

  it("errors when nights don't total 20", () => {
    const p = plan("B");
    p.stays[0].nights += 1;
    const w = planWarnings(p, P);
    expect(w[0]).toMatchObject({ level: "error", code: "nights" });
  });

  it("downgrades an overridden peak move to info", () => {
    const p = plan("A");
    const kyoto = p.stays.find((s) => s.place === "kyoto")!;
    kyoto.overridePeak = true;
    const w = planWarnings(p, P).find((x) => x.stayId === kyoto.id && x.code === "peak-move")!;
    expect(w.level).toBe("info");
  });

  it("flags stairs-heavy places and New Year closures", () => {
    const w = planWarnings(plan("A"), P, [
      { id: "a1", date: "2027-01-02", title: "Nishiki Market", place_slug: null } as Activity,
      { id: "a2", date: "2027-01-06", title: "Nishiki Market", place_slug: null } as Activity,
    ]);
    expect(w.some((x) => x.code === "stairs" && x.message.startsWith("Lake Kawaguchiko"))).toBe(true);
    expect(w.filter((x) => x.code === "closure").map((x) => x.activityId)).toEqual(["a1"]);
  });
});

describe("legs, reminders and bookings", () => {
  it("builds legs and rail reminders one month ahead", () => {
    const p = plan("A");
    const legs = planLegs(p);
    expect(legs).toHaveLength(6);
    const r = railReminders(p, [], P);
    const kyoto = r.find((x) => x.title.includes("Kyoto"))!;
    expect(kyoto.date).toBe("2026-11-30");
    expect(kyoto.detail).toMatch(/peak day/);
  });

  it("marks a rail reminder done once a transport booking is booked", () => {
    const p = plan("A");
    const stay = p.stays[4];
    const r = railReminders(p, [booking({ kind: "transport", stay_id: stay.id, status: "booked" })], P);
    expect(r.find((x) => x.stayId === stay.id)!.done).toBe(true);
  });

  it("handles month arithmetic", () => {
    expect(addMonths("2027-01-02", -1)).toBe("2026-12-02");
    expect(addMonths("2026-12-31", -1)).toBe("2026-11-30");
  });

  it("lists deadlines within 7 days (F9)", () => {
    const d = deadlineReminders([
      booking({ id: "soon", cancel_by: "2026-10-05" }),
      booking({ id: "later", cancel_by: "2026-10-20" }),
      booking({ id: "paid", cancel_by: "2026-10-03", status: "paid" }),
    ]);
    expect(upcoming(d, "2026-10-01", 7).map((x) => x.bookingId)).toEqual(["soon"]);
  });

  it("finds stays without held lodging", () => {
    const p = plan("C");
    const b = [booking({ stay_id: p.stays[0].id, status: "held" }), booking({ stay_id: p.stays[1].id, status: "idea" })];
    expect(staysNeedingLodging(p, b)).toHaveLength(p.stays.length - 1);
  });

  it("updates the budget from bookings", () => {
    const p = plan("A");
    const before = planBudget(p, []);
    const tokyo = p.stays[0];
    const after = planBudget(p, [booking({ stay_id: tokyo.id, status: "booked", price_jpy: 600_000, people: 6 })]);
    const lodge = (b: ReturnType<typeof planBudget>) => b.find((x) => x.category === "lodging")!;
    expect(lodge(after).booked).toBe(100_000);
    expect(lodge(after).projected).toBeCloseTo(100_000 + (16 * lodge(before).estimate) / 20);
  });

  it("lays out 21 days with moving days", () => {
    const days = planDays(plan("A"));
    expect(days).toHaveLength(21);
    expect(days[4].arriving?.place).toBe("kawaguchiko");
    expect(days[20].departure).toBe(true);
    expect(days[20].stay).toBeNull();
  });
});
