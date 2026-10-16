"use client";

import { JOURNEY, ridgePeaks, smoothPath } from "@/lib/journey";
import { MAP, project } from "@/lib/map";

const RIDGES = ridgePeaks();
const SEAS = JOURNEY.seas.map((s) => ({ ...s, ...project(s.lat, s.lng) }));
const SNOW = new Set(JOURNEY.snow_prefectures);
const FUJI = project(JOURNEY.fuji_summit.lat, JOURNEY.fuji_summit.lng);

/**
 * The printed base of every map in the app: sea with seigaiha waves, land
 * printed slightly off register, snow country stippled, lakes, the ranges in
 * ink and Fuji. Peaks and Fuji are drawn in screen pixels: pass `k` (viewBox
 * units per pixel) for a still map; without it they carry data-gx/data-gy for
 * a moving camera to place.
 */
export function MapInkDefs({ uid }: { uid: string }) {
  return (
    <>
          <pattern id={`${uid}-waves`} data-pattern="waves" width="7" height="3.6" patternUnits="userSpaceOnUse">
            <path d="M0 3.6 A3.5 3.5 0 0 1 7 3.6 M-3.5 1.8 A3.5 3.5 0 0 1 3.5 1.8 M3.5 1.8 A3.5 3.5 0 0 1 10.5 1.8" fill="none" stroke="var(--jm-wave)" strokeWidth="0.22" />
          </pattern>
          <pattern id={`${uid}-snow`} data-pattern="snow" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
            <circle cx="0.6" cy="0.6" r="0.22" fill="var(--jm-snowdot)" />
            <circle cx="1.8" cy="1.8" r="0.16" fill="var(--jm-snowdot)" />
          </pattern>
          <filter id={`${uid}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4" />
            <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.09 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
    </>
  );
}

export function MapInk({ uid, near = false, k, lit, quiet = false }: { uid: string; near?: boolean; k?: number; lit?: Set<string>; quiet?: boolean }) {
  const sea = SEAS;
  const snowPref = SNOW;
  const fuji = FUJI;
  const place = (x: number, y: number) => (k ? { transform: `translate(${x} ${y}) scale(${k})` } : { "data-gx": x, "data-gy": y });
  return (
    <>
        {/* Sea, with seigaiha waves */}
        <rect x="0" y="0" width="438" height="516" fill="var(--jm-sea)" />
        <rect x="0" y="0" width="438" height="516" fill={`url(#${uid}-waves)`} />
        {sea.map((s) => (
          <text key={s.label} x={s.x} y={s.y} transform={`rotate(${s.rotate ?? 0} ${s.x} ${s.y})`} fontSize={4.6} fontStyle="italic" letterSpacing={1.4} fill="var(--jm-sealabel)" textAnchor="middle" style={{ fontFamily: "var(--font-display)" }}>
            {s.label}
          </text>
        ))}

        {/* Land: a misregistered print under the paper, like a woodblock */}
        <g transform="translate(0.45 0.6)" opacity={0.9}>
          {MAP.locations.map((p) => (
            <path key={p.id} d={p.path} fill="var(--jm-offset)" />
          ))}
        </g>
        <g>
          {MAP.locations.map((p) => (
            <path key={p.id} d={p.path} fill={lit?.has(p.id) ? "var(--jm-lit)" : snowPref.has(p.id) ? "var(--jm-snowland)" : "var(--jm-land)"} stroke="var(--jm-border)" strokeWidth={0.7} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          ))}
        </g>
        <g pointerEvents="none">
          {MAP.locations.filter((p) => snowPref.has(p.id)).map((p) => (
            <path key={p.id} d={p.path} fill={`url(#${uid}-snow)`} />
          ))}
        </g>
        <rect x="0" y="0" width="438" height="516" filter={`url(#${uid}-grain)`} pointerEvents="none" opacity={0.8} />

        {/* Lakes */}
        {JOURNEY.lakes.map((lk) => {
          const e = lk.ellipse;
          if (e) {
            const c = project(e.lat, e.lng);
            return <ellipse key={lk.name} cx={c.x} cy={c.y} rx={e.rx * 19.675} ry={e.ry * 25.682} fill="var(--jm-lake)" stroke="var(--jm-border)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />;
          }
          const pts = (lk.points ?? []).map(([la, ln]) => project(la, ln));
          return <path key={lk.name} d={smoothPath(pts) + " Z"} fill="var(--jm-lake)" stroke="var(--jm-border)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />;
        })}

        <g opacity={quiet ? 0.6 : 1}>
        {/* Mountain ranges: small peaks along each ridge */}
        {RIDGES.map((r, i) => (
          <g key={"r" + i} {...place(r.x, r.y)} pointerEvents="none">
            <g transform={`scale(${r.s}) translate(0 5)`}>
              <path d="M-9 0 L-2.5 -9 L0 -6.5 L3 -11 L10 0 Z" fill="var(--jm-mountain)" opacity={0.8} />
              <path d="M-4.6 -6.2 L-2.5 -9 L-0.6 -7 L1 -8.6 L3 -11 L5.4 -7.6 L3.6 -6.9 L2 -7.6 L0.4 -5.8 L-1.4 -7 Z" fill="var(--jm-snowcap)" />
            </g>
          </g>
        ))}
        {/* Mountains in ink; Fuji larger, with its snow */}
        {JOURNEY.peaks.map((pk) => {
          const p = project(pk.lat, pk.lng);
          const s = 0.75 + (pk.elev - 2400) / 2400;
          return (
            <g key={pk.name} {...place(p.x, p.y)} pointerEvents="none">
              <g transform={`scale(${s}) translate(0 5)`}>
                <path d="M-9 0 L-2.5 -9 L0 -6.5 L3 -11 L10 0 Z" fill="var(--jm-mountain)" />
                <path d="M-4.6 -6.2 L-2.5 -9 L-0.6 -7 L1 -8.6 L3 -11 L5.4 -7.6 L3.6 -6.9 L2 -7.6 L0.4 -5.8 L-1.4 -7 Z" fill="var(--jm-snowcap)" />
                <path d="M-9 0 L-2.5 -9 L0 -6.5 L3 -11 L10 0" fill="none" stroke="var(--jm-ink)" strokeWidth={0.9} strokeLinejoin="round" opacity={0.55} />
              </g>
            </g>
          );
        })}
        </g>
        <g {...place(fuji.x, fuji.y)} pointerEvents="none" className="jm-fuji" data-near={near ? "1" : "0"}>
          <g className="jm-fuji-inner">
            <g transform="translate(0 21)">
            <path d="M-26 2 C-17 -2 -9 -12 -4.5 -21 L4.5 -21 C9 -12 17 -2 26 2 Z" fill="var(--jm-fuji)" />
            <path d="M-8.4 -14.6 C-6.6 -17.4 -5.6 -19.4 -4.5 -21 L4.5 -21 C5.6 -19.4 6.6 -17.4 8.4 -14.6 L5.8 -12.6 L3.6 -15.2 L1.2 -12.2 L-1.4 -15.4 L-3.8 -12.4 L-6 -15 Z" fill="var(--jm-snowcap)" />
            <path d="M-26 2 C-17 -2 -9 -12 -4.5 -21 L4.5 -21 C9 -12 17 -2 26 2" fill="none" stroke="var(--jm-ink)" strokeWidth={1} opacity={0.6} />
            <text y={14} textAnchor="middle" fontSize={9.5} fill="var(--jm-ink)" opacity={0.75} style={{ fontFamily: "var(--font-jp)" }} stroke="var(--jm-land)" strokeWidth={2.4} paintOrder="stroke">
              富士山
            </text>
            </g>
          </g>
        </g>
    </>
  );
}
