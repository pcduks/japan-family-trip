"use client";

import Image from "next/image";
import Link from "next/link";
import { art } from "@/lib/art";
import { daysBetween, fmtDay, fmtRange } from "@/lib/dates";
import { movesOf, paceLabel, statsOf } from "@/lib/versions";
import type { PaceVote } from "@/lib/types";
import { EkiStamp, type Motif } from "./EkiStamp";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { Avatar, Page } from "./ui";

export function Home({ today }: { today: string }) {
  const { snapshot, me, isPlanner } = useStore();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const days = daysBetween(today, snapshot.trip.start);
  const first = me?.name.split(" ")[0] ?? "";
  const myPace = snapshot.votes.find((v) => v.kind === "pace" && v.traveller_id === me?.travellerId) as PaceVote | undefined;
  const myMust = (snapshot.votes.find((v) => v.kind === "mustdo" && v.traveller_id === me?.travellerId)?.value as { places?: string[] } | undefined)?.places ?? [];
  const myRank = snapshot.votes.find((v) => v.kind === "rank" && v.traveller_id === me?.travellerId);
  const openSuggestions = snapshot.suggestions.filter((s) => s.status === "open").length;
  const next = !myPace
    ? { href: "/vote", title: "Pick your pace", blurb: "Gentle, Balanced or Full: it decides how many nights each place gets.", motif: "ballot" as Motif }
    : myMust.length < 2
      ? { href: "/vote", title: myMust.length ? "Name one more must-do" : "Name two must-dos", blurb: "The two things you would be sad to miss. They shape the days.", motif: "pin" as Motif }
      : !myRank
        ? { href: "/vote", title: "Rank the versions", blurb: "Six ways to spend the same 20 nights. Put them in your order.", motif: "ballot" as Motif }
        : isPlanner && openSuggestions
          ? { href: `/versions/${plan?.id ?? "plan"}`, title: `${openSuggestions} suggestion${openSuggestions > 1 ? "s" : ""} to decide`, blurb: "Accept them into the plan or decline with a note.", motif: "brush" as Motif }
          : { href: "/places", title: "Browse the places", blurb: "Photos, reviews and videos for everything we researched.", motif: "lantern" as Motif };
  const paceVotes = snapshot.votes.filter((v) => v.kind === "pace") as PaceVote[];
  const stats = plan ? statsOf(plan, snapshot) : null;
  const moves = plan ? movesOf(plan.stays, snapshot.regions) : [];
  const upcoming = snapshot.deadlines.filter((d) => !d.done && d.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

  return (
    <Page wide>
      <section className="grid gap-3 pt-1">
        <p className="eyebrow">{fmtDay(snapshot.trip.start, false)} – {fmtDay(snapshot.trip.end, false)} · {snapshot.trip.nights} nights · {snapshot.travellers.length} of us</p>
        <h1 className="display text-[2.6rem] leading-[1.02] sm:text-6xl">
          Our winter <em className="text-accent not-italic">in Japan</em>
        </h1>
        <div className="relative -mx-4 aspect-[16/9] overflow-hidden sm:mx-0 sm:rounded-2xl sm:shadow-[var(--glow)]">
          <Image src={art("chapter-alpes")} alt="Snow-roped pines, thatched farmhouses and snow monkeys in a hot spring" fill priority sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" />
          <p className="absolute bottom-3 left-4 rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
            {days > 0 ? (
              <>
                <span className="display text-[1.3rem] leading-none">{days}</span> days to go{first ? `, ${first}` : ""}
              </>
            ) : days === 0 ? (
              "Today is the day. 行ってらっしゃい"
            ) : (
              "We’re in Japan"
            )}
          </p>
        </div>
        <p className="max-w-prose text-[1.05rem] text-ink-2">Snow country, crab season, a ryokan New Year and the first clear mornings of January. Three weeks, seven of us, one plan to agree on.</p>
      </section>

      {plan ? (
        <section className="grid gap-3" aria-labelledby="journey">
          <div className="flex items-baseline justify-between">
            <h2 id="journey" className="text-[1.35rem]">
              The plan, stop by stop
            </h2>
            <Link href={`/versions/${plan.id}`} className="text-sm text-muted">
              Details →
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {plan.stays.map((s, i) => {
              const region = snapshot.regions.find((r) => r.id === s.region);
              const leg = moves.find((m) => m.index === i);
              return (
                <Link key={s.id ?? i} href={`/places?region=${s.region}`} className="w-[72%] shrink-0 snap-start no-underline sm:w-[40%] lg:w-[30%]">
                  <RegionCover regionId={s.region} className="hero-fade aspect-[4/5] rounded-2xl shadow-[var(--glow)]">
                    <span className="absolute top-3 left-3 z-10 rounded-full bg-black/45 px-2 py-0.5 text-[0.7rem] font-bold text-white backdrop-blur">
                      {i + 1} · {fmtRange(s.from, s.to)}
                    </span>
                    <span className="absolute inset-x-3 bottom-3 z-10 grid gap-0.5 text-white">
                      <span className="display text-[1.6rem] leading-none">{region?.name ?? s.region}</span>
                      <span className="text-sm opacity-90">
                        {s.nights} night{s.nights === 1 ? "" : "s"}
                        {s.lodging ? ` · ${s.lodging}` : ""}
                        {s.note ? ` · ${s.note}` : ""}
                      </span>
                      {leg ? <span className="text-[0.72rem] opacity-80">← {leg.hours} h · {leg.how}</span> : null}
                    </span>
                  </RegionCover>
                </Link>
              );
            })}
          </div>
          {stats ? (
            <p className="text-sm text-muted">
              {stats.bases} bases · {stats.moves} moves · about {stats.travelHours} h on trains and buses · New Year’s Eve in {snapshot.regions.find((r) => r.id === stats.newYearsEve?.region)?.name ?? "—"}
              {stats.newYearsEve?.lodging === "ryokan" ? " at a ryokan" : ""}.
            </p>
          ) : null}
        </section>
      ) : null}

      <Link href={next.href} className="card flex items-center gap-4 border-accent/40 p-4 no-underline">
        <EkiStamp motif={next.motif} ink="var(--accent)" size={72} rotate={-8} label="" />
        <span className="grid min-w-0 gap-0.5">
          <span className="eyebrow text-accent">Your next step</span>
          <span className="display text-[1.4rem] leading-tight">{next.title}</span>
          <span className="text-sm text-ink-2">{next.blurb}</span>
        </span>
      </Link>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile href="/board" title="Board" blurb={`${snapshot.versions.filter((v) => v.status !== "legacy").length} versions side by side`} motif="train" />
        <Tile href="/vote" title="Vote" blurb={`${paceVotes.length}/${snapshot.travellers.length} picked a pace`} motif="ballot" />
        <Tile href="/places" title="Places" blurb={`${snapshot.places.length} researched`} motif="pin" />
        <Tile href="/map" title="Map" blurb="route, stays, candidates" motif="map" />
        <Tile href="/missing" title="What we’re missing" blurb="candidates and swaps" motif="onsen" />
        <Tile href="/versions/new" title="My version" blurb="copy, change, suggest" motif="suitcase" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card grid gap-2 p-4">
          <h2 className="text-[1.15rem]">Where we stand</h2>
          <p className="text-sm">
            Pace: {(["gentle", "balanced", "full"] as const).map((p) => `${paceLabel(p)} ${paceVotes.filter((v) => v.value.pace === p).length}`).join(" · ")}
          </p>
          <p className="flex flex-wrap items-center gap-1 text-sm">
            <span className="text-muted">Voted:</span>
            {snapshot.travellers.map((t) => (
              <span key={t.id} style={{ opacity: paceVotes.some((v) => v.traveller_id === t.id) ? 1 : 0.3 }}>
                <Avatar traveller={t} travellers={snapshot.travellers} size={24} />
              </span>
            ))}
          </p>
        </div>
        <div className="card grid gap-2 p-4">
          <h2 className="text-[1.15rem]">Coming up</h2>
          {upcoming.length ? (
            <ul className="grid gap-1 text-sm">
              {upcoming.map((d) => (
                <li key={d.id ?? d.date} className="flex gap-2">
                  <b className="shrink-0">{fmtDay(d.date, false)}</b> <span className="text-ink-2">{d.item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No deadlines ahead.</p>
          )}
        </div>
      </section>
    </Page>
  );
}

function Tile({ href, title, blurb, motif }: { href: string; title: string; blurb: string; motif: Motif }) {
  return (
    <Link href={href} className="card grid gap-1 p-4 no-underline transition-transform hover:-translate-y-0.5">
      <EkiStamp motif={motif} ink="var(--indigo)" size={52} rotate={-6} label="" />
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-muted">{blurb}</span>
    </Link>
  );
}
