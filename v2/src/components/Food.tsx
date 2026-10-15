"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import foodGuide from "../../data/food-guide.json";
import { fmtDay } from "@/lib/dates";
import type { Place } from "@/lib/types";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { Page, PageHeader, RegionDot, Section } from "./ui";

interface FoodRegion {
  title: string;
  dishes: string[];
  intro: string;
  for_her: string;
  dates: string;
  guides: { label: string; url: string }[];
  extras: { name: string; url: string; what: string; who: string; six: string; hours: string; map: string }[];
}

const GUIDE = foodGuide as unknown as {
  how_we_eat: { title: string; text: string }[];
  for_her: { summary: string; fine: string[]; careful: string[]; avoid: string[]; sources: { label: string; url: string }[] };
  ryokan_meals: { text: string; ask_for: string[] };
  regions: Record<string, FoodRegion>;
};

/** Which region's food section covers a place's region (Gero sits with Takayama, Nara with Kyoto). */
const FOOD_REGION: Record<string, string> = { tokyo: "tokyo", kanazawa: "kanazawa", shirakawago: "kanazawa", takayama: "takayama", gero: "takayama", okuhida: "takayama", kyoto: "kyoto", nara: "kyoto", hakone: "hakone", kawaguchiko: "hakone" };

/** Where a meal sits in the plan's day by day, if it does. */
export function plannedOn(placeId: string, days: { version_id: string; date: string; items: { place_id: string | null; slot: string }[] }[], versionId = "plan"): { date: string; slot: string }[] {
  return days.filter((d) => d.version_id === versionId).flatMap((d) => d.items.filter((it) => it.place_id === placeId).map((it) => ({ date: d.date, slot: it.slot })));
}

const TABS = [
  { id: "", label: "Everything" },
  ...Object.entries(GUIDE.regions).map(([id, r]) => ({ id, label: r.title })),
  { id: "her", label: "For her" },
  { id: "ryokan", label: "Ryokan meals" },
  { id: "ours", label: "Our Tokyo list" },
];

