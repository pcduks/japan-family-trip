/**
 * The journey: how each move is drawn on the map (the real line it follows,
 * from data/journey.json), and where the camera looks at each point of the
 * trip. Everything here is in the map's viewBox units (see lib/map.ts).
 */
import journey from "../../data/journey.json";
import { legBetween } from "./legs";
import { project } from "./map";
import type { Region, Stay } from "./types";

export type Mode = "shinkansen" | "limited_express" | "local" | "bus" | "private_rail" | "ropeway" | "rail";
export interface Pt {
  x: number;
  y: number;
}
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RawSegment {
  mode: Mode;
  name: string;
  /** [lat, lng] or [lat, lng, "Station name"] for a stop worth naming on the map. */
  points: (number | string)[][];
}
interface JourneyData {
  kanji: Record<string, string>;
  snow: Record<string, number>;
  snow_words: string[];
  fuji: { regions: string[]; clear_mornings: number; source: string };
  lines: Record<string, { segments: RawSegment[] }>;
  peaks: { name: string; lat: number; lng: number; elev: number }[];
  ranges: { name: string; points: [number, number][] }[];
  fuji_summit: { lat: number; lng: number };
  lakes: { name: string; points?: [number, number][]; ellipse?: { lat: number; lng: number; rx: number; ry: number }; label?: boolean }[];
  seas: { label: string; lat: number; lng: number; rotate?: number }[];
  snow_prefectures: string[];
}

export const JOURNEY = journey as unknown as JourneyData;

export const MODE_LABEL: Record<Mode, string> = {
  shinkansen: "Shinkansen",
  limited_express: "Limited express",
  local: "Local train",
  bus: "Bus",
  private_rail: "Private railway",
  ropeway: "Ropeway",
  rail: "Train",
};

export function kanji(regionId: string): string | null {
  return JOURNEY.kanji[regionId] ?? null;
}

/** 0 rarely, 1 possible, 2 likely, 3 near-certain: snow on the ground in our window. */
export function snowLevel(regionId: string): number {
  return JOURNEY.snow[regionId] ?? 0;
}

export function fujiChance(regionId: string): number | null {
  return JOURNEY.fuji.regions.includes(regionId) ? JOURNEY.fuji.clear_mornings : null;
}

export interface LegSegment {
  mode: Mode;
  name: string;
  /** Index range into the leg's points that this segment covers. */
  from: number;
  to: number;
}

