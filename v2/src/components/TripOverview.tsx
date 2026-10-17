"use client";

import Image from "next/image";
import Link from "next/link";
import { art } from "@/lib/art";
import { budgetOf, BUDGET_RATES, fmtJpyShort, fmtSgd, jpyToSgd, stayCost } from "@/lib/budget";
import { fmtRange } from "@/lib/dates";
import { stayNote, versionGuide } from "@/lib/guide";
import { LODGING_TYPES } from "@/lib/lodging";
import { checkVersion } from "@/lib/rules";
import type { Version } from "@/lib/types";
import { movesOf, paceLabel, statsOf } from "@/lib/versions";
import { BudgetCard, BudgetLine } from "./Budget";
import { useStore } from "./providers";
import { guideFor } from "@/lib/autoGuide";
import { RegionCover } from "./RegionCover";
import { TimelineLane } from "./Timeline";
import { Page, PageHeader, RegionDot, RuleBadges, Section } from "./ui";

export function TripOverview() {
  const { snapshot, me } = useStore();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const alternatives = snapshot.versions.filter((v) => v.status === "alternative");
  const personal = snapshot.versions.filter((v) => v.status === "personal" && (v.shared !== false || v.owner === me?.travellerId || me?.role === "planner"));
  const g = plan ? versionGuide(plan.id) : null;
  const regionName = (id: string) => snapshot.regions.find((r) => r.id === id)?.name ?? id;
  const planBudget = plan ? budgetOf(plan, snapshot.regions).perCoupleSgd : undefined;
  const stats = plan ? statsOf(plan, snapshot) : null;
  const moves = plan ? movesOf(plan.stays, snapshot.regions) : [];

  return (
    <Page wide>
      <PageHeader eyebrow={`The trip · ${snapshot.trip.nights} nights · ${fmtRange(snapshot.trip.start, snapshot.trip.end)} · ${snapshot.travellers.length} of us`} title={g?.theme ?? "The plan"}>
        {g?.tagline}
      </PageHeader>

      {plan && g ? (
        <>
          <div className="relative -mx-4 aspect-[2/1] overflow-hidden sm:mx-0 sm:rounded-2xl sm:shadow-[var(--glow)]">
            <Image src={art("route-A")} alt="The route from Tokyo through the mountains to Kyoto and Fuji" fill priority sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10 text-white">
              <TimelineLane stays={plan.stays} trip={snapshot.trip} calendar={snapshot.calendar} regions={snapshot.regions} height={26} />
            </div>
          </div>

          <Section title="What it feels like">
            <p className="max-w-prose text-[1.05rem] leading-relaxed text-ink-2">{g.feel}</p>
            {stats ? (
              <p className="text-sm text-muted">
                {stats.bases} bases · {stats.moves} moves · about {stats.travelHours} h between bases · shortest stay {stats.shortestStay} nights · New Year’s Eve in {regionName(stats.newYearsEve?.region ?? "")}
                {stats.newYearsEve?.lodging === "ryokan" ? " at a ryokan" : ""} · {stats.fuji ? "two dawns for Fuji" : "no Fuji"} · {paceLabel(plan.pace)} pace
              </p>
            ) : null}
          </Section>

          <Section title="Where we sleep, for how long, and why" aside={<Link href={`/versions/${plan.id}`}>candidates and booking links →</Link>}>
            <ol className="grid gap-3">
              {plan.stays.map((s, i) => {
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
                    <Link href={`/versions/${plan.id}#stay-${i}`} className="card flex gap-3 overflow-hidden no-underline">
                      <RegionCover regionId={s.region} className="w-24 shrink-0 self-stretch sm:w-36" sizes="160px" />
                      <div className="grid min-w-0 flex-1 gap-1.5 py-3 pr-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <RegionDot id={s.region} size={12} />
                            <span className="display text-[1.3rem] leading-tight">{regionName(s.region)}</span>
                          </span>
                          <span className="shrink-0 text-right text-sm">
                            <b>{s.nights}</b> night{s.nights === 1 ? "" : "s"}
                            <span className="block text-muted">{fmtRange(s.from, s.to)}</span>
                          </span>
                        </div>
                        <p className="text-sm">
                          <span className="chip mr-1">{LODGING_TYPES[cost.lodging].label}</span>
                          <span className="text-muted">
                            about {fmtJpyShort(cost.perNight)} a night for six · {fmtSgd(jpyToSgd(cost.total / BUDGET_RATES.couples))} per couple
                          </span>
                        </p>
                        {note ? <p className="text-sm text-ink-2">{note}</p> : s.note ? <p className="text-sm text-ink-2">{s.note}</p> : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Section title="What we’ll do">
              <ul className="grid gap-2 text-ink-2">
                {g.activities.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      ●
                    </span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm">
                <Link href={`/versions/${plan.id}`}>The day by day →</Link> · <Link href="/places?in=plan">Every place in the plan →</Link> · <Link href="/food">Where we eat →</Link>
              </p>
            </Section>
            <Section title="Why this one">
              <p className="text-ink-2">{g.why}</p>
              <p className="text-ink-2">
                <b>Suits:</b> {g.suits}
              </p>
              <p className="text-ink-2">
                <b>The trade:</b> {g.trade}
              </p>
              <p className="text-sm">
                <Link href="/plan">The full report →</Link> · <Link href="/plan?tab=nights">Why each stay is this long →</Link>
              </p>
            </Section>
          </div>

          <BudgetCard v={plan} regions={snapshot.regions} regionName={regionName} title="Budget per couple, the plan" />
        </>
      ) : null}

      <Section title="The alternatives" aside={`${alternatives.length} alternatives`}>
        <p className="text-ink-2">The same 20 nights spent differently. Each one trades something the plan has for something it lacks. Rank them on the Vote page, or open one and move its stops around: it becomes your own version to suggest.</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {alternatives.map((v) => (
            <AlternativeCard key={v.id} v={v} planBudget={planBudget} />
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href="/board" className="btn btn-sm">
            Compare side by side
          </Link>
          <Link href="/vote" className="btn btn-sm btn-primary">
            Rank them
          </Link>
        </div>
      </Section>

      {personal.length ? (
        <Section title="The family’s own versions" aside={`${personal.length}`}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {personal.map((v) => (
              <AlternativeCard key={v.id} v={v} planBudget={planBudget} />
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Dig deeper">
        <div className="flex flex-wrap gap-2">
          <Link href="/places" className="btn btn-sm">
            Every place we researched
          </Link>
          <Link href="/map" className="btn btn-sm">
            The map
          </Link>
          <Link href="/plan" className="btn btn-sm">
            The full report
          </Link>
          <Link href="/missing" className="btn btn-sm">
            Swaps that work
          </Link>
        </div>
      </Section>
    </Page>
  );
}

export function AlternativeCard({ v, planBudget, onShow }: { v: Version; planBudget?: number; onShow?: () => void }) {
  const { snapshot, rules } = useStore();
  const g = guideFor(v, snapshot);
  const owner = v.owner === "planners" ? null : snapshot.travellers.find((t) => t.id === v.owner);
  const findings = checkVersion(v, rules);
  const nye = v.stays.find((s) => s.from <= "2026-12-31" && s.to > "2026-12-31");
  return (
    <li className="card grid gap-3 overflow-hidden no-underline">
      <Link href={`/versions/${v.id}`} className="grid gap-3 no-underline">
        <RegionCover regionId={v.stays.find((s) => !["tokyo", "kanazawa", "kyoto"].includes(s.region) && !snapshot.versions.find((p) => p.status === "plan")?.stays.some((ps) => ps.region === s.region))?.region ?? nye?.region ?? v.stays[0]?.region ?? "tokyo"} className="hero-fade aspect-[5/2]">
          <span className="absolute inset-x-3 bottom-3 z-10 grid gap-0.5 text-white">
            <span className="text-[0.72rem] font-semibold uppercase tracking-wide opacity-90">
              {owner ? `${owner.name}’s version` : paceLabel(v.pace)}
            </span>
            <span className="display text-[1.45rem] leading-tight">{g?.theme ?? v.name}</span>
          </span>
        </RegionCover>
        <div className="grid gap-2 px-4">
          {g ? <p className="text-sm text-ink-2">{g.tagline}</p> : null}
          <TimelineLane stays={v.stays} trip={snapshot.trip} calendar={snapshot.calendar} regions={snapshot.regions} height={22} />
          {v.gains || v.gives_up ? (
            <p className="text-sm text-ink-2">
              {v.gains ? (
                <>
                  <b className="text-ok">+</b> {v.gains}
                </>
              ) : null}
              {v.gains && v.gives_up ? <br /> : ""}
              {v.gives_up ? (
                <>
                  <b className="text-danger">−</b> {v.gives_up}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="grid gap-2 px-4 pb-4">
        <BudgetLine v={v} regions={snapshot.regions} compareTo={planBudget} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">
            <b>{statsOf(v, snapshot).bases}</b>&nbsp;bases · <b>{statsOf(v, snapshot).moves}</b>&nbsp;check-ins
          </span>
          <RuleBadges findings={findings} />
          {onShow ? (
            <button className="btn btn-sm ml-auto" onClick={onShow}>
              Draw it on the map
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
