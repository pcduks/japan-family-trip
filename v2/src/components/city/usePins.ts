"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { CityArea, Pin } from "@/lib/city";
import type { SpotHit } from "@/lib/google/places";
import type { PlaceDetails } from "@/lib/types";
import { useState } from "react";

/*
 * Where every pin is. Tips and library places carry coordinates; the rest
 * are found on Google through /api/city/resolve, a few dozen at a time, and
 * kept in this tab and in localStorage for 30 days (Google's limit for
 * coordinates). Nothing here needs the Maps key: without Google the page
 * still draws what it knows and links out to Maps.
 */

export type Hits = Record<string, SpotHit>;

const STORE_KEY = "jp-pins-v1";
const TTL_MS = 30 * 24 * 3600 * 1000;

const hits: Hits = {};
const asked = new Set<string>();
let inFlight = 0;
let unavailable: string | null = null;
let version = 0;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as { at: number; hits: Hits } | null;
    if (raw && Date.now() - raw.at < TTL_MS) Object.assign(hits, raw.hits);
  } catch {}
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ at: Date.now(), hits }));
    } catch {}
  }, 800);
}

/** The circle to search in for a pin: its area when named, else the city. */
export function biasFor(pin: Pin, areas: CityArea[], city: { lat: number; lng: number }): { lat: number; lng: number; radiusM: number } {
  if (pin.area) {
    const a = areas.find((x) => x.name === pin.area || pin.area!.startsWith(x.name) || x.name.startsWith(pin.area!));
    if (a) return { lat: a.lat, lng: a.lng, radiusM: pin.layer === "walk" ? 1800 : 2500 };
  }
  return { lat: city.lat, lng: city.lng, radiusM: 25000 };
}

async function request(batch: { id: string; query: string; bias: { lat: number; lng: number; radiusM: number } }[]) {
  inFlight++;
  emit();
  try {
    const res = await fetch("/api/city/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pins: batch }) });
    const body = (await res.json().catch(() => ({}))) as { pins?: Hits; error?: string };
    if (res.status === 503 || (!res.ok && /not set|not configured/i.test(body.error ?? ""))) {
      unavailable = body.error ?? "Google is not configured";
      return;
    }
    if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
    Object.assign(hits, body.pins ?? {});
    persist();
  } catch {
    // Let them be asked again next time the page needs them.
    batch.forEach((b) => asked.delete(b.id));
  } finally {
    inFlight--;
    emit();
  }
}

/** Ask Google for the pins we don't have yet, in batches of 60. */
export function resolvePins(pins: Pin[], areas: CityArea[], city: { lat: number; lng: number }) {
  hydrate();
  if (unavailable) return;
  const todo = pins.filter((p) => !(p.lat != null && p.lng != null) && !hits[p.id] && !asked.has(p.id));
  if (!todo.length) return;
  todo.forEach((p) => asked.add(p.id));
  for (let i = 0; i < todo.length; i += 60) void request(todo.slice(i, i + 60).map((p) => ({ id: p.id, query: p.query, bias: biasFor(p, areas, city) })));
}

interface PinState {
  hits: Hits;
  busy: boolean;
  unavailable: string | null;
}
let snap: PinState & { v: number } = { hits, busy: false, unavailable, v: -1 };
function getSnapshot(): PinState {
  if (snap.v !== version) snap = { hits: { ...hits }, busy: inFlight > 0, unavailable, v: version };
  return snap;
}
const SERVER: PinState = { hits: {}, busy: false, unavailable: null };

/** Coordinates for the pins asked for; loads the missing ones. */
export function usePins(pins: Pin[], areas: CityArea[], city: { lat: number; lng: number }): PinState {
  const key = pins.map((p) => p.id).join("|");
  useEffect(() => {
    resolvePins(pins, areas, city);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, city.lat, city.lng]);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      hydrate();
      return () => listeners.delete(l);
    },
    getSnapshot,
    () => SERVER,
  );
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
