"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LAYER_INK, MEAL_LABEL, MEAL_SLOTS, allPins, cityAreas, cityDays, cityStays, fitOf, heartsByTarget, mealSuggestions, nearestArea, savedBy, type CityArea, type Fit, type Layer, type Meals, type MealSlot, type Pin } from "@/lib/city";
import type { PlannedDay } from "@/lib/days";
import { fmtDay, fmtRange } from "@/lib/dates";
import { kanji } from "@/lib/journey";
import { CAT_LABEL, REST, distanceKm, nearest, todayInJapan, walkByN, type SpotCat } from "@/lib/tokyo";
import { useStore } from "../providers";
import { RegionCover } from "../RegionCover";
import { CatIcon } from "../tokyo/CatIcon";
import { AddTipSheet } from "./AddTipSheet";
import { Chip, LayerDot, LayerToggle, MapChip, PinRow, PinTile, Segmented, fmtKm } from "./bits";
import { BUBBLE_ABOVE, CityMap, type Bubble, type MapPin } from "./CityMap";
import { PinSheet } from "./PinSheet";
import { coordsOf, usePins } from "./usePins";

/*
 * One page per stop (docs/product/city-pages.md): everything we know about a
 * city as pins in four layers, on one map, read through three lenses: our
 * Days there, the city's Areas, or Types of place. On a phone the map comes
 * first and its controls live inside it; the list scrolls freely under a
 * sticky lens bar. Tap anything for its card; "+" drops a tip.
 */

type Lens = "days" | "areas" | "types";
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
  park: ["park", "spa"],
  bar: ["bar"],
};
const LAYERS: Layer[] = ["plan", "walk", "guide", "ours"];
const LAYER_PRIORITY: Record<Layer, number> = { ours: 0, plan: 1, guide: 2, walk: 3 };
const TYPE_ORDER: SpotCat[] = ["food", "cafe", "bakery", "sweets", "bar", "market", "shop", "book", "culture", "park", "view", "spa", "transit"];
const NEAR_KM = 1.2;
const FAR_KM = 60;
const AREA_KM = 1.6;

type Hits = Record<string, { photo?: string }>;
type DayFit = { pin: Pin; near: string; km: number };

