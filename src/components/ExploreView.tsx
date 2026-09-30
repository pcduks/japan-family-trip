"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { onRouteColor, routeColor } from "@/lib/colors";
import { placeMap, routePlaces, routeSequence } from "@/lib/trip";
import { CalendarStrip } from "./CalendarStrip";
import { PlaceSheet } from "./PlaceSheet";
import { useStore } from "./providers";
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

  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-4">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1" role="group" aria-label="Choose a route">
        {candidates.map((r) => (
          <button key={r.code} className="chip" aria-pressed={r.code === route?.code} onClick={() => setCode(r.code)}>
            <span className="inline-block size-3 rounded-full" style={{ background: routeColor(r.code, r.color, resolvedTheme) }} />
            {r.code} · {r.name}
          </button>
        ))}
        {planRoutes.map((r) => (
          <button key={r.code} className="chip" aria-pressed={r.code === route?.code} onClick={() => setCode(r.code)}>
            <span className="inline-block size-3 rounded-sm" style={{ background: r.color }} />
            {r.id === chosen?.id ? "★ " : ""}
            {r.name}
          </button>
        ))}
        <button className="chip" aria-pressed={code === ADDONS} onClick={() => setCode(ADDONS)}>
          <span className="inline-block size-3 rounded-full" style={{ background: routeColor(ADDONS, "#6b5b95", resolvedTheme) }} />
          Add-ons
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold">{route ? route.title : "Optional add-ons"}</h1>
        <p className="text-sm text-muted">
          {route
            ? `${route.isCandidate ? "" : "Our plan · "}${route.stays.length} bases${route.exitAirport ? ` · fly home from ${route.exitAirport}` : ""}. Tap a place for photos, reviews and videos.`
            : "Places that could be swapped into a route. Tap one to see it."}
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <RouteMap
          lines={lines}
          markers={markers}
          color={color}
          onColor={onColor}
          selected={selected}
          onSelect={select}
          theme={resolvedTheme}
          label={route ? `Map of route ${route.code}, ${route.name}` : "Map of optional add-ons"}
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
                    <button type="button" onClick={() => select(slug)} className="card grid w-full gap-0.5 p-3 text-left">
                      <span className="font-bold">{p.name}</span>
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
