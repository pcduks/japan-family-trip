"use client";

import { useReducedMotion, type MotionValue } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { regionColor } from "@/lib/colors";
import { fmtRange } from "@/lib/dates";
import { cameraFrames, cameraOnLeg, kanji, legsOf, lerpBox, regionPoint, smoothPath, smoothstep, snowLevel, travelAt, type Box, type Leg, type Mode, type Pt } from "@/lib/journey";

import { project, shortRegionName } from "@/lib/map";
import { MapInk, MapInkDefs } from "./MapInk";
import type { Region, Stay } from "@/lib/types";

/** Which side of its stamp a place name sits, so the busy middle of Honshu stays readable. */
const SIDE: Record<string, "r" | "l" | "t" | "b"> = {
  tokyo: "r",
  kanazawa: "l",
  shirakawago: "l",
  takayama: "r",
  gero: "l",
  kyoto: "l",
  nara: "b",
  kawaguchiko: "t",
  hakone: "r",
  okuhida: "r",
  yudanaka: "t",
  okayama: "b",
  kinosaki: "t",
  hiroshima: "b",
  miyajima: "l",
  shirahama: "r",
  nagano: "l",
  arima: "t",
  osaka: "l",
  kamakura: "r",
  matsue: "t",
  fukuoka: "l",
  nagoya: "r",
  atami: "r",
  "ise-shima": "b",
  morioka: "r",
  tsunagi: "l",
  "south-tohoku": "r",
  "north-tohoku": "r",
  shuzenji: "l",
};

const SHORT: Record<string, string> = { yudanaka: "Snow monkeys" };

