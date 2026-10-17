"use client";

import { useState } from "react";
import { BUDGET_RATES, fmtJpyShort, fmtSgd, jpyToSgd, stayCost } from "@/lib/budget";
import { lodgingFor, LODGING_TYPES, searchLinks, TIER_LABEL } from "@/lib/lodging";
import type { Region, Stay } from "@/lib/types";

/**
 * Where to stay for one stay: the recommended type and why, the named
 * candidates from the research with links and prices for six, and search
 * links with our dates and six guests filled in.
 */
export function StayLodging({ stay, region, defaultOpen = false }: { stay: Stay; region: Region | undefined; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const info = lodgingFor(stay.region);
  const cost = stayCost(stay);
  const links = searchLinks(stay, region);
  const type = LODGING_TYPES[cost.lodging];
  const differs = info && info.type !== cost.lodging;
  return (
    <div className="grid gap-2 rounded-xl bg-bg-2 p-3 text-sm">
      <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>
          <b>Where to stay:</b> {type.label.toLowerCase()}
          {cost.inferred ? <span className="text-muted"> (assumed)</span> : null} · about {fmtJpyShort(cost.perNight)} a night for six
          {cost.upliftNights ? <span className="text-muted">, more over New Year</span> : null} · <b>{fmtSgd(jpyToSgd(cost.total / BUDGET_RATES.couples))}</b> per couple
        </span>
        <span aria-hidden="true" className="shrink-0 text-muted">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div className="grid gap-3">
          {info ? (
            <>
              <p className="text-ink-2">
                <b>Why a {LODGING_TYPES[info.type].label.toLowerCase()}:</b> {info.why}
                {differs ? <span className="text-warn"> This route sets a {type.label.toLowerCase()} here instead.</span> : null}
              </p>
              <p className="text-ink-2">
                <b>For six:</b> {info.fit} <b>Outlook:</b> {info.outlook}
              </p>
              <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                {(["budget", "mid", "top"] as const).map((t) => (
                  <span key={t}>
                    {TIER_LABEL[t]} {fmtJpyShort(info.tiers[t][0])}–{fmtJpyShort(info.tiers[t][1])} a night for six
                  </span>
                ))}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {info.candidates.map((c) => (
                  <li key={c.name} className="card grid gap-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold no-underline">
                        {c.name}
                      </a>
                      <span className="chip shrink-0">{TIER_LABEL[c.tier]}</span>
                    </div>
                    <p className="text-xs text-muted">{c.area}</p>
                    <p className="text-ink-2">{c.what}</p>
                    <p>
                      <b>{c.price}</b>
                      {c.verified ? <span className="text-xs text-ok"> · verified</span> : <span className="text-xs text-muted"> · typical</span>}
                    </p>
                    <p className="text-xs text-ink-2">{c.fit}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted">No places to stay picked for this base yet. The budget assumes a {type.label.toLowerCase()} at {fmtJpyShort(cost.perNight)} a night for six.</p>
          )}
          <div className="grid gap-1">
            <p className="eyebrow">Search with our dates and six guests</p>
            <ul className="flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.label}>
                  <a href={l.url} target="_blank" rel="noreferrer" className="btn btn-sm" title={l.note}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">{links.map((l) => `${l.label}: ${l.note}`).join(" · ")}.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
