"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { regionColor } from "@/lib/colors";
import { legsOf, smoothPath } from "@/lib/journey";
import { project, REGION_PREFECTURES, shortRegionName } from "@/lib/map";
import { MapInk, MapInkDefs } from "./MapInk";
import type { Region, Stay } from "@/lib/types";

/** Label nudges for the crowded middle of Honshu, in viewBox units. */
const NUDGE: Record<string, [number, number]> = {
  shirakawago: [-26, -4], takayama: [10, -6], gero: [-8, 1], okuhida: [12, -14], kanazawa: [-30, 2], kyoto: [-22, 2], nara: [8, 9], osaka: [-24, 8], hakone: [8, 8], kawaguchiko: [-2, 11], tokyo: [10, -2], kamakura: [8, 7], nikko: [8, -2], kusatsu: [-26, -2], karuizawa: [10, -2], yudanaka: [-32, -3], matsumoto: [10, 4], "echigo-yuzawa": [10, -3], shuzenji: [2, 10], kinosaki: [-30, -2], okayama: [-4, 10], hiroshima: [-4, 10], koyasan: [6, 8], kumano: [6, 8], ginzan: [8, -2], "south-tohoku": [8, 4], "north-tohoku": [8, 0], hokkaido: [6, 8], kyushu: [-8, 12], shikoku: [-6, 10], okinawa: [20, -8],
};
const SHORT: Record<string, string> = { shirakawago: "Shirakawa-go", yudanaka: "Snow monkeys", okayama: "Okayama & Naoshima", "echigo-yuzawa": "Yuzawa", kumano: "Kumano", kyushu: "Kyushu", shikoku: "Shikoku", hokkaido: "Hokkaido" };

export const VIEWS = { japan: "0 0 438 516", heart: "138 163 236 180" } as const;

interface Props {
  regions: Region[];
  /** Stays to draw as the route (numbered, joined by an ink line). */
  stays?: Stay[];
  /** Region ids to glow; the rest dim. Null means no filter. */
  highlight?: Set<string> | null;
  /** Weight 1–3 for the stamp size. */
  weight?: (id: string) => number;
  view?: keyof typeof VIEWS;
  /** A colour per area, such as its verdict; the area's own colour otherwise. */
  pinColor?: (id: string) => string;
  selected?: string | null;
  onPick?: (id: string) => void;
  className?: string;
}

/** The illustrated map: ink coastlines on paper, a stamp per researched area, the route as a line. */
export function JapanMap({ regions, stays, highlight = null, weight, view = "heart", selected = null, onPick, pinColor, className = "" }: Props) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const pick = (id: string) => (onPick ? onPick(id) : router.push(`/areas/${id}`));
  const points = useMemo(() => regions.map((r) => ({ r, ...project(r.lat, r.lng) })), [regions]);
  const route = useMemo(() => (stays ?? []).map((s) => ({ s, ...project(regions.find((r) => r.id === s.region)?.lat ?? 35, regions.find((r) => r.id === s.region)?.lng ?? 135) })), [stays, regions]);
  const lit = new Set((hover ?? selected) ? REGION_PREFECTURES[(hover ?? selected)!] ?? [] : []);
  const routeIds = new Set(route.map((p) => p.s.region));
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const vbW = Number(VIEWS[view].split(" ")[2]);
  const k = vbW / 360;
  const routeSig = (stays ?? []).map((s) => s.region).join("|");
  const regionCount = regions.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const legs = useMemo(() => legsOf(stays ?? [], regions), [routeSig, regionCount]);
  const dimmed = (id: string) => (highlight && !highlight.has(id)) || (stays && stays.length > 0 && !routeIds.has(id) && !highlight);

  return (
    <div className={`journey relative overflow-hidden rounded-2xl ${className}`}>
      <svg viewBox={VIEWS[view]} className="block h-auto w-full select-none" role="img" aria-label="Map of Japan with the areas we looked at">
        <defs>
          <MapInkDefs uid={uid} />
        </defs>
        <MapInk uid={uid} k={k * 0.55} lit={lit} quiet />
        {legs.map((l, i) => (
          <motion.path key={l.key + l.index} d={smoothPath(l.points)} fill="none" stroke="var(--jm-ink)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.85 }} transition={{ duration: 0.5, delay: 0.15 + i * 0.18, ease: "easeInOut" }} />
        ))}
        {points.map(({ r, x, y }) => {
          const w = weight?.(r.id) ?? 1;
          const rad = 2.6 + w * 1.1;
          const dim = dimmed(r.id);
          const [dx, dy] = NUDGE[r.id] ?? [8, 0];
          const label = SHORT[r.id] ?? shortRegionName(r.id, [r]);
          const idx = route.findIndex((p) => p.s.region === r.id);
          return (
            <g key={r.id} className="cursor-pointer" onClick={() => pick(r.id)} onPointerEnter={() => setHover(r.id)} onPointerLeave={() => setHover(null)} style={{ opacity: dim ? 0.28 : 1, transition: "opacity 0.25s" }}>
              <circle cx={x} cy={y} r={rad + 3} fill="var(--card)" opacity={0.9} />
              <motion.circle cx={x} cy={y} r={rad} fill={pinColor?.(r.id) ?? regionColor(r.id)} stroke="var(--card)" strokeWidth={0.8} initial={false} animate={{ r: selected === r.id || hover === r.id ? rad * 1.35 : rad }} transition={{ type: "spring", stiffness: 300, damping: 18 }} />
              {idx >= 0 ? (
                <text x={x} y={y + 1.5} textAnchor="middle" fontSize={4.2} fontWeight={700} fill="#fff" style={{ pointerEvents: "none" }}>
                  {idx + 1}
                </text>
              ) : null}
              <text x={x + dx} y={y + dy + 1.6} textAnchor={dx < 0 ? "end" : "start"} fontSize={5.2} fontWeight={600} fill="var(--ink)" stroke="var(--card)" strokeWidth={1.4} paintOrder="stroke" style={{ fontFamily: "var(--font-sans)", pointerEvents: "none" }}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