interface Props {
  regions: Region[];
  stays: Stay[];
  /** Another route drawn faintly underneath (the plan, when an alternative is shown). */
  ghost?: Stay[] | null;
  /** Scroll position through the stops (follow mode). Without it the map shows the whole route and can play it. */
  t?: MotionValue<number>;
  /** Width / height of the map window. */
  aspect?: number;
  /** Tapping a stamp. */
  onStop?: (stopIndex: number) => void;
  className?: string;
  label?: string;
  /** Draw the route in leg by leg when it appears or changes (overview only). */
  drawIn?: boolean;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The journey on an ink-and-paper map: the real lines, a train that travels them, a camera that follows. */
export function JourneyMap({ regions, stays, ghost = null, t, aspect = 1.3, onStop, className = "", label, drawIn = true }: Props) {
  const router = useRouter();
  const reduce = !!useReducedMotion();
  const follow = !!t;
  // The store refreshes the snapshot every few seconds; key everything on the route itself, not on object identity.
  const sig = stays.map((s) => `${s.region}:${s.from}:${s.to}`).join("|");
  const ghostSig = ghost ? ghost.map((s) => s.region).join("|") : "";
  const regionSig = regions.length;
  /* eslint-disable react-hooks/exhaustive-deps */
  const legs = useMemo(() => legsOf(stays, regions), [sig, regionSig]);
  const ghostLegs = useMemo(() => {
    if (!ghost) return [];
    const mine = new Set(legs.map((l) => l.key));
    return legsOf(ghost, regions).filter((l) => !mine.has(l.key));
  }, [ghostSig, legs]);
  const frames = useMemo(() => cameraFrames(stays, legs, regions, aspect), [legs, aspect]);
  const routeRegions = useMemo(() => Array.from(new Set(stays.map((s) => s.region))), [sig]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const lastCam = useRef<Box | null>(null);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(follow ? 0 : -1);
  const [moving, setMoving] = useState<number>(-1);

  useEffect(() => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    const e = startEngine({ svg, wrap, pill: pillRef.current, legs, frames, stays, follow, t: t ?? null, reduce: reduce || !drawIn, aspect, lastCam, onActive: setActive, onMoving: setMoving, onPlaying: setPlaying });
    engine.current = e;
    return () => {
      e.destroy();
      engine.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs, frames, follow, t, reduce, aspect]);

  const others = regions.filter((r) => !routeRegions.includes(r.id) && r.lat > 27);
  const activeRegion = active >= 0 ? stays[active]?.region : null;
  const snowy = !!activeRegion && snowLevel(activeRegion) >= 2 && !reduce;
  const cam0 = follow ? (frames.stops[0] ?? frames.overview) : frames.overview;
  const movingLeg = moving >= 0 ? legs[moving] : null;
  const stopsOf = (id: string) => stays.map((s, i) => (s.region === id ? i : -1)).filter((i) => i >= 0);

  return (
    <div ref={wrapRef} className={`journey relative overflow-hidden rounded-2xl ${className}`} style={{ aspectRatio: String(aspect) }}>
      <svg ref={svgRef} viewBox={`${cam0.x} ${cam0.y} ${cam0.w} ${cam0.h}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 block h-full w-full select-none" role="img" aria-label={label ?? `The route on the map: ${stays.map((s) => regions.find((r) => r.id === s.region)?.name ?? s.region).join(", ")}`}>
        <defs>
          <MapInkDefs uid={uid} />
          {legs.map((l, j) => (
            <mask key={l.key + j} id={`${uid}-reveal-${j}`} maskUnits="userSpaceOnUse" x="0" y="0" width="438" height="516">
              <path data-mask={j} d={smoothPath(l.points)} fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="butt" />
            </mask>
          ))}
        </defs>
        <MapInk uid={uid} near={activeRegion === "kawaguchiko" || activeRegion === "hakone"} />
        {/* The other places we looked at, faint */}
        {others.map((r) => {
          const p = project(r.lat, r.lng);
          return (
            <g key={r.id} data-gx={p.x} data-gy={p.y} className="cursor-pointer" onClick={() => router.push(`/areas/${r.id}`)} opacity={0.45}>
              <circle r={7} fill="transparent" />
              <circle r={3.2} fill={regionColor(r.id)} stroke="var(--jm-land)" strokeWidth={1.2} />
            </g>
          );
        })}

        {/* Another route, faint, to compare */}
        {ghostLegs.map((l) => (
          <path key={"g" + l.key} d={smoothPath(l.points)} fill="none" stroke="var(--jm-ink)" strokeOpacity={0.32} strokeWidth={1.6} strokeDasharray="2 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}

        {/* The whole route, faint: what is still ahead */}
        {legs.map((l) => (
          <path key={"f" + l.key + l.index} d={smoothPath(l.points)} fill="none" stroke="var(--jm-ink)" strokeOpacity={0.28} strokeWidth={1.4} strokeDasharray="1 3.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}

        {/* The route travelled, by kind of line */}
        {legs.map((l, j) => (
          <g key={"d" + l.key + l.index} className="jm-drawn" mask={`url(#${uid}-reveal-${j})`}>
            {l.segments.map((s, k) => (
              <SegmentPath key={k} d={smoothPath(l.points, s.from, s.to)} mode={s.mode} />
            ))}
          </g>
        ))}

        {/* Named stations on each leg (shown while that leg is travelled) */}
        {legs.map((l, j) => (
          <Stations key={"s" + l.key + j} leg={l} index={j} />
        ))}

        {/* The train */}
        <g data-train="" className="jm-train" style={{ opacity: 0 }} pointerEvents="none">
          <g className="jm-rail">
            <path d="M-11 -3.6 L6 -3.6 C10 -3.6 12.5 -1.6 13 0 C12.5 1.6 10 3.6 6 3.6 L-11 3.6 Z" fill="var(--jm-land)" stroke="var(--jm-ink)" strokeWidth={1.3} strokeLinejoin="round" />
            <path d="M-11 0.6 L11.6 0.6" stroke="var(--accent)" strokeWidth={1.4} />
            <path d="M6.5 -3 C9 -2.6 10.8 -1.6 11.4 -0.6 L6.5 -0.6 Z" fill="var(--jm-ink)" opacity={0.8} />
          </g>
          <g className="jm-bus">
            <rect x={-9} y={-4.6} width={18} height={9.2} rx={2.4} fill="var(--jm-land)" stroke="var(--jm-ink)" strokeWidth={1.3} />
            <path d="M-6.5 -2.4 h3.2 M-1.6 -2.4 h3.2 M3.3 -2.4 h3.2" stroke="var(--jm-ink)" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
            <path d="M-9 1.6 h18" stroke="var(--accent)" strokeWidth={1.3} />
          </g>
        </g>

        {/* Stamps: a seal per stop, in its region's colour */}
        {routeRegions.map((id) => {
          const p = regionPoint(id, regions);
          const idx = stopsOf(id);
          const name = SHORT[id] ?? shortRegionName(id, regions);
          const side = SIDE[id] ?? "r";
          const jp = kanji(id);
          const nums = idx.map((i) => i + 1).join(" · ");
          const seal = 9.5 + (nums.length > 2 ? 3 : 0);
          const lx = side === "r" ? seal + 5 : side === "l" ? -seal - 5 : 0;
          const ly = side === "t" ? -seal - 9 : side === "b" ? seal + 15 : 4.5;
          const anchor = side === "r" ? "start" : side === "l" ? "end" : "middle";
          return (
            <g
              key={id}
              data-gx={p.x}
              data-gy={p.y}
              data-stamp={id}
              data-stops={idx.join(",")}
              className="jm-stamp cursor-pointer"
              style={{ ["--c" as string]: regionColor(id) }}
              data-arrived="1"
              data-here="0"
              role="button"
              tabIndex={0}
              aria-label={`${name}: stop ${nums}, ${idx.map((i) => fmtRange(stays[i].from, stays[i].to)).join(" and ")}`}
              onClick={() => (onStop ? onStop(idx[0]) : router.push(`/areas/${id}`))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (onStop) onStop(idx[0]);
                  else router.push(`/areas/${id}`);
                }
              }}
            >
              <circle className="jm-halo" r={seal + 7} fill={regionColor(id)} opacity={0} />
              <circle r={seal + 6} fill="transparent" />
              <rect className="jm-seal" x={-seal - (nums.length > 2 ? 4 : 0)} y={-seal} width={(seal + (nums.length > 2 ? 4 : 0)) * 2} height={seal * 2} rx={seal} fill={regionColor(id)} stroke="var(--jm-land)" strokeWidth={2} />
              <rect x={-seal + 2.2 - (nums.length > 2 ? 4 : 0)} y={-seal + 2.2} width={(seal - 2.2 + (nums.length > 2 ? 4 : 0)) * 2} height={(seal - 2.2) * 2} rx={seal - 2.2} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.8} className="jm-seal-ring" />
              <text className="jm-num" y={3.6} textAnchor="middle" fontSize={nums.length > 2 ? 9.5 : 10.5} fontWeight={700} fill="#fff" style={{ fontFamily: "var(--font-sans)" }}>
                {nums}
              </text>
              <text x={lx} y={ly} textAnchor={anchor} fontSize={13} fontWeight={500} fill="var(--jm-ink)" stroke="var(--jm-land)" strokeWidth={3.2} paintOrder="stroke" strokeLinejoin="round" style={{ fontFamily: "var(--font-display)" }}>
                {name}
              </text>
              {jp ? (
                <text x={lx} y={ly + 11.5} textAnchor={anchor} fontSize={9} fill="var(--jm-ink)" opacity={0.6} stroke="var(--jm-land)" strokeWidth={2.6} paintOrder="stroke" style={{ fontFamily: "var(--font-jp)" }}>
                  {jp}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* What the train is on right now */}
      <div ref={pillRef} className="pointer-events-none absolute top-0 left-0 max-w-[calc(100%-12px)] truncate rounded-full border border-rule bg-card/95 px-2.5 py-1 text-[0.72rem] font-semibold whitespace-nowrap shadow-sm backdrop-blur transition-opacity duration-200" style={{ opacity: 0 }} aria-hidden="true">
        {movingLeg ? (
          <>
            {fmtLegHours(movingLeg.hours)} · {movingLeg.how}
          </>
        ) : null}
      </div>

      {snowy ? <Snowfall /> : null}

      {!follow && !reduce ? (
        <button type="button" onClick={() => engine.current?.play()} className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full border border-rule bg-card/95 px-3 py-1.5 text-[0.8rem] font-semibold shadow-sm backdrop-blur" aria-pressed={playing}>
          <span aria-hidden="true" className="text-accent">
            {playing ? "❚❚" : "▶"}
          </span>
          {playing ? "Pause" : "Play the journey"}
        </button>
      ) : null}
      {!follow && playing && active >= 0 ? (
        <div className="pointer-events-none absolute top-2.5 left-2.5 rounded-xl border border-rule bg-card/95 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur">
          <b className="display text-[0.95rem]">{regions.find((r) => r.id === stays[active]?.region)?.name}</b>
          <span className="block text-muted">
            Stop {active + 1} · {fmtRange(stays[active].from, stays[active].to)} · {stays[active].nights} nights
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function fmtLegHours(h: number): string {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  if (!whole) return `${min} min`;
  return min ? `${whole} h ${min}` : `${whole} h`;
}

function modeAt(leg: Leg, f: number): Mode {
  const i = f * (leg.points.length - 1);
  return leg.segments.find((s) => i >= s.from && i <= s.to)?.mode ?? leg.segments[0]?.mode ?? "rail";
}

function SegmentPath({ d, mode }: { d: string; mode: Mode }) {
  if (mode === "shinkansen")
    return (
      <>
        <path d={d} fill="none" stroke="var(--jm-ink)" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="var(--jm-land)" strokeWidth={1.3} strokeDasharray="5 5" strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
      </>
    );
  if (mode === "bus") return <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeDasharray="5 3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
  if (mode === "ferry") return <path d={d} fill="none" stroke="var(--jm-ink)" strokeWidth={1.8} strokeDasharray="2 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
  if (mode === "taxi") return <path d={d} fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeDasharray="2 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
  if (mode === "ropeway") return <path d={d} fill="none" stroke="var(--jm-ink)" strokeWidth={2} strokeDasharray="1 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />;
  return <path d={d} fill="none" stroke="var(--jm-ink)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
}

/** Places the line passes that are part of the trip, kept on the map once travelled. */
const VIA = new Set(["Shirakawa-go"]);

function Stations({ leg, index }: { leg: Leg; index: number }) {
  const named = leg.points.map((p, i) => ({ p, name: leg.names[i] })).filter((s): s is { p: Pt; name: string } => !!s.name);
  if (!named.length) return null;
  return (
    <>
      {named.map(({ p, name }) => (
        <g key={name} data-gx={p.x} data-gy={p.y} data-station={index} data-via={VIA.has(name) ? "1" : undefined} style={{ opacity: 0, transition: "opacity 0.3s" }} pointerEvents="none">
          <circle r={2.4} fill="var(--jm-land)" stroke="var(--jm-ink)" strokeWidth={1.1} />
          <text x={5} y={3} fontSize={9.5} fill="var(--jm-ink)" opacity={0.8} stroke="var(--jm-land)" strokeWidth={2.4} paintOrder="stroke" style={{ fontFamily: "var(--font-sans)" }}>
            {name}
          </text>
        </g>
      ))}
    </>
  );
}

const FLAKES = Array.from({ length: 34 }, (_, i) => ({ left: (i * 37) % 100, delay: (i * 0.73) % 6, dur: 5 + ((i * 1.7) % 4), size: 3 + ((i * 7) % 3) }));

function Snowfall() {
  return (
    <div className="jm-snowfall pointer-events-none absolute inset-0" aria-hidden="true">
      {FLAKES.map((f, i) => (
        <span key={i} style={{ left: `${f.left}%`, width: f.size, height: f.size, animationDelay: `-${f.delay}s`, animationDuration: `${f.dur}s` }} />
      ))}
    </div>
  );
}


interface Engine {
  play(): void;
  destroy(): void;
}

interface EngineOpts {
  svg: SVGSVGElement;
  wrap: HTMLDivElement;
  pill: HTMLDivElement | null;
  legs: Leg[];
  frames: { stops: Box[]; legs: (Box | null)[]; overview: Box };
  stays: Stay[];
  follow: boolean;
  t: MotionValue<number> | null;
  reduce: boolean;
  aspect: number;
  lastCam: { current: Box | null };
  onActive: (i: number) => void;
  onMoving: (legIndex: number) => void;
  onPlaying: (p: boolean) => void;
}

/**
 * The moving parts, outside React: the camera (viewBox), the line revealed
 * leg by leg, the train, the seals. React renders the map once; this keeps it
 * alive on every scroll frame without re-rendering.
 */
function startEngine(o: EngineOpts): Engine {
  const { svg, wrap, pill, legs, frames, stays, follow, t, reduce, aspect } = o;
  const n = stays.length;
  const masks = legs.map((_, j) => svg.querySelector<SVGPathElement>(`[data-mask="${j}"]`));
  const lens = masks.map((m) => m?.getTotalLength() ?? 0);
  masks.forEach((m, j) => {
    if (m) m.style.strokeDasharray = `${lens[j]} ${lens[j] + 1}`;
  });
  const glyphs = Array.from(svg.querySelectorAll<SVGGElement>("[data-gx]")).map((el) => ({ el, x: Number(el.dataset.gx), y: Number(el.dataset.gy), fuji: el.classList.contains("jm-fuji") }));
  const stamps = Array.from(svg.querySelectorAll<SVGGElement>("[data-stamp]")).map((el) => ({ el, region: el.dataset.stamp!, stops: (el.dataset.stops ?? "").split(",").map(Number) }));
  const stations = Array.from(svg.querySelectorAll<SVGGElement>("[data-station]"));
  const train = svg.querySelector<SVGGElement>("[data-train]");
  const waves = svg.querySelector<SVGPatternElement>('[data-pattern="waves"]');
  const snowDots = svg.querySelector<SVGPatternElement>('[data-pattern="snow"]');
  const legsBefore = stays.map((_, i) => legs.filter((l) => l.index < i).length);
  let width = wrap.clientWidth || 360;
  let head = reduce || follow ? legs.length : 0;
  let tour = -1;
  let blend: { from: Box; start: number } | null = o.lastCam.current ? { from: o.lastCam.current, start: performance.now() } : null;
  let raf = 0;
  let anim: { stop(): void } | null = null;
  let lastActive = -2;
  let lastMoving = -2;
  let intro = 0;
  let destroyed = false;

  const frame = () => {
    raf = 0;
    let h: number;
    let cam: Box;
    let stopNow = -1;
    let travelling = -1;
    let legFrac = 0;
    const tv = follow && t ? t.get() : tour;
    if (follow || tv >= 0) {
      const { stop, travel, outro } = travelAt(Math.max(0, tv), n);
      stopNow = travel > 0.5 ? Math.min(n - 1, stop + 1) : stop;
      const j = legs.findIndex((l) => l.index === stop);
      h = legsBefore[stop] + (j >= 0 ? travel : 0);
      if (j >= 0 && travel > 0 && travel < 1) {
        travelling = j;
        legFrac = travel;
      }
      cam = outro > 0 ? lerpBox(frames.stops[n - 1] ?? frames.overview, frames.overview, outro) : cameraOnLeg(frames, stop, travel);
      if (reduce && follow) cam = frames.overview;
    } else {
      h = head;
      cam = frames.overview;
      const j = Math.floor(h);
      if (h > 0 && h < legs.length) {
        travelling = j;
        legFrac = h - j;
      }
    }
    if (blend) {
      const k = clamp01((performance.now() - blend.start) / 900);
      cam = lerpBox(blend.from, cam, smoothstep(k));
      if (k >= 1) blend = null;
      else schedule();
    }
    o.lastCam.current = cam;
    svg.setAttribute("viewBox", `${cam.x} ${cam.y} ${cam.w} ${cam.h}`);
    const px = cam.w / Math.max(1, width);
    // Seals, names and peaks keep their size on screen; a bigger map gets slightly bigger ones.
    const k = px * Math.min(1.5, Math.max(1, width / 400));
    // Fuji grows as the camera comes close: small on the whole route, big at the lake.
    const fujiK = k * Math.min(1.35, Math.max(0.5, 0.17 / px));
    for (const g of glyphs) g.el.setAttribute("transform", `translate(${g.x} ${g.y}) scale(${g.fuji ? fujiK : k})`);
    waves?.setAttribute("patternTransform", `scale(${(22 * px) / 7})`);
    snowDots?.setAttribute("patternTransform", `scale(${(9 * px) / 2.4})`);

    masks.forEach((m, j) => {
      if (m && lens[j]) m.style.strokeDashoffset = String(lens[j] * (1 - clamp01(h - j)));
    });
    for (const s of stamps) {
      s.el.dataset.arrived = s.stops.some((i) => h >= legsBefore[i] - 0.001) ? "1" : "0";
      s.el.dataset.here = stopNow >= 0 && s.stops.includes(stopNow) ? "1" : "0";
    }
    for (const el of stations) {
      const j = Number(el.dataset.station);
      // A place on the way stays named once travelled, but only when the camera is close enough for it not to crowd the stops.
      el.style.opacity = j === travelling || (el.dataset.via && h >= j + 1 && px < 0.2) ? "1" : "0";
    }

    if (travelling >= 0 && train && masks[travelling] && lens[travelling]) {
      const m = masks[travelling]!;
      const len = lens[travelling];
      const at = m.getPointAtLength(len * legFrac);
      const ahead = m.getPointAtLength(Math.min(len, len * legFrac + 0.6));
      const back = m.getPointAtLength(Math.max(0, len * legFrac - 0.6));
      const ang = (Math.atan2(ahead.y - back.y, ahead.x - back.x) * 180) / Math.PI;
      const flip = Math.abs(ang) > 90;
      train.setAttribute("transform", `translate(${at.x} ${at.y}) scale(${k}) rotate(${flip ? ang + 180 : ang}) scale(${flip ? -1 : 1} 1)`);
      train.style.opacity = "1";
      const mode = modeAt(legs[travelling], legFrac);
      train.dataset.mode = mode === "bus" || mode === "taxi" ? "bus" : "rail";
      if (pill) {
        const sx = ((at.x - cam.x) / cam.w) * width;
        const sy = ((at.y - cam.y) / cam.h) * (width / aspect);
        const half = Math.min(pill.offsetWidth, width - 12) / 2;
        pill.style.opacity = "1";
        pill.style.transform = `translate(${Math.min(Math.max(sx, half + 6), width - half - 6) - half}px, ${sy > 60 ? sy - 40 : sy + 22}px)`;
      }
    } else {
      if (train) train.style.opacity = "0";
      if (pill) pill.style.opacity = "0";
    }
    if (stopNow !== lastActive) o.onActive((lastActive = stopNow));
    if (travelling !== lastMoving) {
      o.onMoving((lastMoving = travelling));
      // The pill's text changes on the next render; place it again once it has its new width.
      setTimeout(schedule, 40);
    }
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const ro = new ResizeObserver(() => {
    width = wrap.clientWidth || 360;
    schedule();
  });
  ro.observe(wrap);
  const unsub = t ? t.on("change", schedule) : null;

  // Overview: draw the route in, leg by leg.
  if (!follow && !reduce) {
    const started = performance.now() + 150;
    const dur = 550 + legs.length * 320;
    const tick = () => {
      const p = clamp01((performance.now() - started) / dur);
      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      head = eased * legs.length;
      frame();
      if (p < 1 && !destroyed) intro = requestAnimationFrame(tick);
    };
    intro = requestAnimationFrame(tick);
  }
  frame();
  svg.dataset.ready = "1";

  return {
    play() {
      if (tour >= 0) {
        anim?.stop();
        tour = -1;
        blend = { from: o.lastCam.current ?? frames.overview, start: performance.now() };
        o.onPlaying(false);
        frame();
        return;
      }
      cancelAnimationFrame(intro);
      head = legs.length;
      tour = 0;
      blend = { from: o.lastCam.current ?? frames.overview, start: performance.now() };
      o.onPlaying(true);
      const total = n * 1900;
      const start = performance.now();
      let id = 0;
      const step = () => {
        if (destroyed || tour < 0) return;
        const p = (performance.now() - start) / total;
        if (p >= 1) {
          tour = -1;
          o.onPlaying(false);
          frame();
          return;
        }
        tour = p * n;
        frame();
        id = requestAnimationFrame(step);
      };
      id = requestAnimationFrame(step);
      anim = { stop: () => cancelAnimationFrame(id) };
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(intro);
      anim?.stop();
      ro.disconnect();
      unsub?.();
    },
  };
}
