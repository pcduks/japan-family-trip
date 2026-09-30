import { describe, expect, it } from "vitest";
import { coupleBalances, parseMapsUrl, settleUp, type Expense } from "./family";

const e = (paid_by: string, amount_jpy: number, split_couples: string[] = []): Expense => ({
  id: String(Math.random()),
  paid_by,
  amount_jpy,
  description: "",
  date: null,
  split_couples,
  created_by: paid_by,
});

describe("contas", () => {
  const coupleOf = new Map([
    ["pedro", "P"],
    ["esposa", "P"],
    ["irmao", "I"],
    ["mae", "M"],
  ]);
  const couples = ["P", "I", "M"];

  it("splits equally between all couples by default", () => {
    const b = coupleBalances([e("pedro", 9000)], coupleOf, couples);
    expect(b.find((x) => x.couple === "P")!.balance).toBe(6000);
    expect(b.find((x) => x.couple === "I")!.balance).toBe(-3000);
    expect(settleUp(b)).toEqual([
      { from: "I", to: "P", amount: 3000 },
      { from: "M", to: "P", amount: 3000 },
    ]);
  });

  it("respects a split between some couples", () => {
    const b = coupleBalances([e("mae", 4000, ["M", "I"])], coupleOf, couples);
    expect(b.find((x) => x.couple === "P")!.balance).toBe(0);
    expect(settleUp(b)).toEqual([{ from: "I", to: "M", amount: 2000 }]);
  });

  it("nets out several expenses", () => {
    const b = coupleBalances([e("pedro", 6000), e("irmao", 6000), e("mae", 6000)], coupleOf, couples);
    expect(settleUp(b)).toEqual([]);
  });
});

describe("parseMapsUrl", () => {
  it("reads name and coordinates from a place link", () => {
    const r = parseMapsUrl("https://www.google.com/maps/place/Tonkatsu+Suzuki/@35.6812,139.7671,17z/data=!3m1");
    expect(r).toMatchObject({ name: "Tonkatsu Suzuki", lat: 35.6812, lng: 139.7671 });
  });
  it("reads a search link", () => {
    expect(parseMapsUrl("https://www.google.com/maps/search/?api=1&query=Bar+Trench&query_place_id=ChIJabc").placeId).toBe("ChIJabc");
  });
});
