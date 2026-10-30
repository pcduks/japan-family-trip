"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { regionArt } from "@/lib/art";
import { regionColor } from "@/lib/colors";
import { fmtDay, fmtRange, weekday } from "@/lib/dates";
import { outdoorHours } from "@/lib/exposure";
import { fujiChance, JOURNEY, kanji, legsOf, snowLevel } from "@/lib/journey";
import { fmtClock, fmtHours, sunTimes } from "@/lib/sun";
import { planDays } from "@/lib/days";
import { walkByN } from "@/lib/tokyo";
import type { DayItem, Place, Snapshot, Stay, Version } from "@/lib/types";
import Link from "next/link";
import { fmtLegHours } from "./JourneyMap";
import { useStore } from "./providers";

const W = 132; // one day
const RIBBON = 34;
const ART = 150;

const SPECIAL: Record<string, string> = {
  "12-24": "Christmas Eve",
  "12-25": "Christmas Day",
  "12-31": "New Year’s Eve",
  "01-01": "New Year’s Day",
};

interface DayView {
  date: string;
  stayIndex: number;
  region: string;
  kind: string;
  title: string;
  items: DayItem[];
  forHer: string | null;
  move: { from: string; hours: number; how: string; bus: boolean } | null;
  rise: number;
  set: number;
  daylight: number;
  snow: number;
  fuji: number | null;
  outside: number;
  effort: "easy" | "some" | "hard" | "long";
  special: string | null;
  peak: boolean;
  closed: boolean;
}

const EFFORT: Record<DayView["effort"], string> = { easy: "Easy day", some: "Some walking", hard: "A harder day", long: "Long travel day" };

function kindWord(kind: string | null): string {
  return (kind ?? "").split("·")[0].trim() || "Explore";
}

/** "4 h 15 · Shinkansen to …" → "Shinkansen to …" (the hours are shown with the train). */
function cleanTitle(title: string | null): string {
  return (title ?? "").replace(/^[\d–.\s]+(h|min)[\s\d]*·\s*/, "");
}

