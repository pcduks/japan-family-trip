"use client";

import { useEffect, useRef, useState } from "react";
import { regionColor } from "@/lib/colors";

const cache = new Map<string, Promise<{ src: string; author?: { displayName: string; uri?: string }; place?: string } | null>>();

function load(regionId: string) {
  if (!cache.has(regionId)) {
    cache.set(
      regionId,
      fetch(`/api/regions/${regionId}/cover`)
        .then(async (r) => {
          if (!r.ok) return null;
          const j = (await r.json()) as { place?: string; photo?: { name: string; author?: { displayName: string; uri?: string } } | null };
          return j.photo ? { src: `/api/photo/${j.photo.name}?w=640`, author: j.photo.author, place: j.place } : null;
        })
        .catch(() => null),
    );
  }
  return cache.get(regionId)!;
}

/** A region's postcard photo, loaded when it scrolls into view; a coloured wash until then. */
export function RegionCover({ regionId, className = "", children, credit = true }: { regionId: string; className?: string; children?: React.ReactNode; credit?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<{ src: string; author?: { displayName: string; uri?: string }; place?: string } | null>(null);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || tried) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setTried(true);
      load(regionId).then(setImg);
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [regionId, tried]);
  const c = regionColor(regionId);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(160deg, ${c} 0%, color-mix(in srgb, ${c} 55%, #000) 100%)` }}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.src} alt="" className="absolute inset-0 size-full object-cover rise" loading="lazy" />
      ) : null}
      {children}
      {credit && img?.author ? (
        <span className="absolute right-1.5 bottom-1.5 z-10 rounded bg-black/50 px-1 text-[0.6rem] text-white">
          {img.author.uri ? (
            <a href={img.author.uri} target="_blank" rel="noreferrer" className="text-white">
              {img.author.displayName}
            </a>
          ) : (
            img.author.displayName
          )}
        </span>
      ) : null}
    </div>
  );
}
