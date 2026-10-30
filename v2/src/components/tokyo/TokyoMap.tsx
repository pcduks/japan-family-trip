"use client";

import { AdvancedMarker, APIProvider, Map, Polyline, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useMemo } from "react";
import { env, hasMaps } from "@/lib/env";
import type { SpotHit } from "@/lib/google/places";
import { HOODS, ZONE_HEX, type Hood, type Spot } from "@/lib/tokyo";
import { CatIcon } from "./CatIcon";

/*
 * The Tokyo map: neighbourhoods as numbered seals along a dashed walking
 * line, the walk's spots as small category pins once Google has found them,
 * and "you are here" during the trip. A sketch stands in without a key.
 */

export interface MapSpot {
  spot: Spot;
  hit: SpotHit;
  /** Someone in the family saved it. */
  saved: boolean;
}

export interface TokyoMapModel {
  /** The walk's neighbourhoods, in walking order. */
  walkHoods: Hood[];
  /** Neighbourhoods shown as quiet dots (nearby, or all of them). */
  otherHoods: Hood[];
  spots: MapSpot[];
  selectedSpot: string | null;
  focusHood: string | null;
  color: string;
  theme: "light" | "dark";
  me: { lat: number; lng: number } | null;
  onSpot: (id: string) => void;
  onHood: (id: string) => void;
  label: string;
}

const TOKYO = { lat: 35.675, lng: 139.72 };

export function TokyoMap(m: TokyoMapModel) {
  return hasMaps ? <GoogleTokyoMap {...m} /> : <SketchTokyoMap {...m} />;
}

/* ------------------------------------------------------------ google */

function GoogleTokyoMap(m: TokyoMapModel) {
  const dark = m.theme === "dark";
  const mapId = (dark && env.mapIdDark) || env.mapId || "DEMO_MAP_ID";
  const path = m.walkHoods.map((h) => ({ lat: h.lat, lng: h.lng }));
  const icons = useMemo(() => [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeWeight: 3, scale: 3, strokeColor: m.color }, offset: "0", repeat: "16px" }], [m.color]);
  return (
    <APIProvider apiKey={env.mapsKey} language="en" region="JP">
      <Map
        key={`${mapId}-${m.theme}`}
        mapId={mapId}
        colorScheme={dark && !env.mapIdDark ? "DARK" : "LIGHT"}
        defaultCenter={TOKYO}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
        aria-label={m.label}
      >
        {path.length > 1 ? <Polyline path={path} strokeColor={m.color} strokeOpacity={0} icons={icons} zIndex={1} /> : null}
        {m.otherHoods.map((h) => (
          <AdvancedMarker key={h.id} position={{ lat: h.lat, lng: h.lng }} title={h.name} zIndex={5} onClick={() => m.onHood(h.id)}>
            <QuietHood hood={h} theme={m.theme} />
          </AdvancedMarker>
        ))}
        {m.spots.map((s) => (
          <AdvancedMarker key={s.spot.id} position={{ lat: s.hit.lat, lng: s.hit.lng }} title={s.spot.name} zIndex={s.spot.id === m.selectedSpot ? 40 : s.saved ? 25 : 10} onClick={() => m.onSpot(s.spot.id)}>
            <SpotPin s={s} color={m.color} selected={s.spot.id === m.selectedSpot} />
          </AdvancedMarker>
        ))}
        {m.walkHoods.map((h, i) => (
          <AdvancedMarker key={h.id} position={{ lat: h.lat, lng: h.lng }} title={h.name} zIndex={30 + i} onClick={() => m.onHood(h.id)}>
            <HoodSeal hood={h} num={i + 1} color={m.color} focused={m.focusHood === h.id} />
          </AdvancedMarker>
        ))}
        {m.me ? (
          <AdvancedMarker position={m.me} title="You are here" zIndex={50}>
            <span className="relative block size-4 rounded-full border-2 border-white bg-[#1a73e8] shadow" aria-label="You are here">
              <span className="absolute -inset-2 animate-ping rounded-full bg-[#1a73e8]/30" />
            </span>
          </AdvancedMarker>
        ) : null}
        <Fit walkHoods={m.walkHoods} spots={m.spots} focusHood={m.focusHood} />
      </Map>
    </APIProvider>
  );
}

/** A numbered seal in the walk's ink, with the neighbourhood's name beneath. */
function HoodSeal({ hood, num, color, focused }: { hood: Hood; num: number; color: string; focused: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ transform: "translateY(50%)" }}>
      <div
        className="grid place-items-center rounded-full text-[13px] font-extrabold shadow-md"
        style={{ width: focused ? 34 : 28, height: focused ? 34 : 28, background: color, color: "#fff", border: "2.5px solid #fff", outline: focused ? `2px solid ${color}` : undefined, outlineOffset: 2 }}
      >
        {num}
      </div>
      <span className="mt-0.5 rounded bg-card/95 px-1.5 text-[11px] font-bold tracking-wide whitespace-nowrap text-ink uppercase shadow-sm">{hood.name}</span>
    </div>
  );
}