export function CityView({ region, initialPin, initialDay, initialLens }: { region: string; initialPin: string | null; initialDay: string | null; initialLens: Lens | null }) {
  const { snapshot, me, resolvedTheme, setMeal } = useStore();
  const today = todayInJapan();
  const regionRow = snapshot.regions.find((r) => r.id === region);
  const name = regionRow?.name ?? region;
  const centre = useMemo(() => ({ lat: regionRow?.lat ?? 35.68, lng: regionRow?.lng ?? 139.72 }), [regionRow]);

  /* the data, from the slices of the snapshot it depends on (a poll that changes votes must not rebuild the page) */
  const { versions, regions, places, days: dayRows, calendar, food_list, tips, reactions, meals } = snapshot;
  const slice = useMemo(() => ({ versions, regions, places, days: dayRows, calendar, food_list }), [versions, regions, places, dayRows, calendar, food_list]);
  const days = useMemo(() => cityDays(region, slice), [region, slice]);
  const stays = useMemo(() => cityStays(region, slice), [region, slice]);
  const areas = useMemo(() => cityAreas(region), [region]);
  const pins = useMemo(() => allPins(region, slice, tips), [region, slice, tips]);
  const byId = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);
  const hearts = useMemo(() => heartsByTarget(reactions), [reactions]);
  const savedCount = useCallback((p: Pin) => savedBy(p, hearts).length, [hearts]);
  const counts = useMemo(() => Object.fromEntries(LAYERS.map((l) => [l, pins.filter((p) => p.layer === l).length])) as Record<Layer, number>, [pins]);

  /* what is on */
  const [layers, setLayers] = useState<Set<Layer>>(() => new Set<Layer>(LAYERS));
  const [lens, setLens] = useState<Lens>(initialLens ?? (days.length ? "days" : "areas"));
  const [filter, setFilter] = useState<Filter>("all");
  const [day, setDay] = useState<string>(() => initialDay ?? (days.find((d) => d.date === today)?.date ?? days[0]?.date ?? ""));
  const [areaId, setAreaId] = useState<string | null>(null);
  const [openPin, setOpenPin] = useState<string | null>(initialPin);
  const [adding, setAdding] = useState(false);
  const [full, setFull] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const u = new URL(window.location.href);
    if (openPin) u.searchParams.set("pin", openPin);
    else u.searchParams.delete("pin");
    if (lens === "days" && day) u.searchParams.set("day", day);
    else u.searchParams.delete("day");
    if (lens !== (days.length ? "days" : "areas")) u.searchParams.set("lens", lens);
    else u.searchParams.delete("lens");
    window.history.replaceState(null, "", u);
  }, [openPin, lens, day, days.length]);

  // The fullscreen map sits over the bottom nav; keep the page from scrolling under it.
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  const matches = useCallback(
    (p: Pin) => {
      if (!layers.has(p.layer)) return false;
      if (filter === "all") return true;
      if (filter === "saved") return savedCount(p) > 0;
      return (FILTER_CATS[filter] ?? []).includes(p.cat);
    },
    [layers, filter, savedCount],
  );
  const wanted = useMemo(() => pins.filter(matches), [pins, matches]);
  /* what the current view shows is asked for first; the rest of the page's pins follow */
  const askOrder = useMemo(() => {
    const first = lens === "days" ? wanted.filter((p) => p.layer === "plan" || p.layer === "ours") : wanted;
    const seen = new Set(first.map((p) => p.id));
    return [...first, ...wanted.filter((p) => !seen.has(p.id)), ...pins.filter((p) => !seen.has(p.id) && !matches(p))];
  }, [lens, wanted, pins, matches]);
  const { hits, busy, unavailable } = usePins(region, askOrder);
  const coords = useMemo(() => {
    const out: Record<string, { lat: number; lng: number }> = {};
    for (const p of pins) {
      const c = coordsOf(p, hits);
      // A short name can land Google in another city; a hit that far away is no hit.
      if (c && distanceKm(c, centre) <= FAR_KM) out[p.id] = c;
    }
    return out;
  }, [pins, hits, centre]);

  /* The same place in two layers (the saved list and the food guide, say) is one pin: the layer that matters most keeps it. */
  const { shadowed, alsoIn } = useMemo(() => {
    const groups = new Map<string, Pin[]>();
    const keyOf = (p: Pin) => (p.ref.kind === "tip" ? (tips.find((t) => t.id === (p.ref as { id: string }).id)?.google_place_id ?? null) : (hits[p.id]?.placeId ?? null)) ?? `name:${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
    for (const p of pins) groups.set(keyOf(p), [...(groups.get(keyOf(p)) ?? []), p]);
    const shadowed = new Map<string, string>();
    const alsoIn = new Map<string, Layer[]>();
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      const [keep, ...rest] = [...g].sort((a, b) => LAYER_PRIORITY[a.layer] - LAYER_PRIORITY[b.layer]);
      for (const r of rest) shadowed.set(r.id, keep.id);
      alsoIn.set(keep.id, [...new Set(rest.map((r) => r.layer))]);
    }
    return { shadowed, alsoIn };
  }, [pins, hits, tips]);
  const active = useMemo(() => wanted.filter((p) => !shadowed.has(p.id)), [wanted, shadowed]);

  /* the plan's own places, with coordinates from the library or from Google */
  const placeCoords = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; name: string }>();
    for (const p of places) if (p.lat != null && p.lng != null) m.set(p.id, { lat: p.lat, lng: p.lng, name: p.name });
    for (const p of pins) if (p.ref.kind === "place" && coords[p.id] && !m.has(p.ref.id)) m.set(p.ref.id, { ...coords[p.id], name: p.name });
    return m;
  }, [places, pins, coords]);
  /* tips put on a day count as that day's things too */
  const pinsOnDays = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; name: string }[]>();
    for (const p of pins) if (p.date && p.layer !== "plan" && coords[p.id]) m.set(p.date, [...(m.get(p.date) ?? []), { ...coords[p.id], name: p.name }]);
    return m;
  }, [pins, coords]);
  const thingsOf = useCallback(
    (d: PlannedDay) => [...d.items.map((it) => (it.place_id ? placeCoords.get(it.place_id) : undefined)).filter((x): x is { lat: number; lng: number; name: string } => !!x), ...(pinsOnDays.get(d.date) ?? [])],
    [placeCoords, pinsOnDays],
  );

  /* what fits each day: one pass over the active pins */
  const fitsByDay = useMemo(() => {
    const out = new Map<string, DayFit[]>();
    for (const d of days) {
      const things = thingsOf(d);
      const list: DayFit[] = [];
      if (things.length)
        for (const p of active) {
          if (p.date === d.date) continue;
          const at = coords[p.id];
          if (!at) continue;
          let best: { near: string; km: number } | null = null;
          for (const t of things) {
            // A cheap box before the haversine: 0.011° is about 1.2 km.
            if (Math.abs(at.lat - t.lat) > 0.011 || Math.abs(at.lng - t.lng) > 0.014) continue;
            const km = distanceKm(at, t);
            if (km <= NEAR_KM && (!best || km < best.km)) best = { near: t.name, km };
          }
          if (best) list.push({ pin: p, ...best });
        }
      out.set(
        d.date,
        list.sort((a, b) => a.km - b.km),
      );
    }
    return out;
  }, [days, thingsOf, active, coords]);
  const theDay = days.find((d) => d.date === day) ?? null;
  const dayPins = useMemo(() => (theDay ? pins.filter((p) => p.date === theDay.date && !shadowed.has(p.id)) : []), [pins, theDay, shadowed]);
  const dayFits = useMemo(() => (theDay ? (fitsByDay.get(theDay.date) ?? []) : []), [fitsByDay, theDay]);
  const dayCounts = useMemo(() => new Map(days.map((d) => [d.date, { plan: pins.filter((p) => p.layer === "plan" && p.date === d.date).length, ours: pins.filter((p) => p.layer === "ours" && p.date === d.date).length, fits: fitsByDay.get(d.date)?.length ?? 0 }])), [days, pins, fitsByDay]);

  /* areas: which pin sits in which, once per change of coordinates */
  const areaOfPin = useMemo(() => {
    const m = new Map<string, CityArea | null>();
    for (const p of pins) {
      const at = coords[p.id];
      if (at) {
        const n = nearestArea(at, areas);
        m.set(p.id, n && n.km <= AREA_KM ? n.area : null);
      } else m.set(p.id, p.area ? (areas.find((a) => a.name === p.area || p.area!.startsWith(a.name)) ?? null) : null);
    }
    return m;
  }, [pins, coords, areas]);
  const byArea = useMemo(() => {
    const m = new Map<string, Pin[]>();
    for (const p of active) {
      const a = areaOfPin.get(p.id);
      const k = a ? a.id : "elsewhere";
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [active, areaOfPin]);
  const areasSorted = useMemo(() => [...areas].filter((a) => byArea.has(a.id)).sort((a, b) => (byArea.get(b.id)?.length ?? 0) - (byArea.get(a.id)?.length ?? 0)), [areas, byArea]);

  /* the map: the current view's pins, or area bubbles when there would be too many to read */
  const { mapPins, bubbles } = useMemo(() => {
    let list: Pin[];
    if (lens === "days" && theDay) list = [...dayPins, ...dayFits.map((f) => f.pin)];
    else if (lens === "areas" && areaId) list = byArea.get(areaId) ?? [];
    else list = active;
    const placed = list.filter((p) => coords[p.id]);
    if (placed.length > BUBBLE_ABOVE && !(lens === "areas" && areaId)) {
      const groups = new Map<string, Pin[]>();
      for (const p of placed) {
        const a = areaOfPin.get(p.id);
        if (a) groups.set(a.id, [...(groups.get(a.id) ?? []), p]);
      }
      const bubbles: Bubble[] = [...groups.entries()].map(([id, ps]) => {
        const area = areas.find((a) => a.id === id)!;
        const tally = new Map<Layer, number>();
        for (const p of ps) tally.set(p.layer, (tally.get(p.layer) ?? 0) + 1);
        const layer = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return { area, count: ps.length, layer };
      });
      return { mapPins: [] as MapPin[], bubbles };
    }
    const saved = new Set(placed.filter((p) => savedCount(p) > 0).map((p) => p.id));
    const drawn = placed.sort((a, b) => Number(saved.has(b.id)) - Number(saved.has(a.id)) || LAYER_PRIORITY[a.layer] - LAYER_PRIORITY[b.layer]);
    return { mapPins: drawn.map((p): MapPin => ({ pin: p, at: coords[p.id], saved: saved.has(p.id) })), bubbles: [] as Bubble[] };
  }, [lens, theDay, dayPins, dayFits, areaId, byArea, active, coords, areaOfPin, areas, savedCount]);
  const focusArea = lens === "areas" && areaId ? (areas.find((a) => a.id === areaId) ?? null) : null;
  const focus = useMemo(() => (focusArea ? { lat: focusArea.lat, lng: focusArea.lng } : null), [focusArea]);
  const fitKey = `${lens}|${lens === "days" ? day : lens === "areas" ? (areaId ?? "") : ""}`;

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
  const far = geo ? distanceKm(geo, centre) > 40 : false;
  const nearMe = useMemo(() => (geo ? nearest(geo, active.filter((p) => coords[p.id]).map((p) => ({ ...coords[p.id], pin: p })), 6) : []), [geo, active, coords]);

  /* the open pin */
  const open = openPin ? (byId.get(shadowed.get(openPin) ?? openPin) ?? null) : null;
  const openFit: Fit | null = useMemo(() => (open ? fitOf(open, coords, areas, days, placeCoords, pinsOnDays) : null), [open, coords, areas, days, placeCoords, pinsOnDays]);
  const show = useCallback(
    (id: string) => {
      const p = byId.get(id);
      if (p && !layers.has(p.layer)) setLayers((cur) => new Set([...cur, p.layer]));
      opener.current = document.activeElement as HTMLElement | null;
      setOpenPin(id);
    },
    [byId, layers],
  );
  const closePin = useCallback(() => {
    setOpenPin(null);
    const el = opener.current;
    opener.current = null;
    if (el && document.contains(el)) setTimeout(() => el.focus({ preventScroll: true }), 0);
  }, []);
  const scrollToList = useCallback((id: string) => {
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, []);
  function onArea(id: string) {
    setLens("areas");
    setAreaId((cur) => (cur === id ? null : id));
    setFull(false);
    scrollToList(`area-${id}`);
  }
  function pickDay(d: string) {
    setDay(d);
    scrollToList("day-panel");
  }
  // A deep link to a day lands on that day, not on the postcard.
  useEffect(() => {
    if (initialDay) scrollToList("day-panel");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toggleLayer = (l: Layer) =>
    setLayers((cur) => {
      const next = new Set(cur);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });

  const ours = counts.ours;
  const jp = kanji(region);
  const stopLine = stays.length ? `Stop ${stays[0].stop} · ${stays.map((s) => fmtRange(s.from, s.to)).join(" and ")}` : "Not on the route right now";
  const shown = bubbles.length ? bubbles.reduce((n, b) => n + b.count, 0) : mapPins.length;
  const status = busy && !shown ? "Finding the places on Google…" : unavailable ? "No Google here: tap a place to open it in Maps" : shown ? `${shown} ${shown === 1 ? "place" : "places"}${lens === "days" && theDay ? ` · ${fmtDay(theDay.date, false)}` : lens === "areas" && focusArea ? ` · ${focusArea.name}` : ""}${busy ? " · finding more…" : ""}` : busy ? "Finding the places on Google…" : "Nothing in this view";

  const map = (
    <CityMap center={centre} pins={mapPins} bubbles={bubbles} areas={areas} selected={openPin} focus={focus} fitKey={fitKey} theme={resolvedTheme} me={geo} gesture={full ? "greedy" : "cooperative"} onPin={show} onArea={onArea} label={`Map of ${name}`} />
  );
  const overlays = (
    <>
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <div className="no-scrollbar pointer-events-auto flex max-w-[calc(100%-5.5rem)] gap-1 overflow-x-auto" role="group" aria-label="Layers">
          {LAYERS.filter((l) => counts[l] > 0 || l === "ours").map((l) => (
            <LayerToggle key={l} layer={l} on={layers.has(l)} onClick={() => toggleLayer(l)} theme={resolvedTheme} />
          ))}
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-1">
          <MapChip pressed={!!geo} onClick={geo ? () => setGeo(null) : locate} label={geo ? "Hide where I am" : "Where am I"}>
            ◎
          </MapChip>
          <MapChip onClick={() => setFull((v) => !v)} className="lg:hidden" label={full ? "Close the big map" : "Bigger map"}>
            {full ? "✕" : "⤢"}
          </MapChip>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-end justify-between gap-2">
        <span className="max-w-[70%] truncate rounded-full border border-rule bg-card/95 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-sm" aria-live="polite">
          {status}
        </span>
        {me ? (
          <button type="button" onClick={() => setAdding(true)} className="pointer-events-auto btn btn-primary min-h-11 shrink-0 px-4 shadow-lg" aria-label="Drop a tip">
            <span className="text-lg leading-none">+</span> Tip
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <main className="mx-auto grid max-w-5xl gap-4 pb-8 lg:px-4 lg:pt-3">
      {/* ------------------------------------------------ postcard */}
      <header className="relative">
        <RegionCover regionId={region} className="aspect-[21/9] sm:aspect-[3/1] lg:rounded-3xl" priority sizes="(max-width: 1024px) 100vw, 1024px" position="center 60%">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />
          <Link href="/city" className="absolute top-2.5 left-3 grid min-h-9 place-items-center rounded-full bg-black/35 px-3 text-sm font-semibold text-white no-underline backdrop-blur">
            ← Cities
          </Link>
          <div className="absolute inset-x-4 bottom-3 grid gap-0.5 text-white sm:inset-x-6">
            <p className="text-[0.68rem] font-semibold tracking-[0.12em] uppercase opacity-90">{stopLine}</p>
            <h1 className="flex flex-wrap items-baseline gap-x-3">
              <span className="display text-[2.2rem] leading-none sm:text-[3rem]">{name}</span>
              {jp ? <span className="jp text-[1.2rem] opacity-90">{jp}</span> : null}
            </h1>
            <p className="text-[0.85rem] opacity-90">
              {days.length ? `${days.length} days` : "no days yet"} · {pins.length} places · {ours ? `${ours} ours` : "none ours yet"}
            </p>
          </div>
        </RegionCover>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        {/* ------------------------------------------------ map */}
        {full ? (
          <div className="fixed inset-0 z-40 bg-bg-2 lg:hidden" role="dialog" aria-label={`Map of ${name}, full screen`}>
            {map}
            {overlays}
          </div>
        ) : null}
        <div id="city-map" className="relative h-[46dvh] min-h-[300px] scroll-mt-14 lg:sticky lg:top-4 lg:order-2 lg:h-[calc(100dvh-2rem)]">
          <div className="relative size-full overflow-hidden border-y border-rule bg-bg-2 lg:rounded-2xl lg:border" style={{ boxShadow: "var(--glow)" }}>
            {full ? <div className="size-full" /> : map}
            {full ? null : overlays}
          </div>
        </div>

        {/* ------------------------------------------------ content */}
        <div className="grid gap-4 lg:order-1">
          <div className="sticky top-0 z-20 -mx-0 flex items-center gap-2 bg-bg/95 px-4 py-2 backdrop-blur lg:static lg:px-0 lg:py-0">
            <div className="min-w-0 flex-1">
              <Segmented value={lens} onChange={(l) => setLens(l)} label="See it by" options={[{ id: "days", label: days.length ? "Our days" : "Days" }, { id: "areas", label: "Areas" }, { id: "types", label: "Types" }]} />
            </div>
            <button type="button" className="btn btn-sm shrink-0 lg:hidden" onClick={() => document.getElementById("city-map")?.scrollIntoView({ behavior: "smooth", block: "start" })} aria-label="Back to the map">
              Map ↑
            </button>
          </div>

          <div className="grid gap-4 px-4 lg:px-0">
            {geo ? (
              <section className="card grid gap-2 p-4" aria-label="Near you">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[1.3rem]">Near you</h2>
                  <button type="button" className="text-xs underline" onClick={() => setGeo(null)}>
                    close
                  </button>
                </div>
                {far ? (
                  <p className="text-sm text-muted">You are {Math.round(distanceKm(geo, centre))} km from {name}. Once there, this shows what is a few steps away.</p>
                ) : nearMe.length ? (
                  <ul className="grid gap-1.5">
                    {nearMe.map((x) => (
                      <li key={x.pin.id}>
                        <PinRow pin={x.pin} onOpen={() => show(x.pin.id)} saved={savedCount(x.pin)} trailing={fmtKm(x.km)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">Nothing placed yet. Turn on more layers or wait for the pins to land.</p>
                )}
                {geoError ? <p className="text-xs text-danger">{geoError}</p> : null}
              </section>
            ) : geoError ? (
              <p className="text-xs text-danger">{geoError}</p>
            ) : null}

            {lens !== "days" || !days.length ? (
              <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label="Kinds of place">
                {FILTERS.map(([f, label]) => (
                  <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
                    {f !== "all" && f !== "saved" ? <CatIcon cat={f} size={13} /> : null}
                    {label}
                  </Chip>
                ))}
              </div>
            ) : null}

            {lens === "days" ? (
              days.length ? (
                <DaysLens days={days} day={day} setDay={pickDay} today={today} theDay={theDay} dayPins={dayPins} dayFits={dayFits} dayCounts={dayCounts} hits={hits} savedCount={savedCount} show={show} region={region} onAdd={() => setAdding(true)} tokyoPins={snapshot.tokyo_pins} filter={filter} setFilter={setFilter} meals={meals} byId={byId} clearMeal={(d, slot) => setMeal(d, slot, null)} canPick={!!me} />
              ) : (
                <p className="rounded-2xl border border-dashed border-rule p-5 text-center text-muted">{name} is not on the route right now, so there are no days to fit things to. Areas and types still work.</p>
              )
            ) : null}
            {lens === "areas" ? <AreasLens areas={areasSorted} byArea={byArea} areaId={areaId} onArea={onArea} hits={hits} savedCount={savedCount} show={show} elsewhere={byArea.get("elsewhere") ?? []} /> : null}
            {lens === "types" ? <TypesLens pins={active} hits={hits} savedCount={savedCount} show={show} /> : null}

            {!ours ? (
              <section className="grid gap-2 rounded-2xl p-4" style={{ background: "color-mix(in srgb, var(--accent) 10%, var(--card))" }}>
                <p className="font-display text-[1.15rem] leading-snug">Nothing of ours in {name} yet.</p>
                <p className="text-sm text-ink-2">Paste a Google Maps link, an Instagram post or a friend’s message and it lands on this map, next to the day it fits.</p>
                <button type="button" className="btn btn-sm btn-primary justify-self-start" onClick={() => setAdding(true)} disabled={!me}>
                  + Drop a tip
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      <PinSheet pin={open} hit={open ? hits[open.id] : undefined} fit={openFit} alsoIn={open ? (alsoIn.get(open.id) ?? []) : []} hearts={hearts} days={days} meals={meals} currentDay={lens === "days" ? day : null} city={region} onClose={closePin} onOpen={show} />
      <AddTipSheet open={adding} onClose={() => setAdding(false)} city={region} cityName={name} days={days} bias={focus} />
    </main>
  );
}

/* ------------------------------------------------------------ days */

function DaysLens({ days, day, setDay, today, theDay, dayPins, dayFits, dayCounts, hits, savedCount, show, region, onAdd, tokyoPins, filter, setFilter, meals, byId, clearMeal, canPick }: { days: PlannedDay[]; day: string; setDay: (d: string) => void; today: string; theDay: PlannedDay | null; dayPins: Pin[]; dayFits: DayFit[]; dayCounts: Map<string, { plan: number; ours: number; fits: number }>; hits: Hits; savedCount: (p: Pin) => number; show: (id: string) => void; region: string; onAdd: () => void; tokyoPins: Record<string, number>; filter: Filter; setFilter: (f: Filter) => void; meals: Meals; byId: Map<string, Pin>; clearMeal: (date: string, slot: MealSlot) => void; canPick: boolean }) {
  const [all, setAll] = useState(false);
  const mealNames = (date: string) =>
    MEAL_SLOTS.map((slot) => {
      const id = meals[date]?.[slot];
      return id ? (byId.get(id)?.name ?? null) : null;
    }).filter((x): x is string => !!x);
  const planPins = dayPins.filter((p) => p.layer === "plan");
  const oursOnDay = dayPins.filter((p) => p.layer !== "plan");
  const walkN = region === "tokyo" && theDay ? tokyoPins[theDay.date] : undefined;
  const walk = walkN != null ? (walkN === 0 ? REST : walkByN(walkN)) : null;
  const shown = all ? dayFits : dayFits.slice(0, 8);
  return (
    <section className="grid gap-4" aria-label="Our days">
      <ol className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const on = d.date === day;
          const c = dayCounts.get(d.date);
          return (
            <li key={d.date} className="shrink-0">
              <button type="button" aria-pressed={on} onClick={() => setDay(d.date)} className={`grid h-full w-[9.5rem] content-start gap-1 rounded-2xl border p-3 text-left transition-colors ${on ? "border-ink bg-ink text-bg" : "border-rule bg-card"}`}>
                <span className={`flex justify-between gap-1 text-[0.64rem] font-bold tracking-[0.08em] uppercase ${on ? "opacity-80" : "text-muted"}`}>
                  <span className="truncate">{fmtDay(d.date)}</span>
                  {d.date === today ? <span className="shrink-0 text-accent">today</span> : null}
                </span>
                <span className={`line-clamp-2 text-[0.8rem] leading-snug ${on ? "" : "text-ink-2"}`}>{d.title}</span>
                <span className={`mt-auto truncate pt-1 text-[0.72rem] font-semibold ${on ? "opacity-85" : mealNames(d.date).length ? "text-accent" : "text-muted"}`}>{mealNames(d.date).length ? mealNames(d.date).join(" · ") : c?.fits ? `${c.fits} nearby` : c?.plan ? `${c.plan} on the plan` : d.kind}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {theDay ? (
        <div id="day-panel" className="grid gap-4 scroll-mt-16">
          <div className="grid gap-0.5">
            <p className="eyebrow">
              {fmtDay(theDay.date)} · {theDay.kind}
            </p>
            <h2 className="font-display text-[1.5rem] leading-tight">{theDay.title}</h2>
            {theDay.forHer ? <p className="text-sm text-muted">{theDay.forHer}</p> : null}
          </div>

          {planPins.length || walk ? (
            <div className="grid gap-2">
              <p className="eyebrow flex items-center gap-1.5">
                <LayerDot layer="plan" /> On the plan
              </p>
              <ul className="grid gap-2">
                {planPins.map((p) => (
                  <li key={p.id}>
                    <PinRow pin={p} onOpen={() => show(p.id)} saved={savedCount(p)} line={p.line} />
                  </li>
                ))}
                {walk ? (
                  <li>
                    <Link href={`/tokyo?walk=${walkN}`} className="flex items-center gap-3 rounded-xl border border-rule p-2.5 no-underline">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white" style={{ background: LAYER_INK.walk }}>
                        {walkN || "☺"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{walk.title}</span>
                        <span className="block truncate text-xs text-muted">The walk pinned to this day · Tokyo on foot</span>
                      </span>
                      <span aria-hidden="true" className="text-muted">
                        →
                      </span>
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted">The plan puts nothing on this day yet.</p>
          )}

          <div className="grid gap-2" aria-label="Meals">
            <p className="eyebrow">Meals</p>
            {MEAL_SLOTS.map((slot) => {
              const pickId = meals[theDay.date]?.[slot];
              const pick = pickId ? byId.get(pickId) : undefined;
              const sugg = pick ? [] : mealSuggestions(theDay.date, dayFits, slot, 3);
              const near = planPins[0]?.name ?? oursOnDay[0]?.name ?? null;
              return (
                <div key={slot} className="grid gap-2 rounded-2xl border border-rule p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[0.72rem] font-bold tracking-[0.08em] uppercase" style={{ color: pick ? "var(--accent)" : "var(--muted)" }}>
                      {MEAL_LABEL[slot]}
                      {!pick && sugg.length && near ? <span className="font-normal normal-case tracking-normal text-muted"> near {shortName(sugg[0].near)}</span> : null}
                    </span>
                    {pick && canPick ? (
                      <button type="button" className="text-xs font-semibold text-muted underline" onClick={() => clearMeal(theDay.date, slot)}>
                        clear
                      </button>
                    ) : null}
                  </div>
                  {pick ? (
                    <>
                      <PinRow pin={pick} onOpen={() => show(pick.id)} saved={savedCount(pick)} line={mealLine(pick, theDay.date)} />
                      {pick.food?.deadline ? (
                        <Link href="/food/book" className="justify-self-start rounded-full border border-rule bg-bg-2 px-2.5 py-1 text-xs font-semibold no-underline">
                          Book by {fmtDay(pick.food.deadline.date, false)}
                          {pick.food.deadline.how ? ` · ${pick.food.deadline.how}` : ""} →
                        </Link>
                      ) : null}
                    </>
                  ) : sugg.length ? (
                    <>
                      <ul className="grid grid-cols-3 gap-2">
                        {sugg.map((m) => (
                          <li key={m.pin.id}>
                            <PinTile pin={m.pin} photo={m.pin.photo ?? hits[m.pin.id]?.photo} saved={savedCount(m.pin)} onOpen={() => show(m.pin.id)} size="sm" line={`${fmtKm(m.km)} · ${m.walkIn ? "walk in" : m.open === "open" ? "open" : "check hours"}`} />
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted">Tap one, then “{MEAL_LABEL[slot]} · {fmtDay(theDay.date, false)}” on its card.</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted">{planPins.length || oursOnDay.length ? "Nothing the guide knows is open for this nearby. Turn on the food guide, or drop a tip." : "Put something on this day and the places to eat near it show up here."}</p>
                  )}
                </div>
              );
            })}
          </div>

          {oursOnDay.length ? (
            <div className="grid gap-2">
              <p className="eyebrow flex items-center gap-1.5">
                <LayerDot layer="ours" /> Ours, put on this day
              </p>
              <ul className="grid grid-cols-2 gap-2.5">
                {oursOnDay.map((p) => (
                  <li key={p.id}>
                    <PinTile pin={p} photo={p.photo ?? hits[p.id]?.photo} saved={savedCount(p)} onOpen={() => show(p.id)} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="eyebrow">Nearby that day {dayFits.length ? <span className="font-normal normal-case tracking-normal">· {dayFits.length}</span> : null}</p>
              <span className="truncate text-xs text-muted">a short walk from what’s on it</span>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label="Kinds of place">
              {FILTERS.map(([f, label]) => (
                <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
                  {f !== "all" && f !== "saved" ? <CatIcon cat={f} size={13} /> : null}
                  {label}
                </Chip>
              ))}
            </div>
            {dayFits.length ? (
              <ul className="grid grid-cols-2 gap-2.5">
                {shown.map((f) => (
                  <li key={f.pin.id}>
                    <PinTile pin={f.pin} photo={f.pin.photo ?? hits[f.pin.id]?.photo} saved={savedCount(f.pin)} onOpen={() => show(f.pin.id)} line={`${fmtKm(f.km)} from ${shortName(f.near)}`} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-rule p-4 text-sm text-muted">
                {planPins.length ? "Nothing from the layers that are on sits within a short walk of this day yet. Turn on another layer, or drop a tip near it." : "Put a place on this day and what fits around it shows up here."}{" "}
                <button type="button" className="font-semibold text-accent" onClick={onAdd}>
                  Drop a tip
                </button>
              </p>
            )}
            {dayFits.length > 8 ? (
              <button type="button" className="btn btn-sm justify-self-center" onClick={() => setAll((v) => !v)}>
                {all ? "Fewer" : `All ${dayFits.length}`}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** One line for a picked meal: what the guide knows about that day. */
function mealLine(pin: Pin, date: string): string {
  const f = pin.food;
  if (!f) return [CAT_LABEL[pin.cat], pin.line].filter(Boolean).join(" · ");
  const open = f.closed_dates?.includes(date) || f.closed_weekdays?.includes(new Date(date + "T00:00:00Z").toLocaleDateString("en", { weekday: "short", timeZone: "UTC" }) as never) ? "closed that day" : f.closed_weekdays ? "open that day" : "check hours";
  const seven = f.seven === "yes" || f.seven === "room" || f.seven === "counter" ? "seats seven" : f.seven === "split" ? "two tables" : f.seven === "ask" ? "ask about seven" : null;
  const book = f.channel === "walk-in" ? "walk in" : f.channel ? `book ${f.channel === "phone" ? "by phone" : f.channel === "online" ? "online" : f.channel === "hotel" ? "through the hotel" : "by queuing"}` : f.booking ? "booking" : null;
  return [open, seven, book].filter(Boolean).join(" · ");
}

/** "Winter illuminations (Marunouchi, Roppongi…)" → "Winter illuminations". */
function shortName(s: string): string {
  const t = s.replace(/\s*\(.*$/, "").replace(/\s+and .*$/, "");
  return t.length > 24 ? t.slice(0, 23) + "…" : t;
}

/* ----------------------------------------------------------- areas */

function AreasLens({ areas, byArea, areaId, onArea, hits, savedCount, show, elsewhere }: { areas: CityArea[]; byArea: Map<string, Pin[]>; areaId: string | null; onArea: (id: string) => void; hits: Hits; savedCount: (p: Pin) => number; show: (id: string) => void; elsewhere: Pin[] }) {
  const list = areaId ? areas.filter((a) => a.id === areaId) : areas;
  if (!areas.length && !elsewhere.length) return <p className="rounded-2xl border border-dashed border-rule p-5 text-center text-muted">Nothing in this view. Turn on a layer or widen the kinds of place.</p>;
  return (
    <section className="grid gap-5" aria-label="Areas">
      {areaId ? (
        <button type="button" className="btn btn-sm justify-self-start" onClick={() => onArea(areaId)}>
          ← All areas
        </button>
      ) : null}
      {list.map((a) => (
        <AreaBlock key={a.id} area={a} pins={byArea.get(a.id) ?? []} open={areaId === a.id} onArea={onArea} hits={hits} savedCount={savedCount} show={show} />
      ))}
      {!areaId && elsewhere.length ? <AreaBlock area={{ id: "elsewhere", name: "Further out", lat: 0, lng: 0, walks: [] }} pins={elsewhere} open={false} onArea={() => undefined} hits={hits} savedCount={savedCount} show={show} /> : null}
    </section>
  );
}

function AreaBlock({ area, pins, open, onArea, hits, savedCount, show }: { area: CityArea; pins: Pin[]; open: boolean; onArea: (id: string) => void; hits: Hits; savedCount: (p: Pin) => number; show: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = open || all ? pins : pins.slice(0, 6);
  const layersHere = [...new Set(pins.map((p) => p.layer))];
  return (
    <div id={`area-${area.id}`} className="grid gap-2 scroll-mt-16">
      <button type="button" className="flex items-baseline justify-between gap-2 text-left" onClick={() => area.id !== "elsewhere" && onArea(area.id)} aria-expanded={open}>
        <h2 className="font-display text-[1.35rem] leading-tight">
          {area.name}
          <span className="ml-2 text-[0.85rem] font-normal text-muted">{pins.length}</span>
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {layersHere.map((l) => (
            <LayerDot key={l} layer={l} size={8} />
          ))}
          {area.walks.length ? <span>· walk {area.walks.join(", ")}</span> : null}
        </span>
      </button>
      <ul className="grid grid-cols-3 gap-2">
        {shown.map((p) => (
          <li key={p.id}>
            <PinTile pin={p} photo={p.photo ?? hits[p.id]?.photo} saved={savedCount(p)} onOpen={() => show(p.id)} size="sm" line={CAT_LABEL[p.cat]} />
          </li>
        ))}
      </ul>
      {!open && pins.length > 6 ? (
        <button type="button" className="justify-self-start text-sm font-semibold text-accent" onClick={() => setAll((v) => !v)}>
          {all ? "Fewer" : `All ${pins.length} in ${area.name}`}
        </button>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- types */

function TypesLens({ pins, hits, savedCount, show }: { pins: Pin[]; hits: Hits; savedCount: (p: Pin) => number; show: (id: string) => void }) {
  const groups = TYPE_ORDER.map((c) => [c, pins.filter((p) => p.cat === c)] as const).filter(([, l]) => l.length);
  if (!groups.length) return <p className="rounded-2xl border border-dashed border-rule p-5 text-center text-muted">Nothing in this view. Turn on a layer or widen the kinds of place.</p>;
  return (
    <section className="grid gap-5" aria-label="Types">
      {groups.map(([c, list]) => (
        <TypeBlock key={c} cat={c} pins={list} hits={hits} savedCount={savedCount} show={show} />
      ))}
    </section>
  );
}

function TypeBlock({ cat, pins, hits, savedCount, show }: { cat: SpotCat; pins: Pin[]; hits: Hits; savedCount: (p: Pin) => number; show: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? pins : pins.slice(0, 6);
  return (
    <div className="grid gap-2">
      <h2 className="flex items-center gap-2 font-display text-[1.35rem] leading-tight">
        <CatIcon cat={cat} size={18} className="text-muted" /> {CAT_LABEL[cat]}
        <span className="text-[0.85rem] font-normal text-muted">{pins.length}</span>
      </h2>
      <ul className="grid grid-cols-3 gap-2">
        {shown.map((p) => (
          <li key={p.id}>
            <PinTile pin={p} photo={p.photo ?? hits[p.id]?.photo} saved={savedCount(p)} onOpen={() => show(p.id)} size="sm" />
          </li>
        ))}
      </ul>
      {pins.length > 6 ? (
        <button type="button" className="justify-self-start text-sm font-semibold text-accent" onClick={() => setAll((v) => !v)}>
          {all ? "Fewer" : `All ${pins.length}`}
        </button>
      ) : null}
    </div>
  );
}
