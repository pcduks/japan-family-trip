"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMotionValue, useMotionValueEvent, type MotionValue } from "motion/react";
import { regionColor } from "@/lib/colors";
import { travelAt } from "@/lib/journey";
import why from "../../data/why.json";
import { budgetOf, BUDGET_RATES, fmtJpyShort, fmtSgd, jpyToSgd, stayCost } from "@/lib/budget";
import { fmtRange } from "@/lib/dates";
import { planDays } from "@/lib/days";
import { avgOutdoorHours, exposure, EXPOSURE_LABEL } from "@/lib/exposure";
import { IDLE_LABEL, stayNote, stayTradeoff } from "@/lib/guide";
import { LODGING_TYPES } from "@/lib/lodging";
import type { Place, Version } from "@/lib/types";
import { movesOf, paceLabel, statsOf } from "@/lib/versions";
import { guideFor } from "@/lib/autoGuide";
import { STYLE_LABEL, styleOf } from "@/lib/styles";
import { BudgetCard } from "./Budget";
import { fmtLegHours, JourneyMap } from "./JourneyMap";
import { PictureScroll } from "./PictureScroll";
import { PlacePrefs } from "./PlacePrefs";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { Back, Empty, Page, RegionDot, Section } from "./ui";

type Src = { label: string; url: string };
const WHY = why as unknown as { facts: { title: string; text: string; sources: Src[] }[]; route: { intro: string; steps: { region: string; title: string; text: string }[]; sources: Src[] }; for_whom: { who: string; text: string }[]; trust: { points: string[]; links: { label: string; href: string }[] } };

