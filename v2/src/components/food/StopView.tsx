"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { fmtDay, fmtRange, todayIso, weekday } from "@/lib/dates";
import { slug } from "@/lib/food";
import type { DeepCity, DeepDish, DeepPlace } from "@/lib/foodDeep";
import { datesIn, stopNumber, glanceOf, mapsUrl, openOn, routeNights, SEVEN_MARK, shortArea, shortPrice, type Photo } from "@/lib/foodView";
import { useStore } from "../providers";
import { RegionDot } from "../ui";
import { FernandaMark, Monograms, OpenMark, SevenMark, TabelogTile } from "./Marks";
import { BookingStatus, PlaceSheet } from "./PlaceSheet";
import { DishStory } from "./DishStory";

type View = "eat" | "try" | "streets" | "story";
const VIEWS: { id: View; label: string }[] = [
  { id: "eat", label: "Eat" },
  { id: "try", label: "Try" },
  { id: "streets", label: "Streets" },
  { id: "story", label: "Story" },
];

/** One guide city: where to eat, what to try, the streets and markets, and why it eats the way it does. */
export function StopView({ city, photos }: { city: DeepCity; photos: Record<string, Photo> }) {
  const { snapshot } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const stays = useMemo(() => plan?.stays ?? [], [plan]);
  const dates = useMemo(() => datesIn(stays, city.slug), [stays, city.slug]);
  const view = (VIEWS.find((v) => v.id === params.get("view"))?.id ?? "eat") as View;
  const placeSlug = params.get("place");
  const dishSlug = params.get("dish");

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v == null) next.delete(k);
      else next.set(k, v);
    }
    const q = next.toString();
    router.replace(q ? `${path}?${q}` : path, { scroll: false });
  };

  const stopNo = stopNumber(stays, city.slug);
  const nights = routeNights(stays).filter((n) => n.cities.includes(city.slug));
  const ranges = nights.reduce<{ from: string; to: string }[]>((acc, n) => {
    const last = acc[acc.length - 1];
    if (last && n.first === false) last.to = n.date;
    else acc.push({ from: n.date, to: n.date });
    return acc;
  }, []);

  const place = placeSlug ? city.places?.find((p) => slug(p.name) === placeSlug) : undefined;
  const dishes = city.meibutsu ?? [];
  const dishIdx = dishSlug ? dishes.findIndex((d) => slug(d.name) === dishSlug) : -1;

  return (
    <main className="mx-auto grid max-w-2xl gap-4 px-4 pt-3 pb-8">
      <header className="grid gap-1">
        <Link href="/food" className="text-sm text-muted no-underline">
          ← Food
        </Link>
        <p className="eyebrow flex items-center gap-1.5">
          <RegionDot id={stays.find((s) => datesIn([s], city.slug).length)?.region ?? city.slug} size={8} />
          {stopNo ? `Stop ${stopNo} · ${ranges.map((r) => fmtRange(r.from, r.to)).join(" and ")}` : "Not on the route"}
        </p>
        <h1 className="display text-[2.2rem] leading-[1.05]">{city.name}</h1>
        {city.tagline ? <p className="text-ink-2">{city.tagline}</p> : null}
      </header>

      <div className="sticky top-0 z-10 -mx-4 bg-bg px-4 pt-1 pb-2">
        <div role="tablist" aria-label="Sections" className="grid grid-cols-4 gap-1 rounded-full border border-rule bg-bg-2 p-1">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id} className={`min-h-10 rounded-full text-sm font-semibold ${view === v.id ? "bg-card text-ink shadow-sm" : "text-muted"}`} onClick={() => setParam({ view: v.id === "eat" ? null : v.id })}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === "eat" ? <EatList city={city} dates={dates} initial={params.get("date")} onOpen={(p) => setParam({ place: slug(p.name) })} /> : null}
      {view === "try" ? <TryGrid city={city} photos={photos} onOpen={(d) => setParam({ dish: slug(d.name) })} /> : null}
      {view === "streets" ? <Streets city={city} /> : null}
      {view === "story" ? <Story city={city} /> : null}

      {place ? <PlaceSheet city={city} place={place} dates={dates} onClose={() => setParam({ place: null })} /> : null}
      {dishIdx >= 0 ? (
        <DishStory
          city={city}
          dish={dishes[dishIdx]}
          index={dishIdx}
          total={dishes.length}
          photo={photos[`${city.slug}/${dishes[dishIdx].name}`] ?? null}
          onClose={() => setParam({ dish: null })}
          onNext={() => setParam({ dish: slug(dishes[(dishIdx + 1) % dishes.length].name) })}
        />
      ) : null}
    </main>
  );
}

