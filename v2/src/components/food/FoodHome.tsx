"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { addDays, daysBetween, fmtDay, fmtRange, todayIso, weekday } from "@/lib/dates";
import { isConfirmed } from "@/lib/food";
import { DEEP_CITIES } from "@/lib/foodDeep";
import { cityOrder, openOn, stopNumber, routeNights, SEVEN_MARK, type DishLite, type Night, type PlaceLite } from "@/lib/foodView";
import type { Deadline, FoodBooking, Stay } from "@/lib/types";
import { useStore } from "../providers";
import { RegionDot } from "../ui";
import { FernandaMark, SevenMark, TabelogTile } from "./Marks";
import { BookingStatus } from "./PlaceSheet";
import { DishTile } from "./StopView";

const MEAL_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2 };

function sheetHref(id: string): string {
  const [city, s] = id.split("/");
  return `/food/${city}?place=${s}`;
}

/** The Food tab's front page: before the trip, every night and what's booked; on the trip, tonight. */
export function FoodHome({ places, dishes }: { places: PlaceLite[]; dishes: DishLite[] }) {
  const { snapshot } = useStore();
  const params = useSearchParams();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const stays = useMemo(() => plan?.stays ?? [], [plan]);
  const nights = useMemo(() => routeNights(stays), [stays]);
  const today = todayIso();
  const asked = params.get("night");
  const night = nights.find((n) => n.date === asked) ?? (params.get("table") ? undefined : nights.find((n) => n.date === today));

  return night ? <Tonight night={night} nights={nights} stays={stays} places={places} dishes={dishes} isToday={night.date === today} /> : <OurTable nights={nights} stays={stays} />;
}

/* ------------------------------------------------------------ before the trip */

