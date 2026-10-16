"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue, type MotionValue } from "motion/react";
import why from "../../data/why.json";
import { budgetOf, BUDGET_RATES, fmtJpyShort, fmtSgd, jpyToSgd, stayCost } from "@/lib/budget";
import { dateRange, fmtRange } from "@/lib/dates";
import { avgOutdoorHours, exposure, EXPOSURE_LABEL } from "@/lib/exposure";
import { IDLE_LABEL, stayNote, stayTradeoff, versionGuide } from "@/lib/guide";
import { LODGING_TYPES } from "@/lib/lodging";
import type { Place, Version } from "@/lib/types";
import { movesOf, statsOf } from "@/lib/versions";
import { BudgetCard } from "./Budget";
import { fmtLegHours, JourneyMap } from "./JourneyMap";
import { PictureScroll } from "./PictureScroll";
import { PlacePrefs } from "./PlacePrefs";
import { Planner } from "./Planner";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { AlternativeCard } from "./TripOverview";
import { Back, Page, RegionDot, Section } from "./ui";

type Src = { label: string; url: string };
const WHY = why as unknown as { facts: { title: string; text: string; sources: Src[] }[]; route: { intro: string; steps: { region: string; title: string; text: string }[]; sources: Src[] }; for_whom: { who: string; text: string }[]; trust: { points: string[]; links: { label: string; href: string }[] } };

