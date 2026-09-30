"use client";

import { AdvancedMarker, APIProvider, Map, Polyline, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useMemo } from "react";
import { env, hasMaps } from "@/lib/env";

export interface MapLine {
  code: string;
  color: string;
  active: boolean;
  path: { lat: number; lng: number }[];
}

export interface MapMarker {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** "base" = where you sleep (numbered), "stop" = day trip or stop on the way. */
  kind: "base" | "stop";
  num?: number;
  hearted: boolean;
}

export interface MapModel {
  lines: MapLine[];
  markers: MapMarker[];
  color: string;
  onColor: string;
  selected: string | null;
  onSelect: (slug: string) => void;
  theme: "light" | "dark";
  label: string;
}

export function RouteMap(props: MapModel) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-soft">
      <div className="aspect-[4/5] w-full sm:aspect-square lg:aspect-[5/4]">
        {hasMaps ? <GoogleRouteMap {...props} /> : <SketchMap {...props} />}
      </div>
      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-3 rounded-md border border-line bg-card/90 px-2.5 py-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full" style={{ background: props.color }} /> Where you sleep
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full border-2" style={{ borderColor: props.color }} /> Day trip or stop
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Google map */

function GoogleRouteMap(m: MapModel) {
  const dark = m.theme === "dark";
  const mapId = (dark && env.mapIdDark) || env.mapId || "DEMO_MAP_ID";
  return (
    <APIProvider apiKey={env.mapsKey} language="en" region="JP">
      <Map
        // colorScheme is fixed at creation, so remount when the theme flips.
        key={`${mapId}-${m.theme}`}
        mapId={mapId}
        colorScheme={dark && !env.mapIdDark ? "DARK" : "LIGHT"}
        defaultCenter={{ lat: 36, lng: 137.5 }}
        defaultZoom={5}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
        aria-label={m.label}
      >
        {m.lines.map((l) => (
          <Polyline
            key={l.code + l.active}
            path={l.path}
            strokeColor={l.color}
            strokeOpacity={l.active ? 0.95 : 0.3}
            strokeWeight={l.active ? 4 : 2}
            zIndex={l.active ? 2 : 1}
            geodesic
          />
        ))}
        {m.markers.map((mk) => (
          <AdvancedMarker
            key={mk.slug}
            position={{ lat: mk.lat, lng: mk.lng }}
            title={mk.name}
            zIndex={mk.slug === m.selected ? 30 : mk.kind === "base" ? 20 : 10}
            onClick={() => m.onSelect(mk.slug)}
          >
            <MarkerFace mk={mk} color={m.color} onColor={m.onColor} selected={mk.slug === m.selected} />
          </AdvancedMarker>
        ))}
        <FitBounds points={m.markers} />
      </Map>
    </APIProvider>
  );
}

function MarkerFace({ mk, color, onColor, selected }: { mk: MapMarker; color: string; onColor: string; selected: boolean }) {
  const base = mk.kind === "base";
  return (
    <div className="flex flex-col items-center" style={{ transform: "translateY(50%)" }}>
      <div
        className="grid place-items-center rounded-full font-mono text-[11px] font-medium shadow"
        style={{
          width: base ? 26 : 16,
          height: base ? 26 : 16,
          background: base ? color : "var(--card)",
          color: onColor,
          border: base ? "2px solid var(--card)" : `3px solid ${color}`,
          outline: selected ? "2px solid var(--ink)" : undefined,
          outlineOffset: 2,
        }}
      >
        {base ? mk.num : null}
      </div>
      {base || selected ? (
        <span className="mt-0.5 rounded bg-card/90 px-1 text-[12px] font-bold whitespace-nowrap text-ink">
          {mk.hearted ? "♥ " : ""}
          {mk.name}
        </span>
      ) : null}
    </div>
  );
}

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join("|");
  useEffect(() => {
    if (!map || !points.length || typeof google === "undefined") return;
    const b = new google.maps.LatLngBounds();
    points.forEach((p) => b.extend(p));
    map.fitBounds(b, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/* --------------------------------------------- fallback (no Maps key) */

/**
 * Plain SVG sketch used when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing, so
 * the app still works for local development and demos.
 */
function SketchMap(m: MapModel) {
  const all = useMemo(() => [...m.markers, ...m.lines.flatMap((l) => l.path)], [m.markers, m.lines]);
  const focus = m.markers.length ? m.markers : all;
  const W = 400;
  const H = 440;
  const proj = useMemo(() => {
    const lats = focus.map((p) => p.lat);
    const lngs = focus.map((p) => p.lng);
    const k = Math.cos(((Math.min(...lats) + Math.max(...lats)) / 2) * (Math.PI / 180));
    const minX = Math.min(...lngs) * k;
    const maxX = Math.max(...lngs) * k;
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);
    const span = Math.max(maxX - minX, maxY - minY, 0.6);
    const s = Math.min((W - 90) / span, (H - 90) / span);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return (p: { lat: number; lng: number }) => [W / 2 + (p.lng * k - cx) * s, H / 2 - (p.lat - cy) * s] as const;
  }, [focus]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="size-full" role="group" aria-label={`${m.label} (sketch map, add a Google Maps key for the live map)`}>
      {m.lines.map((l) => (
        <polyline
          key={l.code}
          points={l.path.map((p) => proj(p).join(",")).join(" ")}
          fill="none"
          stroke={l.color}
          strokeWidth={l.active ? 3 : 1.5}
          strokeOpacity={l.active ? 0.95 : 0.3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {m.markers
        .slice()
        .sort((a, b) => (a.kind === "base" ? 1 : 0) - (b.kind === "base" ? 1 : 0))
        .map((mk) => {
          const [x, y] = proj(mk);
          const sel = mk.slug === m.selected;
          const base = mk.kind === "base";
          return (
            <g
              key={mk.slug}
              role="button"
              tabIndex={0}
              aria-label={mk.name}
              className="cursor-pointer"
              onClick={() => m.onSelect(mk.slug)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && m.onSelect(mk.slug)}
            >
              {sel ? <circle cx={x} cy={y} r={base ? 14 : 10} fill="none" stroke="var(--ink)" strokeWidth={2} /> : null}
              <circle cx={x} cy={y} r={base ? 10 : 5.5} fill={base ? m.color : "var(--card)"} stroke={base ? "var(--card)" : m.color} strokeWidth={base ? 2 : 2.5} />
              {base ? (
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize={10} fill={m.onColor} className="font-mono" style={{ pointerEvents: "none" }}>
                  {mk.num}
                </text>
              ) : null}
              {base || sel ? (
                <text x={x + (base ? 14 : 9)} y={y + 4} fontSize={12} fontWeight={700} fill="var(--ink)" stroke="var(--soft)" strokeWidth={3} paintOrder="stroke" style={{ pointerEvents: "none" }}>
                  {mk.hearted ? "♥ " : ""}
                  {mk.name}
                </text>
              ) : null}
            </g>
          );
        })}
    </svg>
  );
}
