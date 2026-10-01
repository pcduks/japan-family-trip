import { describe, expect, it } from "vitest";
import { FALLBACK_FX, fromYen, isCurrency, rateLine } from "./money";

const fx = { date: "2026-09-30", perYen: { BRL: 0.0331, SGD: 0.00814, CHF: 0.00532 } };

describe("money", () => {
  it("converts yen to each home currency in whole units", () => {
    expect(fromYen(3000, "BRL", fx)).toBe("R$ 99");
    expect(fromYen(3000, "SGD", fx)).toBe("S$ 24");
    expect(fromYen(3000, "CHF", fx)).toBe("CHF 16");
    expect(fromYen(603000, "BRL", fx)).toBe("R$ 19.959");
  });

  it("shows the rate as yen per unit", () => {
    expect(rateLine("SGD", fx)).toBe("1 S$ = ¥123");
  });

  it("has a fallback and validates codes", () => {
    expect(FALLBACK_FX.date).toBeNull();
    expect(isCurrency("CHF")).toBe(true);
    expect(isCurrency("USD")).toBe(false);
  });
});
