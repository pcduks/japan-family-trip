"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmtDay, weekday } from "@/lib/dates";
import {
  CAT_LABEL,
  COMMENT_TYPE,
  HOODS,
  REST,
  WALKS,
  WHEN_LABEL,
  ZONES,
  ZONE_HEX,
  ZONE_INK,
  datesOfWalk,
  distanceKm,
  footprint,
  heartsBySpot,
  nearbyHoods,
  nearest,
  nyNote,
  reflectionId,
  routeUrl,
  spotById,
  thePlan,
  todayInJapan,
  tokyoDays,
  walkByN,
  type Pins,
  type Spot,
  type SpotCat,
  type TokyoDay,
  type Walk,
} from "@/lib/tokyo";
import { EkiStamp } from "../EkiStamp";
import { useStore } from "../providers";
import { Avatar } from "../ui";
import { CatIcon } from "./CatIcon";
import { SpotSheet } from "./SpotSheet";
import { TokyoMap, type MapSpot } from "./TokyoMap";
import { loadWalkSpots, useTokyoSpots } from "./useTokyoSpots";

type Filter = SpotCat | "all" | "saved";
const FILTERS: [Filter, string][] = [
  ["all", "Everything"],
  ["saved", "♥ Saved"],
  ["cafe", "Coffee"],
  ["food", "Eat"],
  ["sweets", "Sweets"],
  ["shop", "Shops"],
  ["culture", "Culture"],
  ["park", "Parks"],
  ["bar", "Bars"],
];
const FILTER_CATS: Partial<Record<Filter, SpotCat[]>> = {
  cafe: ["cafe", "bakery"],
  food: ["food"],
  sweets: ["sweets", "bakery"],
  shop: ["shop", "book", "market"],
  culture: ["culture", "view"],
  park: ["park"],
  bar: ["bar"],
};
const TOKYO_CENTRE = { lat: 35.68, lng: 139.72 };

