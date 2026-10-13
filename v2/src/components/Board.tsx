"use client";

import Link from "next/link";
import { useMemo } from "react";
import { checkVersion } from "@/lib/rules";
import type { Version } from "@/lib/types";
import { paceLabel, statsOf } from "@/lib/versions";
import { useStore } from "./providers";
import { RegionLegend, TimelineAxis, TimelineLane } from "./Timeline";
import { Avatar, Page, PageHeader, RuleBadges, Section } from "./ui";

export function VersionStatsRow({ v }: { v: Version }) {
  const { snapshot } = useStore();
  const st = statsOf(v, snapshot);
  const items: [string, string][] = [
    ["moves", String(st.moves)],
    ["travel", `${st.travelHours}${st.travelEstimated ? "~" : ""} h`],
    ["shortest", `${st.shortestStay} n`],
    ["rest", `${st.restDays}`],
    ["31 Dec", st.newYearsEve ? `${(snapshot.regions.find((r) => r.id === st.newYearsEve!.region)?.name ?? st.newYearsEve.region).replace(" Onsen", "")}${st.newYearsEve.lodging === "ryokan" ? " ♨" : ""}` : "—"],
    ["Fuji", st.fuji ? "yes" : "no"],
  ];
  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-sm sm:grid-cols-6">
      {items.map(([k, val]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[0.7rem] font-semibold tracking-wide text-muted uppercase">{k}</dt>
          <dd className="truncate font-semibold" title={k === "31 Dec" && val.endsWith("♨") ? "ryokan with dinner" : undefined}>{val}</dd>
        </div>
      ))}
    </dl>
  );
}

export function VersionCard({ v, href }: { v: Version; href: string }) {
  const { snapshot, rules, me } = useStore();
  const findings = useMemo(() => checkVersion(v, rules), [v, rules]);
  const owner = v.owner === "planners" ? null : snapshot.travellers.find((t) => t.id === v.owner);
  return (
    <Link href={href} className="card grid gap-3 p-4 no-underline transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {owner ? <Avatar traveller={owner} travellers={snapshot.travellers} size={24} /> : null}
          <h3 className="truncate text-[1.1rem]">{v.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {v.status === "plan" ? <span className="chip bg-accent text-accent-ink">The plan</span> : null}
          {v.status === "personal" && v.owner === me?.travellerId ? <span className="chip">mine</span> : null}
          {v.shared === false ? <span className="chip">private</span> : null}
          <span className="chip">{paceLabel(v.pace)}</span>
        </div>
      </div>
      <TimelineLane stays={v.stays} trip={snapshot.trip} calendar={snapshot.calendar} regions={snapshot.regions} />
      <VersionStatsRow v={v} />
      {v.gains || v.gives_up ? (
        <p className="text-sm text-ink-2">
          {v.gains ? (
            <>
              <b className="text-ok">+</b> {v.gains}
            </>
          ) : null}
          {v.gains && v.gives_up ? " · " : ""}
          {v.gives_up ? (
            <>
              <b className="text-danger">−</b> {v.gives_up}
            </>
          ) : null}
        </p>
      ) : null}
      <RuleBadges findings={findings} />
    </Link>
  );
}

export function Board() {
  const { snapshot, me } = useStore();
  const versions = snapshot.versions.filter((v) => v.status !== "legacy" && (v.shared !== false || v.owner === me?.travellerId || me?.role === "planner"));
  const regionIds = Array.from(new Set(versions.flatMap((v) => v.stays.map((s) => s.region))));
  const paceVotes = snapshot.votes.filter((v) => v.kind === "pace").length;
  const rankVotes = snapshot.votes.filter((v) => v.kind === "rank").length;
  return (
    <Page wide>
      <PageHeader eyebrow={`${snapshot.trip.nights} nights · ${snapshot.travellers.length} travellers · 20 Dec – 9 Jan`} title="Version board">
        Every version side by side. Same colour, same place. Tap one for the stays, the rules check and the reasons.
      </PageHeader>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/versions" className="btn btn-sm">
          All versions
        </Link>
        <Link href="/vote" className="btn btn-sm">
          Vote · {paceVotes}/{snapshot.travellers.length} pace, {rankVotes}/{snapshot.travellers.length} ranked
        </Link>
        <Link href="/missing" className="btn btn-sm">
          What we’re missing
        </Link>
        <Link href="/versions/new" className="btn btn-sm btn-primary">
          + My version
        </Link>
      </div>

      <div className="grid gap-3">
        <div className="sticky top-0 z-10 bg-bg pt-1">
          <TimelineAxis trip={snapshot.trip} calendar={snapshot.calendar} />
        </div>
        {versions.map((v) => (
          <VersionCard key={v.id} v={v} href={`/versions/${v.id}`} />
        ))}
      </div>

      <RegionLegend ids={regionIds} regions={snapshot.regions} />

      {snapshot.legacy_routes.length ? (
        <Section title="Old routes A–D" aside="for reference">
          <p className="text-sm text-muted">
            {snapshot.legacy_routes.map((r) => `${r.name.replace("Old route ", "")}: ${r.stays.map((s) => `${s.place} ${s.nights}`).join(", ")}`).join(" · ")}. They break the two-night minimum or the peak-day rule.
          </p>
        </Section>
      ) : null}
    </Page>
  );
}