function OurTable({ nights, stays }: { nights: Night[]; stays: Stay[] }) {
  const { snapshot, isPlanner, setDeadlineDone } = useStore();
  const today = todayIso();
  const food = snapshot.deadlines.filter((d) => d.id?.startsWith("food-")).sort((a, b) => a.date.localeCompare(b.date));
  const next = food.find((d) => !d.done);
  const openCount = food.filter((d) => !d.done).length;
  const byDate = bookingsByDate(snapshot.food_bookings);
  const { onRoute, others } = cityOrder(stays);
  const booked = snapshot.food_bookings.filter(isConfirmed).length;

  return (
    <main className="mx-auto grid max-w-2xl gap-5 px-4 pt-3 pb-8">
      <header className="grid gap-1">
        <p className="eyebrow">
          Our table · {nights.length ? fmtRange(nights[0].date, addDays(nights[nights.length - 1].date, 1)) : ""} · {booked} booked
        </p>
        <h1 className="display text-[2.2rem] leading-[1.05]">Food</h1>
      </header>

      {next ? <NextDeadline d={next} today={today} openCount={openCount} canTick={isPlanner} onDone={() => next.id && setDeadlineDone(next.id, true)} /> : null}

      <section className="grid gap-2" aria-labelledby="nights">
        <div className="flex items-baseline justify-between">
          <h2 id="nights" className="text-[1.35rem]">
            Every night
          </h2>
          <span className="text-xs text-muted">tap a night to see it as on the day</span>
        </div>
        <ol className="grid gap-3">
          {stays.map((s, i) => {
            const own = nights.filter((n) => n.stop === i);
            const city = own[0]?.cities[0];
            const region = snapshot.regions.find((r) => r.id === s.region);
            return (
              <li key={s.id ?? i} className="card overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-rule bg-bg-2/60 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <RegionDot id={s.region} />
                    <b className="truncate">{region?.name.split(",")[0] ?? s.region}</b>
                    <span className="shrink-0 text-xs text-muted">{fmtRange(s.from, s.to)}</span>
                  </span>
                  {city ? (
                    <Link href={`/food/${city}`} className="shrink-0 text-sm font-semibold text-accent no-underline">
                      Where to eat ›
                    </Link>
                  ) : null}
                </div>
                <ul className="divide-y divide-rule">
                  {own.map((n) => {
                    const bs = byDate.get(n.date) ?? [];
                    const dinner = bs.some((b) => b.meal === "dinner" || !b.meal);
                    return (
                      <li key={n.date}>
                        <Link href={`/food?night=${n.date}`} className="grid grid-cols-[3.6rem_1fr_auto] items-center gap-2 px-3 py-2.5 text-sm no-underline hover:bg-bg-2">
                          <span className="leading-tight">
                            <b className="block">{weekday(n.date)}</b>
                            <span className="text-xs text-muted">{fmtDay(n.date, false)}</span>
                          </span>
                          <span className="grid min-w-0 gap-1">
                            {bs.map((b) => (
                              <span key={b.id} className="flex min-w-0 flex-wrap items-center gap-x-2">
                                <span className="truncate font-semibold">{b.name.replace(/ \([^)]*\)$/, "")}</span>
                                <BookingStatus b={b} />
                              </span>
                            ))}
                            {!dinner ? (
                              s.lodging === "ryokan" ? (
                                <span className="text-ink-2">Dinner at the ryokan</span>
                              ) : (
                                <span className="text-muted">Dinner open</span>
                              )
                            ) : null}
                          </span>
                          <span aria-hidden="true" className="text-muted">
                            ›
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      <Stops onRoute={onRoute} others={others} stays={stays} />
      <Guides />
    </main>
  );
}

function NextDeadline({ d, today, openCount, canTick, onDone }: { d: Deadline; today: string; openCount: number; canTick: boolean; onDone: () => void }) {
  const days = daysBetween(today, d.date);
  const when = days < 0 ? `${-days} days late` : days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  return (
    <section className="card grid gap-2 border-accent/60 p-4" aria-labelledby="next-book">
      <div className="flex items-baseline justify-between gap-2">
        <p id="next-book" className="eyebrow text-accent">
          Next to book
        </p>
        <span className={`text-xs font-bold ${days <= 0 ? "text-danger" : days <= 7 ? "text-warn" : "text-muted"}`}>{when}</span>
      </div>
      <div className="grid grid-cols-[3.4rem_1fr] gap-3">
        <span className="grid place-items-center rounded-xl bg-accent py-1.5 text-accent-ink">
          <span className="text-[0.62rem] font-bold tracking-wide uppercase">{fmtDay(d.date, false).split(" ")[1]}</span>
          <span className="font-display text-[1.6rem] leading-none">{Number(d.date.slice(8))}</span>
        </span>
        <span className="grid gap-0.5">
          <span className="font-semibold">{d.item}</span>
          {d.how ? <span className="text-xs text-muted">{d.how}</span> : null}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {d.place ? (
          <Link href={sheetHref(d.place)} className="btn btn-sm btn-primary">
            Open it
          </Link>
        ) : d.source ? (
          <a href={d.source} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">
            Open it
          </a>
        ) : null}
        {canTick ? (
          <button className="btn btn-sm" onClick={onDone}>
            ✓ Done
          </button>
        ) : null}
        <Link href="/food/book" className="btn btn-sm">
          All {openCount} to book
        </Link>
      </div>
    </section>
  );
}

function bookingsByDate(bookings: FoodBooking[]): Map<string, FoodBooking[]> {
  const m = new Map<string, FoodBooking[]>();
  for (const b of bookings) {
    if (!b.date) continue;
    m.set(b.date, [...(m.get(b.date) ?? []), b]);
  }
  for (const list of m.values()) list.sort((a, b) => (MEAL_ORDER[a.meal ?? "dinner"] ?? 2) - (MEAL_ORDER[b.meal ?? "dinner"] ?? 2));
  return m;
}

/* ------------------------------------------------------------ on the trip */

function Tonight({ night, nights, stays, places, dishes, isToday }: { night: Night; nights: Night[]; stays: Stay[]; places: PlaceLite[]; dishes: DishLite[]; isToday: boolean }) {
  const { snapshot } = useStore();
  const router = useRouter();
  const stay = stays[night.stop];
  const city = night.cities[0];
  const region = snapshot.regions.find((r) => r.id === night.region);
  const bs = (bookingsByDate(snapshot.food_bookings).get(night.date) ?? []).slice().sort((a, b) => (MEAL_ORDER[b.meal ?? "dinner"] ?? 2) - (MEAL_ORDER[a.meal ?? "dinner"] ?? 2));
  const taken = new Set(snapshot.food_bookings.map((b) => b.target_id));
  const here = places.filter((p) => night.cities.includes(p.city));
  const options = here
    .filter((p) => !taken.has(p.id) && openOn(p, night.date) === "open" && p.pregnancy !== "avoid" && (!p.meals || p.meals.includes("dinner")))
    .sort((a, b) => Number(b.pregnancy === "ok") - Number(a.pregnancy === "ok") || Number(b.seven ? SEVEN_MARK[b.seven].fits : 0) - Number(a.seven ? SEVEN_MARK[a.seven].fits : 0) || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);
  const tryToday = dishes.filter((d) => night.cities.includes(d.city) && d.must).slice(0, 4);
  const dinnerBooked = bs.some((b) => b.meal === "dinner" || !b.meal);
  const tomorrow = nights.find((n) => n.date === addDays(night.date, 1));
  const travel = !tomorrow || tomorrow.stop !== night.stop;

  return (
    <main className="mx-auto grid max-w-2xl gap-4 px-4 pt-3 pb-8">
      <header className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="display text-[2.2rem] leading-none">{isToday ? "Tonight" : "That night"}</h1>
          <label className="relative">
            <span className="sr-only">Night</span>
            <select value={night.date} onChange={(e) => router.replace(`/food?night=${e.target.value}`, { scroll: false })} className="min-h-10 rounded-full py-1 pr-8 pl-3 text-sm font-semibold">
              {nights.map((n) => (
                <option key={n.date} value={n.date}>
                  {snapshot.regions.find((r) => r.id === n.region)?.name.split(",")[0]} · {fmtDay(n.date)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-ink-2">
          <RegionDot id={night.region} size={8} />
          {region?.name.split(",")[0]} · {fmtDay(night.date)}
          {!isToday ? (
            <Link href="/food?table=1" className="ml-auto text-accent no-underline">
              All nights ›
            </Link>
          ) : null}
        </p>
      </header>

      {bs.map((b) => (
        <Link key={b.id} href={sheetHref(b.target_id)} className={`card grid gap-1 p-4 no-underline ${isConfirmed(b) ? "border-ok/60" : ""}`}>
          <span className="flex items-center justify-between gap-2">
            <span className={`text-[0.7rem] font-bold tracking-[0.1em] uppercase ${isConfirmed(b) ? "text-ok" : "text-ask"}`}>
              {isConfirmed(b) ? "Booked" : b.status === "held" ? "Requested" : "Picked"} · {b.meal ?? "dinner"}
              {b.time ? ` ${b.time}` : ""}
            </span>
            {isConfirmed(b) ? (
              <span aria-hidden="true" className="jp grid size-[34px] -rotate-[8deg] place-items-center rounded-full border-2 border-ok text-[11px] font-bold text-ok">
                予約
              </span>
            ) : null}
          </span>
          <b className="font-display text-[1.4rem] leading-tight">{b.name.replace(/ \([^)]*\)$/, "")}</b>
          <PlaceMeta p={places.find((p) => p.id === b.target_id)} />
          {b.ref ? <span className="text-xs text-muted">Ref {b.ref}</span> : null}
        </Link>
      ))}

      {!dinnerBooked ? (
        stay?.lodging === "ryokan" ? (
          <div className="card grid gap-1 p-4">
            <span className="text-[0.7rem] font-bold tracking-[0.1em] text-ok uppercase">Dinner at the ryokan</span>
            <span className="text-sm text-ink-2">Kaiseki and breakfast come with the room. Remind them at check-in: Fernanda has the cooked swaps.</span>
          </div>
        ) : (
          <div className="grid gap-2 rounded-2xl border-2 border-dashed border-accent bg-card p-4">
            <span className="flex items-baseline justify-between">
              <b>Dinner</b>
              <span className="text-xs font-bold text-accent">not booked</span>
            </span>
            {options.length ? <span className="text-sm text-ink-2">Open tonight and good for us: {options.map((o) => o.name).join(", ")}.</span> : null}
            {city ? (
              <Link href={`/food/${city}?date=${night.date}`} className="grid min-h-11 place-items-center rounded-xl bg-accent font-bold text-accent-ink no-underline">
                Choose dinner
              </Link>
            ) : null}
          </div>
        )
      ) : null}

      {tryToday.length ? (
        <section className="grid gap-2" aria-labelledby="try-today">
          <h2 id="try-today" className="text-[1.3rem]">
            Try here
          </h2>
          <ul className="grid grid-cols-2 gap-2.5">
            {tryToday.map((d) => (
              <li key={d.id}>
                <DishTile dish={d} photo={d.photo} href={`/food/${d.city}?view=try&dish=${d.slug}`} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {options.length ? (
        <section className="grid gap-2" aria-labelledby="plan-b">
          <div className="flex items-baseline justify-between">
            <h2 id="plan-b" className="text-[1.3rem]">
              If plans change
            </h2>
            <span className="text-xs text-muted">open {weekday(night.date)} {Number(night.date.slice(8))}</span>
          </div>
          <ul className="card divide-y divide-rule overflow-hidden">
            {options.map((p) => (
              <li key={p.id}>
                <Link href={sheetHref(p.id)} className="grid grid-cols-[40px_1fr] items-center gap-3 px-3 py-2.5 no-underline hover:bg-bg-2">
                  <TabelogTile score={p.score} size={40} />
                  <span className="grid min-w-0">
                    <b className="truncate">{p.name}</b>
                    <PlaceMeta p={p} />
                  </span>
                </Link>
              </li>
            ))}
            <li className="bg-bg-2/60 px-3 py-2 text-[0.82rem] text-ink-2">
              Plan B: <Link href="/food/guide/depachika">depachika</Link> · <Link href="/food/guide/konbini">konbini</Link> · <Link href="/food/guide/ekiben">station food</Link>
            </li>
          </ul>
        </section>
      ) : null}

      {travel && tomorrow ? (
        <p className="text-sm text-ink-2">
          Tomorrow we travel to {snapshot.regions.find((r) => r.id === tomorrow.region)?.name.split(",")[0]}: <Link href="/food/guide/ekiben">what to eat on the train</Link>.
        </p>
      ) : null}

      <div className="sticky bottom-24 z-10 flex gap-2">
        <Link href="/food/staff" className="grid min-h-12 flex-1 place-items-center rounded-xl bg-ink font-bold text-bg no-underline shadow-lg">
          Show staff 見せる
        </Link>
        <Link href="/food/book" className="grid min-h-12 place-items-center rounded-xl border-[1.5px] border-ink bg-card px-4 font-semibold no-underline shadow-lg">
          Bookings
        </Link>
      </div>

      {city ? (
        <p className="text-sm">
          <Link href={`/food/${city}`}>All of {DEEP_CITIES[city]?.name ?? city} ›</Link>
        </p>
      ) : null}
    </main>
  );
}

function PlaceMeta({ p }: { p?: PlaceLite }) {
  if (!p) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 text-[0.8rem]">
      <FernandaMark level={p.pregnancy} />
      <SevenMark seven={p.seven} />
      {p.genre ? <span className="truncate text-muted">{p.genre}</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------ shared */

export function Stops({ onRoute, others, stays }: { onRoute: string[]; others: string[]; stays: Stay[] }) {
  return (
    <section className="grid gap-2" aria-labelledby="stops">
      <h2 id="stops" className="text-[1.35rem]">
        Where to eat, stop by stop
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {onRoute.map((c, i) => (
          <li key={c}>
            <StopCard city={c} n={stopNumber(stays, c) ?? i + 1} />
          </li>
        ))}
      </ul>
      {others.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-muted">Not on the route ({others.length})</summary>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {others.map((c) => (
              <li key={c}>
                <StopCard city={c} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function StopCard({ city, n }: { city: string; n?: number }) {
  const c = DEEP_CITIES[city];
  if (!c) return null;
  return (
    <Link href={`/food/${city}`} className="card grid h-full content-start gap-1 p-3 no-underline">
      <span className="eyebrow">{n ? `Stop ${n}` : "Alternative"}</span>
      <b className="font-display text-[1.15rem] leading-tight">{c.name}</b>
      <span className="line-clamp-2 text-xs text-ink-2">{c.places?.length ?? 0} places · {(c.meibutsu ?? []).filter((d) => d.must).length} must-tries</span>
    </Link>
  );
}

const GUIDES: { href: string; title: string; ja?: string; sub: string }[] = [
  { href: "/food/book", title: "Book by…", sub: "Every date to book, in order" },
  { href: "/food/staff", title: "Show staff", ja: "見せる", sub: "Big Japanese for the counter" },
  { href: "/food/guide/fernanda", title: "For Fernanda", sub: "Fine, ask, skip" },
  { href: "/food/guide/how", title: "How we eat", sub: "Seven at the table" },
  { href: "/food/guide/depachika", title: "Depachika", ja: "デパ地下", sub: "Food halls and bentō" },
  { href: "/food/guide/ekiben", title: "Station food", ja: "駅弁", sub: "Ekiben for the trains" },
  { href: "/food/guide/konbini", title: "Konbini", ja: "コンビニ", sub: "What to buy, what to skip" },
  { href: "/food/guide/etiquette", title: "Manners", sub: "At the table and the counter" },
  { href: "/food/guide/calendar", title: "Day by day", sub: "What's open on each date" },
  { href: "/food/guide/ryokan", title: "Ryokan meals", sub: "Yudanaka, 24–27 Dec" },
  { href: "/food/guide/ours", title: "Our own list", sub: "Saved places and Tokyo bars" },
];

export function Guides() {
  return (
    <section className="grid gap-2" aria-labelledby="guides">
      <h2 id="guides" className="text-[1.35rem]">
        How-to guides
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

