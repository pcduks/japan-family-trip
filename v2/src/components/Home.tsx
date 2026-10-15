"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import why from "../../data/why.json";
import { art } from "@/lib/art";
import { fitLabel, regionColor } from "@/lib/colors";
import { daysBetween, fmtDay, fmtRange } from "@/lib/dates";
import { movesOf, statsOf } from "@/lib/versions";
import type { PaceVote, Region } from "@/lib/types";
import { EkiStamp, type Motif } from "./EkiStamp";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { Page, RegionDot } from "./ui";

type Src = { label: string; url: string };
const WHY = why as unknown as {
  researched: { catalog: string; plan: string; reports: number; experience_cards: number };
  intro: string;
  facts: { title: string; text: string; sources: Src[] }[];
  route: { intro: string; steps: { region: string; title: string; text: string }[]; sources: Src[] };
  for_whom: { who: string; text: string }[];
  not_chosen: { intro: string; items: { region: string; why: string; comeback: string }[] };
  trust: { intro: string; points: string[]; links: { label: string; href: string }[] };
};

const CHAPTERS = [
  { id: "facts", label: "Three facts" },
  { id: "route", label: "The route" },
  { id: "who", label: "For each of us" },
  { id: "considered", label: "Everything we considered" },
  { id: "trust", label: "How sure we are" },
  { id: "you", label: "Your part" },
];