export function Food() {
  const { snapshot } = useStore();
  const params = useSearchParams();
  const wanted = params.get("region");
  const [picked, setPicked] = useState<{ forParam: string | null; id: string } | null>(null);
  const active = picked && picked.forParam === wanted ? picked.id : wanted ? (FOOD_REGION[wanted] ?? wanted) : "";
  const meals = snapshot.places.filter((p) => p.size === "meal" || p.kind === "food");
  const ownList = snapshot.food_list;
  const show = (id: string) => !active || active === id;
  const regionOrder = Object.keys(GUIDE.regions);

  return (
    <Page wide>
      <PageHeader eyebrow={`Where we eat · ${meals.length} researched places · ${ownList.length} of our own`} title="Food">
        Three weeks, sixty-odd meals, one of us pregnant and two of us new to all of it. This is what each place is about at the table, who recommends each restaurant and why, what she can eat, and how the ryokan nights work. Tap a region, or read it top to bottom.
      </PageHeader>

      <div className="no-scrollbar sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-bg px-4 py-2">
        {TABS.map((t) => (
          <button key={t.id} className={`chip shrink-0 ${active === t.id ? "bg-accent text-accent-ink" : ""}`} aria-pressed={active === t.id} onClick={() => setPicked({ forParam: wanted, id: t.id })}>
            {GUIDE.regions[t.id] ? <RegionDot id={t.id} size={8} /> : null} {t.label}
          </button>
        ))}
      </div>

      {!active ? (
        <Section title="How we eat as six">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDE.how_we_eat.map((h, i) => (
              <li key={h.title} className="card grid gap-1 p-4">
                <span className="display text-[1.6rem] leading-none text-accent">{i + 1}</span>
                <b>{h.title}</b>
                <span className="text-sm text-ink-2">{h.text}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {regionOrder.filter(show).map((id) => {
        const r = GUIDE.regions[id];
        const places = meals.filter((p) => (FOOD_REGION[p.region] ?? p.region) === id);
        const region = snapshot.regions.find((x) => x.id === id);
        const stays = snapshot.versions.find((v) => v.status === "plan")?.stays.filter((s) => (FOOD_REGION[s.region] ?? s.region) === id) ?? [];
        return (
          <section key={id} className="grid gap-4" aria-labelledby={`food-${id}`}>
            <RegionCover regionId={id} className="hero-fade -mx-4 h-[290px] sm:mx-0 sm:h-auto sm:aspect-[3/1] sm:rounded-2xl" sizes="(max-width: 1024px) 100vw, 1024px">
              <div className="absolute inset-x-4 bottom-4 z-10 grid gap-1 text-white">
                <p className="text-[0.72rem] font-semibold tracking-wide uppercase opacity-90">
                  {stays.length ? stays.map((s) => `${fmtDay(s.from, false)} – ${fmtDay(s.to, false)}`).join(" and ") : region?.name}
                </p>
                <h2 id={`food-${id}`} className="display text-[2rem] leading-none">
                  {r.title}
                </h2>
                <ul className="flex flex-wrap gap-1.5 pt-1">
                  {r.dishes.map((d) => (
                    <li key={d} className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </RegionCover>
            <p className="max-w-prose text-[1.02rem] leading-relaxed text-ink-2">{r.intro}</p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="rounded-xl bg-bg-2 p-3">
                <b>For her:</b> {r.for_her}
              </p>
              <p className="rounded-xl bg-bg-2 p-3">
                <b>On our dates:</b> {r.dates}
              </p>
            </div>
            {places.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {places.map((p) => (
                  <FoodCard key={p.id} p={p} />
                ))}
              </ul>
            ) : null}
            {r.extras.length ? (
              <div className="grid gap-1 text-sm">
                <p className="eyebrow">Also in the guides</p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {r.extras.map((e) => (
                    <li key={e.name} className="border-b border-rule py-1.5">
                      <a href={e.url} target="_blank" rel="noreferrer" className="font-semibold no-underline">
                        {e.name}
                      </a>{" "}
                      <span className="text-ink-2">· {e.what}</span>
                      <span className="block text-xs text-muted">
                        {e.who} · six: {e.six} · {e.hours} ·{" "}
                        <a href={e.map} target="_blank" rel="noreferrer">
                          map
                        </a>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="grid gap-1 text-sm">
              <p className="eyebrow">Guides to read</p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {r.guides.map((g) => (
                  <li key={g.url}>
                    <a href={g.url} target="_blank" rel="noreferrer">
                      {g.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">
                <Link href={`/places?region=${id}`}>Places in {r.title.split(" and")[0]}</Link> · <Link href={`/plan?tab=${id}`}>the full guide in the report</Link>
              </p>
            </div>
          </section>
        );
      })}

      {show("her") ? (
        <Section title="What she can eat" id="her" aside="29–32 weeks">
          <p className="max-w-prose text-ink-2">{GUIDE.for_her.summary}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ListCard title="Fine" tone="ok" items={GUIDE.for_her.fine} />
            <ListCard title="With care" tone="warn" items={GUIDE.for_her.careful} />
            <ListCard title="Not this trip" tone="danger" items={GUIDE.for_her.avoid} />
          </div>
          <p className="text-sm text-muted">
            A note to show: <span className="font-semibold text-ink">妊娠中です。生もの抜きでお願いします。</span> (I am pregnant; nothing raw, please.) Sources:{" "}
            {GUIDE.for_her.sources.map((s, i) => (
              <span key={s.url}>
                {i ? " · " : ""}
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </span>
            ))}
            . <Link href="/plan?tab=plan">More on pregnancy in the report</Link>.
          </p>
        </Section>
      ) : null}

      {show("ryokan") ? (
        <Section title="The ryokan meals" id="ryokan" aside="Gero and Hakone">
          <p className="max-w-prose text-ink-2">{GUIDE.ryokan_meals.text}</p>
          <div className="card grid gap-2 p-4 text-sm">
            <p className="eyebrow">Ask for, when booking</p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {GUIDE.ryokan_meals.ask_for.map((a) => (
                <li key={a} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    ●
                  </span>
                  {a}
                </li>
              ))}
            </ul>
            <p className="text-muted">
              The candidate ryokan, with prices and links, are on <Link href="/versions/plan#stay-3">the plan’s Gero stay</Link> and <Link href="/versions/plan#stay-5">its Hakone stay</Link>.
            </p>
          </div>
        </Section>
      ) : null}

      {show("ours") && ownList.length ? (
        <Section title="Our own Tokyo list" id="ours" aside="from the family’s saved Google Maps list">
          <p className="text-sm text-ink-2">Bars and restaurants we saved ourselves over the years. Ratings are Google’s at the time of saving. Not researched for this trip, just ours. Nothing here has been checked for her.</p>
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

function ListCard({ title, tone, items }: { title: string; tone: "ok" | "warn" | "danger"; items: string[] }) {
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
  const on = plannedOn(p.id, snapshot.days);
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
        {f.group_of_6 ? <Row k="Six of us">{f.group_of_6}</Row> : null}
        {herNote ? (
          <Row k="For her">
            <span className="text-warn">{herNote}</span>
          </Row>
        ) : null}
        {otherNote ? <Row k="Note">{otherNote}</Row> : null}
        {p.hours ? <Row k="Hours">{p.hours}</Row> : null}
        {p.closures.length || p.closed_weekdays.length ? (
          <Row k="Closed">{[...p.closed_weekdays.map((d) => `${d}s`), ...p.closures.map((c) => `${fmtDay(c.start, false)}–${fmtDay(c.end, false)}`)].join(", ")}</Row>
        ) : null}
        {p.booking ? <Row k="Booking">{p.booking}</Row> : null}
        <Row k="In the plan">
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