/** A route's page: the map, the 21 days, the stops, and why. With no id it is the route we are taking (the Trip tab). */
export function RouteView({ id }: { id?: string }) {
  const { snapshot } = useStore();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const [openFacts, setOpenFacts] = useState<number | null>(null);
  const [feelOpen, setFeelOpen] = useState(false);
  const regionName = (rid: string) => snapshot.regions.find((r) => r.id === rid)?.name ?? rid;
  const listRef = useRef<HTMLOListElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const t = useStopScroll(listRef, stickyRef);
  const [activeStop, setActiveStop] = useState(0);
  const found = id ? snapshot.versions.find((x) => x.id === id) : undefined;
  const stopCount = (found ?? plan)?.stays.length ?? 0;
  useMotionValueEvent(t, "change", (val) => {
    const { stop, travel } = travelAt(val, stopCount);
    const now = travel > 0.5 ? Math.min(stopCount - 1, stop + 1) : stop;
    setActiveStop((prev) => (prev === now ? prev : now));
  });
  const wide = useWide();
  /** Bring stop i into view just under the pinned map. */
  const scrollToStop = useCallback((i: number) => {
    const card = listRef.current?.querySelector<HTMLElement>(`[data-stop="${i}"]`);
    if (!card) return;
    const pinned = wide ? 0 : (stickyRef.current?.offsetHeight ?? 0);
    window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - pinned - 20, behavior: "smooth" });
  }, [wide]);
  const days = useMemo(() => (found ?? plan ? planDays(found ?? plan!, snapshot) : []), [found, plan, snapshot]);
  if (!plan) return null;
  if (id && !found)
    return (
      <Page>
        <Back href="/routes">Routes</Back>
        <Empty>No route with that name. It may have been deleted, or it is still private to the person drafting it.</Empty>
      </Page>
    );

  const v: Version = found ?? plan;
  const isPlan = v.id === plan.id;
  const g = guideFor(v, snapshot);
  const mine = v.status === "personal";
  const author = snapshot.travellers.find((x) => x.id === v.owner)?.name.split(" ")[0];
  const planBudget = budgetOf(plan, snapshot.regions).perCoupleSgd;
  const stats = statsOf(v, snapshot);
  const moves = movesOf(v.stays, snapshot.regions);
  const budget = budgetOf(v, snapshot.regions).perCoupleSgd;
  const byId = new Map(snapshot.places.map((p) => [p.id, p]));

  /** The places this route's days visit at a stop, one list per day. */
  const placesFor = (stayIndex: number): { places: Place[]; days: Place[][] } => {
    const list = days.filter((d) => d.stayIndex === stayIndex).map((d) => d.items.map((it) => (it.place_id ? byId.get(it.place_id) : undefined)).filter((p): p is Place => !!p && p.size !== "meal"));
    const seen = new Set<string>();
    return { places: list.flat().filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))), days: list };
  };

  const steps = (region: string, i: number) => {
    if (!isPlan || !g.written) return stayNote(v.id, v.stays, i) ?? v.stays[i].note ?? null;
    const sameBefore = v.stays.slice(0, i).filter((s) => s.region === region).length;
    const matches = WHY.route.steps.filter((x) => x.region === region);
    return (matches[sameBefore] ?? matches[0])?.text ?? stayNote(v.id, v.stays, i) ?? v.stays[i].note ?? null;
  };

  return (
    <Page wide>
      {isPlan ? null : <Back href="/routes">Routes</Back>}
      <section className="grid gap-2">
        <p className="eyebrow">{isPlan ? `The route · ${fmtRange(snapshot.trip.start, snapshot.trip.end)}` : mine ? `${author ? `${author}’s` : "A family"} route · ${fmtStamp(v.updated_at)}` : `Another route · ${STYLE_LABEL[styleOf(v.id)] ?? ""} · ${paceLabel(v.pace)}`}</p>
        <h1 className="display text-[2.3rem] leading-[1.02] sm:text-5xl">{g.theme}</h1>
        <p className="max-w-prose text-ink-2">{g.tagline}</p>
      </section>

      <div className="grid gap-2">
        <JourneyMap regions={snapshot.regions} stays={v.stays} ghost={isPlan ? null : plan.stays} aspect={wide ? 1.9 : 1.2} onStop={scrollToStop} />
        <p className="text-sm text-muted">
          <b className="text-ink">
            {stats.bases} bases · {stats.moves} check-ins
          </b>{" "}
          · about {stats.travelHours} h between bases · New Year’s Eve in {regionName(stats.newYearsEve?.region ?? "")} · {fmtSgd(budget)} per couple
          {!isPlan ? ` · ${budget - planBudget >= 0 ? "+" : "−"}${fmtSgd(Math.abs(budget - planBudget))} vs the route` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/build?from=${v.id}`} className="btn btn-sm btn-primary">
            Change it
          </Link>
          <Link href="/routes" className="btn btn-sm">
            {isPlan ? "Other routes" : "All routes"}
          </Link>
        </div>
      </div>

      <Section title="The 21 days" aside="tap a day">
        <PictureScroll version={v} onStop={scrollToStop} />
      </Section>

      <Section title="Stop by stop" aside={`${v.stays.length} stops · tap one`}>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
          <div ref={stickyRef} className="sticky top-0 z-[5] -mx-4 mb-3 bg-gradient-to-b from-bg from-80% to-transparent px-3 pt-2 pb-4 lg:order-2 lg:top-6 lg:mx-0 lg:bg-none lg:p-0">
            <JourneyMap regions={snapshot.regions} stays={v.stays} t={t} aspect={wide ? 1.05 : 1.9} onStop={scrollToStop} label="The route, following the stop you are reading" />
          </div>
          <ol ref={listRef} className="grid gap-2">
            {v.stays.map((s, i) => {
              const text = steps(s.region, i);
              const cost = stayCost(s);
              const leg = moves.find((m) => m.index === i);
              const tr = stayTradeoff(v.id, v.stays, i);
              const { places, days: placeDays } = placesFor(i);
              const outside = avgOutdoorHours(placeDays);
              return (
                <li key={s.id ?? i} className="grid gap-1.5" data-stop={i} id={`stop-${i}`}>
                  {leg ? (
                    <p className="flex items-center gap-2.5 pl-3 text-xs text-muted">
                      <span aria-hidden="true" className="h-5 border-l-2 border-dotted border-ink/40" />
                      <span>
                        <b className="text-ink">
                          {leg.curated ? "" : "about "}
                          {fmtLegHours(leg.hours)}
                        </b>{" "}
                        · {leg.how}
                      </span>
                    </p>
                  ) : null}
                  <details className="card group overflow-hidden transition-shadow duration-300" style={activeStop === i ? { boxShadow: `0 0 0 2px ${regionColor(s.region)}, var(--shadow)` } : undefined}>
                    <summary className="flex cursor-pointer list-none gap-3 [&::-webkit-details-marker]:hidden">
                      <RegionCover regionId={s.region} className="w-16 shrink-0 self-stretch sm:w-24" sizes="120px" />
                      <span className="grid min-w-0 flex-1 gap-0.5 py-2.5 pr-3">
                        <span className="flex items-start justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="display text-[1.05rem] leading-none text-accent">{i + 1}</span>
                            <RegionDot id={s.region} size={9} />
                            <span className="display truncate text-[1.15rem] leading-tight">{regionName(s.region)}</span>
                          </span>
                          <span className="shrink-0 text-right text-sm">
                            <b>{s.nights}</b> {s.nights === 1 ? "night" : "nights"}
                            <span className="block text-xs text-muted">{fmtRange(s.from, s.to)}</span>
                          </span>
                        </span>
                        {text ? <span className="line-clamp-2 text-sm text-ink-2 group-open:line-clamp-none">{text}</span> : null}
                      </span>
                    </summary>
                    <div className="grid gap-2 border-t border-rule px-3 py-3 text-sm">
                      <p className="text-xs text-muted">
                        {LODGING_TYPES[cost.lodging].label} · about {fmtJpyShort(cost.perNight)} a night for the group · {fmtSgd(jpyToSgd(cost.total / BUDGET_RATES.couples))} per couple
                        {outside != null ? ` · about ${outside} h outdoors a day` : ""}
                      </p>
                      {tr ? (
                        <div className="grid gap-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <b>Stay longer or move on?</b>
                            <span className={`chip ${tr.idle === "real" ? "border-warn text-warn" : tr.idle === "some" ? "text-muted" : "text-ok"}`}>{IDLE_LABEL[tr.idle]}</span>
                          </p>
                          <p className="text-ink-2">{tr.note}</p>
                          <p className="text-ink-2">
                            <b>One more night:</b> {tr.longer}
                          </p>
                          <p className="text-ink-2">
                            <b>One fewer:</b> {tr.shorter}
                          </p>
                        </div>
                      ) : null}
                      {places.length ? (
                        <div className="grid gap-1.5">
                          <b>Where these days go · Must, Nice or Skip</b>
                          <ul className="grid gap-2">
                            {places.map((p) => (
                              <li key={p.id} className="grid gap-1 border-b border-rule pb-2 last:border-0">
                                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                                  <Link href={`/places/${p.id}`} className="font-semibold no-underline">
                                    {p.name}
                                  </Link>
                                  <span className="text-xs text-muted">
                                    {EXPOSURE_LABEL[exposure(p)]}
                                    {p.status === "avoid_for_her" ? " · not for her" : p.effort_for_her === "high" ? " · hard for her" : ""}
                                  </span>
                                </span>
                                {p.why ? <span className="text-ink-2">{p.why}</span> : null}
                                <PlacePrefs placeId={p.id} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <Link href={`/areas/${s.region}`}>All about {regionName(s.region)} →</Link>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </div>
      </Section>

      {g.nye ? (
        <p className="card max-w-prose border-l-4 border-l-accent p-4 text-sm leading-relaxed text-ink-2">
          <b className="block pb-1 text-ink">New Year’s Eve</b>
          {g.nye}
        </p>
      ) : null}

      <Section title="Why this route">
        <div className="grid max-w-prose justify-items-start gap-1">
          <p className={`leading-relaxed text-ink-2 ${feelOpen ? "" : "line-clamp-5"}`}>{g.feel}</p>
          {g.feel.length > 420 ? (
            <button className="text-sm font-semibold text-accent" onClick={() => setFeelOpen(!feelOpen)} aria-expanded={feelOpen}>
              {feelOpen ? "Show less" : "Read it all"}
            </button>
          ) : null}
        </div>
        <details className="card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">{isPlan ? "What chose it, and who it suits" : "Why it exists, who it suits, what it gives up"}</summary>
          <div className="grid gap-3 pt-3 text-ink-2">
            {isPlan && g.written ? (
              <>
                <ol className="grid gap-2">
                  {WHY.facts.map((f, i) => (
                    <li key={f.title}>
                      <button className="flex w-full items-baseline gap-2 text-left" onClick={() => setOpenFacts(openFacts === i ? null : i)} aria-expanded={openFacts === i}>
                        <span className="display text-[1.3rem] leading-none text-accent">{i + 1}</span>
                        <b className="flex-1 text-ink">{f.title}</b>
                        <span className="text-muted">{openFacts === i ? "▴" : "▾"}</span>
                      </button>
                      {openFacts === i ? <p className="pt-1 pl-6">{f.text}</p> : null}
                    </li>
                  ))}
                </ol>
                <ul className="grid gap-1.5">
                  {WHY.for_whom.map((w) => (
                    <li key={w.who}>
                      <b className="text-ink">{w.who}:</b> {w.text}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                <b className="text-ink">Why it exists:</b> {g.why} <b className="text-ink">Suits:</b> {g.suits} <b className="text-ink">Gives up:</b> {g.trade}
              </p>
            )}
            {isPlan ? (
              <ul className="grid gap-1">
                {WHY.trust.points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      ●
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {(g.sources ?? (isPlan ? WHY.route.sources : [])).length ? (
              <p className="text-xs text-muted">
                Sources:{" "}
                {(g.sources ?? WHY.route.sources).map((s, k) => (
                  <span key={s.url}>
                    {k ? " · " : ""}
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  </span>
                ))}
              </p>
            ) : null}
            {isPlan ? <Link href="/plan">The full report →</Link> : null}
          </div>
        </details>
      </Section>

      <BudgetCard v={v} regions={snapshot.regions} regionName={regionName} title="What it costs, per couple" />
    </Page>
  );
}

/**
 * Scroll position through the stop cards as a number: i when the reading line
 * (a little below the pinned map) is at the top of card i, i + 0.5 halfway to
 * the next, n - 1 + f through the last card.
 */
function useStopScroll(list: React.RefObject<HTMLOListElement | null>, pinned: React.RefObject<HTMLDivElement | null>): MotionValue<number> {
  const t = useMotionValue(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const cards = Array.from(list.current?.querySelectorAll<HTMLElement>("[data-stop]") ?? []);
      if (!cards.length) return;
      const pin = pinned.current?.getBoundingClientRect();
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const top = wide || !pin ? 0 : Math.max(0, pin.bottom);
      const line = top + (window.innerHeight - top) * 0.32;
      const tops = cards.map((c) => c.getBoundingClientRect().top);
      let i = 0;
      while (i + 1 < tops.length && tops[i + 1] <= line) i++;
      let v: number;
      if (line < tops[0]) v = 0;
      else if (i < tops.length - 1) v = i + (line - tops[i]) / Math.max(1, tops[i + 1] - tops[i]);
      else v = i + Math.min(1, (line - tops[i]) / Math.max(1, cards[i].offsetHeight));
      t.set(v);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const ro = new ResizeObserver(on);
    if (list.current) ro.observe(list.current);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      ro.disconnect();
    };
  }, [list, pinned, t]);
  return t;
}

function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

function fmtStamp(iso: string | null | undefined): string {
  if (!iso) return "new";
  const d = new Date(iso);
  return `saved ${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`;
}
