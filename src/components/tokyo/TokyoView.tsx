"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { routeDirectionsUrl } from "@/lib/links";
import { todayInJapan } from "@/lib/plan";
import { deleteRow, insertRow, useTable } from "@/lib/tables";
import {
  CAT_LABEL,
  HOODS,
  REST,
  ROUTES,
  WHEN_LABEL,
  ZONES,
  ZONE_HEX,
  ZONE_INK,
  distanceKm,
  nearbyHoods,
  nearest,
  nyNote,
  routeActivity,
  routeAssignments,
  routeByN,
  routeFootprint,
  spotAssignments,
  spotById,
  isTokyoMark,
  spotIdFromMark,
  tokyoDays as tokyoDaysOf,
  type Spot,
  type SpotCat,
  type TokyoDay,
  type TokyoRoute,
} from "@/lib/tokyo";
import { formatDay, inClosureZone, weekday } from "@/lib/trip";
import { EkiStamp } from "../EkiStamp";
import { useStore } from "../providers";
import { Avatar, PageHeader, Pill, firstName } from "../ui";
import { usePlans } from "../usePlans";
import { CatIcon } from "./CatIcon";
import { SpotSheet } from "./SpotSheet";
import { TokyoMap, type MapSpot } from "./TokyoMap";
import { loadRouteSpots, useTokyoSpots } from "./useTokyoSpots";

const FILTERS: [SpotCat | "all" | "family", string][] = [
  ["all", "Tudo"],
  ["family", "♥ Nossos"],
  ["cafe", "Café"],
  ["food", "Comer"],
  ["sweets", "Doces"],
  ["shop", "Lojas"],
  ["culture", "Cultura"],
  ["park", "Parques"],
  ["bar", "Bares"],
];
const FILTER_CATS: Partial<Record<SpotCat | "all" | "family", SpotCat[]>> = {
  cafe: ["cafe", "bakery"],
  food: ["food"],
  sweets: ["sweets", "bakery"],
  shop: ["shop", "book", "market"],
  culture: ["culture", "view"],
  park: ["park"],
  bar: ["bar"],
};
const TOKYO_CENTRE = { lat: 35.68, lng: 139.72 };

