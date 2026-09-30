"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { onRouteColor, routeColor } from "@/lib/colors";
import { BOARD } from "@/lib/guides";
import { ROUTE_INK, ROUTE_MOTIF } from "@/lib/stamps";
import { placeMap, routePlaces, routeSequence } from "@/lib/trip";
import { EkiStamp } from "./EkiStamp";
import { CalendarStrip } from "./CalendarStrip";
import { PlaceSheet } from "./PlaceSheet";
import { useStore } from "./providers";
import { Pill } from "./ui";
import { RouteMap, type MapLine, type MapMarker } from "./RouteMap";
import { StayList } from "./StayList";
import { usePlans } from "./usePlans";

const ADDONS = "M";

export function ExploreView({ initialRoute, initialPlace }: { initialRoute: string | null; initialPlace: string | null }) {
  const { trip, resolvedTheme, hearts, me } = useStore();
  const candidates = useMemo(() => trip.routes.filter((r) => r.isCandidate), [trip.routes]);
  const { routes: planRoutes, chosen } = usePlans();
  const all = useMemo(() => [...candidates, ...planRoutes], [candidates, planRoutes]);
  const P = useMemo(() => placeMap(trip), [trip]);

  // Plans load after first render, so an unknown ?r= is kept until they arrive.
  const [code, setCode] = useState(initialRoute ?? candidates[0]?.code ?? ADDONS);
  const [selected, setSelected] = useState<string | null>(initialPlace && P.has(initialPlace) ? initialPlace : null);
  const [sheetOpen, setSheetOpen] = useState(!!selected);

  // Keep the URL shareable (?r=B&p=kyoto) without a navigation.
  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set("r", code);
    if (selected && sheetOpen) u.searchParams.set("p", selected);
    else u.searchParams.delete("p");
    window.history.replaceState(null, "", u);
  }, [code, selected, sheetOpen]);

  const route = code === ADDONS ? null : all.find((r) => r.code === code) ?? candidates[0] ?? null;
  const color = routeColor(route?.code ?? ADDONS, route?.color ?? "#6b5b95", resolvedTheme);
  const onColor = onRouteColor(resolvedTheme);

  const select = useCallback((slug: string) => {
    setSelected(slug);
    setSheetOpen(true);
  }, []);

  const myHearts = useMemo(
    () => new Set(hearts.filter((h) => h.travellerId === me?.travellerId).map((h) => h.placeId)),
    [hearts, me],
  );

  const { lines, markers } = useMemo(() => {
    const shown = route && !route.isCandidate ? [...candidates, route] : candidates;
    const lines: MapLine[] = shown.map((r) => ({
      code: r.code,
      color: routeColor(r.code, r.color, resolvedTheme),
      active: r.code === route?.code,
      path: routeSequence(r)
        .map((s) => P.get(s))
        .filter((p) => p?.lat != null && p?.lng != null)
        .map((p) => ({ lat: p!.lat!, lng: p!.lng! })),
    }));
    // Draw the active route on top.
    lines.sort((a, b) => Number(a.active) - Number(b.active));

    const markers: MapMarker[] = [];
    const slugs = route ? routePlaces(route) : trip.modules;
    const baseNum = new Map<string, number>();
    route?.stays.forEach((s, i) => !baseNum.has(s.place) && baseNum.set(s.place, i + 1));
    for (const slug of slugs) {
      const p = P.get(slug);
      if (!p || p.lat == null || p.lng == null) continue;
      const num = baseNum.get(slug);
      markers.push({
        slug,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        kind: num || !route ? "base" : "stop",
        num: num ?? (route ? undefined : trip.modules.indexOf(slug) + 1),
        hearted: myHearts.has(p.id),
      });
    }
    return { lines: route ? lines : lines.map((l) => ({ ...l, active: false })), markers };
  }, [candidates, route, trip.modules, P, resolvedTheme, myHearts]);

  const heartCount = useCallback((placeId: string) => hearts.filter((h) => h.placeId === placeId).length, [hearts]);

  const board = route ? BOARD.find((b) => b.code === route.code) : null;
  const ink = route ? ROUTE_INK[route.code] ?? route.color : ROUTE_INK[ADDONS];

  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-5 pb-12">
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1" role="group" aria-label="Escolha uma rota">
        {candidates.map((r) => (
          <button key={r.code} className="chip shrink-0" aria-pressed={r.code === route?.code} onClick={() => setCode(r.code)}>
            <span className="inline-block size-3 rounded-full" style={{ background: routeColor(r.code, r.color, resolvedTheme) }} />
            {r.code} · {r.name}
          </button>
        ))}
        {planRoutes.map((r) => (
          <button key={r.code} className="chip shrink-0" aria-pressed={r.code === route?.code} onClick={() => setCode(r.code)}>
            <span className="inline-block size-3 rounded-sm" style={{ background: r.color }} />
            {r.id === chosen?.id ? "★ " : ""}
            {r.name}
          </button>
        ))}
        <button className="chip shrink-0" aria-pressed={code === ADDONS} onClick={() => setCode(ADDONS)}>
          <span className="inline-block size-3 rounded-full" style={{ background: routeColor(ADDONS, "#6b5b95", resolvedTheme) }} />
          Extras
        </button>
      </div>

      <header className="grid gap-3">
        <div className="flex items-start gap-4">
          <div className="grid min-w-0 flex-1 gap-1">
            <p className="eyebrow" style={{ color: ink }}>
              {route ? (route.isCandidate ? `Rota ${route.code}` : route.id === chosen?.id ? "Nosso plano" : "Rascunho") : "Opcionais"}
            </p>
            <h1 className="text-[2.6rem] leading-[1.02] sm:text-5xl">{route ? route.name : "Extras"}</h1>
            <p className="text-[1.05rem] text-ink-2">{route ? route.title : "Lugares que podem entrar numa rota"}</p>
          </div>
          <EkiStamp
            motif={route ? ROUTE_MOTIF[route.code] ?? "train" : "leaf"}
            ink={ink}
            top={route ? route.name : "Extras"}
            bottom={route ? `${route.stays.length} bases` : "Japão"}
            size={92}
            rotate={9}
            seed={(route?.code ?? ADDONS).charCodeAt(0)}
            label=""
          />
        </div>
        {board ? <p className="text-[1.05rem] text-ink-2">{board.pitch}</p> : null}
        {board ? (
          <div className="flex flex-wrap gap-1.5">
            {board.good.slice(0, 2).map((g) => (
              <Pill key={g} tone="ok">
                {g}
              </Pill>
            ))}
            {board.warn.slice(0, 1).map((w) => (
              <Pill key={w} tone="warn">
                {w}
              </Pill>
            ))}
          </div>
        ) : null}
        <p className="text-sm text-muted">
          {route
            ? `${route.stays.length} bases${route.exitAirport ? ` · volta por ${route.exitAirport}` : ""}. Toque num lugar para ver fotos, avaliações e vídeos.`
            : "Toque num lugar para ver."}
        </p>
        {route?.isCandidate && !chosen ? (
          <Link href="/votar" className="btn btn-accent justify-self-start no-underline">
            Votar nas rotas
          </Link>
        ) : null}
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <RouteMap
          lines={lines}
          markers={markers}
          color={color}
          onColor={onColor}
          selected={selected}
          onSelect={select}
          theme={resolvedTheme}
          label={route ? `Mapa da rota ${route.code}, ${route.name}` : "Mapa dos extras"}
        />
        <div className="grid gap-4">
          {route ? (
            <CalendarStrip route={route} places={P} color={color} onColor={onColor} onSelect={select} />
          ) : (
            <ul className="grid gap-2">
              {trip.modules.map((slug) => {
                const p = P.get(slug)!;
                return (
                  <li key={slug}>
                    <button type="button" onClick={() => select(slug)} className="card grid w-full gap-0.5 p-4 text-left">
                      <span className="font-display text-[1.35rem] leading-tight">{p.name}</span>
                      <span className="text-sm text-muted">{p.blurb}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {route ? <StayList route={route} places={P} color={color} heartCount={heartCount} selected={selected} onSelect={select} /> : null}

      <PlaceSheet place={sheetOpen && selected ? P.get(selected) ?? null : null} route={route} onClose={() => setSheetOpen(false)} />
    </main>
  );
}
