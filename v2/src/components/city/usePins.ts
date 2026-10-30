"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Pin } from "@/lib/city";
import type { SpotHit } from "@/lib/google/places";
import type { PlaceDetails } from "@/lib/types";

/*
 * Where every pin is. Tips and library places carry coordinates; the rest
 * are found on Google through /api/city/resolve, one batch at a time, and
 * kept in this tab and in localStorage for 30 days per entry (Google's limit
 * for coordinates). Misses are remembered too, so they are not asked again.
 * Nothing here needs the Maps key: without Google the page still draws what
 * it knows and links out to Maps.
 */

export type Hits = Record<string, SpotHit>;

interface Entry {
  h: SpotHit | null;
  at: number;
}

const STORE_KEY = "jp-pins-v2";
const TTL_MS = 30 * 24 * 3600 * 1000;
const BATCH = 60;

const entries: Record<string, Entry> = {};
let hits: Hits = {};
const queued = new Set<string>();
let region = "";
let running = false;
let unavailable: string | null = null;
let version = 0;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  hydrate();
  return () => {
    listeners.delete(l);
  };
};

function rebuildHits() {
  const next: Hits = {};
  for (const [id, e] of Object.entries(entries)) if (e.h) next[id] = e.h;
  hits = next;
}

function hydrate() {
  if (hydrated || typeof localStorage === "undefined") return;
  hydrated = true;
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as Record<string, Entry> | null;
    const now = Date.now();
    if (raw) for (const [id, e] of Object.entries(raw)) if (e && now - e.at < TTL_MS) entries[id] = e;
    localStorage.removeItem("jp-pins-v1");
  } catch {}
  rebuildHits();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(entries));
    } catch {}
  }, 1500);
}

/** One batch at a time: the page asks for what it shows first, the rest follows. */
async function pump() {
  if (running || unavailable) return;
  running = true;
  emit();
  try {
    while (queued.size && !unavailable) {
      const ids = [...queued].slice(0, BATCH);
      ids.forEach((id) => queued.delete(id));
      try {
        const res = await fetch("/api/city/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ region, ids }) });
        const body = (await res.json().catch(() => ({}))) as { pins?: Record<string, SpotHit | null>; error?: string };
        if (res.status === 503 || (!res.ok && /not set|not configured/i.test(body.error ?? ""))) {
          unavailable = body.error ?? "Google is not configured";
          break;
        }
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
        const now = Date.now();
        for (const [id, h] of Object.entries(body.pins ?? {})) entries[id] = { h, at: now };
        rebuildHits();
        persist();
        emit();
      } catch {
        // Network trouble: stop for now; the next page view asks again.
        break;
      }
    }
  } finally {
    running = false;
    emit();
  }
}

/** Ask Google for the pins we don't have yet, in the order given. */
export function resolvePins(forRegion: string, pins: Pin[]) {
  hydrate();
  if (unavailable) return;
  if (forRegion !== region) {
    queued.clear();
    region = forRegion;
  }
  for (const p of pins) if (!(p.lat != null && p.lng != null) && !(p.id in entries) && !queued.has(p.id)) queued.add(p.id);
  if (queued.size) void pump();
}

interface PinState {
  hits: Hits;
  busy: boolean;
  unavailable: string | null;
}
let snap: PinState & { v: number } = { hits, busy: false, unavailable, v: -1 };
function getSnapshot(): PinState {
  if (snap.v !== version) snap = { hits, busy: running, unavailable, v: version };
  return snap;
}
const SERVER: PinState = { hits: {}, busy: false, unavailable: null };

/** Coordinates for the pins asked for, most-needed first; loads the missing ones. */
export function usePins(forRegion: string, pins: Pin[]): PinState {
  const key = pins.map((p) => p.id).join("|");
  useEffect(() => {
    resolvePins(forRegion, pins);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forRegion, key]);
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER);
}

/** Where a pin is, from what it carries or what Google said. */
export function coordsOf(pin: Pin, h: Hits): { lat: number; lng: number } | null {
  if (pin.lat != null && pin.lng != null) return { lat: pin.lat, lng: pin.lng };
  const hit = h[pin.id];
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
}

/* ------------------------------------------------------------ details */

type DetailsState = { status: "idle" | "loading" } | { status: "ok"; data: PlaceDetails } | { status: "error"; error: string };
const details = new Map<string, Promise<PlaceDetails>>();

export function fetchPlaceDetails(placeId: string): Promise<PlaceDetails> {
  let p = details.get(placeId);
  if (!p) {
    p = fetch(`/api/city/place/${encodeURIComponent(placeId)}`).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      return body as PlaceDetails;
    });
    p.catch(() => details.delete(placeId));
    details.set(placeId, p);
  }
  return p;
}

export function usePlaceDetails(placeId: string | null): DetailsState {
  const [result, setResult] = useState<{ id: string; state: DetailsState } | null>(null);
  useEffect(() => {
    if (!placeId) return;
    let live = true;
    fetchPlaceDetails(placeId).then(
      (data) => live && setResult({ id: placeId, state: { status: "ok", data } }),
      (e: Error) => live && setResult({ id: placeId, state: { status: "error", error: e.message } }),
    );
    return () => {
      live = false;
    };
  }, [placeId]);
  if (!placeId) return { status: "idle" };
  return result?.id === placeId ? result.state : { status: "loading" };
}

export const photoSrc = (name: string, w = 800) => `/api/photo/${name}?w=${w}`;
