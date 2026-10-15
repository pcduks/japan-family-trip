"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import why from "../../data/why.json";
import { budgetOf, BUDGET_RATES, fmtJpyShort, fmtSgd, jpyToSgd, stayCost } from "@/lib/budget";
import { fmtRange } from "@/lib/dates";
import { stayNote, versionGuide } from "@/lib/guide";
import { LODGING_TYPES } from "@/lib/lodging";
import { movesOf, statsOf } from "@/lib/versions";
import { BudgetCard } from "./Budget";
import { JapanMap } from "./JapanMap";
import { Planner } from "./Planner";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { AlternativeCard } from "./TripOverview";
import { Back, Page, RegionDot, Section } from "./ui";

type Src = { label: string; url: string };
const WHY = why as unknown as { facts: { title: string; text: string; sources: Src[] }[]; route: { intro: string; steps: { region: string; title: string; text: string }[]; sources: Src[] }; for_whom: { who: string; text: string }[]; trust: { points: string[]; links: { label: string; href: string }[] } };

/** Step two: the route drawn on the map, the facts behind it, the whys, the alternatives, and a quiet way to try a change. */
export function RouteView() {
  const { snapshot } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const alternatives = snapshot.versions.filter((v) => v.status === "alternative");
  const [shown, setShown] = useState<string | null>(params.get("show"));
  const [openFacts, setOpenFacts] = useState<number | null>(null);
  const [tryOpen, setTryOpen] = useState(false);
  const showing = snapshot.versions.find((v) => v.id === shown) ?? plan;
  const g = plan ? versionGuide(plan.id) : null;
  const sg = showing ? versionGuide(showing.id) : null;
  const regionName = (id: string) => snapshot.regions.find((r) => r.id === id)?.name ?? id;
  const planBudget = plan ? budgetOf(plan, snapshot.regions).perCoupleSgd : undefined;
  const stats = plan ? statsOf(plan, snapshot) : null;
  const moves = plan ? movesOf(plan.stays, snapshot.regions) : [];
  if (!plan) return null;

  return (
    <Page wide>
      <Back href="/">Explore</Back>
      <section className="grid gap-2">
        <p className="eyebrow">Step two · the route, and why</p>
        <h1 className="display text-[2.3rem] leading-[1.02] sm:text-5xl">{g?.theme ?? plan.name}</h1>
        <p className="max-w-prose text-ink-2">{g?.tagline}</p>
      </section>

      <div className="grid gap-2">
        <JapanMap regions={snapshot.regions} stays={showing?.stays} view="heart" className="shadow-[var(--glow)]" onPick={(id) => router.push(`/areas/${id}`)} />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button className={`chip shrink-0 ${!shown || shown === plan.id ? "bg-accent text-accent-ink" : ""}`} onClick={() => setShown(null)}>
            The route
          </button>
          {alternatives.map((v) => (
            <button key={v.id} className={`chip shrink-0 ${shown === v.id ? "bg-accent text-accent-ink" : ""}`} onClick={() => setShown(v.id)}>
              {versionGuide(v.id)?.theme ?? v.name}
            </button>
          ))}
        </div>
        {showing && showing.id !== plan.id && sg ? (
          <p className="text-sm text-ink-2">
            <b>{sg.theme}.</b> {sg.tagline} <Link href={`/versions/${showing.id}`}>Open it →</Link>
          </p>
        ) : stats ? (
          <p className="text-sm text-muted">
            {stats.bases} bases · {stats.moves} moves · about {stats.travelHours} h between bases · New Year’s Eve in {regionName(stats.newYearsEve?.region ?? "")} · {planBudget ? `${fmtSgd(planBudget)} per couple` : ""}
          </p>
        ) : null}
      </div>

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

      {g ? (
        <Section title="What it feels like">
          <p className="max-w-prose leading-relaxed text-ink-2">{g.feel}</p>
        </Section>
      ) : null}

      <Section title="Stop by stop, and why" aside={`${plan.stays.length} stops · ${snapshot.trip.nights} nights`}>
        <ol className="grid gap-3">
          {plan.stays.map((s, i) => {
            const step = WHY.route.steps.find((x, k) => x.region === s.region && WHY.route.steps.findIndex((y) => y.region === s.region) + (s.region === "tokyo" && i > 0 ? 1 : 0) === k) ?? WHY.route.steps.find((x) => x.region === s.region);
            const note = stayNote(plan.id, plan.stays, i);
            const cost = stayCost(s);
            const leg = moves.find((m) => m.index === i);
            return (
              <li key={s.id ?? i} className="grid gap-2">
                {leg ? (
                  <p className="pl-3 text-sm text-muted">
                    ↓ {leg.hours}
                    {leg.curated ? "" : "~"} h · {leg.how}
                  </p>
                ) : null}
                <Link href={`/areas/${s.region}`} className="card flex gap-3 overflow-hidden no-underline">
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
                    <p className="text-sm text-ink-2">{step?.text ?? note ?? s.note}</p>
                    <p className="text-xs text-muted">
                      {LODGING_TYPES[cost.lodging].label} · about {fmtJpyShort(cost.perNight)} a night for the group · {fmtSgd(jpyToSgd(cost.total / BUDGET_RATES.couples))} per couple
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
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
      </Section>

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

      <Section title="What we could change" aside={`${alternatives.length} alternatives`}>
        <p className="text-ink-2">The same 20 nights spent differently. Tap one to draw it on the map above; open it for the full story, the stops and the cost.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {alternatives.map((v) => (
            <AlternativeCard key={v.id} v={v} planBudget={planBudget} onShow={() => { setShown(v.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
          ))}
        </ul>
      </Section>

      <BudgetCard v={plan} regions={snapshot.regions} regionName={regionName} title="What it costs, per couple" />

      <Section title="Try a change" aside="drag, swap, add nights">
        {tryOpen ? (
          <Planner key={plan.id} version={plan} />
        ) : (
          <div className="card grid gap-2 p-4">
            <p className="text-ink-2">Move the stops, swap a place for another from the map, add or take nights. The timeline, the rules and the cost follow live. If this is not your version to edit, your first change makes a copy that is yours to shape and suggest.</p>
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
