"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { SpotHit } from "@/lib/google/places";
import type { PlaceDetails } from "@/lib/types";

/*
 * Pins for a route's spots come from /api/tokyo/spots?route=N and are kept
 * for the session; details for one spot come from /api/tokyo/spot/:id when a
 * sheet opens. Both are quiet when Google isn't configured (the page still
 * works with neighbourhood pins and Google Maps links).
 */

export type SpotHits = Record<string, SpotHit>;

const hits: SpotHits = {};
const loaded = new Set<number>();
const loading = new Map<number, Promise<void>>();
let unavailable: string | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export function loadRouteSpots(n: number): Promise<void> {
  if (loaded.has(n) || unavailable) return Promise.resolve();
  let p = loading.get(n);
  if (!p) {
    p = fetch(`/api/tokyo/spots?route=${n}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 503 || (!res.ok && /not set|not configured/i.test(body.error ?? ""))) {
          unavailable = body.error ?? "Google não configurado";
          return;
        }
        if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
        Object.assign(hits, body.spots as SpotHits);
        loaded.add(n);
      })
      .catch(() => undefined)
      .finally(() => {
        loading.delete(n);
        emit();
      });
    loading.set(n, p);
  }
  return p;
}

interface Snapshot {
  hits: SpotHits;
  loaded: Set<number>;
  busy: boolean;
  unavailable: string | null;
}
let snapshot: Snapshot & { v: number } = { hits, loaded, busy: false, unavailable, v: -1 };
function getSnapshot(): Snapshot {
  if (snapshot.v !== version) snapshot = { hits: { ...hits }, loaded: new Set(loaded), busy: loading.size > 0, unavailable, v: version };
  return snapshot;
}
const SERVER: Snapshot = { hits: {}, loaded: new Set(), busy: false, unavailable: null };

/** Pins for the routes asked for (loads them on first use). */
export function useTokyoSpots(routes: number[]): Snapshot {
  const key = routes.join(",");
  useEffect(() => {
    routes.forEach((n) => void loadRouteSpots(n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot,
    () => SERVER,
  );
}

/* ------------------------------------------------------------ details */

type DetailsState = { status: "idle" | "loading" } | { status: "ok"; data: PlaceDetails } | { status: "error"; error: string };
const details = new Map<string, Promise<PlaceDetails>>();

export function fetchSpotDetails(id: string): Promise<PlaceDetails> {
  let p = details.get(id);
  if (!p) {
    p = fetch(`/api/tokyo/spot/${encodeURIComponent(id)}`).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      return body as PlaceDetails;
    });
    p.catch(() => details.delete(id));
    details.set(id, p);
  }
  return p;
}

export function useSpotDetails(id: string | null): DetailsState {
  const [result, setResult] = useState<{ id: string; state: DetailsState } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    fetchSpotDetails(id).then(
      (data) => live && setResult({ id, state: { status: "ok", data } }),
      (e: Error) => live && setResult({ id, state: { status: "error", error: e.message } }),
    );
    return () => {
      live = false;
    };
  }, [id]);
  if (!id) return { status: "idle" };
  return result?.id === id ? result.state : { status: "loading" };
}
