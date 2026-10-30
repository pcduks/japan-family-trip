"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { LAYER_INK, LAYER_LABEL, allPins, cityAreas, cityDays, cityStays, fitOf, heartsByTarget, nearestArea, savedBy, type CityArea, type Fit, type Layer, type Pin } from "@/lib/city";
import type { PlannedDay } from "@/lib/days";
import { fmtDay, fmtRange } from "@/lib/dates";
import { kanji } from "@/lib/journey";
import { CAT_LABEL, REST, distanceKm, mapsSearchUrl, nearest, todayInJapan, walkByN, type SpotCat } from "@/lib/tokyo";
import { useStore } from "../providers";
import { RegionCover } from "../RegionCover";
import { CatIcon } from "../tokyo/CatIcon";
import { AddTipSheet } from "./AddTipSheet";
import { Chip, LayerDot, MapChip, PinRow, PinTile, Segmented, fmtKm } from "./bits";
import { CityMap, MAX_DRAWN, type MapPin } from "./CityMap";
import { PinSheet } from "./PinSheet";
import { coordsOf, usePins } from "./usePins";

/*
 * One page per stop (docs/product/city-pages.md): everything we know about a
 * city as pins in four layers, on one map, read through three lenses: our
 * Days there, the city's Areas, or Types of place. Tap anything for its card;
 * the + button drops a tip from a link, a screenshot or a saved list.
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

export function CityView({ region, initialPin, initialDay, initialLens }: { region: string; initialPin: string | null; initialDay: string | null; initialLens: Lens | null }) {
  const { snapshot, me, resolvedTheme } = useStore();
  const today = todayInJapan();
  const regionRow = snapshot.regions.find((r) => r.id === region);
  const name = regionRow?.name ?? region;
  const centre = useMemo(() => ({ lat: regionRow?.lat ?? 35.68, lng: regionRow?.lng ?? 139.72 }), [regionRow]);

  /* the data */
  const days = useMemo(() => cityDays(region, snapshot), [region, snapshot]);
  const stays = useMemo(() => cityStays(region, snapshot), [region, snapshot]);
  const areas = useMemo(() => cityAreas(region), [region]);
  const pins = useMemo(() => allPins(region, snapshot, snapshot.tips), [region, snapshot]);
  const byId = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);
  const hearts = useMemo(() => heartsByTarget(snapshot.reactions), [snapshot.reactions]);
  const counts = useMemo(() => Object.fromEntries(LAYERS.map((l) => [l, pins.filter((p) => p.layer === l).length])) as Record<Layer, number>, [pins]);

  /* what is on */
  const [layers, setLayers] = useState<Set<Layer>>(() => new Set<Layer>(LAYERS));
  const [lens, setLens] = useState<Lens>(initialLens ?? (days.length ? "days" : "areas"));
  const [filter, setFilter] = useState<Filter>("all");
  const [day, setDay] = useState<string>(() => initialDay ?? (days.find((d) => d.date === today)?.date ?? days[0]?.date ?? ""));
  const [areaId, setAreaId] = useState<string | null>(null);
  const [openPin, setOpenPin] = useState<string | null>(initialPin);
  const [adding, setAdding] = useState(false);
  const [tall, setTall] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

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

  const matches = useCallback(
    (p: Pin) => {
      if (!layers.has(p.layer)) return false;
      if (filter === "all") return true;
      if (filter === "saved") return savedBy(p, hearts).length > 0;
      return (FILTER_CATS[filter] ?? []).includes(p.cat);
    },
    [layers, filter, hearts],
  );
  const wanted = useMemo(() => pins.filter(matches), [pins, matches]);
  const { hits, busy, unavailable } = usePins(wanted, areas, centre);
  const coords = useMemo(() => {
    const out: Record<string, { lat: number; lng: number }> = {};
    for (const p of pins) {
      const c = coordsOf(p, hits);
      // A short name can land Google in another city; a hit that far away is no hit.
      if (c && distanceKm(c, centre) <= FAR_KM) out[p.id] = c;
    }
    return out;
  }, [pins, hits, centre]);
  /* The same place in two layers (Pedro's list and the food guide, say) is one pin: the layer that matters most keeps it. */
  const { shadowed, alsoIn } = useMemo(() => {
    const groups = new Map<string, Pin[]>();
    const keyOf = (p: Pin) => (p.ref.kind === "tip" ? (snapshot.tips.find((t) => t.id === (p.ref as { id: string }).id)?.google_place_id ?? null) : (hits[p.id]?.placeId ?? null)) ?? `name:${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
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
  }, [pins, hits, snapshot.tips]);
  const active = useMemo(() => wanted.filter((p) => !shadowed.has(p.id)), [wanted, shadowed]);

  /* the plan's own places, with coordinates from the library or from Google */
  const placeCoords = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; name: string }>();
    for (const p of snapshot.places) if (p.lat != null && p.lng != null) m.set(p.id, { lat: p.lat, lng: p.lng, name: p.name });
    for (const p of pins) if (p.ref.kind === "place" && coords[p.id] && !m.has(p.ref.id)) m.set(p.ref.id, { ...coords[p.id], name: p.name });
    return m;
  }, [snapshot.places, pins, coords]);
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

  /* the selected day: what is on it, what fits it */
  const theDay = days.find((d) => d.date === day) ?? null;
  const dayPins = useMemo(() => (theDay ? pins.filter((p) => p.date === theDay.date) : []), [pins, theDay]);
  const dayFits = useMemo(() => {
    if (!theDay) return [];
    const things = thingsOf(theDay);
    if (!things.length) return [];
    const out: { pin: Pin; near: string; km: number }[] = [];
    for (const p of active) {
      if (p.date === theDay.date) continue;
      const at = coords[p.id];
      if (!at) continue;
      let best: { near: string; km: number } | null = null;
      for (const t of things) {
        const km = distanceKm(at, t);
        if (km <= NEAR_KM && (!best || km < best.km)) best = { near: t.name, km };
      }
      if (best) out.push({ pin: p, ...best });
    }
    return out.sort((a, b) => a.km - b.km);
  }, [theDay, thingsOf, active, coords]);
  const dayCounts = useMemo(() => {
    const m = new Map<string, { plan: number; ours: number; fits: number }>();
    for (const d of days) {
      const things = thingsOf(d);
      let fits = 0;
      if (things.length) for (const p of active) if (p.date !== d.date && coords[p.id] && things.some((t) => distanceKm(coords[p.id], t) <= NEAR_KM)) fits++;
      m.set(d.date, { plan: pins.filter((p) => p.layer === "plan" && p.date === d.date).length, ours: pins.filter((p) => p.layer === "ours" && p.date === d.date).length, fits });
    }
    return m;
  }, [days, thingsOf, active, coords, pins]);

  /* areas: which pins sit in which */
  const areaOf = useCallback(
    (p: Pin): CityArea | null => {
      const at = coords[p.id];
      if (at) {
        const n = nearestArea(at, areas);
        return n && n.km <= 1.6 ? n.area : null;
      }
      return p.area ? (areas.find((a) => a.name === p.area || p.area!.startsWith(a.name)) ?? null) : null;
    },
    [coords, areas],
  );
  const byArea = useMemo(() => {
    const m = new Map<string, Pin[]>();
    for (const p of active) {
      const a = areaOf(p);
      const k = a ? a.id : "elsewhere";
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [active, areaOf]);
  const areasSorted = useMemo(() => [...areas].filter((a) => byArea.has(a.id)).sort((a, b) => (byArea.get(b.id)?.length ?? 0) - (byArea.get(a.id)?.length ?? 0)), [areas, byArea]);

  /* the map */
  const mapPins = useMemo<MapPin[]>(() => {
    let list: Pin[];
    if (lens === "days" && theDay) list = [...dayPins, ...dayFits.map((f) => f.pin)];
    else if (lens === "areas" && areaId) list = byArea.get(areaId) ?? [];
    else list = active;
    const drawn = list
      .filter((p) => coords[p.id])
      .sort((a, b) => Number(savedBy(b, hearts).length > 0) - Number(savedBy(a, hearts).length > 0) || LAYER_PRIORITY[a.layer] - LAYER_PRIORITY[b.layer])
      .slice(0, MAX_DRAWN);
    return drawn.map((p) => ({ pin: p, ...coords[p.id], saved: savedBy(p, hearts).length > 0 }));
  }, [lens, theDay, dayPins, dayFits, areaId, byArea, active, coords, hearts]);
  const focusArea = lens === "areas" && areaId ? (areas.find((a) => a.id === areaId) ?? null) : null;
  const fitKey = `${lens}|${lens === "days" ? day : lens === "areas" ? areaId ?? "" : ""}|${[...layers].sort().join()}|${filter}`;

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
      setOpenPin(id);
    },
    [byId, layers],
  );
  function onArea(id: string) {
    setLens("areas");
    setAreaId((cur) => (cur === id ? null : id));
    setTimeout(() => document.getElementById(`area-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
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
  const status = busy ? "Finding the places on Google…" : unavailable ? "No Google here: tap a place to open it in Maps" : mapPins.length ? `${mapPins.length} on the map${active.length > mapPins.length && lens === "types" ? ` of ${active.length}` : ""}` : active.length ? "Placing them…" : "Nothing in this view";

  return (
    <main className="mx-auto grid max-w-5xl gap-5 pb-24 lg:px-4 lg:pt-3">
      {/* ------------------------------------------------ postcard */}
      <header className="relative">
        <RegionCover regionId={region} className="aspect-[4/3] sm:aspect-[21/9] lg:rounded-3xl" priority sizes="(max-width: 1024px) 100vw, 1024px" position="center 60%">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
          <Link href="/city" className="absolute top-3 left-4 grid min-h-10 place-items-center rounded-full bg-black/35 px-3 text-sm font-semibold text-white no-underline backdrop-blur">
            ← Cities
          </Link>
          <div className="absolute inset-x-4 bottom-4 grid gap-1 text-white sm:inset-x-6">
            <p className="text-[0.72rem] font-semibold tracking-[0.12em] uppercase opacity-90">{stopLine}</p>
            <h1 className="flex flex-wrap items-baseline gap-x-3">
              <span className="display text-[2.6rem] leading-none sm:text-[3.2rem]">{name}</span>
              {jp ? <span className="jp text-[1.4rem] opacity-90">{jp}</span> : null}
            </h1>
            <p className="text-[0.95rem] opacity-90">
              {days.length ? `${days.length} days there` : "No days there yet"} · {pins.length} places we know about · {ours ? `${ours} of them ours` : "none of them ours yet"}
            </p>
          </div>
        </RegionCover>
      </header>

      <div className="grid gap-5 px-4 lg:px-0">
        {/* ------------------------------------------------ layers */}
        <Hint />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Layers">
          {LAYERS.filter((l) => counts[l] > 0 || l === "ours").map((l) => (
            <Chip key={l} pressed={layers.has(l)} onClick={() => toggleLayer(l)} tone={LAYER_INK[l]} title={LAYER_HINT[l]}>
              {layers.has(l) ? <LayerDot layer={l} size={9} /> : <span className="inline-block size-[9px] rounded-full border-2" style={{ borderColor: LAYER_INK[l] }} aria-hidden="true" />}
              {LAYER_LABEL[l]} <span className={layers.has(l) ? "opacity-75" : "text-muted"}>{counts[l]}</span>
            </Chip>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          {/* ------------------------------------------------ map */}
          <div className={`sticky top-0 z-20 -mx-4 lg:order-2 lg:mx-0 lg:top-4 lg:h-[calc(100dvh-2rem)] ${tall ? "h-[72dvh]" : "h-[40dvh]"} transition-[height] duration-300`}>
            <div className="relative size-full overflow-hidden border-y border-rule bg-bg-2 lg:rounded-2xl lg:border" style={{ boxShadow: "var(--glow)" }}>
              <CityMap center={centre} pins={mapPins} areas={areas} selected={openPin} focus={focusArea ? { lat: focusArea.lat, lng: focusArea.lng } : null} fitKey={fitKey} theme={resolvedTheme} me={geo} onPin={show} onArea={onArea} label={`Map of ${name}`} />
              <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
                <div className="pointer-events-auto flex flex-wrap gap-1.5">
                  <MapChip pressed={!!geo} onClick={geo ? () => setGeo(null) : locate}>
                    ◎ Where am I
                  </MapChip>
                  {lens === "areas" && areaId ? <MapChip pressed onClick={() => setAreaId(null)}>{areas.find((a) => a.id === areaId)?.name} ×</MapChip> : null}
                </div>
                <MapChip onClick={() => setTall((v) => !v)} className="lg:hidden" label={tall ? "Smaller map" : "Bigger map"}>
                  {tall ? "⤓" : "⤢"}
                </MapChip>
              </div>
              <div className="pointer-events-none absolute right-2 bottom-7 left-2 flex items-end justify-between gap-2 text-xs">
                <span className="rounded-md border border-rule bg-card/90 px-2 py-1 text-muted">{status}</span>
                <a className="pointer-events-auto rounded-md border border-rule bg-card/90 px-2 py-1 font-bold text-ink no-underline" href={mapsSearchUrl(`${name}, Japan`)} target="_blank" rel="noreferrer">
                  Maps ↗
                </a>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ content */}
          <div className="grid gap-5 lg:order-1">
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
                        <PinRow pin={x.pin} onOpen={() => show(x.pin.id)} saved={savedBy(x.pin, hearts).length} trailing={fmtKm(x.km)} />
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

            <Segmented value={lens} onChange={(l) => setLens(l)} label="See it by" options={[{ id: "days", label: days.length ? "Our days" : "Days" }, { id: "areas", label: "Areas" }, { id: "types", label: "Types" }]} />

            <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label="Kinds of place">
              {FILTERS.map(([f, label]) => (
                <Chip key={f} pressed={filter === f} onClick={() => setFilter(f)}>
                  {f !== "all" && f !== "saved" ? <CatIcon cat={f} size={13} /> : null}
                  {label}
                </Chip>
              ))}
            </div>

            {lens === "days" ? (
              days.length ? (
                <DaysLens days={days} day={day} setDay={setDay} today={today} theDay={theDay} dayPins={dayPins} dayFits={dayFits} dayCounts={dayCounts} hits={hits} hearts={hearts} show={show} region={region} onAdd={() => setAdding(true)} tokyoPins={snapshot.tokyo_pins} />
              ) : (
                <p className="rounded-2xl border border-dashed border-rule p-5 text-center text-muted">
                  {name} is not on the route right now, so there are no days to fit things to. The areas and types still work.
                </p>
              )
            ) : null}
            {lens === "areas" ? <AreasLens areas={areasSorted} byArea={byArea} areaId={areaId} onArea={onArea} hits={hits} hearts={hearts} show={show} elsewhere={byArea.get("elsewhere") ?? []} /> : null}
            {lens === "types" ? <TypesLens pins={active} hits={hits} hearts={hearts} show={show} /> : null}

            {!ours ? (
              <section className="grid gap-2 rounded-2xl p-4" style={{ background: `color-mix(in srgb, ${LAYER_INK.ours} 10%, var(--card))` }}>
                <p className="font-display text-[1.15rem] leading-snug">Nothing of ours in {name} yet.</p>
                <p className="text-sm text-ink-2">Paste a Google Maps link, an Instagram post or a friend’s message and it lands on this map, next to the day it fits.</p>
                <button type="button" className="btn btn-sm justify-self-start" style={{ background: LAYER_INK.ours, color: "#fff", borderColor: "transparent" }} onClick={() => setAdding(true)} disabled={!me}>
                  + Drop a tip
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ + tip */}
      {me ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="fixed right-4 z-30 inline-flex min-h-12 items-center gap-1.5 rounded-full px-4 text-[0.95rem] font-bold text-white shadow-lg transition-transform active:scale-95 lg:right-8"
          style={{ background: LAYER_INK.ours, bottom: "calc(3.9rem + env(safe-area-inset-bottom) + 0.75rem)" }}
          aria-label="Drop a tip"
        >
          <span className="text-xl leading-none">+</span> Tip
        </button>
      ) : null}

      <PinSheet pin={open} hit={open ? hits[open.id] : undefined} fit={openFit} alsoIn={open ? (alsoIn.get(open.id) ?? []) : []} hearts={hearts} days={days} city={region} onClose={() => setOpenPin(null)} onOpen={show} />
      <AddTipSheet open={adding} onClose={() => setAdding(false)} city={region} cityName={name} days={days} bias={lens === "areas" && focusArea ? { lat: focusArea.lat, lng: focusArea.lng } : null} />
    </main>
  );
}

/** "Winter illuminations (Marunouchi, Roppongi…)" → "Winter illuminations". */
function shortName(s: string): string {
  const t = s.replace(/\s*\(.*$/, "").replace(/\s+and .*$/, "");
  return t.length > 22 ? t.slice(0, 21) + "…" : t;
}

const hintListeners = new Set<() => void>();

/** One line for the first visit, gone once dismissed. */
function Hint() {
  const seen = useSyncExternalStore(
    (l) => {
      hintListeners.add(l);
      return () => hintListeners.delete(l);
    },
    () => {
      try {
        return localStorage.getItem("jp-city-hint") === "1";
      } catch {
        return true;
      }
    },
    () => true,
  );
  if (seen) return null;
  return (
    <p className="-mb-2 flex items-start gap-2 text-[0.85rem] text-ink-2">
      <span>Four colours, one map. Tap a colour to show or hide it, tap any place for its card, and tap <b>+ Tip</b> to drop one of yours.</span>
      <button
        type="button"
        className="shrink-0 text-xs font-semibold text-muted underline"
        onClick={() => {
          try {
            localStorage.setItem("jp-city-hint", "1");
          } catch {}
          hintListeners.forEach((l) => l());
        }}
      >
        got it
      </button>
    </p>
  );
}

const LAYER_HINT: Record<Layer, string> = {
  plan: "Places on our days, from the plan",
  walk: "The Neighborhood Guide's ten walks",
  guide: "The researched food guide",
  ours: "What the family saved and dropped",
};

/* ------------------------------------------------------------ days */

function DaysLens({ days, day, setDay, today, theDay, dayPins, dayFits, dayCounts, hits, hearts, show, region, onAdd, tokyoPins }: { days: PlannedDay[]; day: string; setDay: (d: string) => void; today: string; theDay: PlannedDay | null; dayPins: Pin[]; dayFits: { pin: Pin; near: string; km: number }[]; dayCounts: Map<string, { plan: number; ours: number; fits: number }>; hits: Record<string, { photo?: string }>; hearts: Map<string, string[]>; show: (id: string) => void; region: string; onAdd: () => void; tokyoPins: Record<string, number> }) {
  const [all, setAll] = useState(false);
  const planPins = dayPins.filter((p) => p.layer === "plan");
  const oursOnDay = dayPins.filter((p) => p.layer !== "plan");
  const walkN = region === "tokyo" && theDay ? tokyoPins[theDay.date] : undefined;
  const walk = walkN != null ? (walkN === 0 ? REST : walkByN(walkN)) : null;
  const shown = all ? dayFits : dayFits.slice(0, 9);
  return (
    <section className="grid gap-4" aria-label="Our days">
      <ol className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const on = d.date === day;
          const c = dayCounts.get(d.date);
          return (
            <li key={d.date} className="shrink-0">
              <button type="button" aria-pressed={on} onClick={() => setDay(d.date)} className={`grid h-full w-[10rem] content-start gap-1 rounded-2xl border p-3 text-left transition-colors ${on ? "border-ink bg-ink text-bg" : "border-rule bg-card"}`}>
                <span className={`flex justify-between gap-1 text-[0.64rem] font-bold tracking-[0.08em] uppercase ${on ? "opacity-80" : "text-muted"}`}>
                  <span className="truncate">{fmtDay(d.date)}</span>
                  {d.date === today ? <span className="shrink-0 text-accent">today</span> : <span className="shrink-0">{d.kind}</span>}
                </span>
                <span className={`line-clamp-2 text-[0.78rem] leading-snug ${on ? "" : "text-ink-2"}`}>{d.title}</span>
                <span className={`mt-auto flex items-center gap-2 pt-1 text-[0.72rem] font-semibold ${on ? "opacity-85" : "text-muted"}`}>
                  {c?.plan ? (
                    <span className="inline-flex items-center gap-1">
                      <LayerDot layer="plan" size={7} /> {c.plan}
                    </span>
                  ) : null}
                  {c?.ours ? (
                    <span className="inline-flex items-center gap-1">
                      <LayerDot layer="ours" size={7} /> {c.ours}
                    </span>
                  ) : null}
                  {c?.fits ? <span>{c.fits} fit</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {theDay ? (
        <div className="grid gap-4">
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
                    <PinRow pin={p} onOpen={() => show(p.id)} saved={savedBy(p, hearts).length} line={p.line} />
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
            <p className="text-sm text-muted">Nothing placed on this day by the plan: it is a {theDay.kind.toLowerCase()} day.</p>
          )}

          {oursOnDay.length ? (
            <div className="grid gap-2">
              <p className="eyebrow flex items-center gap-1.5">
                <LayerDot layer="ours" /> Ours, put on this day
              </p>
              <ul className="grid grid-cols-3 gap-2">
                {oursOnDay.map((p) => (
                  <li key={p.id}>
                    <PinTile pin={p} photo={p.photo ?? hits[p.id]?.photo} saved={savedBy(p, hearts).length} onOpen={() => show(p.id)} size="sm" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <p className="eyebrow">
                Fits this day {dayFits.length ? <span className="font-normal normal-case tracking-normal">· {dayFits.length}</span> : null}
              </p>
              <span className="truncate text-xs text-muted">a short walk from what’s on it</span>
            </div>
            {dayFits.length ? (
              <ul className="grid grid-cols-3 gap-2">
                {shown.map((f) => (
                  <li key={f.pin.id}>
                    <PinTile pin={f.pin} photo={f.pin.photo ?? hits[f.pin.id]?.photo} saved={savedBy(f.pin, hearts).length} onOpen={() => show(f.pin.id)} line={`${fmtKm(f.km)} · ${shortName(f.near)}`} size="sm" />
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
            {dayFits.length > 9 ? (
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

/* ----------------------------------------------------------- areas */

function AreasLens({ areas, byArea, areaId, onArea, hits, hearts, show, elsewhere }: { areas: CityArea[]; byArea: Map<string, Pin[]>; areaId: string | null; onArea: (id: string) => void; hits: Record<string, { photo?: string }>; hearts: Map<string, string[]>; show: (id: string) => void; elsewhere: Pin[] }) {
  const list = areaId ? areas.filter((a) => a.id === areaId) : areas;
  if (!areas.length && !elsewhere.length) return <p className="rounded-2xl border border-dashed border-rule p-5 text-center text-muted">Nothing in this view. Turn on a layer or widen the kinds of place.</p>;
  return (
    <section className="grid gap-5" aria-label="Areas">
      {list.map((a) => (
        <AreaBlock key={a.id} area={a} pins={byArea.get(a.id) ?? []} open={areaId === a.id} onArea={onArea} hits={hits} hearts={hearts} show={show} />
      ))}
      {!areaId && elsewhere.length ? <AreaBlock area={{ id: "elsewhere", name: "Further out", lat: 0, lng: 0, walks: [] }} pins={elsewhere} open={false} onArea={() => undefined} hits={hits} hearts={hearts} show={show} /> : null}
    </section>
  );
}

function AreaBlock({ area, pins, open, onArea, hits, hearts, show }: { area: CityArea; pins: Pin[]; open: boolean; onArea: (id: string) => void; hits: Record<string, { photo?: string }>; hearts: Map<string, string[]>; show: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = open || all ? pins : pins.slice(0, 6);
  const layersHere = [...new Set(pins.map((p) => p.layer))];
  return (
    <div id={`area-${area.id}`} className="grid gap-2 scroll-mt-[44dvh] lg:scroll-mt-4">
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
            <PinTile pin={p} photo={p.photo ?? hits[p.id]?.photo} saved={savedBy(p, hearts).length} onOpen={() => show(p.id)} size="sm" line={CAT_LABEL[p.cat]} />
          </li>
        ))}
      </ul>
      {!open && pins.length > 6 ? (
        <button type="button" className="text-sm font-semibold text-accent justify-self-start" onClick={() => setAll((v) => !v)}>
          {all ? "Fewer" : `All ${pins.length} in ${area.name}`}
        </button>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- types */

function TypesLens({ pins, hits, hearts, show }: { pins: Pin[]; hits: Record<string, { photo?: string }>; hearts: Map<string, string[]>; show: (id: string) => void }) {
  const groups = TYPE_ORDER.map((c) => [c, pins.filter((p) => p.cat === c)] as const).filter(([, l]) => l.length);
  if (!groups.length) return <p className="rounded-2xl border border-dashed border-rule p-5 text-center text-muted">Nothing in this view. Turn on a layer or widen the kinds of place.</p>;
  return (
    <section className="grid gap-5" aria-label="Types">
      {groups.map(([c, list]) => (
        <TypeBlock key={c} cat={c} pins={list} hits={hits} hearts={hearts} show={show} />
      ))}
    </section>
  );
}

function TypeBlock({ cat, pins, hits, hearts, show }: { cat: SpotCat; pins: Pin[]; hits: Record<string, { photo?: string }>; hearts: Map<string, string[]>; show: (id: string) => void }) {
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
            <PinTile pin={p} photo={p.photo ?? hits[p.id]?.photo} saved={savedBy(p, hearts).length} onOpen={() => show(p.id)} size="sm" />
          </li>
        ))}
      </ul>
      {pins.length > 6 ? (
        <button type="button" className="text-sm font-semibold text-accent justify-self-start" onClick={() => setAll((v) => !v)}>
          {all ? "Fewer" : `All ${pins.length}`}
        </button>
      ) : null}
    </div>
  );
}
