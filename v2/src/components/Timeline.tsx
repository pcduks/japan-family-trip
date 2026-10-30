"use client";

import { regionColor } from "@/lib/colors";
import { addDays, daysBetween, fmtDay } from "@/lib/dates";
import { shortRegionName } from "@/lib/map";
import type { Calendar, Region, Stay, TripData } from "@/lib/types";

interface LaneProps {
  stays: Stay[];
  trip: TripData["trip"];
  calendar: Calendar;
  regions: Region[];
  height?: number;
  /** Highlight one stay. */
  activeIndex?: number | null;
  onStayClick?: (index: number) => void;
}

const SHORT: Record<string, string> = { shirakawago: "Shira", "echigo-yuzawa": "Yuzawa", yudanaka: "Yudanaka" };

/** Fit the label to the bar: ~17 px per night at 375 px wide. */
function label(r: Region | undefined, id: string, nights: number): string {
  const name = SHORT[id] ?? (r ? shortRegionName(id, [r]) : id);
  if (nights >= 4) return name;
  if (nights === 3) return name.length > 6 ? name.slice(0, 5) : name;
  if (nights === 2) return name.slice(0, 4);
  return name.slice(0, 2);
}

/** One lane: stays as coloured bars across the 21 days, with the New Year window shaded. */
export function TimelineLane({ stays, trip, calendar, regions, height = 34, activeIndex = null, onStayClick }: LaneProps) {
  const days = daysBetween(trip.start, trip.end);
  const pct = (iso: string) => (Math.min(days, Math.max(0, daysBetween(trip.start, iso))) / days) * 100;
  const ny = calendar.new_year_closures;
  return (
    <div className="relative w-full overflow-hidden rounded-md bg-bg-2" style={{ height }} role="img" aria-label={stays.map((s) => `${regions.find((r) => r.id === s.region)?.name ?? s.region} ${s.nights} nights`).join(", ")}>
      <div className="absolute inset-y-0" style={{ left: `${pct(ny.start)}%`, width: `${pct(addDays(ny.end, 1)) - pct(ny.start)}%`, background: "var(--ny)" }} aria-hidden="true" />
      {stays.map((s, i) => {
        const left = pct(s.from);
        const width = Math.max(0, pct(s.to) - left);
        const r = regions.find((rg) => rg.id === s.region);
        const active = activeIndex === i;
        return (
          <div
            key={s.id ?? i}
            onClick={onStayClick ? () => onStayClick(i) : undefined}
            className={`absolute top-[3px] bottom-[3px] flex items-center justify-center overflow-hidden rounded-[5px] px-1 text-[0.7rem] leading-none font-bold whitespace-nowrap text-white ${onStayClick ? "cursor-pointer" : ""}`}
            style={{
              left: `calc(${left}% + 1px)`,
              width: `calc(${width}% - 2px)`,
              background: regionColor(s.region),
              opacity: activeIndex != null && !active ? 0.45 : 1,
              boxShadow: active ? "inset 0 0 0 2px var(--ink)" : undefined,
              textShadow: "0 1px 2px rgba(0,0,0,.35)",
              transition: "left 0.35s cubic-bezier(.2,.8,.2,1), width 0.35s cubic-bezier(.2,.8,.2,1), opacity 0.2s",
            }}
            title={`${r?.name ?? s.region} · ${s.nights} nights`}
          >
            {s.nights >= 1 ? (
              <span>
                {label(r, s.region, s.nights)}
                {s.nights >= 3 ? <span className="opacity-80"> {s.nights}</span> : null}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** The date axis shared by every lane on the board. */
export function TimelineAxis({ trip, calendar }: { trip: TripData["trip"]; calendar: Calendar }) {
  const days = daysBetween(trip.start, trip.end);
  const pct = (iso: string) => (daysBetween(trip.start, iso) / days) * 100;
  const ticks = ["2026-12-20", "2026-12-24", "2026-12-28", "2027-01-01", "2027-01-05", "2027-01-09"];
  const ny = calendar.new_year_closures;
  return (
    <div className="relative h-6 w-full text-[0.68rem] font-semibold text-muted" aria-hidden="true">
      <div className="absolute inset-y-0 rounded" style={{ left: `${pct(ny.start)}%`, width: `${pct(addDays(ny.end, 1)) - pct(ny.start)}%`, background: "var(--ny)" }} />
      {ticks.map((t, i) => (
        <span key={t} className="absolute top-0 whitespace-nowrap" style={{ left: `${pct(t)}%`, transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}>
          {fmtDay(t, false)}
          <span className="absolute top-4 left-1/2 h-2 border-l border-rule" />
        </span>
      ))}
    </div>
  );
}

export function RegionLegend({ ids, regions }: { ids: string[]; regions: Region[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
      {ids.map((id) => (
        <li key={id} className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm" style={{ background: regionColor(id) }} />
          {regions.find((r) => r.id === id)?.name ?? id}
        </li>
      ))}
      <li className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-sm border border-rule" style={{ background: "var(--ny)" }} /> New Year closures 29 Dec–3 Jan
      </li>
    </ul>
  );
}