/** Tokyo on foot: the ten walks, a live map, the family's hearts, and the days the route gives us in Tokyo. */
export function TokyoView({ initialWalk, initialSpot }: { initialWalk: number | null; initialSpot: string | null }) {
  const { snapshot, me, resolvedTheme, pinTokyoWalk } = useStore();
  const today = todayInJapan();

  /* the route's Tokyo days and the walks pinned to them */
  const plan = thePlan(snapshot);
  const days = useMemo(() => tokyoDays(plan, snapshot), [plan, snapshot]);
  const pins: Pins = snapshot.tokyo_pins;
  const dateOfWalk = useMemo(() => datesOfWalk(pins), [pins]);
  const hearts = useMemo(() => heartsBySpot(snapshot.reactions), [snapshot.reactions]);
  const ny = snapshot.calendar.new_year_closures;

  /* selection */
  const todayWalk = pins[today] ?? null;
  const [chosenN, setN] = useState<number>(initialWalk ?? (initialSpot ? (spotById(initialSpot)?.walk ?? 1) : 1));
  const [picked, setPicked] = useState(initialWalk != null || initialSpot != null);
  // Until someone picks: today's pinned walk wins when the URL asked for nothing.
  const n = !picked && todayWalk != null ? todayWalk : chosenN;
  const walk = n === 0 ? null : (walkByN(n) ?? WALKS[0]);
  const [openSpot, setOpenSpot] = useState<string | null>(initialSpot && spotById(initialSpot) ? initialSpot : null);
  const [focusHood, setFocusHood] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [allHoods, setAllHoods] = useState(false);
  const [tall, setTall] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("walk", String(n));
    if (openSpot) u.searchParams.set("spot", openSpot);
    else u.searchParams.delete("spot");
    window.history.replaceState(null, "", u);
  }, [n, openSpot]);

  const pick = useCallback((next: number) => {
    setPicked(true);
    setN(next);
    setFocusHood(null);
  }, []);

  /* pins on the map */
  const { hits, busy, unavailable, loaded } = useTokyoSpots([n]);
  const walkSpots: Spot[] = walk ? walk.spots : REST.spots;
  const matches = useCallback(
    (s: Spot) => {
      if (s.cat === "transit") return false;
      if (filter === "all") return true;
      if (filter === "saved") return (hearts.get(s.id)?.length ?? 0) > 0;
      return (FILTER_CATS[filter] ?? []).includes(s.cat);
    },
    [filter, hearts],
  );
  const mapSpots = useMemo<MapSpot[]>(() => walkSpots.filter((s) => hits[s.id] && matches(s)).map((s) => ({ spot: s, hit: hits[s.id], saved: (hearts.get(s.id)?.length ?? 0) > 0 })), [walkSpots, hits, matches, hearts]);
  const walkHoods = useMemo(() => (walk ? walk.hoods.map((h) => HOODS[h]).filter(Boolean) : []), [walk]);
  const near = useMemo(() => {
    if (!walk) return [];
    const seen = new Set<string>();
    return walk.hoods
      .flatMap((h) => nearbyHoods(h, 1.8, walk.n))
      .filter((x) => (seen.has(x.hood.id) ? false : (seen.add(x.hood.id), true)))
      .sort((a, b) => a.km - b.km);
  }, [walk]);
  const otherHoods = useMemo(() => {
    const own = new Set(walkHoods.map((h) => h.id));
    if (allHoods || !walk) return Object.values(HOODS).filter((h) => !own.has(h.id));
    return near.map((x) => x.hood);
  }, [allHoods, walk, walkHoods, near]);
  const color = ZONE_HEX[resolvedTheme][walk ? HOODS[walk.hoods[0]].zone : "centre"];
  const walkDates = walk ? (dateOfWalk.get(walk.n) ?? []) : (dateOfWalk.get(0) ?? []);

  /* where am I */
  function locate() {
    if (!("geolocation" in navigator)) return setGeoError("This device can't share its location.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      () => setGeoError("Couldn't get your location. Allow it and try again."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }
  const farFromTokyo = geo ? distanceKm(geo, TOKYO_CENTRE) > 40 : false;
  const nearHoods = useMemo(() => (geo ? nearest(geo, Object.values(HOODS), 3) : []), [geo]);
  const nearSpots = useMemo(() => {
    if (!geo) return [];
    const all = Object.entries(hits).map(([id, h]) => ({ id, lat: h.lat, lng: h.lng }));
    return nearest(geo, all, 6).map((x) => ({ ...x, spot: spotById(x.id)! })).filter((x) => x.spot);
  }, [geo, hits]);

  function onHood(id: string) {
    if (walk && walk.hoods.includes(id)) {
      setFocusHood((cur) => (cur === id ? null : id));
      document.getElementById(`hood-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const other = WALKS.find((w) => w.hoods.includes(id));
    if (other) {
      pick(other.n);
      setTimeout(() => setFocusHood(id), 0);
    }
  }

  const open = openSpot ? spotById(openSpot) : null;
  const savedCount = hearts.size;

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 pt-3 pb-8">
      <header className="grid gap-1.5">
        <p className="eyebrow">The local guide · 28 neighbourhoods · 10 walks</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="display text-[2.1rem] leading-[1.05]">
            Tokyo on foot
            {todayWalk != null ? (
              <span className="block text-[1.1rem] text-accent">Today is walk {todayWalk || "zero"}: {walkByN(todayWalk)?.title ?? REST.title}</span>
            ) : days.length ? (
              <span className="block text-[1.1rem] text-ink-2">
                {days.length} days in Tokyo on the route, {fmtDay(days[0].date, false)} to {fmtDay(days.at(-1)!.date, false)}
              </span>
            ) : (
              <span className="block text-[1.1rem] text-ink-2">Tokyo is not on the route right now</span>
            )}
          </h1>
          <EkiStamp motif="tower" ink="var(--accent)" top="Tokyo" bottom="on foot" size={84} rotate={7} seed={11} label="" className="shrink-0" />
        </div>
        <p className="max-w-2xl text-ink-2">
          Ten one-day walks, three neighbourhoods each, at a local’s pace: a coffee, a street, a park, lunch, a few shops, dinner. Tap a place for photos and hours, save what you like, and pin a walk to each day the route gives us in Tokyo.
        </p>
      </header>

      {days.length ? <DaysStrip days={days} pins={pins} current={n} onPick={pick} today={today} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        {/* ------------------------------------------------ map */}
        <div className={`sticky top-0 z-20 -mx-4 lg:order-2 lg:mx-0 lg:top-4 lg:h-[calc(100dvh-2rem)] ${tall ? "h-[72dvh]" : "h-[42dvh]"} transition-[height] duration-300`}>
          <div className="relative size-full overflow-hidden border-y border-rule bg-bg-2 lg:rounded-2xl lg:border" style={{ boxShadow: "var(--glow)" }}>
            <TokyoMap
              walkHoods={walkHoods}
              otherHoods={otherHoods}
              spots={mapSpots}
              selectedSpot={openSpot}
              focusHood={focusHood}
              color={color}
              theme={resolvedTheme}
              me={geo}
              onSpot={setOpenSpot}
              onHood={onHood}
              label={walk ? `Map of walk ${walk.n}: ${walk.title}` : "Map of Tokyo"}
            />
            <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
              <div className="pointer-events-auto flex flex-wrap gap-1.5">
                <MapChip pressed={allHoods} onClick={() => setAllHoods((v) => !v)}>
                  {allHoods ? "All 28" : "Nearby"}
                </MapChip>
                <MapChip pressed={!!geo} onClick={locate}>
                  ◎ Where am I
                </MapChip>
              </div>
              <MapChip onClick={() => setTall((v) => !v)} className="lg:hidden" label={tall ? "Smaller map" : "Bigger map"}>
                {tall ? "⤓" : "⤢"}
              </MapChip>
            </div>
            <div className="pointer-events-none absolute right-2 bottom-7 left-2 flex items-end justify-between gap-2 text-xs">
              <span className="rounded-md border border-rule bg-card/90 px-2 py-1 text-muted">
                {busy ? "Finding the places on Google…" : unavailable ? "No Google here: tap a place to open it in Maps" : mapSpots.length ? `${mapSpots.length} places on the map` : walk ? "The walk's neighbourhoods" : ""}
              </span>
              {walk ? (
                <a className="pointer-events-auto rounded-md border border-rule bg-card/90 px-2 py-1 font-bold text-ink no-underline" href={routeUrl(walkHoods.map((h) => h.station))} target="_blank" rel="noreferrer">
                  The day in Maps ↗
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ content */}
        <div className="grid gap-6 lg:order-1">
          {geo ? (
            <section className="card grid gap-2 p-4" aria-label="Near you">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[1.35rem]">Near you</h2>
                <button type="button" className="text-xs underline" onClick={() => setGeo(null)}>
                  close
                </button>
              </div>
              {farFromTokyo ? (
                <p className="text-sm text-muted">You are {Math.round(distanceKm(geo, TOKYO_CENTRE))} km from central Tokyo. Once there, this shows what is a few steps away.</p>
              ) : (
                <>
                  <p className="flex flex-wrap gap-1.5">
                    {nearHoods.map((h) => (
                      <Chip key={h.id} onClick={() => onHood(h.id)}>
                        {h.name} · {fmtKm(h.km)}
                      </Chip>
                    ))}
                  </p>
                  {nearSpots.length ? (
                    <ul className="grid gap-1">
                      {nearSpots.map((x) => (
                        <li key={x.id}>
                          <SpotRow spot={x.spot} onOpen={() => setOpenSpot(x.id)} saved={hearts.get(x.id)?.length ?? 0} trailing={fmtKm(x.km)} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted">
                      Places appear here as their walks load{loaded.size < 10 && !unavailable ? ": " : "."}
                      {loaded.size < 10 && !unavailable ? (
                        <button type="button" className="underline" onClick={() => WALKS.forEach((w) => void loadWalkSpots(w.n))}>
                          load every walk
                        </button>
                      ) : null}
                    </p>
                  )}
                </>
              )}
              {geoError ? <p className="text-xs text-danger">{geoError}</p> : null}
            </section>
          ) : geoError ? (
            <p className="text-xs text-danger">{geoError}</p>
          ) : null}

          <WalkPicker current={n} onPick={pick} dateOfWalk={dateOfWalk} theme={resolvedTheme} hearts={hearts} />

          {walk ? (
            <WalkPanel
              walk={walk}
              color={color}
              days={days}
              walkDates={walkDates}
              pins={pins}
              canPin={!!me}
              pin={(date, w) => pinTokyoWalk(date, w)}
              filter={filter}
              setFilter={setFilter}
              matches={matches}
              focusHood={focusHood}
              onFocusHood={(id) => setFocusHood((cur) => (cur === id ? null : id))}
              onOpen={setOpenSpot}
              hearts={hearts}
              near={near}
              onHood={onHood}
              ny={ny}
              savedCount={savedCount}
            />
          ) : (
            <RestPanel onOpen={setOpenSpot} hearts={hearts} days={days} pins={pins} canPin={!!me} pin={(date, w) => pinTokyoWalk(date, w)} />
          )}
        </div>
      </div>

      <SpotSheet spot={open} hit={open ? hits[open.id] : undefined} savedBy={open ? (hearts.get(open.id) ?? []) : []} walkDate={open ? (dateOfWalk.get(open.walk)?.[0] ?? null) : null} onClose={() => setOpenSpot(null)} />
    </main>
  );
}

/* ------------------------------------------------------------ days */

function DaysStrip({ days, pins, current, onPick, today }: { days: TokyoDay[]; pins: Pins; current: number; onPick: (n: number) => void; today: string }) {
  return (
    <section className="grid gap-2" aria-label="Our days in Tokyo">
      <p className="eyebrow">Our days in Tokyo · from the route</p>
      <ol className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const pinned = pins[d.date];
          const w = pinned != null ? walkByN(pinned) : null;
          const on = pinned != null && pinned === current;
          return (
            <li key={d.date} className="shrink-0">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => pinned != null && onPick(pinned)}
                className={`grid h-full w-[11rem] content-start gap-1 rounded-2xl border p-3 text-left transition-colors ${on ? "border-ink bg-ink text-bg" : "border-rule bg-card"}`}
              >
                <span className={`flex justify-between text-[0.68rem] font-bold tracking-[0.1em] uppercase ${on ? "opacity-80" : "text-muted"}`}>
                  <span>{fmtDay(d.date)}</span>
                  {d.date === today ? <span className="text-accent">today</span> : d.partial ? <span>{d.kind}</span> : null}
                </span>
                <span className={`line-clamp-2 text-[0.74rem] leading-snug ${on ? "opacity-80" : "text-ink-2"}`}>{d.title}</span>
                {pinned != null ? (
                  <span className="mt-auto flex items-center gap-1.5 pt-1 text-[0.8rem] font-semibold">
                    <span className="grid size-5 place-items-center rounded-full text-[0.65rem] font-extrabold" style={{ background: on ? "var(--bg)" : "var(--accent)", color: on ? "var(--ink)" : "var(--accent-ink)" }}>
                      {pinned || "☺"}
                    </span>
                    <span className="truncate">{w ? w.title : REST.title}</span>
                  </span>
                ) : (
                  <span className="mt-auto pt-1 text-[0.74rem] text-muted">No walk pinned yet</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------- picker */

function WalkPicker({ current, onPick, dateOfWalk, theme, hearts }: { current: number; onPick: (n: number) => void; dateOfWalk: Map<number, string[]>; theme: "light" | "dark"; hearts: Map<string, string[]> }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(`[data-n="${current}"]`);
    const box = ref.current;
    if (!el || !box) return;
    const a = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    box.scrollBy({ left: a.left - b.left - b.width / 2 + a.width / 2, behavior: "smooth" });
  }, [current]);
  return (
    <section className="grid gap-2" aria-label="The ten walks">
      <ol ref={ref} className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1" role="tablist">
        {[...WALKS.map((w) => w.n), 0].map((n) => {
          const w = walkByN(n);
          const on = n === current;
          const ink = ZONE_HEX[theme][w ? HOODS[w.hoods[0]].zone : "centre"];
          const dates = dateOfWalk.get(n) ?? [];
          const saved = (w ? w.spots : REST.spots).filter((s) => hearts.has(s.id)).length;
          return (
            <li key={n} className="shrink-0 snap-start" data-n={n}>
              <button
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onPick(n)}
                className={`grid h-full w-[12rem] content-start gap-1 rounded-2xl border p-3 text-left transition-colors ${on ? "border-ink bg-ink text-bg" : "border-rule bg-card hover:shadow-[var(--shadow)]"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[0.68rem] font-extrabold tracking-[0.12em] uppercase" style={{ color: on ? "var(--bg)" : ink }}>
                    {w ? `Walk ${w.n}` : "Bonus"}
                  </span>
                  <span className="flex gap-1.5 text-[0.68rem] font-bold">
                    {dates.length ? <span className={on ? "opacity-80" : "text-ink-2"}>{dates.map((d) => fmtDay(d, false)).join(" · ")}</span> : null}
                    {saved ? <span className={on ? "" : "text-accent"}>♥{saved}</span> : null}
                  </span>
                </span>
                <span className="font-display text-[1.15rem] leading-tight font-semibold">{w ? w.title : REST.title}</span>
                <span className={`line-clamp-2 text-[0.74rem] leading-snug ${on ? "opacity-80" : "text-muted"}`}>{w ? w.tagline : REST.tagline}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------- walk */

function WalkPanel({
  walk,
  color,
  days,
  walkDates,
  pins,
  canPin,
  pin,
  filter,
  setFilter,
  matches,
  focusHood,
  onFocusHood,
  onOpen,
  hearts,
  near,
  onHood,
  ny,
  savedCount,
}: {
  walk: Walk;
  color: string;
  days: TokyoDay[];
  walkDates: string[];
  pins: Pins;
  canPin: boolean;
  pin: (date: string, walk: number | null) => Promise<void>;
  filter: Filter;
  setFilter: (f: Filter) => void;
  matches: (s: Spot) => boolean;
  focusHood: string | null;
  onFocusHood: (id: string) => void;
  onOpen: (id: string) => void;
  hearts: Map<string, string[]>;
  near: ReturnType<typeof nearbyHoods>;
  onHood: (id: string) => void;
  ny: { start: string; end: string };
  savedCount: number;
}) {
  const { snapshot } = useStore();
  const f = footprint(walk);
  const zone = HOODS[walk.hoods[0]].zone;
  const walkDate = walkDates[0] ?? null;
  const closureDay = !!walkDate && walkDate >= ny.start && walkDate <= ny.end;
  const risky = closureDay ? walk.spots.filter((s) => nyNote(s, walkDate, ny)?.level === "warn").length : 0;
  const saved = walk.spots.filter((s) => hearts.has(s.id));
  const savers = [...new Set(saved.flatMap((s) => hearts.get(s.id) ?? []))];

  return (
    <section className="grid gap-5" aria-labelledby="walk-h">
      <div className="grid gap-2">
        <p className="eyebrow flex flex-wrap items-center gap-x-2">
          <span style={{ color: ZONE_INK[zone] }}>Walk {walk.n}</span> · {ZONES[zone].name} Tokyo
          <span className="text-muted">
            · about {f.km.toFixed(1)} km between the neighbourhoods · {f.spots} places
          </span>
        </p>
        <h2 id="walk-h" className="display text-[1.9rem] leading-[1.05]">
          {walk.title}
        </h2>
        <p className="text-ink-2">{walk.tagline}.</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>☕ {f.cafe} coffee and bakeries</span>
          <span>🍜 {f.eat} to eat and drink</span>
          <span>🛍 {f.shop} shops</span>
          <span>⛩ {f.culture} culture and parks</span>
        </p>
      </div>

      {days.length ? (
        <PinCard days={days} pins={pins} walkN={walk.n} canPin={canPin} pin={pin} walkDates={walkDates}>
          {closureDay && risky ? (
            <p className="rounded-xl p-3 text-sm" style={{ background: "var(--ny)" }}>
              <b className="text-accent">{fmtDay(walkDate!)} is in the New Year closures:</b> {risky} places on this walk (museums, shops, markets) may be shut. Cafés, parks and temples carry on, with queues.
            </p>
          ) : null}
        </PinCard>
      ) : null}

      {saved.length ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-accent">♥ {saved.length} saved on this walk</span>
          {savers.map((id) => (
            <Avatar key={id} traveller={id} travellers={snapshot.travellers} size={22} />
          ))}
          <span className="text-muted">· {savedCount} across Tokyo</span>
        </p>
      ) : null}

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter places">
        {FILTERS.map(([k, label]) => (
          <Chip key={k} pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </Chip>
        ))}
      </div>

      <ol className="grid gap-6">
        {walk.blocks.map((b) => (
          <li key={b.when} className="grid gap-3">
            <h3 className="flex items-baseline gap-2 text-[1.35rem]">
              {WHEN_LABEL[b.when].name} <span className="text-xs font-semibold tracking-wider text-muted uppercase">{WHEN_LABEL[b.when].hours}</span>
            </h3>
            <ol className="grid gap-3">
              {b.moves.map((m, i) => {
                const hood = HOODS[m.hood];
                const first = i === 0 ? true : b.moves[i - 1].hood !== m.hood;
                const spots = m.spots.filter(matches);
                const hidden = m.spots.filter((s) => s.cat !== "transit").length - spots.length;
                if (!spots.length && filter !== "all" && !m.spots.some((s) => s.cat === "transit")) return null;
                return (
                  <li key={m.title} id={first ? `hood-${m.hood}` : undefined} className="card grid gap-2 p-4 scroll-mt-[44dvh] lg:scroll-mt-4" style={focusHood === m.hood ? { borderColor: color } : undefined}>
                    {first ? (
                      <button type="button" className="flex flex-wrap items-center gap-2 text-left" onClick={() => onFocusHood(m.hood)} aria-pressed={focusHood === m.hood}>
                        <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold" style={{ background: color, color: "#fff" }}>
                          {walk.hoods.indexOf(m.hood) + 1 || "·"}
                        </span>
                        <span className="text-sm font-bold tracking-wider uppercase">{hood?.name}</span>
                        <span className="jp text-sm text-muted" lang="ja">
                          {hood?.ja}
                        </span>
                        {m.leg ? <span className="chip">{m.leg}</span> : null}
                      </button>
                    ) : m.leg ? (
                      <span className="chip justify-self-start">{m.leg}</span>
                    ) : null}
                    <h4 className="font-display text-[1.2rem] leading-tight font-semibold">{m.title}</h4>
                    <p className="text-sm text-ink-2">{m.text}</p>
                    {spots.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {spots.map((s) => (
                          <li key={s.id}>
                            <SpotChip spot={s} onOpen={() => onOpen(s.id)} saved={hearts.get(s.id)?.length ?? 0} ny={nyNote(s, walkDate, ny)?.level ?? null} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {hidden > 0 && filter !== "all" ? <p className="text-xs text-muted">+{hidden} outside the filter</p> : null}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>

      {near.length ? (
        <section className="grid gap-2 rounded-2xl border border-rule p-4" aria-label="Energy to spare">
          <p className="text-sm font-bold">Energy to spare? Neighbourhoods from other walks a few steps away:</p>
          <ul className="flex flex-wrap gap-1.5">
            {near.slice(0, 6).map((x) => (
              <li key={x.hood.id}>
                <Chip onClick={() => onHood(x.hood.id)}>
                  <span className="size-2 rounded-full" style={{ background: ZONE_INK[x.hood.zone] }} aria-hidden="true" />
                  {x.hood.name} · {fmtKm(x.km)}
                  {x.walks.length ? <span className="text-[0.65rem] text-muted">W{x.walks.join(",")}</span> : null}
                </Chip>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Reflection walk={walk} />
    </section>
  );
}

/** Pin this walk to one of the route's Tokyo days. */
function PinCard({ days, pins, walkN, canPin, pin, walkDates, children }: { days: TokyoDay[]; pins: Pins; walkN: number; canPin: boolean; pin: (date: string, walk: number | null) => Promise<void>; walkDates: string[]; children?: React.ReactNode }) {
  return (
    <div className="card grid gap-2 p-4">
      <p className="text-sm font-bold">{walkDates.length ? `Pinned to ${walkDates.map((d) => fmtDay(d)).join(" and ")}` : "Which day do we do this one?"}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pin the walk to a day">
        {days.map((d) => {
          const cur = pins[d.date];
          const on = cur === walkN;
          return (
            <Chip key={d.date} pressed={on} disabled={!canPin} title={cur != null && !on ? `This day has walk ${cur}; pinning swaps it.` : d.partial ? `${d.kind}: half a day at most` : undefined} onClick={() => pin(d.date, on ? null : walkN)}>
              {weekday(d.date)} {fmtDay(d.date, false)}
              {d.partial ? <span className="opacity-70">· {d.kind.toLowerCase()}</span> : null}
              {cur != null && !on ? <span className="text-[0.65rem] opacity-70">W{cur}</span> : null}
            </Chip>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        A pin shows on that day on <Link href="/">Trip</Link>, next to the plan’s own day. Everyone can change it.
      </p>
      {children}
    </div>
  );
}

/** The guide's end-of-day question, answered as family notes. */
function Reflection({ walk }: { walk: Walk }) {
  const { snapshot, me, addComment } = useStore();
  const id = reflectionId(walk.n);
  const answers = snapshot.comments.filter((c) => c.target_type === COMMENT_TYPE && c.target_id === id);
  const [text, setText] = useState("");
  return (
    <section className="grid gap-2 rounded-2xl border border-dashed border-rule p-4" aria-label="At the end of the day">
      <p className="eyebrow">At the end of the day</p>
      <p className="font-display text-[1.25rem] leading-snug">{walk.reflect}</p>
      {answers.length ? (
        <ul className="grid gap-2">
          {answers.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <Avatar traveller={c.author_id} travellers={snapshot.travellers} size={22} />
              <span className="min-w-0 text-ink-2">{c.body}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {me ? (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            await addComment(COMMENT_TYPE, id, text);
            setText("");
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="A line for the family" aria-label="Your answer" maxLength={400} className="min-w-0 flex-1" />
          <button className="btn btn-sm" disabled={!text.trim()}>
            Add
          </button>
        </form>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------- rest */

function RestPanel({ onOpen, hearts, days, pins, canPin, pin }: { onOpen: (id: string) => void; hearts: Map<string, string[]>; days: TokyoDay[]; pins: Pins; canPin: boolean; pin: (date: string, walk: number | null) => Promise<void> }) {
  return (
    <section className="grid gap-4" aria-labelledby="rest-h">
      <div className="grid gap-2">
        <p className="eyebrow">Bonus</p>
        <h2 id="rest-h" className="display text-[1.9rem] leading-[1.05]">
          {REST.title}
        </h2>
        <p className="text-ink-2">
          {REST.tagline}. {REST.note}
        </p>
      </div>
      {days.length ? <PinCard days={days} pins={pins} walkN={0} canPin={canPin} pin={pin} walkDates={datesOfWalk(pins).get(0) ?? []} /> : null}
      <ul className="grid gap-3">
        {REST.spots.map((s) => (
          <li key={s.id} className="card grid gap-2 p-4">
            <SpotRow spot={s} onOpen={() => onOpen(s.id)} saved={hearts.get(s.id)?.length ?? 0} trailing={HOODS[s.hood]?.name ?? ""} />
            <p className="text-sm text-ink-2">{s.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ bits */

function Chip({ children, pressed, onClick, disabled, title }: { children: React.ReactNode; pressed?: boolean; onClick: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-50 ${pressed ? "border-ink bg-ink text-bg" : "border-rule bg-card text-ink"}`}
    >
      {children}
    </button>
  );
}

function MapChip({ children, pressed, onClick, className = "", label }: { children: React.ReactNode; pressed?: boolean; onClick: () => void; className?: string; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={`pointer-events-auto inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold shadow-sm ${pressed ? "border-ink bg-ink text-bg" : "border-rule bg-card/95 text-ink"} ${className}`}
    >
      {children}
    </button>
  );
}

function SpotChip({ spot, onOpen, saved, ny }: { spot: Spot; onOpen: () => void; saved: number; ny: "warn" | "info" | null }) {
  return (
    <button type="button" className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-rule bg-card px-3 text-sm" onClick={onOpen} title={spot.note ?? undefined}>
      <CatIcon cat={spot.cat} size={14} className="shrink-0 text-muted" />
      <span className="truncate font-semibold">{spot.name}</span>
      {saved ? <span className="text-[0.7rem] font-bold text-accent">♥{saved}</span> : null}
      {ny === "warn" ? (
        <span className="text-[0.65rem] text-accent" aria-label="May be closed">
          ▲
        </span>
      ) : null}
    </button>
  );
}

function SpotRow({ spot, onOpen, saved, trailing }: { spot: Spot; onOpen: () => void; saved: number; trailing: string }) {
  return (
    <button type="button" className="flex w-full items-center gap-3 text-left" onClick={onOpen}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-rule bg-card text-ink-2">
        <CatIcon cat={spot.cat} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {spot.name}
          {saved ? <span className="ml-1.5 text-[0.7rem] font-bold text-accent">♥{saved}</span> : null}
        </span>
        <span className="block truncate text-xs text-muted">
          {CAT_LABEL[spot.cat]}
          {spot.note ? ` · ${spot.note}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-xs text-muted">{trailing}</span>
    </button>
  );
}

function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
