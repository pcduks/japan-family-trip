"use client";

import { AdvancedMarker, APIProvider, Map, Polyline, useMap } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fitColor, fitLabel, regionColor } from "@/lib/colors";
import { fmtRange } from "@/lib/dates";
import { env, hasMaps } from "@/lib/env";
import type { Place, Region, Version } from "@/lib/types";
import { swapInRegion } from "@/lib/versions";
import { useStore } from "./providers";
import { Back, Page, PageHeader, RegionDot } from "./ui";

interface Model {
  version: Version | null;
  path: { lat: number; lng: number }[];
  stays: { index: number; region: Region; nights: number; from: string; to: string }[];
  places: Place[];
  candidates: Region[];
}

export function MapView() {
  const { snapshot, me, resolvedTheme, saveVersion } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const visible = snapshot.versions.filter((v) => v.status !== "legacy" && (v.shared !== false || v.owner === me?.travellerId));
  const [versionId, setVersionId] = useState(params.get("version") ?? snapshot.versions.find((v) => v.status === "plan")?.id ?? "");
  const [selected, setSelected] = useState<string | null>(params.get("region"));
  const [showPlaces, setShowPlaces] = useState(true);
  const [showCandidates, setShowCandidates] = useState(true);

  const model: Model = useMemo(() => {
    const version = snapshot.versions.find((v) => v.id === versionId) ?? null;
    const regionOf = (id: string) => snapshot.regions.find((r) => r.id === id);
    const stays = (version?.stays ?? []).map((s, i) => ({ index: i, region: regionOf(s.region)!, nights: s.nights, from: s.from, to: s.to })).filter((s) => s.region);
    const path = stays.map((s) => ({ lat: s.region.lat, lng: s.region.lng }));
    const inVersion = new Set(stays.map((s) => s.region.id));
    const places = showPlaces ? snapshot.places.filter((p) => p.lat != null && p.lng != null && inVersion.has(p.region) && p.size !== "meal") : [];
    const candidates = showCandidates ? snapshot.regions.filter((r) => !inVersion.has(r.id) && r.status !== "not_this_trip") : [];
    return { version, path, stays, places, candidates };
  }, [snapshot, versionId, showPlaces, showCandidates]);

  const sel = selected ? snapshot.regions.find((r) => r.id === selected) : null;
  const selStays = sel ? model.stays.filter((s) => s.region.id === sel.id) : [];
  const plan = snapshot.versions.find((v) => v.status === "plan");

  async function makeSwap(region: Region) {
    if (!plan || !me) return;
    const { version } = swapInRegion(plan, region, snapshot.versions, me.travellerId, snapshot.trip.start);
    await saveVersion(version);
    router.push(`/versions/${version.id}/edit`);
  }

  return (
    <Page wide>
      <Back href="/route">The route</Back>
      <PageHeader eyebrow="Route, stays, places and candidates" title="Map" />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {visible.map((v) => (
          <button key={v.id} className={`chip shrink-0 ${versionId === v.id ? "bg-accent text-accent-ink" : ""}`} onClick={() => setVersionId(v.id)}>
            {v.name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" className="min-h-0" checked={showPlaces} onChange={(e) => setShowPlaces(e.target.checked)} /> Places
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" className="min-h-0" checked={showCandidates} onChange={(e) => setShowCandidates(e.target.checked)} /> Candidate regions
        </label>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-rule bg-bg-2">
        <div className="aspect-[4/5] w-full sm:aspect-[16/10]">{hasMaps ? <GoogleMap model={model} theme={resolvedTheme} selected={selected} onSelect={setSelected} /> : <SketchMap model={model} selected={selected} onSelect={setSelected} />}</div>
      </div>
      {!hasMaps ? <p className="text-xs text-muted">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for the Google map; this is a sketch.</p> : null}

      {sel ? (
        <div className="card grid gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[1.2rem]">
              <RegionDot id={sel.id} size={14} /> {sel.name}
            </h2>
            <span className="chip" style={{ color: fitColor(sel.status), borderColor: fitColor(sel.status) }}>
              {fitLabel(sel.status)}
            </span>
          </div>
          {selStays.length ? <p className="text-sm">{selStays.map((s) => `Stay ${s.index + 1}: ${fmtRange(s.from, s.to)}, ${s.nights} nights`).join(" · ")}</p> : null}
          {sel.summary ? <p className="text-ink-2">{sel.summary}</p> : null}
          {sel.fit ? <p className="text-sm">{sel.fit}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Link href={`/places?region=${sel.id}`} className="btn btn-sm">
              Places ({snapshot.places.filter((p) => p.region === sel.id).length})
            </Link>
            {!selStays.length && sel.status !== "not_this_trip" && plan ? (
              <button className="btn btn-sm btn-primary" onClick={() => makeSwap(sel)}>
                Make a version with this swap
              </button>
            ) : null}
            <button className="btn btn-sm" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Tap a stay or a candidate region.</p>
      )}
      <ul className="flex flex-wrap gap-3 text-xs text-muted">
        <li>● numbered = where we sleep</li>
        <li>· small dots = places in the library</li>
        <li>◇ = candidate regions, coloured by fit (green fits, amber maybe, blue option, grey day trip)</li>
      </ul>
    </Page>
  );
}

/* ------------------------------------------------------- Google map */

function GoogleMap({ model, theme, selected, onSelect }: { model: Model; theme: "light" | "dark"; selected: string | null; onSelect: (id: string) => void }) {
  const dark = theme === "dark";
  const mapId = (dark && env.mapIdDark) || env.mapId || "DEMO_MAP_ID";
  const points = [...model.path, ...model.candidates.map((c) => ({ lat: c.lat, lng: c.lng }))];
  return (
    <APIProvider apiKey={env.mapsKey} language="en" region="JP">
      <Map key={`${mapId}-${theme}`} mapId={mapId} colorScheme={dark && !env.mapIdDark ? "DARK" : "LIGHT"} defaultCenter={{ lat: 36, lng: 137.5 }} defaultZoom={6} gestureHandling="greedy" disableDefaultUI zoomControl clickableIcons={false} style={{ width: "100%", height: "100%" }} aria-label="Trip map">
        {model.path.length > 1 ? <Polyline path={model.path} strokeColor={dark ? "#dee2e6" : "#1b1d22"} strokeOpacity={0.7} strokeWeight={3} geodesic /> : null}
        {model.places.map((p) => (
          <AdvancedMarker key={p.id} position={{ lat: p.lat!, lng: p.lng! }} title={p.name} zIndex={5}>
            <Link href={`/places/${p.id}`} className="block size-3 rounded-full border-2 border-white shadow" style={{ background: regionColor(p.region) }} aria-label={p.name} />
          </AdvancedMarker>
        ))}
        {model.candidates.map((c) => (
          <AdvancedMarker key={c.id} position={{ lat: c.lat, lng: c.lng }} title={c.name} zIndex={10} onClick={() => onSelect(c.id)}>
            <div className="flex flex-col items-center">
              <span className="size-4 rotate-45 border-2 border-white shadow" style={{ background: fitColor(c.status), outline: selected === c.id ? "2px solid var(--ink)" : undefined }} />
              <span className="mt-0.5 rounded bg-white/90 px-1 text-[11px] font-semibold text-black">{c.name}</span>
            </div>
          </AdvancedMarker>
        ))}
        {model.stays.map((s) => (
          <AdvancedMarker key={s.index} position={{ lat: s.region.lat, lng: s.region.lng }} title={s.region.name} zIndex={20} onClick={() => onSelect(s.region.id)}>
            <div className="flex flex-col items-center">
              <span className="grid size-7 place-items-center rounded-full border-2 border-white text-xs font-bold text-white shadow" style={{ background: regionColor(s.region.id), outline: selected === s.region.id ? "2px solid var(--ink)" : undefined }}>
                {s.index + 1}
              </span>
              <span className="mt-0.5 rounded bg-white/90 px-1 text-[11px] font-bold text-black">
                {s.region.name} · {s.nights}n
              </span>
            </div>
          </AdvancedMarker>
        ))}
        <FitBounds points={points} />
      </Map>
    </APIProvider>
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

/* ------------------------------------------------------- sketch map */

function SketchMap({ model, selected, onSelect }: { model: Model; selected: string | null; onSelect: (id: string) => void }) {
  const all = [...model.stays.map((s) => s.region), ...model.candidates];
  const lats = all.map((r) => r.lat);
  const lngs = all.map((r) => r.lng);
  const minLat = Math.min(...lats, 33) - 0.5;
  const maxLat = Math.max(...lats, 38) + 0.5;
  const minLng = Math.min(...lngs, 131) - 0.5;
  const maxLng = Math.max(...lngs, 141) + 0.5;
  const W = 400;
  const H = 500;
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * W;
  const y = (lat: number) => H - ((lat - minLat) / (maxLat - minLat)) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="size-full" role="img" aria-label="Sketch map">
      <polyline points={model.path.map((p) => `${x(p.lng)},${y(p.lat)}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth={2} strokeOpacity={0.6} />
      {model.candidates.map((c) => (
        <g key={c.id} onClick={() => onSelect(c.id)} style={{ cursor: "pointer" }}>
          <rect x={x(c.lng) - 6} y={y(c.lat) - 6} width={12} height={12} transform={`rotate(45 ${x(c.lng)} ${y(c.lat)})`} fill={fitColor(c.status)} stroke={selected === c.id ? "var(--ink)" : "white"} strokeWidth={2} />
          <text x={x(c.lng) + 9} y={y(c.lat) + 4} fontSize={10} fill="var(--muted)">
            {c.name}
          </text>
        </g>
      ))}
      {model.stays.map((s) => (
        <g key={s.index} onClick={() => onSelect(s.region.id)} style={{ cursor: "pointer" }}>
          <circle cx={x(s.region.lng)} cy={y(s.region.lat)} r={11} fill={regionColor(s.region.id)} stroke={selected === s.region.id ? "var(--ink)" : "white"} strokeWidth={2} />
          <text x={x(s.region.lng)} y={y(s.region.lat) + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="white">
            {s.index + 1}
          </text>
          <text x={x(s.region.lng) + 14} y={y(s.region.lat) + 4} fontSize={11} fontWeight={700} fill="var(--ink)">
            {s.region.name} · {s.nights}n
          </text>
        </g>
      ))}
    </svg>
  );
}
