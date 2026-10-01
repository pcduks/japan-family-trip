/** Home currencies the family thinks in. Prices in the app are yen first; these are the "≈" hint. */
export type Currency = "BRL" | "SGD" | "CHF";

export const CURRENCIES: Record<Currency, { label: string; symbol: string }> = {
  BRL: { label: "Real", symbol: "R$" },
  SGD: { label: "Dólar de Singapura", symbol: "S$" },
  CHF: { label: "Franco suíço", symbol: "CHF" },
};

export const isCurrency = (v: unknown): v is Currency => v === "BRL" || v === "SGD" || v === "CHF";

export interface FxRates {
  /** ECB reference date, e.g. "2026-09-30"; null when using the built-in fallback. */
  date: string | null;
  /** Units of each currency per 1 yen. */
  perYen: Record<Currency, number>;
}

/** Used offline before the first fetch. Late-September 2026 ECB rates. */
export const FALLBACK_FX: FxRates = { date: null, perYen: { BRL: 0.0331, SGD: 0.00814, CHF: 0.00532 } };

/** "R$ 99", "S$ 24", "CHF 16" — whole units, since these are rough conversions. */
export function fromYen(jpy: number, cur: Currency, fx: FxRates): string {
  const v = Math.round(jpy * fx.perYen[cur]);
  return `${CURRENCIES[cur].symbol} ${v.toLocaleString("pt-BR")}`;
}

/** "1 S$ = ¥123" */
export function rateLine(cur: Currency, fx: FxRates): string {
  return `1 ${CURRENCIES[cur].symbol} = ¥${Math.round(1 / fx.perYen[cur]).toLocaleString("pt-BR")}`;
}
