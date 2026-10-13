"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { fmtDay } from "@/lib/dates";
import type { Place } from "@/lib/types";
import { useStore } from "./providers";
import { Page, PageHeader, RegionDot, Section } from "./ui";

/** Where a meal sits in the plan's day by day, if it does. */
export function plannedOn(placeId: string, days: { version_id: string; date: string; items: { place_id: string | null; slot: string }[] }[], versionId = "plan"): { date: string; slot: string }[] {
  return days.filter((d) => d.version_id === versionId).flatMap((d) => d.items.filter((it) => it.place_id === placeId).map((it) => ({ date: d.date, slot: it.slot })));
}

export function Food() {
  const { snapshot } = useStore();
  const params = useSearchParams();
  const regionParam = params.get("region");
  const [picked, setPicked] = useState<{ forParam: string | null; region: string } | null>(null);
  const region = picked && picked.forParam === regionParam ? picked.region : (regionParam ?? "");
  const meals = snapshot.places.filter((p) => p.size === "meal" || p.kind === "food");
  const regions = Array.from(new Set(meals.map((p) => p.region))).map((id) => snapshot.regions.find((r) => r.id === id)!).filter(Boolean);
  const list = region ? meals.filter((p) => p.region === region) : meals;
  const byRegion = regions.filter((r) => !region || r.id === region).map((r) => ({ r, places: list.filter((p) => p.region === r.id) }));
  const ownList = snapshot.food_list;
  const showOwn = !region || region === "tokyo";

  return (
    <Page wide>
      <PageHeader eyebrow={`${meals.length} researched · ${ownList.length} on our own Tokyo list`} title="Where to eat">
        Each researched place says who recommends it and why, whether a table for six is realistic, and anything to know for her. Sources are linked. Our own Google Maps list is at the end.
      </PageHeader>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button className={`chip shrink-0 ${!region ? "bg-accent text-accent-ink" : ""}`} onClick={() => setPicked({ forParam: regionParam, region: "" })}>
          All
        </button>
        {regions.map((r) => (
          <button key={r.id} className={`chip shrink-0 ${region === r.id ? "bg-accent text-accent-ink" : ""}`} onClick={() => setPicked({ forParam: regionParam, region: r.id })}>
            <RegionDot id={r.id} size={8} /> {r.name}
          </button>
        ))}
      </div>

      {byRegion.map(({ r, places }) => (
        <Section key={r.id} title={r.name} aside={`${places.length} place${places.length === 1 ? "" : "s"}`}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {places.map((p) => (
              <FoodCard key={p.id} p={p} />
            ))}
          </ul>
        </Section>
      ))}

      {showOwn && ownList.length ? (
        <Section title="Our own Tokyo list" aside="from the family's saved Google Maps list">
          <p className="text-sm text-ink-2">Bars and restaurants we saved ourselves over the years. Ratings are Google’s at the time of saving. Not researched for this trip, just ours.</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {ownList.map((f) => (
              <li key={f.n} className="flex items-baseline justify-between gap-2 border-b border-rule py-1.5">
                <span>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.n} ${f.area} Tokyo`)}`} target="_blank" rel="noreferrer" className="font-semibold no-underline">
                    {f.n}
                  </a>{" "}
                  <span className="text-muted">· {f.area} · {f.cat}</span>
                </span>
                <span className="shrink-0 text-muted">★ {f.rating}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </Page>
  );
}

export function FoodCard({ p }: { p: Place }) {
  const { snapshot } = useStore();
  const on = plannedOn(p.id, snapshot.days);
  const f = p.food ?? {};
  return (
    <li className="card grid gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[1.15rem]">
          <Link href={`/places/${p.id}`} className="no-underline">
            {p.name}
          </Link>
        </h3>
        {f.price_band ? <span className="chip shrink-0">{f.price_band}</span> : null}
      </div>
      {p.why ? <p className="text-ink-2">{p.why}</p> : null}
      <dl className="grid gap-1 text-sm">
        {f.type ? <Row k="What">{f.type}</Row> : null}
        <Row k="Says who">
          {f.recommended_by ? <b>{f.recommended_by}</b> : <span className="text-muted">source not recorded</span>}
          {p.links?.source ? (
            <>
              {" "}
              <a href={p.links.source} target="_blank" rel="noreferrer" className="text-muted">
                read it
              </a>
            </>
          ) : null}
        </Row>
        {f.group_of_6 ? <Row k="Six of us">{f.group_of_6}</Row> : null}
        {f.pregnancy_note ? (
          <Row k={/raw|pregnan|her\b|sushi|sashimi|alcohol|smok/i.test(f.pregnancy_note) ? "For her" : "Note"}>
            <span className="text-warn">{f.pregnancy_note}</span>
          </Row>
        ) : null}
        {p.hours ? <Row k="Hours">{p.hours}</Row> : null}
        {p.closures.length || p.closed_weekdays.length ? (
          <Row k="Closed">
            {[...p.closed_weekdays.map((d) => `${d}s`), ...p.closures.map((c) => `${fmtDay(c.start, false)}–${fmtDay(c.end, false)}`)].join(", ")}
          </Row>
        ) : null}
        {p.booking ? <Row k="Booking">{p.booking}</Row> : null}
        <Row k="In the plan">
          {on.length ? (
            <span className="text-ok">
              {on.map((x) => `${fmtDay(x.date)} (${x.slot})`).join(", ")}
            </span>
          ) : (
            <span className="text-muted">not yet; a candidate near our base</span>
          )}
        </Row>
      </dl>
    </li>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="font-semibold text-muted">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