/** A neighbourhood from another day: a small ring in its zone ink. */
function QuietHood({ hood, theme }: { hood: Hood; theme: "light" | "dark" }) {
  return (
    <div className="flex flex-col items-center opacity-80" style={{ transform: "translateY(50%)" }}>
      <span className="block size-3 rounded-full border-2 bg-card" style={{ borderColor: ZONE_HEX[theme][hood.zone] }} />
      <span className="mt-0.5 rounded bg-card/80 px-1 text-[10px] whitespace-nowrap text-ink-2">{hood.name}</span>
    </div>
  );
}

function SpotPin({ s, color, selected }: { s: MapSpot; color: string; selected: boolean }) {
  const size = selected ? 30 : 22;
  return (
    <div className="flex flex-col items-center" style={{ transform: "translateY(50%)" }}>
      <div
        className="grid place-items-center rounded-full shadow"
        style={{ width: size, height: size, background: s.saved ? "var(--accent)" : "var(--card)", color: s.saved ? "var(--accent-ink)" : color, border: `2px solid ${s.saved ? "var(--accent)" : color}`, outline: selected ? "2px solid var(--ink)" : undefined, outlineOffset: 2 }}
      >
        <CatIcon cat={s.spot.cat} size={selected ? 16 : 12} />
      </div>
      {selected ? <span className="mt-0.5 rounded bg-card/95 px-1 text-[12px] font-bold whitespace-nowrap text-ink">{s.spot.name}</span> : null}
    </div>
  );
}

function Fit({ walkHoods, spots, focusHood }: { walkHoods: Hood[]; spots: MapSpot[]; focusHood: string | null }) {
  const map = useMap();
  const walkKey = walkHoods.map((h) => h.id).join("|");
  const spotKey = spots.length;
  useEffect(() => {
    if (!map || typeof google === "undefined") return;
    if (focusHood) {
      const h = HOODS[focusHood];
      if (h) {
        map.panTo({ lat: h.lat, lng: h.lng });
        if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
      }
      return;
    }
    const pts = [...walkHoods.map((h) => ({ lat: h.lat, lng: h.lng })), ...spots.map((s) => ({ lat: s.hit.lat, lng: s.hit.lng }))];
    if (!pts.length) return;
    const b = new google.maps.LatLngBounds();
    pts.forEach((p) => b.extend(p));
    map.fitBounds(b, { top: 48, bottom: 24, left: 24, right: 24 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, walkKey, spotKey, focusHood]);
  return null;
}

/* ------------------------------------------------------------ sketch */

/** No Maps key: a plain SVG sketch, so the page works in local development. */
function SketchTokyoMap(m: TokyoMapModel) {
  const W = 480;
  const H = 400;
  const focus = useMemo(() => {
    const all = [...m.walkHoods, ...m.otherHoods, ...m.spots.map((s) => s.hit)];
    return m.walkHoods.length ? [...m.walkHoods, ...m.spots.map((s) => s.hit)] : all.length ? all : [TOKYO];
  }, [m.walkHoods, m.otherHoods, m.spots]);
  const proj = useMemo(() => {
    const lats = focus.map((p) => p.lat);
    const lngs = focus.map((p) => p.lng);
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
  }, [focus]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="size-full bg-bg-2" role="group" aria-label={`${m.label} (a sketch; with a Google Maps key this becomes the real map)`}>
      {m.walkHoods.length > 1 ? <polyline points={m.walkHoods.map((h) => proj(h).join(",")).join(" ")} fill="none" stroke={m.color} strokeWidth={3} strokeDasharray="6 6" strokeLinecap="round" /> : null}
      {m.otherHoods.map((h) => {
        const [x, y] = proj(h);
        return (
          <g key={h.id} className="cursor-pointer" onClick={() => m.onHood(h.id)}>
            <circle cx={x} cy={y} r={4} fill="var(--card)" stroke={ZONE_HEX[m.theme][h.zone]} strokeWidth={2} />
            <text x={x + 7} y={y + 4} fontSize={10} fill="var(--ink-2)">
              {h.name}
            </text>
          </g>
        );
      })}
      {m.spots.map((s) => {
        const [x, y] = proj(s.hit);
        const sel = s.spot.id === m.selectedSpot;
        return (
          <g key={s.spot.id} className="cursor-pointer" onClick={() => m.onSpot(s.spot.id)}>
            <circle cx={x} cy={y} r={sel ? 7 : 4.5} fill={s.saved ? "var(--accent)" : "var(--card)"} stroke={sel ? "var(--ink)" : m.color} strokeWidth={2} />
            {sel ? (
              <text x={x + 10} y={y + 4} fontSize={12} fontWeight={700} fill="var(--ink)" stroke="var(--bg-2)" strokeWidth={3} paintOrder="stroke">
                {s.spot.name}
              </text>
            ) : null}
          </g>
        );
      })}
      {m.walkHoods.map((h, i) => {
        const [x, y] = proj(h);
        return (
          <g key={h.id} className="cursor-pointer" onClick={() => m.onHood(h.id)}>
            <circle cx={x} cy={y} r={m.focusHood === h.id ? 15 : 12} fill={m.color} stroke="var(--card)" strokeWidth={2.5} />
            <text x={x} y={y + 4.5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#fff">
              {i + 1}
            </text>
            <text x={x} y={y + 28} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink)" stroke="var(--bg-2)" strokeWidth={3} paintOrder="stroke" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
              {h.name}
            </text>
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
