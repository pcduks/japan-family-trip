"use client";

import { AdvancedMarker, APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef } from "react";
import { LAYER_HEX, type CityArea, type Pin } from "@/lib/city";
import { env, hasMaps } from "@/lib/env";
import { distanceKm } from "@/lib/tokyo";
import { CatIcon } from "../tokyo/CatIcon";

/*
 * The city map: every pin we know in its layer's ink, the named areas as
 * quiet labels, and "you are here" during the trip. A sketch stands in
 * without a key, so local development still shows the shape of the city.
 */

export interface MapPin {
  pin: Pin;
  lat: number;
  lng: number;
  saved: boolean;
}

export interface CityMapModel {
  center: { lat: number; lng: number };
  pins: MapPin[];
  areas: CityArea[];
  selected: string | null;
  /** Pan here (an area someone tapped), zoomed in. */
  focus: { lat: number; lng: number } | null;
  /** When this changes, the map fits the pins again. */
  fitKey: string;
  theme: "light" | "dark";
  me: { lat: number; lng: number } | null;
  onPin: (id: string) => void;
  onArea: (id: string) => void;
  label: string;
}

/** Drawing more than this many markers makes phones stutter; the list under the map still has them all. */
export const MAX_DRAWN = 300;

export function CityMap(m: CityMapModel) {
  return hasMaps ? <GoogleCityMap {...m} /> : <SketchCityMap {...m} />;
}

/* ------------------------------------------------------------ google */

function GoogleCityMap(m: CityMapModel) {
  const dark = m.theme === "dark";
  const mapId = (dark && env.mapIdDark) || env.mapId || "DEMO_MAP_ID";
  return (
    <APIProvider apiKey={env.mapsKey} language="en" region="JP">
      <Map
        key={`${mapId}-${m.theme}`}
        mapId={mapId}
        colorScheme={dark && !env.mapIdDark ? "DARK" : "LIGHT"}
        defaultCenter={m.center}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
        aria-label={m.label}
      >
        {m.areas.map((a) => (
          <AdvancedMarker key={a.id} position={{ lat: a.lat, lng: a.lng }} title={a.name} zIndex={5} onClick={() => m.onArea(a.id)}>
            <AreaLabel area={a} />
          </AdvancedMarker>
        ))}
        {m.pins.map((p) => {
          const sel = p.pin.id === m.selected;
          return (
            <AdvancedMarker key={p.pin.id} position={{ lat: p.lat, lng: p.lng }} title={p.pin.name} zIndex={sel ? 60 : p.saved ? 30 : p.pin.layer === "ours" ? 20 : 10} onClick={() => m.onPin(p.pin.id)}>
              <PinMarker p={p} color={LAYER_HEX[m.theme][p.pin.layer]} selected={sel} />
            </AdvancedMarker>
          );
        })}
        {m.me ? (
          <AdvancedMarker position={m.me} title="You are here" zIndex={70}>
            <span className="relative block size-4 rounded-full border-2 border-white bg-[#1a73e8] shadow" aria-label="You are here">
              <span className="absolute -inset-2 animate-ping rounded-full bg-[#1a73e8]/30" />
            </span>
          </AdvancedMarker>
        ) : null}
        <Fit pins={m.pins} focus={m.focus} fitKey={m.fitKey} center={m.center} />
      </Map>
    </APIProvider>
  );
}

function AreaLabel({ area }: { area: CityArea }) {
  return (
    <div className="flex flex-col items-center opacity-90" style={{ transform: "translateY(50%)" }}>
      <span className="block size-2.5 rounded-full border-2 border-ink/60 bg-card" />
      <span className="mt-0.5 rounded bg-card/85 px-1 text-[10px] font-bold tracking-wide whitespace-nowrap text-ink-2 uppercase">{area.name}</span>
    </div>
  );
}

function PinMarker({ p, color, selected }: { p: MapPin; color: string; selected: boolean }) {
  const size = selected ? 32 : p.saved ? 26 : 22;
  return (
    <div className="flex flex-col items-center" style={{ transform: "translateY(50%)" }}>
      <div
        className="grid place-items-center rounded-full shadow"
        style={{ width: size, height: size, background: p.saved || selected ? color : "var(--card)", color: p.saved || selected ? "#fff" : color, border: `2px solid ${color}`, outline: selected ? "2px solid var(--ink)" : undefined, outlineOffset: 2 }}
      >
        <CatIcon cat={p.pin.cat} size={selected ? 17 : 12} />
      </div>
      {selected ? <span className="mt-0.5 max-w-[12rem] truncate rounded bg-card/95 px-1 text-[12px] font-bold whitespace-nowrap text-ink">{p.pin.name}</span> : null}
    </div>
  );
}

