"use client";

import { useEffect, useState } from "react";
import type { PlaceDetails } from "@/lib/types";

type State = { status: "idle" | "loading" } | { status: "ok"; data: PlaceDetails } | { status: "error"; error: string };

// Session cache so reopening a sheet is instant (F3).
const cache = new Map<string, Promise<PlaceDetails>>();

export function fetchPlaceDetails(slug: string): Promise<PlaceDetails> {
  let p = cache.get(slug);
  if (!p) {
    p = fetch(`/api/places/${encodeURIComponent(slug)}`).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      return body as PlaceDetails;
    });
    p.catch(() => cache.delete(slug));
    cache.set(slug, p);
  }
  return p;
}

export function usePlaceDetails(slug: string | null): State {
  const [result, setResult] = useState<{ slug: string; state: State } | null>(null);
  useEffect(() => {
    if (!slug) return;
    let live = true;
    fetchPlaceDetails(slug).then(
      (data) => live && setResult({ slug, state: { status: "ok", data } }),
      (e: Error) => live && setResult({ slug, state: { status: "error", error: e.message } }),
    );
    return () => {
      live = false;
    };
  }, [slug]);
  if (!slug) return { status: "idle" };
  return result?.slug === slug ? result.state : { status: "loading" };
}

export const photoSrc = (name: string, w = 800) => `/api/photo/${name}?w=${w}`;