/* ------------------------------------------------------------ Eat */

function EatList({ city, dates, initial, onOpen }: { city: DeepCity; dates: string[]; initial: string | null; onOpen: (p: DeepPlace) => void }) {
  const { snapshot } = useStore();
  const today = todayIso();
  const [picked, setDay] = useState<string | null>(null);
  const [fine, setFine] = useState(false);
  const [seven, setSeven] = useState(false);
  // The date asked for (from Tonight), else today when we are there, else the first night.
  const day = picked ?? (initial && dates.includes(initial) ? initial : dates.includes(today) ? today : (dates[0] ?? null));
  const bookings = new Map(snapshot.food_bookings.map((b) => [b.target_id, b]));
  const places = city.places ?? [];
  const rows = places
    .map((p) => ({ p, open: day ? openOn(p, day) : ("open" as const), b: bookings.get(`${city.slug}/${slug(p.name)}`) }))
    .filter(({ p }) => !fine || p.pregnancy === "ok")
    .filter(({ p }) => !seven || (p.seven ? SEVEN_MARK[p.seven].fits : false))
    .sort((a, b) => Number(!!b.b) - Number(!!a.b) || rank(a.open) - rank(b.open) || (b.p.tabelog?.score ?? 0) - (a.p.tabelog?.score ?? 0));
  const shown = rows.length;

  return (
    <section className="grid gap-3" aria-label="Where to eat">
      <div className="grid gap-2">
        {dates.length ? (
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label="Our date">
            {dates.map((d) => (
              <button key={d} className={`chip shrink-0 min-h-9 ${day === d ? "bg-ink text-bg" : ""}`} aria-pressed={day === d} onClick={() => setDay(d)}>
                {fmtDay(d)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filters">
          <button className={`chip min-h-9 ${fine ? "border-ok bg-ok/15 text-ok" : ""}`} aria-pressed={fine} onClick={() => setFine(!fine)}>
            ● Fine for Fernanda
          </button>
          <button className={`chip min-h-9 ${seven ? "border-ink bg-ink text-bg" : ""}`} aria-pressed={seven} onClick={() => setSeven(!seven)}>
            ⑦ Fits seven
          </button>
          <span className="self-center text-xs text-muted">{shown === places.length ? `${shown} places` : `${shown} of ${places.length}`}</span>
        </div>
      </div>

      {rows.length ? (
        <ul className="card divide-y divide-rule overflow-hidden">
          {rows.map(({ p, open, b }) => (
            <li key={p.name}>
              <button onClick={() => onOpen(p)} className={`grid w-full grid-cols-[44px_1fr] gap-3 px-3 py-3 text-left hover:bg-bg-2 ${open === "closed" ? "opacity-60" : ""}`}>
                <TabelogTile score={p.tabelog?.score} awards={p.tabelog?.awards} />
                <span className="grid min-w-0 gap-0.5">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <b className={`truncate font-display text-[1.08rem] font-semibold ${open === "closed" ? "line-through" : ""}`}>{p.name}</b>
                    {p.name_ja ? <span className="jp truncate text-sm text-ink-2">{p.name_ja}</span> : null}
                  </span>
                  <span className="truncate text-[0.8rem] text-muted">{[p.genre, shortArea(p.area), shortPrice(p.price)].filter(Boolean).join(" · ")}</span>
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.8rem]">
                    <FernandaMark level={p.pregnancy} />
                    <SevenMark seven={p.seven} />
                    {day ? <OpenMark open={open} day={weekday(day)} /> : null}
                    <Monograms critics={p.critics} />
                    {b ? <BookingStatus b={b} /> : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-rule px-4 py-6 text-center text-muted">Nothing matches. Turn a filter off.</p>
      )}

      {city.shops?.length ? (
        <div className="grid gap-2">
          <h2 className="text-[1.25rem]">Shops and takeaway</h2>
          <ul className="card divide-y divide-rule">
            {city.shops.map((s) => (
              <li key={s.name} className="grid gap-0.5 px-3 py-2.5 text-sm">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0">
                    <b>{s.name}</b> {s.name_ja ? <span className="jp text-ink-2">{s.name_ja}</span> : null}
                  </span>
                  <a href={mapsUrl(s.query ?? `${s.name} ${city.name}`)} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-accent">
                    Map
                  </a>
                </span>
                <span className="text-ink-2">{s.buy ?? glanceOf(s)}</span>
                {s.dec_jan ? <span className="text-xs text-muted">{s.dec_jan}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function rank(o: string): number {
  return o === "open" ? 0 : o === "check" ? 1 : 2;
}

/* ------------------------------------------------------------ Try */

function TryGrid({ city, photos, onOpen }: { city: DeepCity; photos: Record<string, Photo>; onOpen: (d: DeepDish) => void }) {
  const dishes = [...(city.meibutsu ?? [])].sort((a, b) => Number(!!b.must) - Number(!!a.must));
  return (
    <section className="grid gap-3" aria-label="What to try">
      <p className="text-sm text-ink-2">What {city.name} is famous for. Tap one for its story, to read out at the table.</p>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {dishes.map((d) => (
          <li key={d.name}>
            <DishTile dish={d} photo={photos[`${city.slug}/${d.name}`] ?? null} onClick={() => onOpen(d)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DishTile({ dish, photo, onClick, href }: { dish: Pick<DeepDish, "name" | "name_ja" | "must" | "pregnancy" | "glance"> & { what?: string }; photo: Photo | null; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt="" loading="lazy" className="h-24 w-full rounded-lg object-cover" />
      ) : null}
      {dish.must ? (
        <span aria-label="Must try" className="jp absolute top-2 right-2 grid size-[26px] -rotate-6 place-items-center rounded-full border-[1.5px] border-accent bg-paper/90 text-[13px] text-accent">
          必
        </span>
      ) : null}
      {dish.name_ja ? <span className="jp text-[1.3rem] leading-tight font-bold">{dish.name_ja}</span> : null}
      <b className="font-display text-[1.02rem] leading-tight">{dish.name}</b>
      <span className="line-clamp-2 text-xs text-ink-2">{glanceOf(dish)}</span>
      <span className="mt-auto text-xs">
        <FernandaMark level={dish.pregnancy} />
      </span>
    </>
  );
  const cls = "relative flex h-full min-h-[120px] w-full flex-col gap-1 rounded-2xl bg-paper p-3 text-left no-underline";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/* ------------------------------------------------------------ Streets */

function Streets({ city }: { city: DeepCity }) {
  return (
    <section className="grid gap-3" aria-label="Streets and markets">
      {(city.areas ?? []).map((a) => (
        <details key={a.name} className="card group p-4">
          <summary className="grid cursor-pointer list-none gap-0.5">
            <span className="flex items-baseline justify-between gap-2">
              <span className="min-w-0">
                <b className="font-display text-[1.15rem]">{a.name}</b> {a.name_ja ? <span className="jp text-ink-2">{a.name_ja}</span> : null}
              </span>
              {a.kind ? <span className="chip shrink-0">{a.kind}</span> : null}
            </span>
            <span className="text-sm text-ink-2">{glanceOf({ glance: a.glance, what: a.story })}</span>
            <span className="text-xs font-semibold text-accent group-open:hidden">Read more ▾</span>
          </summary>
          <div className="mt-3 grid gap-2 text-sm">
            <p className="text-ink-2">{a.story}</p>
            {a.eat?.length ? (
              <div>
                <p className="eyebrow">Eat here</p>
                <ul className="mt-1 grid gap-1">
                  {a.eat.map((e) => (
                    <li key={e} className="flex gap-2">
                      <span aria-hidden="true" className="text-accent">
                        ●
                      </span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {a.tips ? (
              <p>
                <b>Tips:</b> {a.tips}
              </p>
            ) : null}
            {a.dec_jan ? (
              <p className="rounded-xl bg-bg-2 p-3">
                <b>On our dates:</b> {a.dec_jan}
              </p>
            ) : null}
            <a href={mapsUrl(a.query ?? `${a.name} ${city.name}`)} target="_blank" rel="noreferrer" className="btn btn-sm justify-self-start">
              Map
            </a>
          </div>
        </details>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------ Story */

function Story({ city }: { city: DeepCity }) {
  return (
    <section className="grid gap-4" aria-label="Food history">
      {city.history?.map((h, i) => (
        <p key={i} className={`max-w-prose leading-relaxed ${i === 0 ? "font-display text-[1.15rem]" : "text-ink-2"}`}>
          {h}
        </p>
      ))}
      {city.winter ? (
        <div className="rounded-2xl bg-paper p-4">
          <p className="eyebrow">In winter, on our dates</p>
          <p className="mt-1 text-ink-2">{city.winter}</p>
        </div>
      ) : null}
      {city.sources?.length ? (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">Sources ({city.sources.length})</summary>
          <ul className="mt-2 grid gap-1">
            {city.sources.map((s) => (
              <li key={s} className="break-words">
                {/^https?:\/\//.test(s) ? (
                  <a href={s} target="_blank" rel="noreferrer">
                    {s}
                  </a>
                ) : (
                  s
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