/** The 21 days as a picture scroll: a chapter per stop, a panel per day, with what the day is like. */
export function PictureScroll({ version, onStop }: { version: Version; onStop?: (stayIndex: number) => void }) {
  const { snapshot } = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<DayView | null>(null);
  const [view, setView] = useState({ left: 0, width: 1 });
  const regions = snapshot.regions;

  const sig = version.stays.map((s) => `${s.region}:${s.from}:${s.to}`).join("|");
  const days = useMemo(() => buildDays(version, snapshot),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sig, snapshot.days, snapshot.places, snapshot.versions]);
  const chapters = useMemo(() => {
    const out: { stay: Stay; index: number; start: number; len: number }[] = [];
    version.stays.forEach((stay, index) => {
      const start = days.findIndex((d) => d.stayIndex === index);
      const len = days.filter((d) => d.stayIndex === index).length;
      if (start >= 0) out.push({ stay, index, start, len });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const on = () => setView({ left: el.scrollLeft, width: el.clientWidth });
    on();
    el.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      el.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  const total = days.length * W;
  const nyStart = days.findIndex((d) => d.date === snapshot.calendar.new_year_closures.start);
  const nyEnd = days.findIndex((d) => d.date === snapshot.calendar.new_year_closures.end);
  const months = days.map((d, i) => ({ d, i })).filter(({ d, i }) => i === 0 || d.date.endsWith("-01"));
  const jump = (i: number) => scroller.current?.scrollTo({ left: Math.max(0, i * W - 24), behavior: "smooth" });
  const regionName = (id: string) => regions.find((r) => r.id === id)?.name.replace(/ Onsen$/, "") ?? id;

  return (
    <div className="grid gap-2.5">
      <div ref={scroller} className="emaki no-scrollbar -mx-4 overflow-x-auto overscroll-x-contain px-4" role="region" aria-label="The 21 days, day by day" tabIndex={0}>
        <div className="relative" style={{ width: total, height: RIBBON + ART + 236 }}>
          {/* The calendar ribbon: months, the New Year week in gold leaf, the busiest train days */}
          {months.map(({ d, i }) => (
            <span key={d.date} className="absolute top-1 text-[0.68rem] font-bold tracking-[0.14em] text-muted uppercase" style={{ left: i * W + 10 }}>
              {d.date.slice(5, 7) === "12" ? "December 2026" : "January 2027"}
            </span>
          ))}
          {nyStart >= 0 && nyEnd >= 0 ? (
            <div className="emaki-gold absolute flex items-center rounded-full text-[0.68rem] font-semibold whitespace-nowrap" style={{ left: nyStart * W + 4, width: (nyEnd - nyStart + 1) * W - 8, top: 17, height: 15 }}>
              <span className="sticky left-6 px-3">正月 · New Year: museums and most restaurants close</span>
            </div>
          ) : null}

          {/* Chapters: one painting per stop, spanning its days */}
          {chapters.map((c) => {
            const jp = kanji(c.stay.region);
            return (
              <div key={c.index} className="emaki-chapter absolute overflow-clip" style={{ left: c.start * W, width: c.len * W, top: RIBBON, height: ART, ["--c" as string]: regionColor(c.stay.region) }}>
                <Image src={regionArt(c.stay.region)} alt="" fill sizes={`${Math.min(c.len * W, 560)}px`} className="object-cover" />
                <div className="emaki-wash absolute inset-0" />
                <div className="absolute inset-x-0 bottom-0 h-[5px]" style={{ background: "var(--c)" }} />
                <button type="button" onClick={() => onStop?.(c.index)} className="sticky top-2.5 left-4 z-[1] mt-2.5 ml-2.5 flex max-w-[calc(100%-3.5rem)] items-center gap-2 text-left text-white">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-white/70 text-[0.8rem] font-bold" style={{ background: "var(--c)" }}>
                    {c.index + 1}
                  </span>
                  <span className="grid leading-none">
                    <span className="display text-[1.3rem] leading-none drop-shadow">{regionName(c.stay.region)}</span>
                    <span className="mt-1 text-[0.72rem] font-semibold opacity-90 drop-shadow">
                      {c.stay.nights} {c.stay.nights === 1 ? "night" : "nights"} · {fmtRange(c.stay.from, c.stay.to)}
                    </span>
                  </span>
                </button>
                {jp && c.len > 1 ? (
                  <span className="emaki-kanji absolute right-2.5 bottom-3 text-white" aria-hidden="true">
                    {jp}
                  </span>
                ) : null}
              </div>
            );
          })}

          {/* The days */}
          {days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setOpen(d)}
              className={`emaki-day absolute flex flex-col gap-1.5 px-2.5 pt-3 pb-2 text-left ${d.closed ? "emaki-day-ny" : ""}`}
              style={{ left: i * W, width: W, top: RIBBON + ART, height: 236, ["--c" as string]: regionColor(d.region) }}
              aria-label={`${fmtDay(d.date)}, ${regionName(d.region)}: ${d.kind}. ${d.title}`}
            >
              {d.move ? (
                <span className="emaki-move absolute -top-3.5 left-2 flex items-center gap-1 rounded-full border border-rule bg-card px-2 py-0.5 text-[0.68rem] font-semibold shadow-sm">
                  {d.move.bus ? <BusIcon /> : <TrainIcon />}
                  {fmtLegHours(d.move.hours)}
                </span>
              ) : null}
              <span className="flex items-baseline gap-1.5">
                <span className="display text-[1.9rem] leading-none">{Number(d.date.slice(8))}</span>
                <span className="text-[0.7rem] font-bold tracking-[0.12em] text-muted uppercase">{weekday(d.date)}</span>
                {d.peak ? <span className="ml-auto size-1.5 rounded-full bg-danger" title="One of the busiest train days of the year" /> : null}
              </span>
              {d.special ? <span className="text-[0.68rem] font-bold text-accent">{d.special}</span> : null}
              <span className={`text-[0.68rem] font-bold tracking-wide uppercase ${/move|fly|arrive/i.test(d.kind) ? "text-indigo" : /easy|free/i.test(d.kind) ? "text-ok" : "text-ink-2"}`}>{d.kind}</span>
              <span className="line-clamp-4 text-[0.78rem] leading-snug text-ink-2">{d.title}</span>
              {d.region === "tokyo" && snapshot.tokyo_pins[d.date] != null ? (
                <span className="truncate text-[0.7rem] font-semibold text-accent" title="Pinned on Tokyo on foot">
                  {snapshot.tokyo_pins[d.date] ? `Walk ${snapshot.tokyo_pins[d.date]}: ${walkByN(snapshot.tokyo_pins[d.date])?.title}` : "Rest day, from Tokyo on foot"}
                </span>
              ) : null}
              <span className="mt-auto grid gap-1.5">
                <Daylight rise={d.rise} set={d.set} />
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem] text-muted">
                  {d.snow > 0 ? <Flakes n={d.snow} /> : null}
                  {d.fuji ? (
                    <span className="flex items-center gap-1 font-semibold text-indigo" title={`Fuji is fully clear on about ${Math.round(d.fuji * 10)} January mornings in 10`}>
                      <FujiGlyph /> {Math.round(d.fuji * 10)} in 10
                    </span>
                  ) : null}
                  {d.outside > 0 ? <span>{d.outside} h outside</span> : null}
                </span>
                <span className={`justify-self-start rounded-full px-1.5 py-px text-[0.64rem] font-semibold ${d.effort === "easy" ? "bg-ok/10 text-ok" : d.effort === "some" ? "bg-bg-2 text-ink-2" : "bg-warn/10 text-warn"}`}>{EFFORT[d.effort]}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* A strip of the whole trip: where you are in the scroll; tap to jump */}
      <div className="relative flex h-3 gap-px overflow-hidden rounded-full" aria-hidden="true">
        {days.map((d, i) => (
          <button key={d.date} type="button" tabIndex={-1} onClick={() => jump(i)} className="h-full flex-1" style={{ background: regionColor(d.region), opacity: d.closed ? 1 : 0.75 }} />
        ))}
        <span className="pointer-events-none absolute inset-y-0 rounded-full border-2 border-ink/70 bg-white/10" style={{ left: `${(view.left / total) * 100}%`, width: `${Math.min(100, (view.width / total) * 100)}%` }} />
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-[0.72rem] text-muted">
        <span>Swipe the days · tap one for the detail</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-6 rounded-full bg-gradient-to-r from-[#f6c453] to-[#ee8f3b]" /> daylight
        </span>
        <span className="flex items-center gap-1">
          <Flakes n={1} /> snow
        </span>
        <span className="flex items-center gap-1">
          <FujiGlyph /> clear-Fuji mornings
        </span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-danger" /> busiest trains
        </span>
      </p>

      <Dialog.Root open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="sheet-overlay fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="sheet card fixed inset-x-0 bottom-0 z-50 mx-auto grid max-h-[82dvh] max-w-xl gap-3 overflow-y-auto rounded-b-none p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none">
            {open ? (
              <>
                <div className="relative -mx-4 -mt-4 h-28 overflow-hidden rounded-t-[18px]">
                  <Image src={regionArt(open.region)} alt="" fill sizes="600px" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2.5 left-4 text-white">
                    <Dialog.Title className="display text-[1.5rem] leading-none">{fmtDay(open.date)}</Dialog.Title>
                    <span className="text-sm opacity-90">
                      {regionName(open.region)}
                      {kanji(open.region) ? ` · ${kanji(open.region)}` : ""}
                      {open.special ? ` · ${open.special}` : ""}
                    </span>
                  </div>
                </div>
                <Dialog.Description className="sr-only">What this day holds.</Dialog.Description>
                {open.move ? (
                  <p className="rounded-xl bg-bg-2 p-3 text-sm">
                    <b>{fmtLegHours(open.move.hours)}</b> from {regionName(open.move.from)} · {open.move.how}
                  </p>
                ) : null}
                <p className="text-[1.02rem] leading-relaxed text-ink">{open.title}</p>
                {open.items.length ? <DayItems items={open.items} /> : null}
                {open.forHer ? (
                  <p className="text-sm text-ink-2">
                    <b className="text-ink">For Fernanda:</b> {open.forHer}
                  </p>
                ) : null}
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-bg-2 p-2.5">
                    <dt className="text-xs text-muted">Daylight</dt>
                    <dd>
                      <b>{fmtClock(open.rise)}</b> to <b>{fmtClock(open.set)}</b> · {fmtHours(open.daylight)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-bg-2 p-2.5">
                    <dt className="text-xs text-muted">Snow on the ground</dt>
                    <dd>{JOURNEY.snow_words[open.snow]}</dd>
                  </div>
                  {open.fuji ? (
                    <div className="rounded-xl bg-bg-2 p-2.5">
                      <dt className="text-xs text-muted">Fuji at dawn</dt>
                      <dd>Fully clear on about {Math.round(open.fuji * 10)} January mornings in 10</dd>
                    </div>
                  ) : null}
                  <div className="rounded-xl bg-bg-2 p-2.5">
                    <dt className="text-xs text-muted">For Fernanda</dt>
                    <dd>
                      {EFFORT[open.effort]}
                      {open.outside ? `, about ${open.outside} h outside` : ""}
                    </dd>
                  </div>
                  {open.closed ? (
                    <div className="col-span-2 rounded-xl bg-bg-2 p-2.5">
                      <dt className="text-xs text-muted">New Year</dt>
                      <dd>Museums, castles and most independent restaurants are closed; shrines, temples and onsen are open.</dd>
                    </div>
                  ) : null}
                  {open.peak ? (
                    <div className="col-span-2 rounded-xl bg-bg-2 p-2.5">
                      <dt className="text-xs text-muted">Trains</dt>
                      <dd>One of the busiest travel days of the year{open.move ? "; seats reserved a month ahead" : "; no long move planned"}.</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="flex flex-wrap gap-2">
                  {onStop ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        const i = open.stayIndex;
                        setOpen(null);
                        setTimeout(() => onStop(i), 50);
                      }}
                    >
                      Read the stop
                    </button>
                  ) : null}
                  <Dialog.Close className="btn btn-sm">Close</Dialog.Close>
                </div>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

const SLOT: Record<string, string> = { early: "Dawn", morning: "Morning", afternoon: "Afternoon", evening: "Evening", rest: "Rest" };

function DayItems({ items }: { items: DayItem[] }) {
  const { snapshot } = useStore();
  return (
    <ul className="grid gap-1.5">
      {items.map((it, i) => {
        const p = it.place_id ? snapshot.places.find((x) => x.id === it.place_id) : null;
        const extra = it.crew === "early" ? "early start, optional" : it.crew === "easy" ? "easy option" : null;
        return (
          <li key={i} className="flex items-baseline gap-2.5 border-b border-rule pb-1.5 text-sm last:border-0">
            <span className="w-[4.6rem] shrink-0 text-[0.7rem] font-bold tracking-wide text-muted uppercase">{SLOT[it.slot] ?? it.slot}</span>
            <span className="min-w-0">
              {p ? (
                <Link href={`/places/${p.id}`} className="font-semibold no-underline">
                  {p.name}
                </Link>
              ) : (
                <span className="text-ink-2">{it.note}</span>
              )}
              {p && it.note ? <span className="text-ink-2"> · {it.note}</span> : null}
              {extra ? <span className="text-muted"> · {extra}</span> : null}
              {p?.status === "avoid_for_her" ? <span className="text-warn"> · not for Fernanda</span> : p?.effort_for_her === "high" ? <span className="text-warn"> · hard for Fernanda</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TrainIcon() {
  return (
    <svg viewBox="0 0 24 12" width="20" height="10" aria-hidden="true">
      <path d="M1 2.5h13.5c4 0 7.4 2 8.4 3.5-1 1.5-4.4 3.5-8.4 3.5H1Z" fill="var(--card)" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1 7h21" stroke="var(--accent)" strokeWidth="1.3" />
      <path d="M15.5 3.4c2.4.3 4.4 1.2 5.3 2.2h-5.3Z" fill="currentColor" />
    </svg>
  );
}

function BusIcon() {
  return (
    <svg viewBox="0 0 20 12" width="17" height="10" aria-hidden="true">
      <rect x="1" y="1" width="18" height="9" rx="2.2" fill="var(--card)" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.6 3.6h3M8.6 3.6h3M13.6 3.6h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M1 7.2h18" stroke="var(--accent)" strokeWidth="1.2" />
    </svg>
  );
}

function Daylight({ rise, set }: { rise: number; set: number }) {
  const a = (rise / 1440) * 100;
  const b = (set / 1440) * 100;
  return (
    <span className="grid gap-0.5" title="Daylight, sunrise to sunset">
      <span className="relative h-1.5 overflow-hidden rounded-full bg-[var(--emaki-night)]">
        <span className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#f6c453] via-[#f9d57a] to-[#ee8f3b]" style={{ left: `${a}%`, width: `${b - a}%` }} />
      </span>
      <span className="flex justify-between text-[0.64rem] text-muted tabular-nums">
        <span>{fmtClock(rise)}</span>
        <span>{fmtClock(set)}</span>
      </span>
    </span>
  );
}

function Flakes({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-px text-info" title={JOURNEY.snow_words[n]}>
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <path d="M6 0.8v10.4M1.5 3.4l9 5.2M1.5 8.6l9-5.2M4.6 1.6 6 3l1.4-1.4M4.6 10.4 6 9l1.4 1.4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ))}
    </span>
  );
}

function FujiGlyph() {
  return (
    <svg viewBox="0 0 20 12" width="16" height="10" aria-hidden="true">
      <path d="M0.5 11.5 C4 10 6.6 5.6 8.2 1.4 L11.8 1.4 C13.4 5.6 16 10 19.5 11.5 Z" fill="currentColor" opacity="0.85" />
      <path d="M7 4.4 L8.2 1.4 L11.8 1.4 L13 4.4 L11.6 3.6 L10 4.8 L8.4 3.6 Z" fill="#fff" />
    </svg>
  );
}

function buildDays(version: Version, snapshot: Snapshot): DayView[] {
  const stays = version.stays;
  if (!stays.length) return [];
  const { calendar, regions } = snapshot;
  const legs = legsOf(stays, regions);
  const byId = new Map(snapshot.places.map((p) => [p.id, p]));
  return planDays(version, snapshot).map((pd) => {
    const { date, stayIndex } = pd;
    const stay = stays[stayIndex];
    const r = regions.find((x) => x.id === stay.region);
    const isMove = stayIndex > 0 && stay.from === date && stays[stayIndex - 1].region !== stay.region;
    const leg = isMove ? legs.find((l) => l.index === stayIndex - 1) : undefined;
    const items = pd.items.filter((it) => it.crew !== "early");
    const sights = items.map((it) => (it.place_id ? byId.get(it.place_id) : undefined)).filter((p): p is Place => !!p && p.size !== "meal");
    const outside = Math.round(sights.reduce((a, p) => a + outdoorHours(p), 0) * 2) / 2;
    const hard = sights.some((p) => p.effort_for_her === "high" || p.status === "avoid_for_her");
    const some = sights.some((p) => p.effort_for_her === "moderate") || outside >= 3;
    const effort: DayView["effort"] = leg && leg.hours >= 3.5 ? "long" : hard ? "hard" : some ? "some" : "easy";
    const sun = sunTimes(date, r?.lat ?? 35.7, r?.lng ?? 139.7);
    const morningThere = date > stay.from || stayIndex === 0;
    return {
      date,
      stayIndex,
      region: stay.region,
      kind: kindWord(pd.kind),
      title: cleanTitle(pd.title),
      items: pd.items,
      forHer: pd.forHer,
      move: leg ? { from: leg.fromRegion, hours: leg.hours, how: leg.how, bus: leg.segments.some((s) => s.mode === "bus") && leg.segments.every((s) => s.mode === "bus" || s.mode === "local") } : null,
      rise: sun.rise,
      set: sun.set,
      daylight: sun.daylight,
      snow: snowLevel(stay.region),
      fuji: morningThere ? fujiChance(stay.region) : null,
      outside,
      effort,
      special: SPECIAL[date.slice(5)] ?? null,
      peak: calendar.peak_travel_days.includes(date),
      closed: date >= calendar.new_year_closures.start && date <= calendar.new_year_closures.end,
    };
  });
}

