"use client";

import Link from "next/link";
import { useState } from "react";
import { budgetOf, BUDGET_RATES, fmtJpy, fmtJpyShort, fmtSgd, jpyToSgd, perCouple, type Budget } from "@/lib/budget";
import type { Region, Version } from "@/lib/types";
import { LODGING_TYPES } from "@/lib/lodging";

/** "S$13,000 per couple · S$2,000 under" in one line, for cards. */
export function BudgetLine({ v, regions, compareTo }: { v: Pick<Version, "stays" | "pace">; regions: Region[]; compareTo?: number }) {
  const b = budgetOf(v, regions);
  const diff = compareTo !== undefined ? b.perCoupleSgd - compareTo : null;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <b>{fmtSgd(b.perCoupleSgd)}</b>
      <span className="text-muted">per couple, no flights</span>
      {diff !== null && diff !== 0 ? <span className={diff > 0 ? "text-danger" : "text-ok"}>{diff > 0 ? "+" : "−"}{fmtSgd(Math.abs(diff))} vs the route</span> : null}
      {diff === null ? <span className={b.headroomSgd >= 0 ? "text-ok" : "text-danger"}>{b.headroomSgd >= 0 ? `${fmtSgd(b.headroomSgd)} under` : `${fmtSgd(-b.headroomSgd)} over`} {fmtSgd(b.targetPerCoupleSgd)}</span> : null}
    </span>
  );
}

function Row({ label, jpy, note }: { label: string; jpy: number; note?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 border-b border-rule py-1.5 last:border-0">
      <span>
        {label}
        {note ? <span className="block text-xs text-muted">{note}</span> : null}
      </span>
      <span className="text-right">
        <b>{fmtSgd(jpyToSgd(jpy))}</b>
        <span className="block text-xs text-muted">{fmtJpy(jpy)}</span>
      </span>
    </div>
  );
}

/** The full breakdown for a route: the big number against the target, the bar, the lines, the assumptions. */
export function BudgetCard({ v, regions, regionName, title = "Budget per couple" }: { v: Pick<Version, "stays" | "pace">; regions: Region[]; regionName: (id: string) => string; title?: string }) {
  const b: Budget = budgetOf(v, regions);
  const [open, setOpen] = useState(false);
  const pct = Math.min(100, Math.round((b.perCoupleSgd / b.targetPerCoupleSgd) * 100));
  const over = b.headroomSgd < 0;
  const dearest = [...b.stays].sort((a, c) => c.total - a.total).slice(0, 2);
  const paceFood = BUDGET_RATES.food_per_person_per_day[v.pace];
  return (
    <div className="card grid gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">{title}</p>
          <p className="display text-[2.4rem] leading-none">{fmtSgd(b.perCoupleSgd)}</p>
          <p className="text-sm text-muted">without flights · about {fmtJpy(b.totalJpy)}</p>
        </div>
        <p className={`text-right text-sm font-semibold ${over ? "text-danger" : "text-ok"}`}>
          {over ? `${fmtSgd(-b.headroomSgd)} over` : `${fmtSgd(b.headroomSgd)} under`}
          <span className="block font-normal text-muted">the {fmtSgd(b.targetPerCoupleSgd)} target</span>
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-bg-2" role="img" aria-label={`${pct}% of the target`}>
        <div className={`h-full rounded-full ${over ? "bg-danger" : "bg-ok"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-sm">
        <Row label="Where we sleep" jpy={b.lodging} note={`a third of the group's ${b.stays.length} stays · New Year nights uplifted`} />
        <Row label="Food" jpy={b.food} note={`${fmtJpy(paceFood)} a person a day in town, ${fmtJpy(BUDGET_RATES.food_per_person_on_a_ryokan_day)} on the ${b.ryokanDays} ryokan days`} />
        <Row label="Tickets and activities" jpy={b.activities} note={`${fmtJpy(BUDGET_RATES.activities_per_person_per_day[v.pace])} a person a day at ${v.pace} pace`} />
        <Row label="Trains and buses between bases" jpy={b.fares} note={`${b.moves} moves, reserved seats, plus the airport legs`} />
        <Row label="Getting around town" jpy={b.localTransport} note={`${fmtJpy(BUDGET_RATES.local_transport_per_person_per_day)} a person a day: metro, buses, the odd taxi`} />
        <Row label="Sending the suitcases ahead" jpy={b.luggage} note={`${BUDGET_RATES.cases_per_couple} cases × ${b.moves} moves × ${fmtJpy(BUDGET_RATES.luggage_per_case_per_move)}`} />
        <Row label="Extras" jpy={b.extras} note={BUDGET_RATES.extras_per_couple.what} />
      </div>
      <button className="btn btn-sm justify-self-start" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide" : "Show"} the stays and the assumptions
      </button>
      {open ? (
        <div className="grid gap-3 text-sm">
          <table className="w-full text-left">
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th className="py-1 font-semibold">Stay</th>
                <th className="py-1 font-semibold">Type</th>
                <th className="py-1 text-right font-semibold">A night, for seven</th>
                <th className="py-1 text-right font-semibold">Per couple</th>
              </tr>
            </thead>
            <tbody>
              {b.stays.map((s, i) => (
                <tr key={i} className="border-t border-rule">
                  <td className="py-1.5">
                    {regionName(s.region)} <span className="text-muted whitespace-nowrap">· {s.nights} n</span>
                  </td>
                  <td className="py-1.5">
                    {LODGING_TYPES[s.lodging].label.toLowerCase()}
                    {s.inferred ? <span className="text-muted"> (assumed)</span> : null}
                    {s.upliftNights ? <span className="block text-xs text-muted">{s.upliftNights} New Year night{s.upliftNights > 1 ? "s" : ""} uplifted</span> : null}
                  </td>
                  <td className="py-1.5 text-right">{fmtJpyShort(s.perNight)}</td>
                  <td className="py-1.5 text-right font-semibold">{fmtSgd(jpyToSgd(perCouple(s.total)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-ink-2">
            The biggest lines are {dearest.map((s) => `${regionName(s.region)} (${fmtSgd(jpyToSgd(perCouple(s.total)))} per couple)`).join(" and ")}. A tier down there is the first lever; a better room at the Fuji stop is the first indulgence.
          </p>
          <p className="text-muted">
            Assumptions: ¥{BUDGET_RATES.currency.jpy_per_sgd} per S$ (as of {BUDGET_RATES.currency.as_of}); mid-tier nightly rates checked for six on 1 Oct 2026, raised for seven (a fourth hotel room, ryokan per person, a bigger house), with the rooms split per head; ryokan nights include dinner and breakfast; New Year nights at +{Math.round(BUDGET_RATES.new_year_uplift.full.ryokan * 100)}% (ryokan) or +{Math.round(BUDGET_RATES.new_year_uplift.full.hotel * 100)}% (hotel) on 31 Dec and 1 Jan, half that on 30 Dec and 2 Jan; the
            figure is per couple; Tatiana, travelling on her own, pays about half of it (her share of the rooms, one person’s food and tickets). Treat the total as ±15%. The numbers live in <code>v2/data/budget.json</code>.{" "}
            <Link href="/plan?tab=nights">Why each stay is this long</Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