export interface Leg {
  key: string;
  fromRegion: string;
  toRegion: string;
  /** The stop index the leg leaves from (it arrives at index + 1). */
  index: number;
  points: Pt[];
  /** Station names, aligned with points (undefined for shape points). */
  names: (string | undefined)[];
  segments: LegSegment[];
  hours: number;
  how: string;
  curated: boolean;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function curatedSegments(from: string, to: string): RawSegment[] | null {
  const fwd = JOURNEY.lines[`${from}>${to}`];
  if (fwd) return fwd.segments;
  const back = JOURNEY.lines[`${to}>${from}`];
  if (back) return [...back.segments].reverse().map((s) => ({ ...s, points: [...s.points].reverse() }));
  return null;
}

/** A gentle arc between two places that have no curated line (alternatives built in the app). */
function arc(a: Pt, b: Pt): Pt[] {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const d = dist(a, b);
  const nx = -(b.y - a.y) / (d || 1);
  const ny = (b.x - a.x) / (d || 1);
  const c = { x: mx + nx * d * 0.16, y: my + ny * d * 0.16 };
  const out: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    out.push({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
  }
  return out;
}

export function regionPoint(id: string, regions: Region[]): Pt {
  const r = regions.find((x) => x.id === id);
  return project(r?.lat ?? 35, r?.lng ?? 135);
}

export function buildLeg(from: string, to: string, index: number, regions: Region[]): Leg {
  const a = regionPoint(from, regions);
  const b = regionPoint(to, regions);
  const est = legBetween(from, to, regions);
  const raw = curatedSegments(from, to);
  if (!raw) {
    const points = arc(a, b);
    return { key: `${from}>${to}`, fromRegion: from, toRegion: to, index, points, names: points.map(() => undefined), segments: [{ mode: "rail", name: est.how, from: 0, to: points.length - 1 }], hours: est.hours, how: est.how, curated: false };
  }
  const points: Pt[] = [];
  const names: (string | undefined)[] = [];
  const segments: LegSegment[] = [];
  for (const s of raw) {
    const start = Math.max(0, points.length - 1);
    for (const [lat, lng, name] of s.points) {
      const p = project(Number(lat), Number(lng));
      if (!points.length || dist(points[points.length - 1], p) > 0.05) {
        points.push(p);
        names.push(typeof name === "string" ? name : undefined);
      }
    }
    segments.push({ mode: s.mode, name: s.name, from: start, to: points.length - 1 });
  }
  // Tie the line to the stamps: the region centre can sit a little off the station.
  if (dist(points[0], a) > 0.4) {
    points.unshift(a);
    names.unshift(undefined);
    for (const s of segments) {
      s.from += s === segments[0] ? 0 : 1;
      s.to += 1;
    }
  }
  if (dist(points[points.length - 1], b) > 0.4) {
    points.push(b);
    names.push(undefined);
    segments[segments.length - 1].to = points.length - 1;
  }
  // The endpoints are the stops themselves; their stamps carry the names.
  names[0] = undefined;
  names[names.length - 1] = undefined;
  return { key: `${from}>${to}`, fromRegion: from, toRegion: to, index, points, names, segments, hours: est.hours, how: est.how, curated: true };
}

export function legsOf(stays: Pick<Stay, "region">[], regions: Region[]): Leg[] {
  const out: Leg[] = [];
  for (let i = 0; i + 1 < stays.length; i++) if (stays[i].region !== stays[i + 1].region) out.push(buildLeg(stays[i].region, stays[i + 1].region, i, regions));
  return out;
}

/**
 * A smooth path through the points (Catmull-Rom as cubic Béziers), for the
 * slice [from, to]. Neighbours outside the slice still shape the tangents, so
 * slices of one line join without a kink.
 */
export function smoothPath(points: Pt[], from = 0, to = points.length - 1): string {
  if (to <= from) return "";
  const p = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  const f = (n: number) => Math.round(n * 100) / 100;
  let d = `M${f(p(from).x)} ${f(p(from).y)}`;
  for (let i = from; i < to; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

export function bounds(points: Pt[]): Box {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** A box around the points at the given aspect (width / height), padded (more sideways, for the names), never smaller than minW wide. */
export function frame(points: Pt[], aspect: number, minW: number, padX = 0.3, padY = 0.2): Box {
  const b = bounds(points);
  let w = Math.max(b.w * (1 + padX * 2), minW);
  let h = Math.max(b.h * (1 + padY * 2), minW / aspect);
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
}

/** Zoom-feel interpolation: centre moves linearly, size moves in log space. */
export function lerpBox(a: Box, b: Box, t: number): Box {
  const w = Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * t);
  const h = w * (a.h / a.w + (b.h / b.w - a.h / a.w) * t);
  const cx = a.x + a.w / 2 + (b.x + b.w / 2 - a.x - a.w / 2) * t;
  const cy = a.y + a.h / 2 + (b.y + b.h / 2 - a.y - a.h / 2) * t;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/**
 * Where we are on the trip at scroll position t: t = i means "at stop i".
 * Between i and i + 1 we stay put for the first half (reading about stop i),
 * then travel the leg. Past the last stop, t up to n zooms out to the whole route.
 */
export function travelAt(t: number, n: number): { stop: number; travel: number; outro: number } {
  if (t >= n - 1) return { stop: n - 1, travel: 0, outro: smoothstep(t - (n - 1)) };
  const i = Math.max(0, Math.floor(t));
  return { stop: i, travel: smoothstep((t - i - 0.5) / 0.5), outro: 0 };
}

/** The camera's frame for each stop: the leg in and the stop itself; plus the whole route. */
export function cameraFrames(stays: Pick<Stay, "region">[], legs: Leg[], regions: Region[], aspect: number): { stops: Box[]; overview: Box } {
  const pts = stays.map((s) => regionPoint(s.region, regions));
  const legInto = (i: number) => legs.find((l) => l.index === i - 1);
  const stops = stays.map((_, i) => {
    const leg = legInto(i);
    const around = leg ? leg.points : [pts[i], pts[Math.min(pts.length - 1, i + 1)]];
    return frame([...around, pts[i]], aspect, 48, 0.34, 0.24);
  });
  const all = [...pts, ...legs.flatMap((l) => l.points)];
  return { stops, overview: frame(all, aspect, 60, 0.3, 0.14) };
}

/** Small peaks every few units along each range's ridge line, sized with a little deterministic jitter. */
export function ridgePeaks(): { x: number; y: number; s: number }[] {
  const out: { x: number; y: number; s: number }[] = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (const r of JOURNEY.ranges) {
    const pts = r.points.map(([la, ln]) => project(la, ln));
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.round(d / 2.4));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        out.push({ x: a.x + (b.x - a.x) * t + (rnd() - 0.5) * 1.2, y: a.y + (b.y - a.y) * t + (rnd() - 0.5) * 1.2, s: 0.42 + rnd() * 0.28 });
      }
    }
  }
  return out;
}
