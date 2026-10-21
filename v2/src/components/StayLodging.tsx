"use client";

import { useState } from "react";
import { fmtJpyShort, fmtSgd, forSeven, jpyToSgd, perCouple, stayCost } from "@/lib/budget";
import { lodgingFor, LODGING_TYPES, searchLinks, TIER_LABEL } from "@/lib/lodging";
import { areaLinks, areasFor, pickOf, type Neighbourhood } from "@/lib/neighbourhoods";
import type { Region, Stay } from "@/lib/types";

/**
 * Where to stay for one stay: the recommended type and why, the named
 * candidates from the research with links and prices (researched for six), and
 * search links with our dates and seven guests filled in.
 */
export function StayLodging({ stay, region, stopKey, defaultOpen = false }: { stay: Stay; region: Region | undefined; stopKey?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const where = areasFor(stopKey ?? stay.region);
  const pick = where ? pickOf(where) : undefined;
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
          {pick ? <> in {pick.name.replace(/ \(.*\)$/, "").split(",")[0]}</> : null}
          {cost.inferred ? <span className="text-muted"> (assumed)</span> : null} · about {fmtJpyShort(cost.perNight)} a night for seven
          {cost.upliftNights ? <span className="text-muted">, more over New Year</span> : null} · <b>{fmtSgd(jpyToSgd(perCouple(cost.total)))}</b> per couple
        </span>
        <span aria-hidden="true" className="shrink-0 text-muted">
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <div className="grid gap-3">
          {where && pick ? <PartOfTown where={where} pick={pick} stay={stay} /> : null}
          {info ? (
            <>
              <p className="text-ink-2">
                <b>Why a {LODGING_TYPES[info.type].label.toLowerCase()}:</b> {info.why}
                {differs ? <span className="text-warn"> This route sets a {type.label.toLowerCase()} here instead.</span> : null}
              </p>
              <p className="text-ink-2">
                <b>For the group:</b> {info.fit} <b>Outlook:</b> {info.outlook} <span className="text-muted">Researched for six: ask each place about a seventh bed.</span>
              </p>
              <p className="flex flex-wrap gap-x-3 text-xs text-muted">
                {(["budget", "mid", "top"] as const).map((t) => (
                  <span key={t}>
                    {TIER_LABEL[t]} {fmtJpyShort(forSeven(info.tiers[t][0], info.type))}–{fmtJpyShort(forSeven(info.tiers[t][1], info.type))} a night for seven
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
            <p className="text-muted">No places to stay picked for this base yet. The budget assumes a {type.label.toLowerCase()} at {fmtJpyShort(cost.perNight)} a night for seven.</p>
          )}
          <div className="grid gap-1">
            <p className="eyebrow">Search with our dates and seven guests</p>
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

const PRICE: Record<Neighbourhood["price"], string> = { lower: "cheaper for the town", middle: "middle of the range", higher: "dearer for the town" };

/** Which part of town: our pick first, the others folded, each with searches that land there. */
function PartOfTown({ where, pick, stay }: { where: NonNullable<ReturnType<typeof areasFor>>; pick: Neighbourhood; stay: Stay }) {
  const others = where.areas.filter((a) => a.id !== pick.id);
  return (
    <section className="grid gap-2" aria-label="Which part of town">
      <p className="eyebrow">Which part of town</p>
      <div className="card grid gap-1.5 p-3">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <b className="text-ink">{pick.name}</b>
          <span className="chip">Our pick</span>
        </p>
        <p className="text-ink-2">{where.why_pick}</p>
        <AreaDetail a={pick} stay={stay} />
      </div>
      {others.map((a) => (
        <details key={a.id} className="card p-3">
          <summary className="cursor-pointer">
            <b>{a.name}</b> <span className="text-muted">· {a.what_its_like}</span>
          </summary>
          <div className="grid gap-1.5 pt-2">
            <AreaDetail a={a} stay={stay} />
          </div>
        </details>
      ))}
      {where.tips.length ? (
        <div className="grid gap-1">
          <p className="font-semibold">When you book</p>
          <ul className="grid list-disc gap-0.5 pl-5 text-ink-2">
            {where.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {where.sources.length ? (
        <p className="text-xs text-muted">
          From{" "}
          {where.sources.map((s, i) => (
            <span key={s.url}>
              {i ? ", " : ""}
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </span>
          ))}
          .
        </p>
      ) : null}
    </section>
  );
}

function AreaDetail({ a, stay }: { a: Neighbourhood; stay: Stay }) {
  return (
    <>
      <p className="text-ink-2">{a.what_its_like}</p>
      {a.good_for_us.length ? (
        <ul className="grid gap-0.5">
          {a.good_for_us.map((g) => (
            <li key={g} className="text-ok">
              <span className="text-ink-2">+ {g}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {a.watch_out.length ? (
        <ul className="grid gap-0.5">
          {a.watch_out.map((w) => (
            <li key={w} className="text-ink-2">
              <span className="text-warn">!</span> {w}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted">
        {a.station} · {a.to_the_plans} · {PRICE[a.price]}
      </p>
      <p className="flex flex-wrap gap-2">
        {areaLinks(a, stay).map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="btn btn-sm">
            {l.label}
          </a>
        ))}
      </p>
    </>
  );
}
