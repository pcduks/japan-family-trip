"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { areaIds, areaInfo, FAMOUS_TILES, PLACES_INTRO, REGIONS, searchPlaces, VERDICT_LABEL, type KnownFor, type Verdict } from "@/lib/areas";
import { fmtDay } from "@/lib/dates";
import type { Region } from "@/lib/types";
import { JapanMap } from "./JapanMap";
import { PlacePhoto } from "./PlacePhoto";
import { useStore } from "./providers";
import { Page } from "./ui";
import { useFits } from "./useFits";
import { VERDICT_STYLE, VerdictMark, VerdictPill } from "./Verdict";
import { WishBox } from "./WishBox";

const STATES: Verdict["state"][] = ["route", "daytrip", "swap", "later"];
/** What each group means, in one line. */
const STATE_NOTE: Record<Verdict["state"], string> = {
  route: "Planned: on a stop of our route, or a day out we already have.",
  daytrip: "Close enough to a stop for a day out. It would take one of that stop's days.",
  swap: "Too far for a day: it needs nights of its own, taken from somewhere else.",
  later: "A flight away, or too far for these 20 nights. A trip of its own.",
};
/** How many to show in a group before "more". */
const FIRST = 6;

interface Experience extends KnownFor {
  area: string;
}

/**
 * Japan: everything people come for, as things to do. Each one says how it fits
 * the route as it is now, worked out from the route, never written by hand.
 */
