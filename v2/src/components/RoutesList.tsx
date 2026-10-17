"use client";

import Link from "next/link";
import { useState } from "react";
import { guideFor } from "@/lib/autoGuide";
import { budgetOf, fmtSgd } from "@/lib/budget";
import { STYLE_LABEL, styleOf } from "@/lib/styles";
import type { Version } from "@/lib/types";
import { paceLabel, sharedNights, statsOf } from "@/lib/versions";
import { useStore } from "./providers";
import { TimelineLane } from "./Timeline";
import { Page, PageHeader, Section } from "./ui";

/** The Routes tab: the route we are taking, the others by style, and the family's own, one row each. */
export function RoutesList() {
  const { snapshot, me } = useStore();
  const [filter, setFilter] = useState("all");
  const plan = snapshot.versions.find((v) => v.status === "plan");
  if (!plan) return null;
  const others = snapshot.versions.filter((v) => v.status === "alternative").sort((a, b) => statsOf(a, snapshot).moves - statsOf(b, snapshot).moves);
  const family = snapshot.versions.filter((v) => v.status === "personal" && (v.shared !== false || v.owner === me?.travellerId));
  const styles = Array.from(new Set(others.map((v) => styleOf(v.id)))).sort((a, b) => Object.keys(STYLE_LABEL).indexOf(a) - Object.keys(STYLE_LABEL).indexOf(b));
  const shown = filter === "all" ? others : others.filter((v) => styleOf(v.id) === filter);
  // More than half the nights where the route has them: a change to the route rather than another trip.
  const close = shown.filter((v) => sharedNights(plan, v) > snapshot.trip.nights / 2);
  const different = shown.filter((v) => !close.includes(v));
  const planBudget = budgetOf(plan, snapshot.regions).perCoupleSgd;

  return (
    <Page>
      <PageHeader title="Routes">The same 20 nights, shaped different ways. Open one to see its days, its stops and what it costs, or build your own from any of them.</PageHeader>
      <div className="flex flex-wrap gap-2">
        <Link href="/build" className="btn btn-sm btn-primary">
          Build your own
        </Link>
        <Link href="/board" className="btn btn-sm">
          Compare side by side
        </Link>
      </div>

      <ul className="grid gap-2">
        <RouteRow v={plan} label="The route we are taking" />
      </ul>

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 text-[0.8rem]">
        {[["all", "All styles"], ...styles.map((s) => [s, STYLE_LABEL[s] ?? s])].map(([k, label]) => (
          <button key={k} className={`shrink-0 rounded-full px-3 py-1.5 font-semibold ${filter === k ? "bg-ink text-bg" : "bg-bg-2 text-muted"}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>

      {different.length ? (
        <Section title="A different trip" aside={`${different.length}`}>
          <ul className="grid gap-2">
            {different.map((v) => (
              <RouteRow key={v.id} v={v} planBudget={planBudget} />
            ))}
          </ul>
        </Section>
      ) : null}
      {close.length ? (
        <Section title="Close to the route" aside={`${close.length}`}>
          <ul className="grid gap-2">
            {close.map((v) => (
              <RouteRow key={v.id} v={v} planBudget={planBudget} />
            ))}
          </ul>
        </Section>
      ) : null}
      {family.length ? (
        <Section title="The family’s own" aside={`${family.length}`}>
          <ul className="grid gap-2">
            {family.map((v) => (
              <RouteRow key={v.id} v={v} planBudget={planBudget} />
            ))}
          </ul>
        </Section>
      ) : null}
    </Page>
  );
}

function RouteRow({ v, label, planBudget }: { v: Version; label?: string; planBudget?: number }) {
  const { snapshot } = useStore();
  const g = guideFor(v, snapshot);
  const st = statsOf(v, snapshot);
  const cost = budgetOf(v, snapshot.regions).perCoupleSgd;
  const diff = planBudget !== undefined ? cost - planBudget : 0;
  const author = v.status === "personal" ? snapshot.travellers.find((t) => t.id === v.owner)?.name.split(" ")[0] : null;
  const nye = snapshot.regions.find((r) => r.id === st.newYearsEve?.region)?.name.replace(/ Onsen$/, "");
  return (
    <li>
      <Link href={v.status === "plan" ? "/" : `/routes/${v.id}`} className="card grid gap-1.5 p-3 no-underline">
        <span className="text-[0.7rem] font-semibold tracking-wide text-muted uppercase">
          {label ?? (author ? `${author}’s route` : `${STYLE_LABEL[styleOf(v.id)] ?? "Classic"} · ${paceLabel(v.pace)}`)}
        </span>
        <span className="display text-[1.2rem] leading-tight">{g.theme}</span>
        <TimelineLane stays={v.stays} trip={snapshot.trip} calendar={snapshot.calendar} regions={snapshot.regions} height={18} />
        <span className="text-xs text-muted">
          {st.bases} bases · {st.moves} check-ins · New Year’s Eve in {nye ?? "—"} · {fmtSgd(cost)}
          {diff ? <span className={diff > 0 ? "text-danger" : "text-ok"}> ({diff > 0 ? "+" : "−"}{fmtSgd(Math.abs(diff))})</span> : null}
        </span>
      </Link>
    </li>
  );
}
