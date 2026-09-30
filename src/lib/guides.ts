import guidesJson from "../../data/city-guides.json";
import boardJson from "../../data/route-board.json";

export interface GuideSlot {
  time: string;
  title: string;
  text: string | null;
  alt: string | null;
  query: string | null;
  query2: string | null;
  who: "all" | "early" | "bump";
}
export interface GuideDay {
  label: string;
  title: string;
  summary: string;
  slots: GuideSlot[];
}
export interface GuideHood {
  name: string;
  area: string;
  tags: string[];
  vibe: string;
  do: string | null;
  eat: string | null;
  shop: string | null;
  forHer: string | null;
  query: string;
  flag: boolean;
}
export interface Guide {
  city: "tokyo" | "kyoto";
  mapSuffix: string;
  flagLabel: string;
  days: GuideDay[];
  nights: { name: string; fit: string; text: string; query: string }[];
  hoods: GuideHood[];
}

export const GUIDES = guidesJson as unknown as Record<"tokyo" | "kyoto", Guide>;

export function guideFor(slug: string | null | undefined): Guide | null {
  return slug === "tokyo" || slug === "kyoto" ? GUIDES[slug] : null;
}

export const WHO_LABEL: Record<GuideSlot["who"], string> = { all: "Todos", early: "Turma da madrugada", bump: "Opção tranquila" };

export interface BoardStop {
  name: string;
  dates: string;
  nights: number;
  lodging: string;
  how: string;
  highlights: string[];
  eat: string | null;
  bump: string | null;
}
export interface BoardRoute {
  code: string;
  pitch: string;
  good: string[];
  warn: string[];
  stops: BoardStop[];
}

export const BOARD = boardJson as unknown as BoardRoute[];

/** Highlights for a base on a candidate route (stops line up with stays). */
export function boardStop(code: string, stayIndex: number): BoardStop | null {
  return BOARD.find((b) => b.code === code)?.stops[stayIndex] ?? null;
}

/** Highlights for a base from any route that stays there (used by plans). */
export function boardStopForPlace(slug: string, placeName: string): BoardStop | null {
  const first = placeName.split(/[ (/]/)[0].toLowerCase();
  for (const r of BOARD) {
    const s = r.stops.find((x) => x.name.toLowerCase().includes(first) || x.name.toLowerCase().includes(slug));
    if (s) return s;
  }
  return null;
}