export function Explore() {
  const { snapshot } = useStore();
  const fits = useFits();
  const [q, setQ] = useState("");
  const [state, setState] = useState<Verdict["state"] | null>(null);
  const [view, setView] = useState<"heart" | "japan">("heart");
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const byId = useMemo(() => new Map(snapshot.regions.map((r) => [r.id, r])), [snapshot.regions]);
  const name = (id: string) => (byId.get(id)?.name ?? id).split(",")[0].replace(/ \(.*\)$/, "");
  const ids = areaIds().filter((id) => byId.has(id) && fits.has(id));
  const stateOf = (id: string) => fits.get(id)!.state;
  const things: Experience[] = ids.flatMap((id) => (areaInfo(id)?.known_for ?? []).map((k) => ({ ...k, area: id })));
  const counts = Object.fromEntries(STATES.map((s) => [s, things.filter((t) => stateOf(t.area) === s).length])) as Record<Verdict["state"], number>;
  const highlight = state ? new Set(ids.filter((id) => stateOf(id) === state)) : null;
  const found = useMemo(() => searchPlaces(q, Object.fromEntries(snapshot.regions.map((r) => [r.id, r.name]))), [q, snapshot.regions]);
  // Along the route first (in travel order), then by how far the nearest stop is.
  const order = (id: string) => {
    const i = plan?.stays.findIndex((s) => s.region === id) ?? -1;
    const f = fits.get(id)!;
    return i >= 0 ? i : (plan?.stays.findIndex((s) => s.region === f.near) ?? 0) + 0.5 + (f.hours ?? 9) / 100;
  };
  // In route order, taking one from each area in turn, so the first few cover the whole group.
  const inState = (s: Verdict["state"]) => {
    const list = things.filter((t) => stateOf(t.area) === s).sort((a, b) => order(a.area) - order(b.area));
    const byArea = Array.from(new Set(list.map((t) => t.area))).map((a) => list.filter((t) => t.area === a));
    const out: Experience[] = [];
    for (let i = 0; out.length < list.length; i++) for (const g of byArea) if (g[i]) out.push(g[i]);
    return out;
  };

  return (
    <Page wide>
      <section className="grid gap-2 pt-1">
        <p className="eyebrow">
          {fmtDay(snapshot.trip.start, false)} – {fmtDay(snapshot.trip.end, false)} · {snapshot.trip.nights} nights · {snapshot.travellers.length} of us
        </p>
        <h1 className="display text-[2.4rem] leading-[1.02] sm:text-5xl">Japan</h1>
        <p className="max-w-prose text-ink-2">
          {PLACES_INTRO} <Link href="/#why">Why our route? 2 min →</Link>
        </p>
      </section>

      <section className="grid gap-2" aria-label="Heard of somewhere?">
        <label className="grid gap-1">
          <span className="font-semibold">Heard of somewhere?</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Fushimi Inari, Niseko, the snow monkeys…" className="rounded-xl border border-rule bg-card px-3 py-2.5" />
        </label>
        {q.trim().length >= 2 ? (
          found.areas.length || found.heard.length ? (
            <ul className="grid gap-2">
              {found.areas.slice(0, 6).map((id) => (byId.has(id) ? <AreaRow key={id} id={id} region={byId.get(id)!} /> : null))}
              {found.heard.slice(0, 4).map((h) => (
                <li key={h.name} className="card grid gap-0.5 p-3 text-sm">
                  <b>{h.name}</b>
                  <span className="text-ink-2">{h.note}</span>
                  {h.area ? <Link href={`/areas/${h.area}`}>{name(h.area)} →</Link> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Not on our list yet. <a href="#wish">Tell us below</a> and we’ll look into it.
            </p>
          )
        ) : null}
      </section>

      <section className="grid gap-3" aria-labelledby="famous">
        <h2 id="famous" className="text-[1.35rem]">
          The Japan people know
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FAMOUS_TILES.map((t) => {
            const lead = t.areas[0];
            const f = fits.get(lead);
            return (
              <li key={t.title} className="grid content-start gap-1.5">
                <Link href={`/areas/${lead}`} className="block no-underline">
                  <PlacePhoto placeId={areaInfo(lead)?.known_for.find((k) => k.place)?.place} regionId={lead} className="hero-fade aspect-[4/5] rounded-2xl shadow-[var(--glow)]">
                    <span className="absolute top-2 left-2 z-10 rounded-full bg-card/90">{f ? <VerdictPill state={f.state} small /> : null}</span>
                    <span className="absolute inset-x-2.5 bottom-2.5 z-10 grid gap-0.5 text-white">
                      <span className="display text-[1.3rem] leading-none">{t.title}</span>
                      <span className="text-xs leading-snug opacity-95">{t.caption}</span>
                    </span>
                  </PlacePhoto>
                </Link>
                {t.also ? (
                  <Link href={`/areas/${t.also.area}`} className="text-xs">
                    {t.also.label} →
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-2" aria-labelledby="things">
        <div className="grid gap-0.5">
          <h2 id="things" className="text-[1.35rem]">
            Things to do, and how each fits
          </h2>
          <p className="max-w-prose text-sm text-ink-2">Worked out from the route as it is now, the journeys between places and our day plans. Change the route and these move with it.</p>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label="Show">
          {STATES.map((s) => (
            <button key={s} aria-pressed={state === s} onClick={() => setState(state === s ? null : s)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] font-semibold ${state === s ? "bg-ink text-bg" : "bg-card"}`} style={{ borderColor: VERDICT_STYLE[s].color }}>
              <VerdictMark state={s} />
              {VERDICT_LABEL[s]} · {counts[s]}
            </button>
          ))}
        </div>
        <JapanMap regions={snapshot.regions.filter((r) => ids.includes(r.id))} stays={plan?.stays} highlight={highlight} view={view} pinColor={(id) => (fits.get(id) ? VERDICT_STYLE[stateOf(id)].color : "var(--muted)")} className="shadow-[var(--glow)]" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>The numbered line is our route. Tap a place to open it{state ? "; tap the label again to show everything" : ""}.</span>
          <span className="seg">
            <button aria-pressed={view === "heart"} onClick={() => setView("heart")} className="!min-h-8 !py-1 !text-xs">
              Where we go
            </button>
            <button aria-pressed={view === "japan"} onClick={() => setView("japan")} className="!min-h-8 !py-1 !text-xs">
              All of Japan
            </button>
          </span>
        </div>
      </section>

      {STATES.filter((s) => !state || s === state).map((s) => (
        <FitGroup key={s} state={s} list={inState(s)} folded={s === "later" && !state} expanded={!!state} />
      ))}

      <details className="card p-3 text-sm">
        <summary className="cursor-pointer">
          <b>Every area, by part of Japan</b> <span className="text-muted">· {ids.length} areas</span>
        </summary>
        <div className="grid gap-4 pt-3">
          {Object.entries(REGIONS).map(([rid, meta]) => {
            const list = ids.filter((id) => areaInfo(id)!.region === rid).sort((a, b) => STATES.indexOf(stateOf(a)) - STATES.indexOf(stateOf(b)) || order(a) - order(b));
            if (!list.length) return null;
            return (
              <div key={rid} className="grid gap-2">
                <p>
                  <b>{meta.name}</b> <span className="text-muted">· {meta.line}</span>
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {list.map((id) => (
                    <AreaRow key={id} id={id} region={byId.get(id)!} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>

      <div id="wish">
        <WishBox targetId="trip" title="Something missing?" />
      </div>
      <p className="text-sm text-muted">
        <Link href="/places/list">Every sight and restaurant, as a list →</Link>
      </p>
    </Page>
  );
}

/** One fit group: its meaning, then its things to do, the first few open. */
function FitGroup({ state, list, folded, expanded }: { state: Verdict["state"]; list: Experience[]; folded: boolean; expanded: boolean }) {
  const [all, setAll] = useState(false);
  if (!list.length) return null;
  const shown = all || expanded ? list : list.slice(0, FIRST);
  const body = (
    <>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => (
          <ThingCard key={`${t.area}:${t.title}`} t={t} />
        ))}
      </ul>
      {list.length > shown.length ? (
        <button className="justify-self-start text-sm font-semibold text-accent" onClick={() => setAll(true)}>
          {list.length - shown.length} more ▾
        </button>
      ) : null}
    </>
  );
  const head = (
    <span className="grid gap-0.5">
      <span className="flex items-center gap-2 text-[1.2rem] font-semibold">
        <VerdictMark state={state} size={12} /> {VERDICT_LABEL[state]} <span className="text-sm font-normal text-muted">· {list.length}</span>
      </span>
      <span className="text-sm text-ink-2">{STATE_NOTE[state]}</span>
    </span>
  );
  return folded ? (
    <details className="grid gap-3">
      <summary className="cursor-pointer">{head}</summary>
      <div className="grid gap-3 pt-3">{body}</div>
    </details>
  ) : (
    <section className="grid gap-3">
      {head}
      {body}
    </section>
  );
}

/** A thing to do: its picture, where it is, what it is, and how it fits the route now. */
function ThingCard({ t }: { t: Experience }) {
  const { snapshot } = useStore();
  const fits = useFits();
  const f = fits.get(t.area)!;
  const region = snapshot.regions.find((r) => r.id === t.area);
  const area = areaInfo(t.area);
  const short = (region?.name ?? t.area).split(",")[0].replace(/ \(.*\)$/, "");
  return (
    <li className="card grid content-start gap-1.5 p-2 pr-3">
      <Link href={`/areas/${t.area}`} className="flex items-start gap-3 no-underline">
        <PlacePhoto placeId={t.place} regionId={t.area} className="h-20 w-20 shrink-0 rounded-xl" />
        <span className="grid min-w-0 gap-0.5">
          <span className="text-[0.68rem] font-semibold tracking-wide text-muted uppercase">
            {short}
            {area?.prefecture ? ` · ${area.prefecture}` : ""}
          </span>
          <b className="leading-snug text-ink">{t.title}</b>
          <span className="line-clamp-2 text-sm text-ink-2">{t.blurb}</span>
        </span>
      </Link>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 text-muted">
          <VerdictMark state={f.state} /> {f.line}
        </span>
        {f.fit === "change" ? (
          <Link href={`/build?add=${t.area}`} className="font-semibold">
            What would it take? →
          </Link>
        ) : null}
      </span>
    </li>
  );
}

/** One area: a picture, its name and prefecture, what you do there, and how it fits the route. */
function AreaRow({ id, region }: { id: string; region: Region }) {
  const fits = useFits();
  const a = areaInfo(id)!;
  const f = fits.get(id);
  return (
    <li>
      <Link href={`/areas/${id}`} className="card flex items-start gap-3 p-2 pr-3 no-underline">
        <PlacePhoto placeId={a.known_for.find((k) => k.place)?.place} regionId={id} className="h-16 w-16 shrink-0 rounded-xl" />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="flex items-baseline justify-between gap-2">
            <b className="truncate text-ink">{region.name.replace(/ \(.*\)$/, "")}</b>
            <span className="shrink-0 text-xs text-muted">{a.prefecture}</span>
          </span>
          <span className="truncate text-sm text-ink-2">{a.do_line ?? region.summary}</span>
          {f ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <VerdictPill state={f.state} small />
              <span className="text-muted">{f.line}</span>
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
