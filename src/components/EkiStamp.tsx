"use client";

import { useId } from "react";

/**
 * Eki stamp: the ink stamps Japanese stations and temples keep for travellers.
 * The app's signature element — places, days and milestones become stamps.
 */

export type Motif =
  | "fuji"
  | "torii"
  | "pagoda"
  | "onsen"
  | "snow"
  | "castle"
  | "lantern"
  | "bell"
  | "gassho"
  | "alps"
  | "tower"
  | "wave"
  | "train"
  | "bowl"
  | "ballot"
  | "suitcase"
  | "brush"
  | "coin"
  | "deer"
  | "leaf"
  | "passport"
  | "pin"
  | "cross"
  | "map";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Line motifs drawn in a 48×48 box. */
export function MotifPath({ motif }: { motif: Motif }) {
  switch (motif) {
    case "fuji":
      return (
        <g {...S}>
          <circle cx="36" cy="11" r="4.5" />
          <path d="M3 39 L17 17 Q24 11 31 17 L45 39 Z" />
          <path d="M13.5 22.5 L17 26 L20.5 22.5 L24 26 L27.5 22.5 L31 26 L34.5 22.5" />
          <path d="M8 44 H40" />
        </g>
      );
    case "torii":
      return (
        <g {...S}>
          <path d="M5 13 Q24 7 43 13" strokeWidth="3" />
          <path d="M9 20 H39" />
          <path d="M15 13 V42 M33 13 V42" strokeWidth="2.8" />
          <path d="M22 20 V13 M26 20 V13" />
          <path d="M11 42 H19 M29 42 H37" />
        </g>
      );
    case "pagoda":
      return (
        <g {...S}>
          <path d="M24 3 V9" />
          <path d="M13 14 Q24 8 35 14 M16 14 V19 M32 14 V19" />
          <path d="M10 24 Q24 17 38 24 M14 24 V29 M34 24 V29" />
          <path d="M7 34 Q24 26 41 34 M12 34 V42 M36 34 V42" />
          <path d="M8 43 H40" />
        </g>
      );
    case "onsen":
      return (
        <g {...S}>
          <path d="M7 30 Q7 42 24 42 Q41 42 41 30" />
          <path d="M5 30 H43" />
          <path d="M16 25 Q12 20 16 15 Q20 10 16 5" />
          <path d="M24 25 Q20 20 24 15 Q28 10 24 5" />
          <path d="M32 25 Q28 20 32 15 Q36 10 32 5" />
        </g>
      );
    case "snow":
      return (
        <g {...S}>
          {[0, 60, 120].map((a) => (
            <g key={a} transform={`rotate(${a} 24 24)`}>
              <path d="M24 5 V43" />
              <path d="M19 9 L24 13 L29 9 M19 39 L24 35 L29 39" />
            </g>
          ))}
        </g>
      );
    case "castle":
      return (
        <g {...S}>
          <path d="M20 6 H28 M18 10 Q24 5 30 10" />
          <path d="M19 10 V16 H29 V10" />
          <path d="M12 21 Q24 13 36 21 M15 21 V27 H33 V21" />
          <path d="M9 32 Q24 23 39 32" />
          <path d="M8 43 L12 32 H36 L40 43 Z" />
          <path d="M21 43 V37 H27 V43" />
        </g>
      );
    case "lantern":
      return (
        <g {...S}>
          <path d="M16 9 H32 L28 5 H20 Z" />
          <path d="M14 14 H34 L30 9 H18 Z" />
          <rect x="17" y="14" width="14" height="11" rx="1" />
          <path d="M21 18 H27 M21 21 H27" />
          <path d="M13 29 H35 L31 25 H17 Z" />
          <path d="M20 29 V39 M28 29 V39 M15 43 H33 L31 39 H17 Z" />
        </g>
      );
    case "bell":
      return (
        <g {...S}>
          <path d="M24 3 V8 M20 8 H28" />
          <path d="M15 12 Q15 8 24 8 Q33 8 33 12 V34 H15 Z" />
          <path d="M15 20 H33 M15 27 H33" />
          <path d="M12 38 H36 M18 34 V38 M30 34 V38" />
          <path d="M3 25 H11" strokeWidth="3" />
        </g>
      );
    case "gassho":
      return (
        <g {...S}>
          <path d="M24 3 L6 36 H42 Z" />
          <path d="M24 3 L24 36 M15 20 H33 M11 28 H37" />
          <path d="M9 36 V44 H39 V36 M20 44 V38 H28 V44" />
        </g>
      );
    case "alps":
      return (
        <g {...S}>
          <path d="M2 40 L15 18 L21 27 L30 12 L46 40 Z" />
          <path d="M11 25 L15 18 L18 23 M26 18 L30 12 L34 19" />
          <path d="M6 45 H42" />
        </g>
      );
    case "tower":
      return (
        <g {...S}>
          <path d="M24 2 V8 M19 44 L22.5 8 H25.5 L29 44" />
          <path d="M12 44 L20 22 H28 L36 44" />
          <path d="M18 28 H30 M16 34 H32 M20 22 L28 34 M28 22 L20 34" />
          <path d="M8 44 H40" />
        </g>
      );
    case "wave":
      return (
        <g {...S}>
          {[
            [12, 22],
            [36, 22],
            [24, 34],
            [0, 34],
            [48, 34],
          ].map(([x, y], i) => (
            <g key={i}>
              <path d={`M${x - 11} ${y} A11 11 0 0 1 ${x + 11} ${y}`} />
              <path d={`M${x - 7} ${y} A7 7 0 0 1 ${x + 7} ${y}`} />
              <path d={`M${x - 3} ${y} A3 3 0 0 1 ${x + 3} ${y}`} />
            </g>
          ))}
        </g>
      );
    case "train":
      return (
        <g {...S}>
          <path d="M3 32 Q5 18 22 16 H40 Q45 16 45 22 V32 Z" />
          <path d="M9 23 Q14 19 22 19 V25 H9 Z" />
          <path d="M27 20 H32 M35 20 H40" />
          <path d="M3 32 H45 M8 38 H40" />
          <circle cx="14" cy="38" r="2.5" />
          <circle cx="34" cy="38" r="2.5" />
        </g>
      );
    case "bowl":
      return (
        <g {...S}>
          <path d="M6 24 H42 Q42 40 24 40 Q6 40 6 24 Z" />
          <path d="M18 44 H30 M20 40 V44 M28 40 V44" />
          <path d="M14 18 Q16 13 14 9 M24 18 Q26 13 24 9" />
          <path d="M30 4 L42 18 M36 3 L44 15" />
        </g>
      );
    case "ballot":
      return (
        <g {...S}>
          <path d="M8 22 H40 V42 H8 Z" />
          <path d="M18 22 L14 4 H34 L30 22" />
          <path d="M18 12 L22 16 L30 8" strokeWidth="2.8" />
          <path d="M16 30 H32" />
        </g>
      );
    case "suitcase":
      return (
        <g {...S}>
          <rect x="6" y="14" width="36" height="26" rx="4" />
          <path d="M18 14 V9 H30 V14" />
          <path d="M16 14 V40 M32 14 V40" />
          <path d="M12 44 V40 M36 44 V40" />
        </g>
      );
    case "brush":
      return (
        <g {...S}>
          <path d="M34 4 L44 14 L22 36 L12 26 Z" />
          <path d="M12 26 Q4 30 5 43 Q18 44 22 36" />
          <path d="M29 9 L39 19" />
        </g>
      );
    case "coin":
      return (
        <g {...S}>
          <circle cx="24" cy="24" r="18" />
          <rect x="20" y="20" width="8" height="8" rx="1" />
          <path d="M10 10 L6 6 M38 10 L42 6" />
        </g>
      );
    case "deer":
      return (
        <g {...S}>
          <path d="M17 4 L19 12 M13 7 L19 12 L23 9 M31 4 L29 12 M35 7 L29 12 L25 9" />
          <path d="M19 12 Q24 16 29 12 Q31 20 26 24 L26 28 H22 L22 24 Q17 20 19 12 Z" />
          <path d="M22 28 Q12 30 12 38 V44 M26 28 Q36 30 36 38 V44 M12 36 H36" />
        </g>
      );
    case "leaf":
      return (
        <g {...S}>
          <path d="M24 44 V22" />
          <path d="M24 22 L10 8 Q8 18 16 22 Z M24 22 L38 8 Q40 18 32 22 Z M24 22 L24 4 Q18 12 24 22 Q30 12 24 4" />
          <path d="M24 22 L8 26 Q14 32 22 28 M24 22 L40 26 Q34 32 26 28" />
        </g>
      );
    case "passport":
      return (
        <g {...S}>
          <rect x="11" y="5" width="26" height="38" rx="3" />
          <circle cx="24" cy="21" r="7" />
          <path d="M17 21 H31 M24 14 Q20 21 24 28 Q28 21 24 14" />
          <path d="M17 34 H31" />
        </g>
      );
    case "pin":
      return (
        <g {...S}>
          <path d="M24 44 Q10 28 10 18 A14 14 0 0 1 38 18 Q38 28 24 44 Z" />
          <circle cx="24" cy="18" r="5" />
        </g>
      );
    case "cross":
      return (
        <g {...S}>
          <path d="M19 6 H29 V19 H42 V29 H29 V42 H19 V29 H6 V19 H19 Z" />
        </g>
      );
    case "map":
      return (
        <g {...S}>
          <path d="M5 11 L17 6 L31 11 L43 6 V37 L31 42 L17 37 L5 42 Z" />
          <path d="M17 6 V37 M31 11 V42" />
          <path d="M9 30 Q14 20 22 24 T38 16" strokeDasharray="2 3" />
        </g>
      );
  }
}

