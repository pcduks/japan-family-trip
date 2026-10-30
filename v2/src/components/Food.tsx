"use client";

import Link from "next/link";
import { fmtDay } from "@/lib/dates";
import { FOOD_REGION } from "@/lib/foodDeep";
import { routeVisits } from "@/lib/days";
import type { Place } from "@/lib/types";
import { useStore } from "./providers";
import { Section } from "./ui";

/** Our own lists: the saved places in the library that are meals, and the family's Tokyo list. */
export function OurList() {
  const { snapshot } = useStore();
  const meals = snapshot.places.filter((p) => p.size === "meal" || p.kind === "food");
  const ownList = snapshot.food_list;
  return (
    <>
      {meals.length ? (
        <Section title="Saved in our places" id="saved" aside={`${meals.length} places`}>
          <p className="text-sm text-ink-2">Meals saved in the trip’s places library, with who recommended them.</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {meals.map((p) => (
              <FoodCard key={p.id} p={p} />
            ))}
          </ul>
        </Section>
      ) : null}
      {ownList.length ? (
        <Section title="Our own Tokyo list" id="ours" aside="from the family’s saved Google Maps list">
          <p className="text-sm text-ink-2">Bars and restaurants we saved ourselves over the years. Ratings are Google’s at the time of saving. Not checked for this trip, and not checked for Fernanda.</p>
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
    </>
  );
}

export function ListCard({ title, tone, items }: { title: string; tone: "ok" | "warn" | "danger"; items: string[] }) {
  const color = { ok: "text-ok", warn: "text-warn", danger: "text-danger" }[tone];
  return (
    <div className="card grid content-start gap-2 p-4">
      <b className={color}>{title}</b>
      <ul className="grid gap-1 text-sm text-ink-2">
        {items.map((it) => (
          <li key={it} className="border-b border-rule py-1 last:border-0">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FoodCard({ p }: { p: Place }) {
  const { snapshot } = useStore();
  const on = routeVisits(snapshot).get(p.id) ?? [];
  const f = p.food ?? {};
  const herNote = f.pregnancy_note && /raw|pregnan|her\b|sushi|sashimi|alcohol|smok|liver|egg|rare/i.test(f.pregnancy_note) ? f.pregnancy_note : null;
  const otherNote = f.pregnancy_note && !herNote ? f.pregnancy_note : null;
  return (
    <li className="card grid gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[1.15rem]">
          <Link href={`/places/${p.id}`} className="no-underline">
            {p.name}
          </Link>
        </h3>
        <span className="flex shrink-0 gap-1">
          {f.price_band ? <span className="chip">{f.price_band}</span> : null}
          {p.region !== (FOOD_REGION[p.region] ?? p.region) ? <span className="chip">{snapshot.regions.find((r) => r.id === p.region)?.name.replace(" Onsen", "")}</span> : null}
        </span>
      </div>
      {f.type ? <p className="font-semibold text-ink-2">{f.type}</p> : null}
      {p.why && p.why.trim().toLowerCase() !== (f.type ?? "").trim().toLowerCase() ? <p className="text-sm text-ink-2">{p.why}</p> : null}
      <dl className="grid gap-1 text-sm">
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
        {f.group_of_6 ? <Row k="Group">{f.group_of_6}</Row> : null}
        {herNote ? (
          <Row k="For Fernanda">
            <span className="text-warn">{herNote}</span>
          </Row>
        ) : null}
        {otherNote ? <Row k="Note">{otherNote}</Row> : null}
        {p.hours ? <Row k="Hours">{p.hours}</Row> : null}
        {p.closures.length || p.closed_weekdays.length ? (
          <Row k="Closed">{[...p.closed_weekdays.map((d) => `${d}s`), ...p.closures.map((c) => `${fmtDay(c.start, false)}–${fmtDay(c.end, false)}`)].join(", ")}</Row>
        ) : null}
        {p.booking ? <Row k="Booking">{p.booking}</Row> : null}
        <Row k="On the route">
          {on.length ? <span className="text-ok">{on.map((x) => `${fmtDay(x.date)} (${x.slot})`).join(", ")}</span> : <span className="text-muted">not yet; a candidate near our base</span>}
        </Row>
      </dl>
      <p className="flex flex-wrap gap-2 text-xs">
        {p.links?.map ? (
          <a href={p.links.map} target="_blank" rel="noreferrer" className="btn btn-sm">
            Map
          </a>
        ) : null}
        <Link href={`/places/${p.id}`} className="btn btn-sm">
          Photos and reviews
        </Link>
      </p>
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