function Fit({ pins, focus, fitKey, center }: { pins: MapPin[]; focus: { lat: number; lng: number } | null; fitKey: string; center: { lat: number; lng: number } }) {
  const map = useMap();
  const fitted = useRef<{ key: string; at: number } | null>(null);
  const n = pins.length;
  useEffect(() => {
    if (!map || typeof google === "undefined") return;
    if (focus) {
      map.panTo(focus);
      if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
      fitted.current = null;
      return;
    }
    // Fit when the view changes, and again as pins land during the first seconds after; later arrivals leave the map where the person put it.
    const now = Date.now();
    if (fitted.current?.key === fitKey && now - fitted.current.at > 15000) return;
    if (fitted.current?.key !== fitKey) fitted.current = { key: fitKey, at: now };
    if (!n) {
      map.panTo(center);
      map.setZoom(12);
      return;
    }
    // One pin in the next city shouldn't zoom the map out to the whole region: fit the ones near the centre when there are enough.
    const near = pins.filter((p) => distanceKm(p, center) <= 20);
    const b = new google.maps.LatLngBounds();
    (near.length >= 3 ? near : pins).forEach((p) => b.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(b, { top: 56, bottom: 40, left: 28, right: 28 });
    if (n === 1 && (map.getZoom() ?? 0) > 16) map.setZoom(16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey, n, focus]);
  return null;
}

/* ------------------------------------------------------------ sketch */

/** No Maps key: a plain SVG sketch, so the page works in local development. */
function SketchCityMap(m: CityMapModel) {
  const W = 480;
  const H = 400;
  const pts = useMemo(() => {
    const all = [...m.pins.map((p) => ({ lat: p.lat, lng: p.lng })), ...m.areas.map((a) => ({ lat: a.lat, lng: a.lng }))];
    return all.length ? all : [m.center];
  }, [m.pins, m.areas, m.center]);
  const proj = useMemo(() => {
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const k = Math.cos(((Math.min(...lats) + Math.max(...lats)) / 2) * (Math.PI / 180));
    const minX = Math.min(...lngs) * k;
    const maxX = Math.max(...lngs) * k;
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);
    const span = Math.max(maxX - minX, maxY - minY, 0.03);
    const s = Math.min((W - 110) / span, (H - 90) / span);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return (p: { lat: number; lng: number }) => [W / 2 + (p.lng * k - cx) * s, H / 2 - (p.lat - cy) * s] as const;
  }, [pts]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="size-full bg-bg-2" role="group" aria-label={`${m.label} (a sketch; with a Google Maps key this becomes the real map)`}>
      {m.areas.map((a) => {
        const [x, y] = proj(a);
        return (
          <g key={a.id} className="cursor-pointer" onClick={() => m.onArea(a.id)}>
            <circle cx={x} cy={y} r={4} fill="var(--card)" stroke="var(--ink-2)" strokeWidth={2} />
            <text x={x + 7} y={y + 4} fontSize={10} fill="var(--ink-2)">
              {a.name}
            </text>
          </g>
        );
      })}
      {m.pins.map((p) => {
        const [x, y] = proj(p);
        const sel = p.pin.id === m.selected;
        const color = LAYER_HEX[m.theme][p.pin.layer];
        return (
          <g key={p.pin.id} className="cursor-pointer" onClick={() => m.onPin(p.pin.id)}>
            <circle cx={x} cy={y} r={sel ? 7 : p.saved ? 5.5 : 4} fill={p.saved || sel ? color : "var(--card)"} stroke={sel ? "var(--ink)" : color} strokeWidth={2} />
            {sel ? (
              <text x={x + 10} y={y + 4} fontSize={12} fontWeight={700} fill="var(--ink)" stroke="var(--bg-2)" strokeWidth={3} paintOrder="stroke">
                {p.pin.name}
              </text>
            ) : null}
          </g>
        );
      })}
      {m.me
        ? (() => {
            const [x, y] = proj(m.me!);
            return <circle cx={x} cy={y} r={6} fill="#1a73e8" stroke="white" strokeWidth={2} />;
          })()
        : null}
    </svg>
  );
}
