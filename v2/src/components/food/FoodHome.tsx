"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { art } from "@/lib/art";
import { addDays, daysBetween, fmtDay, fmtRange, todayIso } from "@/lib/dates";
import { kanji } from "@/lib/journey";
import { citiesFor, routeNights, type Photo } from "@/lib/foodView";
import type { Deadline, Stay } from "@/lib/types";
import { useStore } from "../providers";
import { RegionCover } from "../RegionCover";

/** What the home page needs from each guide city, sent from the server. */
export interface CityCard {
  slug: string;
  name: string;
  tagline?: string;
  places: number;
  dishes: { name: string; name_ja?: string; slug: string; photo: Photo | null }[];
}

function sheetHref(id: string): string {
  const [city, s] = id.split("/");
  return `/food/${city}?place=${s}`;
}

/** The Food tab's front page: the route as postcards, what to book soon, and the how-to guides. */
export function FoodHome({ cities }: { cities: Record<string, CityCard> }) {
  const { snapshot } = useStore();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const stays = useMemo(() => plan?.stays ?? [], [plan]);
  const today = todayIso();
  const tonight = routeNights(stays).find((n) => n.date === today);
  const stops = useMemo(() => routeStops(stays), [stays]);
  const onRoute = new Set(stops.flatMap((s) => s.cities));
  const others = Object.keys(cities).filter((c) => !onRoute.has(c));
  const soon = snapshot.deadlines
    .filter((d) => d.id?.startsWith("food-") && !d.done && d.date >= addDays(today, -3))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <main className="mx-auto grid max-w-2xl gap-7 px-4 pt-3 pb-10">
      <header className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl">
        <Image src={art("deck-comida")} alt="" width={1200} height={647} priority sizes="(max-width: 672px) 100vw, 672px" className="h-auto w-full" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pt-20 pb-4 text-white">
          <h1 className="display text-[2.4rem] leading-none">Food</h1>
          <p className="mt-1 max-w-md text-[0.95rem] opacity-95">What to eat on our way through Japan, why it’s eaten there, and where the people who know go.</p>
        </div>
      </header>

      {tonight ? <Today city={cities[tonight.cities[0]]} /> : null}

      <section className="grid gap-4" aria-labelledby="route">
        <h2 id="route" className="text-[1.5rem]">
          Our route
        </h2>
        <ol className="grid gap-5">
          {stops.map((s, i) => (
            <li key={s.region}>
              <StopCard n={i + 1} stop={s} cities={cities} />
            </li>
          ))}
        </ol>
      </section>

      {soon.length ? <BookSoon items={soon} today={today} /> : null}

      <Guides />

      {others.length ? (
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-semibold text-muted">
            <span className="group-open:hidden">▸</span>
            <span className="hidden group-open:inline">▾</span> Places not on our route ({others.length})
          </summary>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {others.map((c) => (
              <li key={c}>
                <Link href={`/food/${c}`} className="card grid gap-0.5 p-3 no-underline">
                  <b className="font-display text-[1.1rem]">{cities[c].name}</b>
                  <span className="line-clamp-2 text-xs text-ink-2">{cities[c].tagline}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}

interface RouteStop {
  region: string;
  cities: string[];
  ranges: { from: string; to: string }[];
}

/** The route's stops, a region we come back to (Tokyo) shown once with both stays. */
function routeStops(stays: Stay[]): RouteStop[] {
  const out: RouteStop[] = [];
  for (const s of stays) {
    const cities = citiesFor(s.region);
    if (!cities.length) continue;
    const have = out.find((o) => o.region === s.region);
    if (have) have.ranges.push({ from: s.from, to: s.to });
    else out.push({ region: s.region, cities, ranges: [{ from: s.from, to: s.to }] });
  }
  return out;
}

function StopCard({ n, stop, cities }: { n: number; stop: RouteStop; cities: Record<string, CityCard> }) {
  const main = cities[stop.cities[0]];
  if (!main) return null;
  const extra = stop.cities.slice(1).map((c) => cities[c]).filter(Boolean);
  const dishes = stop.cities.flatMap((c) => cities[c]?.dishes.map((d) => ({ ...d, city: c })) ?? []).slice(0, 4);
  const jp = kanji(stop.region);
  return (
    <article className="card overflow-hidden">
      <Link href={`/food/${main.slug}`} className="block no-underline">
        <RegionCover regionId={stop.region} className="aspect-[16/9]" position="center 72%" sizes="(max-width: 672px) 100vw, 672px">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-4 bottom-3 text-white">
            <p className="text-[0.72rem] font-semibold tracking-[0.12em] uppercase opacity-90">
              Stop {n} · {stop.ranges.map((r) => fmtRange(r.from, r.to)).join(" and ")}
            </p>
            <p className="flex items-baseline gap-2">
              <span className="display text-[1.9rem] leading-tight">{main.name}</span>
              {jp ? <span className="jp text-[1.1rem] opacity-90">{jp}</span> : null}
            </p>
          </div>
        </RegionCover>
        {main.tagline ? <p className="px-4 pt-3 text-[0.95rem] text-ink-2">{main.tagline}</p> : null}
      </Link>
      {dishes.length ? (
        <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4 pt-3 pb-1">
          {dishes.map((d) => (
            <li key={`${d.city}/${d.slug}`} className="shrink-0">
              <Link href={`/food/${d.city}?view=try&dish=${d.slug}`} className="grid w-[76px] justify-items-center gap-1 text-center no-underline">
                <span className="relative grid size-[64px] place-items-center overflow-hidden rounded-full bg-paper">
                  <span className="jp text-lg font-bold text-ink-2">{d.name_ja?.slice(0, 2)}</span>
                  {d.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.photo.url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  ) : null}
                </span>
                <span className="line-clamp-2 text-[0.72rem] leading-tight font-semibold">{d.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-2 pb-4 text-sm">
        <Link href={`/food/${main.slug}`} className="font-semibold text-accent no-underline">
          Where to eat · {main.places} places ›
        </Link>
        {extra.map((c) => (
          <Link key={c.slug} href={`/food/${c.slug}`} className="text-ink-2 no-underline">
            and {c.name} ›
          </Link>
        ))}
      </div>
    </article>
  );
}

function Today({ city }: { city?: CityCard }) {
  if (!city) return null;
  return (
    <section className="card grid gap-3 p-4" aria-labelledby="today">
      <div className="flex items-baseline justify-between">
        <h2 id="today" className="text-[1.35rem]">
          Today in {city.name}
        </h2>
        <Link href={`/food/${city.slug}`} className="text-sm font-semibold text-accent no-underline">
          Where to eat ›
        </Link>
      </div>
      <div className="flex gap-2">
        {city.dishes.slice(0, 3).map((d) => (
          <Link key={d.slug} href={`/food/${city.slug}?view=try&dish=${d.slug}`} className="chip min-h-9 no-underline">
            Try {d.name}
          </Link>
        ))}
      </div>
      <Link href="/food/staff" className="grid min-h-12 place-items-center rounded-xl bg-ink font-bold text-bg no-underline">
        Show staff 見せる
      </Link>
    </section>
  );
}

function BookSoon({ items, today }: { items: Deadline[]; today: string }) {
  return (
    <section className="grid gap-2" aria-labelledby="soon">
      <div className="flex items-baseline justify-between">
        <h2 id="soon" className="text-[1.35rem]">
          Book soon
        </h2>
        <Link href="/food/book" className="text-sm font-semibold text-accent no-underline">
          All dates ›
        </Link>
      </div>
      <ul className="grid gap-2">
        {items.map((d) => {
          const days = daysBetween(today, d.date);
          const href = d.place ? sheetHref(d.place) : (d.source ?? "/food/book");
          const external = !d.place && !!d.source;
          return (
            <li key={d.id}>
              <Link href={href} target={external ? "_blank" : undefined} className="flex items-start gap-3 rounded-2xl bg-card px-3 py-3 no-underline shadow-[var(--shadow)]">
                <span className="grid w-11 shrink-0 place-items-center rounded-xl bg-bg-2 py-1 leading-none">
                  <span className="text-[0.6rem] font-bold tracking-wide text-muted uppercase">{fmtDay(d.date, false).split(" ")[1]}</span>
                  <span className="font-display text-[1.35rem]">{Number(d.date.slice(8))}</span>
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-[0.92rem] leading-snug">{d.item}</span>
                  <span className="text-xs text-muted">
                    {days <= 0 ? "now" : days === 1 ? "tomorrow" : `in ${days} days`}
                    {d.how ? ` · ${d.how}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const GUIDES: { href: string; title: string; ja?: string; sub: string }[] = [
  { href: "/food/staff", title: "Show staff", ja: "見せる", sub: "Big Japanese for the counter" },
  { href: "/food/guide/fernanda", title: "For Fernanda", sub: "What’s fine, what to ask, what to skip" },
  { href: "/food/guide/depachika", title: "Depachika", ja: "デパ地下", sub: "Department-store food halls" },
  { href: "/food/guide/ekiben", title: "Station food", ja: "駅弁", sub: "Bentō for the trains" },
  { href: "/food/guide/konbini", title: "Konbini", ja: "コンビニ", sub: "The corner shop, done right" },
  { href: "/food/guide/etiquette", title: "Manners", ja: "作法", sub: "At the table and the counter" },
  { href: "/food/guide/calendar", title: "Day by day", sub: "What’s open on each of our dates" },
  { href: "/food/book", title: "When to book", sub: "The dates tables open" },
  { href: "/food/guide/how", title: "How we eat", sub: "Seven at the table" },
  { href: "/food/guide/ryokan", title: "Ryokan meals", sub: "Yudanaka, 24–27 Dec" },
  { href: "/food/guide/ours", title: "Our own list", sub: "Places we saved" },
];

export function Guides() {
  return (
    <section className="grid gap-3" aria-labelledby="guides">
      <h2 id="guides" className="text-[1.5rem]">
        Good to know
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GUIDES.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className="card grid h-full content-start gap-0.5 p-3 no-underline">
              <span className="flex items-baseline justify-between gap-1">
                <b>{g.title}</b>
                {g.ja ? <span className="jp text-xs text-muted">{g.ja}</span> : null}
              </span>
              <span className="text-xs text-ink-2">{g.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
