"use client";

import { useState } from "react";
import { suggestNights } from "@/lib/nights";
import type { Pace, Stay } from "@/lib/types";
import { useStore } from "./providers";

/** "Suggested nights at this pace" with the plain-language reason, for one stay. */
export function StayNights({ stay, pace, allStays, mustDos }: { stay: Stay; pace: Pace; allStays: Stay[]; mustDos?: string[] }) {
  const { snapshot } = useStore();
  const [open, setOpen] = useState(false);
  const region = snapshot.regions.find((r) => r.id === stay.region);
  if (!region) return null;
  const s = suggestNights(region, pace, snapshot.places, snapshot.pace, stay, mustDos);
  if (s.nights == null) return null;
  const sameRegion = allStays.filter((x) => x.region === stay.region).reduce((a, x) => a + x.nights, 0);
  const split = sameRegion !== stay.nights;
  const diff = (split ? sameRegion : stay.nights) - s.nights;
  const tone = diff === 0 ? "text-ok" : Math.abs(diff) === 1 ? "text-warn" : "text-danger";
  return (
    <div className="text-sm">
      <button className={`text-left ${tone}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {diff === 0 ? "✓" : diff > 0 ? "▲" : "▼"} Suggested {s.nights} night{s.nights === 1 ? "" : "s"} at {pace}
        {split ? ` (you have ${sameRegion} across ${allStays.filter((x) => x.region === stay.region).length} stays)` : diff ? ` (you have ${stay.nights})` : ""} · why?
      </button>
      {open ? <p className="mt-1 text-ink-2">{s.reason}</p> : null}
    </div>
  );
}
