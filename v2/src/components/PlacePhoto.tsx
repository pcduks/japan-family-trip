"use client";

import { useEffect, useState } from "react";
import type { PlaceDetails } from "@/lib/types";
import { RegionCover } from "./RegionCover";

const cache = new Map<string, string | null>();

/** The first Google photo of a place, fetched lazily; the region's illustration until then or instead. */
export function PlacePhoto({ placeId, regionId, className = "", children }: { placeId?: string; regionId: string; className?: string; children?: React.ReactNode }) {
  const [src, setSrc] = useState<string | null | undefined>(placeId ? cache.get(placeId) : null);
  useEffect(() => {
    if (!placeId || cache.has(placeId)) return;
    let cancelled = false;
    fetch(`/api/places/${placeId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PlaceDetails | null) => {
        const name = d?.photos?.[0]?.name ?? null;
        const url = name ? `/api/photo/${name}?w=600` : null;
        cache.set(placeId, url);
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        cache.set(placeId, null);
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [placeId]);
  if (!src) return <RegionCover regionId={regionId} className={className}>{children}</RegionCover>;
  return (
    <div className={`relative overflow-hidden bg-bg-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      {children}
    </div>
  );
}