/** The route drawn on the map, the facts behind it, the whys, the alternatives, and a way to try a change. Everything follows the selected version. */
export function RouteView() {
  const { snapshot } = useStore();
  const params = useSearchParams();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const [shown, setShown] = useState<string | null>(params.get("show"));
  const [openFacts, setOpenFacts] = useState<number | null>(null);
  const [tryOpen, setTryOpen] = useState(false);
  const regionName = (id: string) => snapshot.regions.find((r) => r.id === id)?.name ?? id;
  const listRef = useRef<HTMLOListElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const t = useStopScroll(listRef, stickyRef);
  const wide = useWide();
  /** Bring stop i into view just under the pinned map. */
  const scrollToStop = useCallback((i: number) => {
    const card = listRef.current?.querySelector<HTMLElement>(`[data-stop="${i}"]`);
    if (!card) return;
    const pinned = wide ? 0 : (stickyRef.current?.offsetHeight ?? 0);
    window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - pinned - 20, behavior: "smooth" });
  }, [wide]);
  if (!plan) return null;

  const alternatives = snapshot.versions.filter((v) => v.status === "alternative").sort((a, b) => statsOf(a, snapshot).moves - statsOf(b, snapshot).moves);
  const v: Version = snapshot.versions.find((x) => x.id === shown) ?? plan;
  const isPlan = v.id === plan.id;
  const g = versionGuide(v.id);
  const planBudget = budgetOf(plan, snapshot.regions).perCoupleSgd;
  const stats = statsOf(v, snapshot);
  const moves = movesOf(v.stays, snapshot.regions);
  const budget = budgetOf(v, snapshot.regions).perCoupleSgd;

  /** Places for a stay: the day plan when this version has one, else what the plan does in that region, else the region's top picks. */
  const placesFor = (stayIndex: number): { places: Place[]; days: Place[][] } => {
    const s = v.stays[stayIndex];
    const dates = dateRange(s.from, s.to);
    const byId = (id: string | null) => (id ? snapshot.places.find((p) => p.id === id) : undefined);
    const fromDays = (versionId: string) =>
      dates.map((d) => (snapshot.days.find((x) => x.version_id === versionId && x.date === d)?.items ?? []).map((it) => byId(it.place_id)).filter((p): p is Place => !!p && p.size !== "meal"));
    let days = fromDays(v.id);
    if (!days.some((d) => d.length) && plan.stays.some((ps) => ps.region === s.region)) {
      const planStay = plan.stays.find((ps) => ps.region === s.region)!;
      days = dateRange(planStay.from, planStay.to).map((d) => (snapshot.days.find((x) => x.version_id === plan.id && x.date === d)?.items ?? []).map((it) => byId(it.place_id)).filter((p): p is Place => !!p && p.size !== "meal"));
    }
    if (!days.some((d) => d.length)) {
      const top = snapshot.places.filter((p) => p.region === s.region && p.size !== "meal").sort((a, b) => (a.size === "main" ? 0 : 1) - (b.size === "main" ? 0 : 1)).slice(0, Math.max(2, s.nights * 2));
      days = Array.from({ length: Math.max(1, s.nights) }, (_, i) => top.filter((_, k) => k % Math.max(1, s.nights) === i));
    }
    const seen = new Set<string>();
    const places = days.flat().filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    return { places, days };
  };

  const steps = (region: string, i: number) => {
    if (!isPlan) return stayNote(v.id, v.stays, i) ?? v.stays[i].note ?? null;
    const sameBefore = v.stays.slice(0, i).filter((s) => s.region === region).length;
    const matches = WHY.route.steps.filter((x) => x.region === region);
    return (matches[sameBefore] ?? matches[0])?.text ?? stayNote(v.id, v.stays, i) ?? v.stays[i].note ?? null;
  };

  return (
    <Page wide>
      <Back href="/">Explore</Back>
      <section className="grid gap-2">
        <p className="eyebrow">{isPlan ? "The route, and why" : "An alternative"}</p>
        <h1 className="display text-[2.3rem] leading-[1.02] sm:text-5xl">{g?.theme ?? v.name}</h1>
        <p className="max-w-prose text-ink-2">{g?.tagline}</p>
      </section>

      <div className="grid gap-2">
        <JourneyMap regions={snapshot.regions} stays={v.stays} ghost={isPlan ? null : plan.stays} aspect={wide ? 1.9 : 1.2} onStop={scrollToStop} />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button className={`chip shrink-0 ${isPlan ? "bg-accent text-accent-ink" : ""}`} onClick={() => setShown(null)}>
            The route
          </button>
          {alternatives.map((a) => (
            <button key={a.id} className={`chip shrink-0 ${v.id === a.id ? "bg-accent text-accent-ink" : ""}`} onClick={() => setShown(a.id)}>
              {versionGuide(a.id)?.theme ?? a.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">
          <b className="text-ink">{stats.bases} bases · {stats.moves} check-ins</b> · about {stats.travelHours} h between bases · New Year’s Eve in {regionName(stats.newYearsEve?.region ?? "")} · {fmtSgd(budget)} per couple
          {!isPlan ? (
            <>
              {" "}
              · {budget - planBudget >= 0 ? "+" : "−"}
              {fmtSgd(Math.abs(budget - planBudget))} vs the route
            </>
          ) : null}
        </p>
      </div>

      <Section title="The 21 days" aside="20 Dec – 9 Jan">
        <PictureScroll version={v} onStop={scrollToStop} />
      </Section>

      {!isPlan ? (
        <div className="card flex flex-wrap items-center justify-between gap-2 border-accent/40 p-3">
          <span className="text-sm">
            <b>Showing: {g?.theme ?? v.name}.</b> Everything below is this alternative. <Link href={`/versions/${v.id}`}>Open its page →</Link>
          </span>
          <button className="btn btn-sm" onClick={() => setShown(null)}>
            Back to the route
          </button>
        </div>
      ) : null}

      {isPlan ? (
        <Section title="Three facts that chose most of it">
          <ol className="grid gap-2">
            {WHY.facts.map((f, i) => (
              <li key={f.title} className="card p-4">
                <button className="flex w-full items-baseline gap-3 text-left" onClick={() => setOpenFacts(openFacts === i ? null : i)} aria-expanded={openFacts === i}>
                  <span className="display text-[1.8rem] leading-none text-accent">{i + 1}</span>
                  <b className="flex-1 text-[1.05rem] leading-tight">{f.title}</b>
                  <span className="text-muted">{openFacts === i ? "▴" : "▾"}</span>
                </button>
                {openFacts === i ? (
                  <div className="grid gap-2 pt-2">
                    <p className="text-ink-2">{f.text}</p>
                    <p className="text-xs text-muted">
                      Sources:{" "}
                      {f.sources.map((s, k) => (
                        <span key={s.url}>
                          {k ? " · " : ""}
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.label}
                          </a>
                        </span>
                      ))}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {g ? (
        <Section title="What it feels like">
          <p className="max-w-prose leading-relaxed text-ink-2">{g.feel}</p>
          {!isPlan ? (
            <p className="text-sm text-ink-2">
              <b>Why it exists:</b> {g.why} <b>Suits:</b> {g.suits} <b>Gives up:</b> {g.trade}
            </p>
          ) : null}
        </Section>
      ) : null}

      <Section title="Stop by stop" aside={`${v.stays.length} stops · ${snapshot.trip.nights} nights`}>
        <p className="text-sm text-ink-2">
          Each stop says why it is this long, what one more or one fewer night would change, and how much of the day is outdoors in the cold. Under each one, the places we would do there: tap <b>Must</b>, <b>Nice</b> or <b>Skip</b> and the family sees the count.
        </p>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
        <div ref={stickyRef} className="sticky top-0 z-[5] -mx-4 mb-3 bg-gradient-to-b from-bg from-80% to-transparent px-3 pt-2 pb-4 lg:order-2 lg:top-6 lg:mx-0 lg:bg-none lg:p-0">
          <JourneyMap regions={snapshot.regions} stays={v.stays} t={t} aspect={wide ? 1.05 : 1.7} onStop={scrollToStop} label="The route, following the stop you are reading" />
        </div>
        <ol ref={listRef} className="grid gap-3">
          {v.stays.map((s, i) => {
            const text = steps(s.region, i);
            const cost = stayCost(s);
            const leg = moves.find((m) => m.index === i);
            const t = stayTradeoff(v.id, v.stays, i);
            const { places, days } = placesFor(i);
            const outside = avgOutdoorHours(days);
            return (
              <li key={s.id ?? i} className="grid gap-2" data-stop={i} id={`stop-${i}`}>
                {leg ? (
                  <p className="flex items-center gap-2.5 pl-3 text-sm text-muted">
                    <span aria-hidden="true" className="h-7 border-l-2 border-dotted border-ink/40" />
                    <span>
                      <b className="text-ink">
                        {leg.curated ? "" : "about "}
                        {fmtLegHours(leg.hours)}
                      </b>{" "}
                      · {leg.how}
                    </span>
                  </p>
                ) : null}
                <div className="card grid gap-0 overflow-hidden">
                  <Link href={`/areas/${s.region}`} className="flex gap-3 no-underline">
                    <RegionCover regionId={s.region} className="w-20 shrink-0 self-stretch sm:w-32" sizes="160px" />
                    <div className="grid min-w-0 flex-1 gap-1 py-3 pr-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span className="display text-[1.1rem] leading-none text-accent">{i + 1}</span>
                          <RegionDot id={s.region} size={10} />
                          <span className="display text-[1.25rem] leading-tight">{regionName(s.region)}</span>
                        </span>
                        <span className="shrink-0 text-right text-sm">
                          <b>{s.nights}</b> n<span className="block text-xs text-muted">{fmtRange(s.from, s.to)}</span>
                        </span>
                      </div>
                      {text ? <p className="text-sm text-ink-2">{text}</p> : null}
                      <p className="text-xs text-muted">
                        {LODGING_TYPES[cost.lodging].label} · about {fmtJpyShort(cost.perNight)} a night for the group · {fmtSgd(jpyToSgd(cost.total / BUDGET_RATES.couples))} per couple
                        {outside != null ? ` · about ${outside} h outdoors a day` : ""}
                      </p>
                    </div>
                  </Link>
                  {t ? (
                    <div className="grid gap-1.5 border-t border-rule px-3 py-3 text-sm">
                      <p className="flex flex-wrap items-center gap-2">
                        <b>Stay longer or move on?</b>
                        <span className={`chip ${t.idle === "real" ? "border-warn text-warn" : t.idle === "some" ? "text-muted" : "text-ok"}`}>{IDLE_LABEL[t.idle]}</span>
                      </p>
                      <p className="text-ink-2">{t.note}</p>
                      <p className="text-ink-2">
                        <b>One more night:</b> {t.longer}
                      </p>
                      <p className="text-ink-2">
                        <b>One fewer:</b> {t.shorter}
                      </p>
                    </div>
                  ) : null}
                  {places.length ? (
                    <details className="border-t border-rule px-3 py-2">
                      <summary className="cursor-pointer text-sm font-semibold">
                        {places.length} places here · Must, Nice or Skip
                      </summary>
                      <ul className="grid gap-2 pt-2">
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
                            {p.why ? <span className="text-sm text-ink-2">{p.why}</span> : null}
                            <PlacePrefs placeId={p.id} />
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        </div>
        {isPlan ? (
          <p className="text-xs text-muted">
            Sources:{" "}
            {WHY.route.sources.map((s, k) => (
              <span key={s.url}>
                {k ? " · " : ""}
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </span>
            ))}
          </p>
        ) : null}
      </Section>

      {isPlan ? (
        <Section title="Why it works for each of us">
          <ul className="grid gap-3 sm:grid-cols-2">
            {WHY.for_whom.map((w) => (
              <li key={w.who} className="card grid gap-1 p-4">
                <b className="leading-tight">{w.who}</b>
                <p className="text-sm text-ink-2">{w.text}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="What we could change" aside="fewest check-ins first">
        <p className="text-ink-2">The same 20 nights spent differently. Tap one to see it above: the map, the stops, the trade-offs and the cost all switch.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {alternatives.map((a) => (
            <AlternativeCard
              key={a.id}
              v={a}
              planBudget={planBudget}
              onShow={() => {
                setShown(a.id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ))}
        </ul>
      </Section>

      <BudgetCard v={v} regions={snapshot.regions} regionName={regionName} title={isPlan ? "What it costs, per couple" : `What “${g?.theme ?? v.name}” costs, per couple`} />

      <Section title="Try a change" aside="drag, swap, add nights">
        {tryOpen ? (
          <Planner key={v.id} version={v} />
        ) : (
          <div className="card grid gap-2 p-4">
            <p className="text-ink-2">Move the stops, swap a place for another from the map, add or take nights. The timeline, the warnings and the cost update as you go. If this is not your version to edit, your first change makes a copy that is yours to shape and suggest.</p>
            <button className="btn btn-sm justify-self-start" onClick={() => setTryOpen(true)}>
              Open the stops
            </button>
          </div>
        )}
      </Section>

      <Section title="How sure we are">
        <ul className="grid gap-1.5 text-sm text-ink-2">
          {WHY.trust.points.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true" className="text-accent">
                ●
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap gap-2">
          {WHY.trust.links.map((l) =>
            l.href.startsWith("http") ? (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="btn btn-sm">
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className="btn btn-sm">
                {l.label}
              </Link>
            ),
          )}
          <Link href="/food" className="btn btn-sm">
            Where we eat
          </Link>
        </p>
      </Section>
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