export interface EkiStampProps {
  motif: Motif;
  /** CSS colour for the ink, e.g. var(--indigo). */
  ink?: string;
  top?: string;
  bottom?: string;
  size?: number;
  rotate?: number;
  shape?: "circle" | "square";
  /** false = an empty slot waiting for a stamp. */
  inked?: boolean;
  seed?: number;
  animate?: boolean;
  className?: string;
  label?: string;
}

export function EkiStamp({
  motif,
  ink = "var(--indigo)",
  top = "",
  bottom = "",
  size = 112,
  rotate = -5,
  shape = "circle",
  inked = true,
  seed = 3,
  animate = false,
  className = "",
  label,
}: EkiStampProps) {
  const uid = useId().replace(/:/g, "");
  const f = `ink-${uid}`;
  const tp = `tp-${uid}`;
  const bp = `bp-${uid}`;
  const color = inked ? ink : "var(--ink)";
  const style = { color, width: size, height: size, ["--stamp-rot" as string]: `${rotate}deg`, transform: `rotate(${rotate}deg)` };

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={label ?? [top, bottom].filter(Boolean).join(", ")}
      className={`shrink-0 ${animate && inked ? "stamp-in" : ""} ${className}`}
      style={style}
    >
      <defs>
        {/* Worn ink: slight edge wobble plus speckled gaps. */}
        <filter id={f} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="shaky" />
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed={seed + 7} result="grain" />
          <feComponentTransfer in="grain" result="holes">
            <feFuncA type="discrete" tableValues="1 1 1 1 0.55 1 1 0.3 1 1" />
          </feComponentTransfer>
          <feComposite in="shaky" in2="holes" operator="in" />
        </filter>
        <path id={tp} d="M 17 50 A 33 33 0 0 1 83 50" />
        <path id={bp} d="M 13 50 A 37 37 0 0 0 87 50" />
      </defs>
      {/* Not earned yet: a faint ghost of the real stamp, so the reward is visible. */}
      <g filter={inked ? `url(#${f})` : undefined} opacity={inked ? 0.92 : 0.2}>
        {shape === "circle" ? (
          <>
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth={inked ? 3.4 : 2} strokeDasharray={inked ? undefined : "5 4"} />
            <circle cx="50" cy="50" r="40.5" fill="none" stroke="currentColor" strokeWidth="1.1" />
          </>
        ) : (
          <>
            <rect x="4" y="4" width="92" height="92" rx="14" fill="none" stroke="currentColor" strokeWidth={inked ? 3.4 : 2} strokeDasharray={inked ? undefined : "5 4"} />
            <rect x="9.5" y="9.5" width="81" height="81" rx="10" fill="none" stroke="currentColor" strokeWidth="1.1" />
          </>
        )}
        {top ? (
          <text fontFamily="var(--font-stamp)" fontWeight="900" fontSize="9.2" letterSpacing="1.4" fill="currentColor">
            <textPath href={`#${tp}`} startOffset="50%" textAnchor="middle">
              {top.toUpperCase()}
            </textPath>
          </text>
        ) : null}
        {bottom ? (
          <text fontFamily="var(--font-stamp)" fontWeight="700" fontSize="7.6" letterSpacing="1.2" fill="currentColor">
            <textPath href={`#${bp}`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
              {bottom.toUpperCase()}
            </textPath>
          </text>
        ) : null}
        <circle cx="14" cy="50" r="1.6" fill="currentColor" />
        <circle cx="86" cy="50" r="1.6" fill="currentColor" />
        <g transform="translate(27 27) scale(0.96)">
          <MotifPath motif={motif} />
        </g>
      </g>
    </svg>
  );
}
