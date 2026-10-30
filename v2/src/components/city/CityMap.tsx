"use client";

import { AdvancedMarker, APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef } from "react";
import { LAYER_HEX, LAYER_ON_INK, type CityArea, type Layer, type Pin } from "@/lib/city";
import { env, hasMaps } from "@/lib/env";
import { distanceKm } from "@/lib/tokyo";
import { CatIcon } from "../tokyo/CatIcon";

/*
 * The city map: pins in their layer's ink, or, when there would be too many
 * to read, one bubble per area with a count (tap it to open the area). A
 * sketch stands in without a key, so local development still shows the
 * shape of the city.
 */

export interface MapPin {
  pin: Pin;
  /** A stable object per pin, so markers are not moved on every render. */
  at: { lat: number; lng: number };
  saved: boolean;
}

export interface Bubble {
  area: CityArea;
  count: number;
  /** The layer with the most pins in it, for the bubble's ink. */
  layer: Layer;
}

export interface CityMapModel {
  center: { lat: number; lng: number };
  pins: MapPin[];
  /** Drawn instead of pins at city zoom. */
  bubbles: Bubble[];
  areas: CityArea[];
  selected: string | null;
  /** Pan here (an area someone tapped), zoomed in. Memoised by the caller. */
  focus: { lat: number; lng: number } | null;
  /** When this changes, the map fits the pins again. */
  fitKey: string;
  theme: "light" | "dark";
  me: { lat: number; lng: number } | null;
  /** One finger scrolls the page past the map; two fingers pan it. Fullscreen and desktop take the map outright. */
  gesture: "cooperative" | "greedy";
  onPin: (id: string) => void;
  onArea: (id: string) => void;
  label: string;
}

/** Above this many pins the map shows area bubbles instead. */
export const BUBBLE_ABOVE = 120;

export function CityMap(m: CityMapModel) {
  return hasMaps ? <GoogleCityMap {...m} /> : <SketchCityMap {...m} />;
}

/* ------------------------------------------------------------ google */