/** Tokyo a pé: the ten routes, a live map, the family's marks and the days the plan gives us in Tokyo. */
export function TokyoView({ initialRoute, initialSpot }: { initialRoute: number | null; initialSpot: string | null }) {
  const { trip, me, resolvedTheme } = useStore();
  const { chosen, plans, loaded } = usePlans();
  const plan = chosen ?? plans.at(-1) ?? null;
  const { rows: allActivities } = useTable("activities");
  const { rows: allMarks } = useTable("food_marks");
  const today = todayInJapan();

  /* the plan's Tokyo days and what is pinned to them */
  const days = useMemo(() => tokyoDaysOf(plan), [plan]);
  const assign = useMemo(() => routeAssignments(allActivities, plan?.id ?? null), [allActivities, plan]);
  const dateOfRoute = useMemo(() => {
    const m = new Map<number, string[]>();
    for (const [date, a] of assign) m.set(a.n, [...(m.get(a.n) ?? []), date].sort());
    return m;
  }, [assign]);
  const spotPlanned = useMemo(() => spotAssignments(allActivities, plan?.id ?? null), [allActivities, plan]);
  const marks = useMemo(() => allMarks.filter((m) => isTokyoMark(m.place_slug)).map((m) => ({ ...m, spotId: spotIdFromMark(m.place_slug)! })), [allMarks]);
  const marksBySpot = useMemo(() => {
    const m = new Map<string, typeof marks>();
    for (const x of marks) m.set(x.spotId, [...(m.get(x.spotId) ?? []), x]);
    return m;
  }, [marks]);

  /* selection */
  const todayRoute = assign.get(today)?.n ?? null;
  const [chosenN, setN] = useState<number>(initialRoute ?? (initialSpot ? (spotById(initialSpot)?.route ?? 1) : 1));
  const [picked, setPicked] = useState(initialRoute != null || initialSpot != null);
  // Until someone picks: today's pinned route wins when nothing was asked for in the URL.
  const n = !picked && todayRoute != null ? todayRoute : chosenN;
  const route = n === 0 ? null : (routeByN(n) ?? ROUTES[0]);
  const [openSpot, setOpenSpot] = useState<string | null>(initialSpot && spotById(initialSpot) ? initialSpot : null);
  const [focusHood, setFocusHood] = useState<string | null>(null);
  const [filter, setFilter] = useState<SpotCat | "all" | "family">("all");
  const [showAllHoods, setShowAllHoods] = useState(false);
  const [tall, setTall] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("r", String(n));
    if (openSpot) u.searchParams.set("s", openSpot);
    else u.searchParams.delete("s");
    window.history.replaceState(null, "", u);
  }, [n, openSpot]);

  const pick = useCallback((next: number) => {
    setPicked(true);
    setN(next);
    setFocusHood(null);
  }, []);

  /* pins */
  const { hits, busy, unavailable, loaded: loadedRoutes } = useTokyoSpots([n]);
  const routeSpots: Spot[] = route ? route.spots : REST.spots;
  const matches = useCallback(
    (s: Spot) => {
      if (s.cat === "transit") return false;
      if (filter === "all") return true;
      if (filter === "family") return (marksBySpot.get(s.id)?.length ?? 0) > 0;
      return (FILTER_CATS[filter] ?? []).includes(s.cat);
    },
    [filter, marksBySpot],
  );
  const mapSpots = useMemo<MapSpot[]>(
    () => routeSpots.filter((s) => hits[s.id] && matches(s)).map((s) => ({ spot: s, hit: hits[s.id], wanted: (marksBySpot.get(s.id)?.length ?? 0) > 0, planned: spotPlanned.has(s.id) })),
    [routeSpots, hits, matches, marksBySpot, spotPlanned],
  );
  const routeHoods = useMemo(() => (route ? route.hoods.map((h) => HOODS[h]).filter(Boolean) : []), [route]);
  const near = useMemo(() => (route ? route.hoods.flatMap((h) => nearbyHoods(h, 1.8, route.n)) : []), [route]);
  const nearUnique = useMemo(() => {
    const seen = new Set<string>();
    return near.filter((x) => (seen.has(x.hood.id) ? false : (seen.add(x.hood.id), true))).sort((a, b) => a.km - b.km);
  }, [near]);
  const otherHoods = useMemo(() => {
    const own = new Set(routeHoods.map((h) => h.id));
    if (showAllHoods || !route) return Object.values(HOODS).filter((h) => !own.has(h.id));
    return nearUnique.map((x) => x.hood);
  }, [showAllHoods, route, routeHoods, nearUnique]);
  const color = route ? ZONE_HEX[resolvedTheme][HOODS[route.hoods[0]].zone] : ZONE_HEX[resolvedTheme].centro;

  const routeDates = route ? (dateOfRoute.get(route.n) ?? []) : [];

  /* "perto de mim" */
  function locate() {
    if (!("geolocation" in navigator)) return setGeoError("Este aparelho não dá a localização.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      () => setGeoError("Não deu para pegar a localização. Permita o acesso e tente de novo."),
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

  const panelRef = useRef<HTMLDivElement>(null);
  function onHood(id: string) {
    const r = route;
    if (r && r.hoods.includes(id)) {
      setFocusHood((cur) => (cur === id ? null : id));
      document.getElementById(`hood-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const other = ROUTES.find((x) => x.hoods.includes(id));
    if (other) {
      pick(other.n);
      setTimeout(() => setFocusHood(id), 0);
    }
  }

  const open = openSpot ? spotById(openSpot) : null;
  const familyCount = marksBySpot.size;

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-5 pb-12">
      <div className="flex items-end justify-between gap-3">
        <PageHeader
          eyebrow="Guia local · 28 bairros · 10 rotas"
          title={
            <>
              Tokyo
              <br />a pé
            </>
          }
          hand={
            todayRoute != null
              ? `hoje é dia da Rota ${todayRoute}`
              : days.length
                ? `${days.length} dias em Tokyo: ${formatDay(days[0].date)} a ${formatDay(days.at(-1)!.date)}`
                : loaded && plan
                  ? "Tokyo ainda não está no plano"
                  : "esperando o plano…"
          }
        />
        <EkiStamp motif="tower" ink="var(--vermilion)" top="Tokyo" bottom="a pé · 2026" size={88} rotate={7} seed={11} label="" className="shrink-0" />
      </div>
      <p className="-mt-3 max-w-2xl text-[1.02rem] text-ink-2">
        Dez caminhadas de um dia, três bairros cada, no ritmo de quem mora lá. Toque num lugar para ver fotos e horários, marque o que a família quer e
        prenda uma rota a cada dia que o plano nos dá em Tokyo.
      </p>

      {days.length ? <DaysStrip days={days} assign={assign} current={n} onPick={pick} today={today} /> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        {/* ------------------------------------------------ map */}
        <div className={`sticky top-0 z-20 -mx-5 lg:order-2 lg:mx-0 lg:top-4 lg:h-[calc(100dvh-2rem)] ${tall ? "h-[72dvh]" : "h-[42dvh]"} transition-[height] duration-300`}>
          <div className="relative size-full overflow-hidden border-y border-rule bg-paper-2 lg:rounded-2xl lg:border">
            <TokyoMap
              routeHoods={routeHoods}
              otherHoods={otherHoods}
              spots={mapSpots}
              selectedSpot={openSpot}
              focusHood={focusHood}
              color={color}
              theme={resolvedTheme}
              me={geo}
              onSpot={setOpenSpot}
              onHood={onHood}
              label={route ? `Mapa da rota ${route.n}: ${route.title}` : "Mapa de Tokyo"}
            />
            <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
              <div className="pointer-events-auto flex flex-wrap gap-1.5">
                <button type="button" className="chip !min-h-8 bg-card/95 text-xs shadow-sm" aria-pressed={showAllHoods} onClick={() => setShowAllHoods((v) => !v)}>
                  {showAllHoods ? "28 bairros" : "Bairros perto"}
                </button>
                <button type="button" className="chip !min-h-8 bg-card/95 text-xs shadow-sm" aria-pressed={!!geo} onClick={locate} title="Perto de mim">
                  ◎ Onde estou
                </button>
              </div>
              <button type="button" className="chip pointer-events-auto !min-h-8 bg-card/95 text-xs shadow-sm lg:hidden" onClick={() => setTall((v) => !v)} aria-label={tall ? "Mapa menor" : "Mapa maior"}>
                {tall ? "⤓" : "⤢"}
              </button>
            </div>
            <div className="pointer-events-none absolute right-2 bottom-7 left-2 flex items-end justify-between gap-2 text-xs">
              <span className="rounded-md border border-rule bg-card/90 px-2 py-1 text-muted">
                {busy ? "Procurando os lugares no Google…" : unavailable ? "Sem Google: toque num lugar para abrir no Maps" : mapSpots.length ? `${mapSpots.length} lugares no mapa` : route ? "Os bairros da rota" : ""}
              </span>
              {route ? (
                <a className="pointer-events-auto rounded-md border border-rule bg-card/90 px-2 py-1 font-bold text-ink no-underline" href={routeDirectionsUrl(routeHoods.map((h) => h.station))} target="_blank" rel="noreferrer">
                  Caminho no Maps ↗
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ content */}
        <div className="grid gap-6 lg:order-1" ref={panelRef}>
          {geo ? (
            <section className="card grid gap-2 p-4" aria-label="Perto de mim">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[1.5rem]">Perto de você</h2>
                <button type="button" className="text-xs underline" onClick={() => setGeo(null)}>
                  fechar
                </button>
              </div>
              {farFromTokyo ? (
                <p className="text-sm text-muted">Você está a {Math.round(distanceKm(geo, TOKYO_CENTRE))} km do centro de Tokyo. Lá, este cartão mostra o que há a poucos passos.</p>
              ) : (
                <>
                  <p className="flex flex-wrap gap-1.5 text-sm">
                    {nearHoods.map((h) => (
                      <button key={h.id} type="button" className="chip !min-h-8 text-xs" onClick={() => onHood(h.id)}>
                        {h.name} · {fmtKm(h.km)}
                      </button>
                    ))}
                  </p>
                  {nearSpots.length ? (
                    <ul className="grid gap-1">
                      {nearSpots.map((x) => (
                        <li key={x.id}>
                          <SpotRow spot={x.spot} onOpen={() => setOpenSpot(x.id)} marks={marksBySpot.get(x.id)?.length ?? 0} planned={spotPlanned.has(x.id)} trailing={fmtKm(x.km)} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted">Os lugares de cada rota entram aqui conforme você as abre{loadedRoutes.size < 10 && !unavailable ? ": " : "."}
                      {loadedRoutes.size < 10 && !unavailable ? (
                        <button type="button" className="underline" onClick={() => ROUTES.forEach((r) => void loadRouteSpots(r.n))}>
                          carregar todas as rotas
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

          <RoutePicker current={n} onPick={pick} dateOfRoute={dateOfRoute} theme={resolvedTheme} familyBySpot={marksBySpot} />

          {route ? (
            <RoutePanel
              route={route}
              color={color}
              days={days}
              routeDates={routeDates}
              planId={plan?.id ?? null}
              assign={assign}
              canEdit={!!me}
              filter={filter}
              setFilter={setFilter}
              matches={matches}
              focusHood={focusHood}
              onFocusHood={(id) => setFocusHood((cur) => (cur === id ? null : id))}
              onOpen={setOpenSpot}
              marksBySpot={marksBySpot}
              spotPlanned={spotPlanned}
              near={nearUnique}
              onHood={onHood}
              travellers={trip.travellers}
              familyCount={familyCount}
            />
          ) : (
            <RestPanel onOpen={setOpenSpot} marksBySpot={marksBySpot} spotPlanned={spotPlanned} />
          )}
        </div>
      </div>

      <SpotSheet
        spot={open}
        hit={open ? hits[open.id] : undefined}
        marks={open ? (marksBySpot.get(open.id) ?? []) : []}
        planned={open ? (spotPlanned.get(open.id) ?? []) : []}
        days={days}
        planId={plan?.id ?? null}
        routeDate={open && open.route ? (dateOfRoute.get(open.route)?.[0] ?? null) : null}
        me={me ? { travellerId: me.travellerId, name: me.name } : null}
        travellers={trip.travellers}
        color={color}
        onClose={() => setOpenSpot(null)}
      />
    </main>
  );
}


/* ------------------------------------------------------------ days */

function DaysStrip({ days, assign, current, onPick, today }: { days: TokyoDay[]; assign: ReturnType<typeof routeAssignments>; current: number; onPick: (n: number) => void; today: string }) {
  return (
    <section className="grid gap-2" aria-label="Nossos dias em Tokyo">
      <p className="eyebrow">Nossos dias em Tokyo · pelo plano atual</p>
      <ol className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {days.map((d) => {
          const a = assign.get(d.date);
          const r = a ? routeByN(a.n) : null;
          const on = r?.n === current;
          const closure = inClosureZone(d.date);
          return (
            <li key={d.date} className="shrink-0">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => r && onPick(r.n)}
                className={`grid w-[9.5rem] gap-0.5 rounded-xl border p-2.5 text-left transition-colors ${on ? "border-ink bg-ink text-paper" : "border-rule bg-card"}`}
                style={!on && closure ? { background: "var(--closure)" } : undefined}
              >
                <span className={`flex justify-between font-mono text-[0.65rem] uppercase ${on ? "opacity-80" : "text-muted"}`}>
                  <span>
                    {weekday(d.date)} {formatDay(d.date)}
                  </span>
                  {d.date === today ? <span className="text-vermilion">hoje</span> : d.arrival ? <span>chegada</span> : d.departure ? <span>manhã</span> : null}
                </span>
                {r ? (
                  <>
                    <span className="font-display text-[1.15rem] leading-tight">Rota {r.n}</span>
                    <span className={`line-clamp-2 text-[0.72rem] leading-snug ${on ? "opacity-80" : "text-ink-2"}`}>{r.title}</span>
                  </>
                ) : (
                  <>
                    <span className="hand text-[1.1rem] leading-tight">livre</span>
                    <span className="text-[0.72rem] leading-snug text-muted">abra uma rota e marque este dia</span>
                  </>
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

function RoutePicker({ current, onPick, dateOfRoute, theme, familyBySpot }: { current: number; onPick: (n: number) => void; dateOfRoute: Map<number, string[]>; theme: "light" | "dark"; familyBySpot: Map<string, unknown[]> }) {
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
    <section className="grid gap-2" aria-label="As dez rotas">
      <ol ref={ref} className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1" role="tablist">
        {[...ROUTES.map((r) => r.n), 0].map((n) => {
          const r = routeByN(n);
          const on = n === current;
          const zone = r ? HOODS[r.hoods[0]].zone : "centro";
          const ink = ZONE_HEX[theme][zone];
          const dates = dateOfRoute.get(n) ?? [];
          const wants = r ? r.spots.filter((s) => familyBySpot.has(s.id)).length : REST.spots.filter((s) => familyBySpot.has(s.id)).length;
          return (
            <li key={n} className="shrink-0 snap-start" data-n={n}>
              <button
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onPick(n)}
                className={`grid h-full w-[11.5rem] content-start gap-1 rounded-xl border p-3 text-left transition-colors ${on ? "border-ink bg-ink text-paper" : "border-rule bg-card hover:border-ink-2"}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-stamp text-[0.7rem] font-black tracking-widest uppercase" style={{ color: on ? "var(--paper)" : ink }}>
                    {r ? `Rota ${r.n}` : "Bônus"}
                  </span>
                  <span className="flex gap-1">
                    {dates.length ? <span className={`rounded px-1 font-mono text-[0.6rem] ${on ? "bg-paper/20" : "bg-paper-2 text-ink-2"}`}>{dates.map(formatDay).join(" · ")}</span> : null}
                    {wants ? <span className={`font-mono text-[0.65rem] ${on ? "" : "text-vermilion"}`}>♥{wants}</span> : null}
                  </span>
                </span>
                <span className="font-display text-[1.15rem] leading-tight">{r ? r.title : "Dia de descanso"}</span>
                <span className={`line-clamp-2 text-[0.72rem] leading-snug ${on ? "opacity-80" : "text-muted"}`}>{r ? r.tagline : REST.tagline}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------ route */

function RoutePanel({
  route,
  color,
  days,
  routeDates,
  planId,
  assign,
  canEdit,
  filter,
  setFilter,
  matches,
  focusHood,
  onFocusHood,
  onOpen,
  marksBySpot,
  spotPlanned,
  near,
  onHood,
  travellers,
  familyCount,
}: {
  route: TokyoRoute;
  color: string;
  days: TokyoDay[];
  routeDates: string[];
  planId: string | null;
  assign: ReturnType<typeof routeAssignments>;
  canEdit: boolean;
  filter: SpotCat | "all" | "family";
  setFilter: (f: SpotCat | "all" | "family") => void;
  matches: (s: Spot) => boolean;
  focusHood: string | null;
  onFocusHood: (id: string) => void;
  onOpen: (id: string) => void;
  marksBySpot: Map<string, { traveller_id: string; status: string }[]>;
  spotPlanned: Map<string, unknown[]>;
  near: ReturnType<typeof nearbyHoods>;
  onHood: (id: string) => void;
  travellers: { id: string; name: string }[];
  familyCount: number;
}) {
  const f = routeFootprint(route);
  const zone = HOODS[route.hoods[0]].zone;
  const routeDate = routeDates[0] ?? null;
  const closureDay = routeDate ? inClosureZone(routeDate) : false;
  const risky = closureDay ? route.spots.filter((s) => nyNote(s, routeDate)?.level === "warn").length : 0;
  const idx = new Map(travellers.map((t, i) => [t.id, i]));
  const names = new Map(travellers.map((t) => [t.id, t.name]));
  const wanted = route.spots.filter((s) => marksBySpot.has(s.id));

  async function pin(date: string) {
    if (!planId) return;
    const cur = assign.get(date);
    if (cur?.n === route.n) return deleteRow("activities", cur.activity.id);
    if (cur) await deleteRow("activities", cur.activity.id);
    await insertRow("activities", routeActivity(route, planId, date, 0));
  }

  return (
    <section className="grid gap-5" aria-labelledby="route-h">
      <div className="grid gap-2">
        <p className="eyebrow flex flex-wrap items-center gap-2">
          <span style={{ color: ZONE_INK[zone] }}>Rota {route.n}</span> · {ZONES[zone].name} de Tokyo
          <span className="text-muted">
            · ~{f.km.toFixed(1)} km entre os bairros · {f.spots} lugares
          </span>
        </p>
        <h2 id="route-h" className="text-[2rem] leading-[1.05]">
          {route.title}
        </h2>
        <p className="text-ink-2">{route.tagline}.</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>☕ {f.cafe} cafés e padarias</span>
          <span>🍜 {f.eat} para comer e beber</span>
          <span>🛍 {f.shop} lojas</span>
          <span>⛩ {f.culture} cultura e parques</span>
        </p>
      </div>

      {days.length ? (
        <div className="card grid gap-2 p-4">
          <p className="text-sm font-bold">{routeDates.length ? `Marcada para ${routeDates.map((d) => `${weekday(d)} ${formatDay(d)}`).join(" e ")}` : "Qual dia fazemos esta rota?"}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Marcar a rota num dia">
            {days.map((d) => {
              const cur = assign.get(d.date);
              const on = cur?.n === route.n;
              return (
                <button
                  key={d.date}
                  type="button"
                  className="chip !min-h-9 text-sm"
                  aria-pressed={on}
                  disabled={!canEdit || !planId}
                  title={cur && !on ? `Hoje este dia tem a rota ${cur.n}; marcar troca.` : undefined}
                  onClick={() => pin(d.date)}
                >
                  {weekday(d.date)} {formatDay(d.date)}
                  {d.arrival ? " · chegada" : d.departure ? " · manhã" : ""}
                  {cur && !on ? <span className="font-mono text-[0.65rem] opacity-70">R{cur.n}</span> : null}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">
            Marcar põe a rota no programa do dia, em <Link href={routeDate ? `/plan/days?d=${routeDate}` : "/plan/days"} className="underline">Dia a dia</Link> e em Hoje. Troque quando quiser.
          </p>
          {closureDay && risky ? (
            <p className="rounded-xl p-3 text-sm" style={{ background: "var(--closure)" }}>
              <b className="text-vermilion">▲ {formatDay(routeDate!)} cai nos fechamentos de Ano-Novo:</b> {risky} lugares desta rota (museus, lojas, mercados) podem estar fechados. Os cafés, parques e templos seguem, com fila.
            </p>
          ) : null}
        </div>
      ) : null}

      {wanted.length ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-vermilion">♥ {wanted.length} nesta rota</span>
          {travellers
            .filter((t) => wanted.some((s) => marksBySpot.get(s.id)?.some((m) => m.traveller_id === t.id)))
            .map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 text-xs">
                <Avatar name={t.name} index={idx.get(t.id) ?? 0} size={20} /> {firstName(names.get(t.id) ?? "")}
              </span>
            ))}
          <span className="text-muted">· {familyCount} em toda Tokyo</span>
        </p>
      ) : null}

      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Filtrar lugares">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" className="chip !min-h-9 shrink-0 text-sm" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      <ol className="grid gap-6">
        {route.blocks.map((b) => (
          <li key={b.when} className="grid gap-3">
            <h3 className="flex items-baseline gap-2 text-[1.5rem]">
              {WHEN_LABEL[b.when].name} <span className="font-mono text-xs tracking-wider text-muted">{WHEN_LABEL[b.when].hours}</span>
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
                      <button type="button" className="flex items-center gap-2 text-left" onClick={() => onFocusHood(m.hood)} aria-pressed={focusHood === m.hood}>
                        <span className="grid size-7 shrink-0 place-items-center rounded-full font-stamp text-xs font-black" style={{ background: color, color: "#fffaf2" }}>
                          {route.hoods.indexOf(m.hood) + 1 || "·"}
                        </span>
                        <span className="font-stamp text-sm font-bold tracking-wider uppercase">{hood?.name}</span>
                        <span className="font-stamp text-xs text-muted" lang="ja">
                          {hood?.ja}
                        </span>
                        {m.leg ? <Pill>{m.leg}</Pill> : null}
                      </button>
                    ) : m.leg ? (
                      <Pill>{m.leg}</Pill>
                    ) : null}
                    <h4 className="font-display text-[1.3rem] leading-tight">{m.title}</h4>
                    <p className="text-sm text-ink-2">{m.text}</p>
                    {spots.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {spots.map((s) => (
                          <li key={s.id}>
                            <SpotChip spot={s} onOpen={() => onOpen(s.id)} marks={marksBySpot.get(s.id)?.length ?? 0} planned={spotPlanned.has(s.id)} ny={nyNote(s, routeDate)?.level ?? null} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {hidden > 0 && filter !== "all" ? <p className="text-xs text-muted">+{hidden} fora do filtro</p> : null}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>

      {near.length ? (
        <section className="card-flat grid gap-2 p-4" aria-label="Dá para emendar">
          <p className="text-sm font-bold">Com energia sobrando? Bairros de outras rotas a poucos passos:</p>
          <ul className="flex flex-wrap gap-1.5">
            {near.slice(0, 6).map((x) => (
              <li key={x.hood.id}>
                <button type="button" className="chip !min-h-9 text-sm" onClick={() => onHood(x.hood.id)}>
                  <span className="size-2 rounded-full" style={{ background: ZONE_INK[x.hood.zone] }} aria-hidden="true" />
                  {x.hood.name} · {fmtKm(x.km)}
                  {x.routes.length ? <span className="font-mono text-[0.65rem] text-muted">R{x.routes.join(",")}</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-2 rounded-2xl border border-dashed border-rule p-4" aria-label="Para refletir">
        <p className="eyebrow">No fim do dia</p>
        <p className="hand text-[1.35rem] leading-snug">{route.reflect}</p>
        <Link href={`/anotar?prompt=${encodeURIComponent(`Rota ${route.n} de Tokyo · ${route.reflect}`)}`} className="btn btn-sm justify-self-start no-underline">
          Responder no caderno
        </Link>
      </section>
    </section>
  );
}

/* ------------------------------------------------------------- rest */

function RestPanel({ onOpen, marksBySpot, spotPlanned }: { onOpen: (id: string) => void; marksBySpot: Map<string, unknown[]>; spotPlanned: Map<string, unknown[]> }) {
  return (
    <section className="grid gap-4" aria-labelledby="rest-h">
      <div className="grid gap-2">
        <p className="eyebrow">Bônus</p>
        <h2 id="rest-h" className="text-[2rem] leading-[1.05]">
          {REST.title}
        </h2>
        <p className="text-ink-2">{REST.tagline}. {REST.note}</p>
      </div>
      <ul className="grid gap-3">
        {REST.spots.map((s) => (
          <li key={s.id} className="card grid gap-2 p-4">
            <SpotRow spot={s} onOpen={() => onOpen(s.id)} marks={marksBySpot.get(s.id)?.length ?? 0} planned={spotPlanned.has(s.id)} trailing={HOODS[s.hood]?.name ?? ""} />
            <p className="text-sm text-ink-2">{s.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ chips */

function SpotChip({ spot, onOpen, marks, planned, ny }: { spot: Spot; onOpen: () => void; marks: number; planned: boolean; ny: "warn" | "info" | null }) {
  return (
    <button type="button" className="chip !min-h-9 max-w-full gap-1.5 !px-3 text-sm" onClick={onOpen} title={spot.note ?? undefined}>
      <CatIcon cat={spot.cat} size={14} className="shrink-0 text-muted" />
      <span className="truncate">{spot.name}</span>
      {marks ? <span className="font-mono text-[0.65rem] text-vermilion">♥{marks}</span> : null}
      {planned ? <span className="size-2 shrink-0 rounded-full bg-pine" aria-label="No plano" /> : null}
      {ny === "warn" ? <span className="text-[0.65rem] text-vermilion" aria-label="Pode estar fechado">▲</span> : null}
    </button>
  );
}

function SpotRow({ spot, onOpen, marks, planned, trailing }: { spot: Spot; onOpen: () => void; marks: number; planned: boolean; trailing: string }) {
  return (
    <button type="button" className="flex w-full items-center gap-3 text-left" onClick={onOpen}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-rule bg-card text-ink-2">
        <CatIcon cat={spot.cat} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">
          {spot.name}
          {marks ? <span className="ml-1.5 font-mono text-[0.7rem] text-vermilion">♥{marks}</span> : null}
          {planned ? <span className="ml-1.5 inline-block size-2 rounded-full bg-pine" aria-label="No plano" /> : null}
        </span>
        <span className="block truncate text-xs text-muted">
          {CAT_LABEL[spot.cat]}
          {spot.note ? ` · ${spot.note}` : ""}
        </span>
      </span>
      <span className="shrink-0 font-mono text-xs text-muted">{trailing}</span>
    </button>
  );
}

function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
