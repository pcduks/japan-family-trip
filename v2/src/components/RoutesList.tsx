"use client";

import Link from "next/link";
import { guideFor } from "@/lib/autoGuide";
import { budgetOf, fmtSgd } from "@/lib/budget";
import { checkVersion } from "@/lib/rules";
import { STYLE_LABEL, styleOf } from "@/lib/styles";
import type { Region, Version } from "@/lib/types";
import { describeDiff, paceLabel, statsOf } from "@/lib/versions";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { TimelineLane } from "./Timeline";
import { Page, PageHeader, Section } from "./ui";

/** Short names for change lines: "Yudanaka", not "Yudanaka, Shibu Onsen and the snow monkeys". */
const shortNames = (regions: Region[]) => regions.map((r) => ({ ...r, name: r.name.split(",")[0].replace(/ \(.*\)$/, "") }));

/**
 * What if: our route is the starting point. A few ready-made changes, each read
 * against the route (nights, moves, warnings, cost), then your own change.
 */
export function RoutesList() {
  const { snapshot, me, isPlanner } = useStore();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  if (!plan) return null;
  const changes = snapshot.versions.filter((v) => v.status === "alternative");
  const family = snapshot.versions.filter((v) => v.status === "personal" && (v.shared !== false || v.owner === me?.travellerId));
  const earlier = snapshot.versions.filter((v) => v.status === "legacy");

  return (
    <Page>
      <PageHeader title="What if">Our route is the starting point. Try a change and see what it takes: which nights move, how many times we pack, what the checks say and what it costs.</PageHeader>

      <ul className="grid gap-2">
        <RouteRow v={plan} label="The route we are taking" />
      </ul>

      <Section title="Changes worth a look" aside={`${changes.length}`}>
        <ul className="grid gap-2">
          {changes.map((v) => (
            <ChangeRow key={v.id} v={v} plan={plan} />
          ))}
        </ul>
      </Section>

      <Section title="Make your own change">
        <div className="flex flex-wrap gap-2">
          <Link href="/?edit=1" className="btn btn-sm btn-primary">
            {isPlanner ? "Edit the route" : "Suggest a change"}
          </Link>
          <Link href="/build" className="btn btn-sm">
            Add, drop or reorder stops
          </Link>
          <Link href="/board" className="btn btn-sm">
            Compare side by side
          </Link>
        </div>
        <p className="text-sm text-muted">More or fewer nights at a stop is quickest on the route itself. To bring in a new place, start from the stops.</p>
      </Section>

      {family.length ? (
        <Section title="The family’s own" aside={`${family.length}`}>
          <ul className="grid gap-2">
            {family.map((v) => (
              <ChangeRow key={v.id} v={v} plan={plan} />
            ))}
          </ul>
        </Section>
      ) : null}

      {earlier.length ? (
        <details className="card p-3 text-sm">
          <summary className="cursor-pointer">
            <b>Earlier ideas</b> <span className="text-muted">· {earlier.length} whole routes we looked at before the 17 Oct review. Kept for reference; most no longer pass the checks.</span>
          </summary>
          <ul className="grid gap-1 pt-2">
            {earlier.map((v) => (
              <li key={v.id}>
                <Link href={`/routes/${v.id}`}>{guideFor(v, snapshot).theme}</Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Page>
  );
}

/** A route read as a change to ours: what moves, and what that does to packing, warnings and cost. */
function ChangeRow({ v, plan }: { v: Version; plan: Version }) {
  const { snapshot, rules } = useStore();
  const g = guideFor(v, snapshot);
  const author = v.status === "personal" ? snapshot.travellers.find((t) => t.id === v.owner)?.name.split(" ")[0] : null;
  const lines = describeDiff(plan.stays, v.stays, shortNames(snapshot.regions));
  const moves = statsOf(v, snapshot).moves - statsOf(plan, snapshot).moves;
  const warns = (x: Version) => checkVersion(x, rules).filter((f) => f.severity !== "info").map((f) => f.rule).sort();
  const warnDiff = warns(v).length - warns(plan).length;
  const sameChecks = warns(v).join() === warns(plan).join();
  const cost = budgetOf(v, snapshot.regions).perCoupleSgd - budgetOf(plan, snapshot.regions).perCoupleSgd;
  const signed = (n: number, unit: string, plural = unit + "s") => `${n > 0 ? "+" : "−"}${Math.abs(n)} ${Math.abs(n) === 1 ? unit : plural}`;
  const cover = v.stays.find((s) => !plan.stays.some((p) => p.region === s.region))?.region ?? v.stays[0]?.region ?? "tokyo";
  return (
    <li>
      <Link href={`/routes/${v.id}`} className="card flex items-start gap-3 p-2 pr-3 no-underline">
        <RegionCover regionId={cover} className="h-20 w-20 shrink-0 rounded-xl" sizes="80px" />
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="text-[0.68rem] font-semibold tracking-wide text-muted uppercase">{author ? `${author}’s change` : "Ready-made change"}</span>
          <b className="leading-snug text-ink">{g.theme}</b>
          <span className="text-sm text-ink-2">{lines.length ? lines.join(" · ") : "Same stops and nights"}</span>
          <span className="flex flex-wrap gap-x-2 text-xs">
            <span className="text-muted">{moves ? `${signed(moves, "move")}` : "Same moves"}</span>
            <span className={warnDiff > 0 ? "text-warn" : warnDiff < 0 ? "text-ok" : "text-muted"}>{warnDiff ? `${signed(warnDiff, "warning")}` : sameChecks ? "Same checks" : "Different checks"}</span>
            <span className={cost > 0 ? "text-danger" : cost < 0 ? "text-ok" : "text-muted"}>{cost ? `${cost > 0 ? "+" : "−"}${fmtSgd(Math.abs(cost))} per couple` : "Same cost"}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

function RouteRow({ v, label }: { v: Version; label: string }) {
  const { snapshot } = useStore();
  const g = guideFor(v, snapshot);
  const st = statsOf(v, snapshot);
  const cost = budgetOf(v, snapshot.regions).perCoupleSgd;
  const nye = snapshot.regions.find((r) => r.id === st.newYearsEve?.region)?.name.replace(/ Onsen$/, "");
  const cover = st.newYearsEve?.region ?? v.stays[0]?.region ?? "tokyo";
  return (
    <li>
      <Link href="/" className="card grid gap-2 overflow-hidden pb-3 no-underline">
        <RegionCover regionId={cover} className="hero-fade h-28 sm:h-32" sizes="(max-width: 640px) 100vw, 640px">
          <span aria-hidden="true" className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <span className="absolute inset-x-3 bottom-2.5 z-10 grid gap-0.5 text-white">
            <span className="text-[0.68rem] font-semibold tracking-wide uppercase opacity-90">
              {label} · {STYLE_LABEL[styleOf(v.id)] ?? "Classic"} · {paceLabel(v.pace)}
            </span>
            <span className="display text-[1.3rem] leading-tight">{g.theme}</span>
          </span>
        </RegionCover>
        <span className="px-3">
          <TimelineLane stays={v.stays} trip={snapshot.trip} calendar={snapshot.calendar} regions={snapshot.regions} height={18} />
        </span>
        <span className="px-3 text-xs text-muted">
          {st.bases} bases · {st.moves} check-ins · New Year’s Eve in {nye ?? "—"} · {fmtSgd(cost)} per couple
        </span>
      </Link>
    </li>
  );
}