function GoogleCityMap(m: CityMapModel) {
  const dark = m.theme === "dark";
  const mapId = (dark && env.mapIdDark) || env.mapId || "DEMO_MAP_ID";
  const inks = LAYER_HEX[m.theme];
  const onInk = LAYER_ON_INK[m.theme];
  return (
    <APIProvider apiKey={env.mapsKey} language="en" region="JP">
      <Map
        key={`${mapId}-${m.theme}`}
        mapId={mapId}
        colorScheme={dark && !env.mapIdDark ? "DARK" : "LIGHT"}
        defaultCenter={m.center}
        defaultZoom={12}
        gestureHandling={m.gesture}
        disableDefaultUI
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
        aria-label={m.label}
      >
        {m.bubbles.length
          ? m.bubbles.map((b) => (
              <AdvancedMarker key={b.area.id} position={b.area} title={`${b.area.name}: ${b.count}`} zIndex={20} onClick={() => m.onArea(b.area.id)}>
                <AreaBubble b={b} ink={inks[b.layer]} onInk={onInk} />
              </AdvancedMarker>
            ))
          : m.areas.map((a) => (
              <AdvancedMarker key={a.id} position={a} title={a.name} zIndex={5} onClick={() => m.onArea(a.id)}>
                <AreaLabel area={a} />
              </AdvancedMarker>
            ))}
        {m.pins.map((p) => {
          const sel = p.pin.id === m.selected;
          return (
            <AdvancedMarker key={p.pin.id} position={p.at} title={p.pin.name} zIndex={sel ? 60 : p.saved ? 30 : p.pin.layer === "ours" ? 20 : 10} onClick={() => m.onPin(p.pin.id)}>
              <PinMarker p={p} color={inks[p.pin.layer]} onInk={onInk} selected={sel} />
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
        <Fit pins={m.pins} bubbles={m.bubbles} focus={m.focus} fitKey={m.fitKey} center={m.center} />
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

/** An area with how much sits in it, like the numbered seals on Tokyo on foot. */
function AreaBubble({ b, ink, onInk }: { b: Bubble; ink: string; onInk: string }) {
  const size = b.count >= 40 ? 44 : b.count >= 15 ? 38 : 32;
  return (
    <div className="flex flex-col items-center" style={{ transform: "translateY(50%)" }}>
      <div className="grid place-items-center rounded-full text-[13px] font-extrabold shadow-md" style={{ width: size, height: size, background: ink, color: onInk, border: "2.5px solid #fff" }}>
        {b.count}
      </div>
      <span className="mt-0.5 rounded bg-card/95 px-1.5 text-[11px] font-bold tracking-wide whitespace-nowrap text-ink uppercase shadow-sm">{b.area.name}</span>
    </div>
  );
}

function PinMarker({ p, color, onInk, selected }: { p: MapPin; color: string; onInk: string; selected: boolean }) {
  const size = selected ? 36 : p.saved ? 30 : 26;
  const filled = p.saved || selected;
  return (
    <div className="flex flex-col items-center" style={{ transform: "translateY(50%)" }}>
      <div
        className="grid place-items-center rounded-full shadow"
        style={{ width: size, height: size, background: filled ? color : "var(--card)", color: filled ? onInk : color, border: `2px solid ${color}`, outline: selected ? "2px solid var(--ink)" : undefined, outlineOffset: 2 }}
      >
        <CatIcon cat={p.pin.cat} size={selected ? 18 : 14} />
      </div>
      {selected ? <span className="mt-0.5 max-w-[12rem] truncate rounded bg-card/95 px-1 text-[12px] font-bold whitespace-nowrap text-ink">{p.pin.name}</span> : null}
    </div>
  );
}

function Fit({ pins, bubbles, focus, fitKey, center }: { pins: MapPin[]; bubbles: Bubble[]; focus: { lat: number; lng: number } | null; fitKey: string; center: { lat: number; lng: number } }) {
  const map = useMap();
  const fitted = useRef<{ key: string; at: number } | null>(null);
  const pts = useMemo(() => (bubbles.length ? bubbles.map((b) => ({ lat: b.area.lat, lng: b.area.lng })) : pins.map((p) => p.at)), [pins, bubbles]);
  const n = pts.length;
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
    const near = pts.filter((p) => distanceKm(p, center) <= 20);
    const b = new google.maps.LatLngBounds();
    (near.length >= 3 ? near : pts).forEach((p) => b.extend(p));
    map.fitBounds(b, { top: 64, bottom: 72, left: 28, right: 28 });
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
    const all = [...m.pins.map((p) => p.at), ...m.areas.map((a) => ({ lat: a.lat, lng: a.lng }))];
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
  const inks = LAYER_HEX[m.theme];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="size-full bg-bg-2" role="group" aria-label={`${m.label} (a sketch; with a Google Maps key this becomes the real map)`}>
      {(m.bubbles.length ? m.bubbles.map((b) => b.area) : m.areas).map((a) => {
        const [x, y] = proj(a);
        const b = m.bubbles.find((x) => x.area.id === a.id);
        return (
          <g key={a.id} className="cursor-pointer" onClick={() => m.onArea(a.id)}>
            <circle cx={x} cy={y} r={b ? 12 : 4} fill={b ? inks[b.layer] : "var(--card)"} stroke={b ? "var(--card)" : "var(--ink-2)"} strokeWidth={2} />
            {b ? (
              <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">
                {b.count}
              </text>
            ) : null}
            <text x={x + (b ? 0 : 7)} y={y + (b ? 24 : 4)} textAnchor={b ? "middle" : "start"} fontSize={10} fill="var(--ink-2)">
              {a.name}
            </text>
          </g>
        );
      })}
      {m.pins.map((p) => {
        const [x, y] = proj(p.at);
        const sel = p.pin.id === m.selected;
        const color = inks[p.pin.layer];
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