/**
 * The home page is the case for the trip: why these places, in this order,
 * for these seven people, and how sure we are. The countdown, the route and
 * the next step live here too; everything else is one tap away in the tabs.
 */
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
          : { href: "/trip", title: "Shape the trip", blurb: "Drag the stops around on any version; it becomes yours to suggest.", motif: "train" as Motif };
  const stats = plan ? statsOf(plan, snapshot) : null;
  const moves = plan ? movesOf(plan.stays, snapshot.regions) : [];
  const upcoming = snapshot.deadlines.filter((d) => !d.done && d.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const regionName = (id: string) => snapshot.regions.find((r) => r.id === id)?.name ?? id;
  const sourceHosts = new Set(snapshot.places.map((p) => p.links?.source).filter(Boolean).map((u) => { try { return new URL(u!).hostname.replace(/^www\./, ""); } catch { return u!; } }));

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
        <p className="max-w-prose text-[1.05rem] leading-relaxed text-ink-2">{WHY.intro}</p>
        <nav aria-label="On this page" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {CHAPTERS.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="chip shrink-0 no-underline">
              {c.label}
            </a>
          ))}
        </nav>
      </section>

      <section id="facts" className="grid gap-4 scroll-mt-4" aria-labelledby="facts-h">
        <h2 id="facts-h" className="text-[1.75rem]">
          Three facts about these dates decide most of it
        </h2>
        <ol className="grid gap-3">
          {WHY.facts.map((f, i) => (
            <li key={f.title} className="card grid gap-2 p-4">
              <p className="flex items-baseline gap-3">
                <span className="display text-[2rem] leading-none text-accent">{i + 1}</span>
                <b className="text-[1.1rem] leading-tight">{f.title}</b>
              </p>
              <p className="text-ink-2">{f.text}</p>
              <Sources list={f.sources} />
            </li>
          ))}
        </ol>
      </section>

      {plan ? (
        <section id="route" className="grid gap-4 scroll-mt-4" aria-labelledby="route-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="route-h" className="text-[1.75rem]">
              The route, and why it is in this order
            </h2>
            <Link href="/trip" className="shrink-0 text-sm text-muted">
              The trip →
            </Link>
          </div>
          <p className="text-ink-2">{WHY.route.intro}</p>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {plan.stays.map((s, i) => {
              const leg = moves.find((m) => m.index === i);
              return (
                <Link key={s.id ?? i} href={`/versions/${plan.id}#stops`} className="w-[62%] shrink-0 snap-start no-underline sm:w-[32%] lg:w-[24%]">
                  <RegionCover regionId={s.region} className="hero-fade aspect-[4/5] rounded-2xl shadow-[var(--glow)]">
                    <span className="absolute top-3 left-3 z-10 rounded-full bg-black/45 px-2 py-0.5 text-[0.7rem] font-bold text-white backdrop-blur">
                      {i + 1} · {fmtRange(s.from, s.to)}
                    </span>
                    <span className="absolute inset-x-3 bottom-3 z-10 grid gap-0.5 text-white">
                      <span className="display text-[1.5rem] leading-none">{regionName(s.region)}</span>
                      <span className="text-sm opacity-90">
                        {s.nights} night{s.nights === 1 ? "" : "s"}
                        {s.lodging ? ` · ${s.lodging}` : ""}
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
              {stats.bases} bases · {stats.moves} moves · about {stats.travelHours} h between bases · New Year’s Eve in {regionName(stats.newYearsEve?.region ?? "")}
              {stats.newYearsEve?.lodging === "ryokan" ? " at a ryokan" : ""} · {stats.fuji ? "two dawns for Fuji" : "no Fuji"}.
            </p>
          ) : null}
          <ol className="grid gap-2">
            {WHY.route.steps.map((st, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-bg-2 p-3">
                <span className="mt-1 shrink-0">
                  <RegionDot id={st.region} size={12} />
                </span>
                <span>
                  <b>{st.title}.</b> <span className="text-ink-2">{st.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <Sources list={WHY.route.sources} />
        </section>
      ) : null}

      <section id="who" className="grid gap-4 scroll-mt-4" aria-labelledby="who-h">
        <h2 id="who-h" className="text-[1.75rem]">
          Why it works for each of us
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {WHY.for_whom.map((w) => (
            <li key={w.who} className="card grid gap-1.5 p-4">
              <b className="text-[1.05rem] leading-tight">{w.who}</b>
              <p className="text-sm text-ink-2">{w.text}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          The three versions in <Link href="/plan?tab=nights">Why each stay is this long</Link> rate each of us against Gentle, Balanced and Full. Balanced is the only one nobody rates poorly.
        </p>
      </section>

      <Considered regions={snapshot.regions} />

      <section id="trust" className="grid gap-3 scroll-mt-4" aria-labelledby="trust-h">
        <h2 id="trust-h" className="text-[1.75rem]">
          How sure we are
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <Stat n={WHY.researched.reports} label="research reports" />
          <Stat n={snapshot.regions.length} label="regions weighed" />
          <Stat n={snapshot.places.length} label={`places from ${sourceHosts.size} sources`} />
        </div>
        <ul className="grid gap-2 text-ink-2">
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
        </p>
      </section>

      <section id="you" className="grid gap-3 scroll-mt-4" aria-labelledby="you-h">
        <h2 id="you-h" className="text-[1.75rem]">
          Your part
        </h2>
        <Link href={next.href} className="card flex items-center gap-4 border-accent/40 p-4 no-underline">
          <EkiStamp motif={next.motif} ink="var(--accent)" size={72} rotate={-8} label="" />
          <span className="grid min-w-0 gap-0.5">
            <span className="eyebrow text-accent">Your next step</span>
            <span className="display text-[1.4rem] leading-tight">{next.title}</span>
            <span className="text-sm text-ink-2">{next.blurb}</span>
          </span>
        </Link>
        <ol className="grid gap-2 text-sm sm:grid-cols-3">
          <li className="rounded-xl bg-bg-2 p-3">
            <b>1 · Read the trip</b>
            <span className="block text-ink-2">What it feels like, where we sleep and why, what it costs, and the alternatives. In the Trip tab.</span>
          </li>
          <li className="rounded-xl bg-bg-2 p-3">
            <b>2 · Vote</b>
            <span className="block text-ink-2">Your pace, two must-dos, your ranking of the versions. By 25 Oct. In the Vote tab.</span>
          </li>
          <li className="rounded-xl bg-bg-2 p-3">
            <b>3 · Move things if you want</b>
            <span className="block text-ink-2">Drag the stops around on any version. It becomes yours; suggest it when you like it.</span>
          </li>
        </ol>
        {upcoming.length ? (
          <p className="text-sm text-muted">
            Coming up: {upcoming.map((d) => `${fmtDay(d.date, false)} ${d.item}`).join(" · ")}.
          </p>
        ) : null}
        <p className="text-sm text-muted">
          Lost? <Link href="/guide">How this app works</Link>.
        </p>
      </section>
    </Page>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="card grid gap-0.5 p-3 text-center">
      <span className="display text-[1.8rem] leading-none">{n}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function Sources({ list }: { list: Src[] }) {
  return (
    <p className="text-xs text-muted">
      Sources:{" "}
      {list.map((s, i) => (
        <span key={s.url}>
          {i ? " · " : ""}
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.label}
          </a>
        </span>
      ))}
    </p>
  );
}

/** Every region weighed, grouped by verdict, with the one-line reason. */
function Considered({ regions }: { regions: Region[] }) {
  const [open, setOpen] = useState(false);
  const order: Record<string, { label: string; blurb: string }> = {
    in_plan: { label: "In the plan", blurb: "the seven places we sleep or stop" },
    option: { label: "Options", blurb: "in one version, or a day trip" },
    candidate_fits: { label: "Would fit", blurb: "each replaces a stop without breaking a rule" },
    candidate_maybe: { label: "Maybe", blurb: "only if rooms or the weather allow" },
    day_trip: { label: "Day trips", blurb: "from Tokyo, no nights change" },
    not_this_trip: { label: "Not this trip", blurb: "worth a trip of their own" },
  };
  const reason = (id: string) => WHY.not_chosen.items.find((x) => x.region === id);
  const groups = Object.keys(order).map((k) => ({ k, ...order[k], list: regions.filter((r) => r.status === k) })).filter((g) => g.list.length);
  return (
    <section id="considered" className="grid gap-3 scroll-mt-4" aria-labelledby="considered-h">
      <h2 id="considered-h" className="text-[1.75rem]">
        Everything we considered
      </h2>
      <p className="text-ink-2">{WHY.not_chosen.intro}</p>
      <ul className="grid gap-3">
        {groups.map((g) => (
          <li key={g.k} className="grid gap-1.5">
            <p className="flex items-baseline gap-2">
              <b>{g.label}</b> <span className="text-sm text-muted">{g.blurb}</span>
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {g.list.map((r) => (
                <li key={r.id} className="chip" style={{ borderColor: regionColor(r.id) }}>
                  <RegionDot id={r.id} size={8} /> {r.name.replace(/ \(.*\)$/, "")}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <button className="btn btn-sm justify-self-start" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Hide the reasons" : "Why each one is in or out"}
      </button>
      {open ? (
        <ul className="grid gap-2 text-sm">
          {regions
            .filter((r) => r.status !== "in_plan")
            .map((r) => {
              const x = reason(r.id);
              return (
                <li key={r.id} className="grid gap-0.5 border-b border-rule py-2">
                  <span className="flex items-center gap-2">
                    <RegionDot id={r.id} size={10} />
                    <b>{r.name}</b> <span className="chip">{fitLabel(r.status)}</span>
                  </span>
                  <span className="text-ink-2">{x?.why ?? r.fit ?? r.summary}</span>
                  {x?.comeback && x.comeback !== "no" ? <span className="text-xs text-muted">Comes back as {x.comeback}.</span> : null}
                </li>
              );
            })}
          <li className="pt-1 text-xs text-muted">
            <Link href="/missing">The swaps in detail</Link> · <Link href="/map">On the map</Link>
          </li>
        </ul>
      ) : null}
    </section>
  );
}
