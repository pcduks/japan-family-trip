import { NextResponse } from "next/server";
import { FALLBACK_FX, type FxRates } from "@/lib/money";

/** Today's ECB reference rates (via Frankfurter, no key), cached for 6 hours. */
export async function GET() {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=JPY&symbols=BRL,SGD,CHF", { next: { revalidate: 21600 } });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { date?: string; rates?: Record<string, number> };
    const r = j.rates ?? {};
    if (!(r.BRL > 0 && r.SGD > 0 && r.CHF > 0)) throw new Error("bad rates");
    const out: FxRates = { date: j.date ?? null, perYen: { BRL: r.BRL, SGD: r.SGD, CHF: r.CHF } };
    return NextResponse.json(out, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json(FALLBACK_FX);
  }
}
