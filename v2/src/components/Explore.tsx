"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { areaIds, areaInfo, FAMOUS_TILES, PLACES_INTRO, REGIONS, searchPlaces, VERDICT_LABEL, type Verdict } from "@/lib/areas";
import { fmtDay } from "@/lib/dates";
import type { Region } from "@/lib/types";
import { JapanMap } from "./JapanMap";
import { PlacePhoto } from "./PlacePhoto";
import { useStore } from "./providers";
import { Page } from "./ui";
import { VERDICT_STYLE, VerdictMark, VerdictPill } from "./Verdict";
import { WishBox } from "./WishBox";

const STATES: Verdict["state"][] = ["route", "daytrip", "swap", "later"];
/** The parts of Japan we travel through, open; the rest folded under "Further away". */
const NEAR = ["tokyo-fuji", "alps", "kansai"];
/** Day trips sort right after the stop they go from. */
const DAY_TRIP_BASE: Record<string, string> = { nara: "kyoto", shirakawago: "kanazawa", nagano: "yudanaka" };

/**
 * Places: the Japan people know, then every area by the part of Japan it is in,
 * each answering "is it for us this trip?".
 */
export function Explore() {
  const { snapshot } = useStore();
  const [q, setQ] = useState("");
  const [state, setState] = useState<Verdict["state"] | null>(null);
  const [view, setView] = useState<"heart" | "japan">("heart");
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const byId = useMemo(() => new Map(snapshot.regions.map((r) => [r.id, r])), [snapshot.regions]);
  const name = (id: string) => (byId.get(id)?.name ?? id).replace(/ \(.*\)$/, "");
  const ids = areaIds().filter((id) => byId.has(id) && areaInfo(id)?.verdict);
  const stateOf = (id: string) => areaInfo(id)!.verdict!.state;
  const counts = Object.fromEntries(STATES.map((s) => [s, ids.filter((id) => stateOf(id) === s).length])) as Record<Verdict["state"], number>;
  const highlight = state ? new Set(ids.filter((id) => stateOf(id) === state)) : null;
  const found = useMemo(() => searchPlaces(q, Object.fromEntries(snapshot.regions.map((r) => [r.id, r.name]))), [q, snapshot.regions]);
  // Route stops in travel order, then day trips, swaps and the rest.
  const planOrder = (id: string) => {
    const at = (r: string) => plan?.stays.findIndex((s) => s.region === r) ?? -1;
    const i = at(id);
    const base = at(DAY_TRIP_BASE[id] ?? "");
    return i >= 0 ? i : base >= 0 ? base + 0.5 : 99;
  };
  const sortRows = (list: string[]) => list.slice().sort((a, b) => STATES.indexOf(stateOf(a)) - STATES.indexOf(stateOf(b)) || planOrder(a) - planOrder(b) || name(a).localeCompare(name(b)));
  const inRegion = (rid: string) => sortRows(ids.filter((id) => areaInfo(id)!.region === rid && (!state || stateOf(id) === state)));

  return (
    <Page wide>
      <section className="grid gap-2 pt-1">
        <p className="eyebrow">
          {fmtDay(snapshot.trip.start, false)} – {fmtDay(snapshot.trip.end, false)} · {snapshot.trip.nights} nights · {snapshot.travellers.length} of us
        </p>
        <h1 className="display text-[2.4rem] leading-[1.02] sm:text-5xl">Places</h1>
        <p className="max-w-prose text-ink-2">
          {PLACES_INTRO} <Link href="/#why">Why these places? 2 min →</Link>
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
              {found.areas.slice(0, 6).map((id) => (
                <AreaRow key={id} id={id} region={byId.get(id)!} />
              ))}
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
            const v = areaInfo(lead)?.verdict;
            return (
              <li key={t.title} className="grid content-start gap-1.5">
                <Link href={`/areas/${lead}`} className="block no-underline">
                  <PlacePhoto placeId={areaInfo(lead)?.known_for.find((k) => k.place)?.place} regionId={lead} className="hero-fade aspect-[4/5] rounded-2xl shadow-[var(--glow)]">
                    <span className="absolute top-2 left-2 z-10 rounded-full bg-card/90">{v ? <VerdictPill state={v.state} small /> : null}</span>
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

      <section className="grid gap-2" aria-label="Map">
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" role="group" aria-label="Show">
          {STATES.map((s) => (
            <button key={s} aria-pressed={state === s} onClick={() => setState(state === s ? null : s)} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] font-semibold ${state === s ? "bg-ink text-bg" : "bg-card"}`} style={{ borderColor: VERDICT_STYLE[s].color }}>
              <VerdictMark state={s} />
              {VERDICT_LABEL[s]} · {counts[s]}
            </button>
          ))}
        </div>
        <JapanMap regions={snapshot.regions.filter((r) => ids.includes(r.id))} stays={plan?.stays} highlight={highlight} view={view} pinColor={(id) => (areaInfo(id)?.verdict ? VERDICT_STYLE[stateOf(id)].color : "var(--muted)")} className="shadow-[var(--glow)]" />
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

      {NEAR.map((rid) => {
        const list = inRegion(rid);
        const meta = REGIONS[rid];
        if (!meta || !list.length) return null;
        return <RegionSection key={rid} meta={meta} list={list} regions={byId} limit={state ? 99 : 4} />;
      })}

      <section className="grid gap-2" aria-labelledby="further">
        <h2 id="further" className="text-[1.35rem]">
          Further away
        </h2>
        {Object.keys(REGIONS)
          .filter((rid) => !NEAR.includes(rid))
          .map((rid) => {
            const list = inRegion(rid);
            const meta = REGIONS[rid];
            if (!list.length) return null;
            return (
              <details key={rid} className="card p-3" open={!!state}>
                <summary className="cursor-pointer">
                  <b>{meta.name}</b> <span className="text-sm text-muted">· {list.length} {list.length === 1 ? "place" : "places"}</span>
                  <span className="block text-sm text-ink-2">{meta.line}</span>
                  <span className="block text-xs text-muted">{meta.our_take}</span>
                </summary>
                <ul className="grid gap-2 pt-3">
                  {list.map((id) => (
                    <AreaRow key={id} id={id} region={byId.get(id)!} />
                  ))}
                </ul>
              </details>
            );
          })}
      </section>

      <div id="wish">
        <WishBox targetId="trip" title="Something missing?" />
      </div>
      <p className="text-sm text-muted">
        <Link href="/places/list">Every sight and restaurant, as a list →</Link>
      </p>
    </Page>
  );
}

function RegionSection({ meta, list, regions, limit }: { meta: { name: string; line: string; our_take: string }; list: string[]; regions: Map<string, Region>; limit: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, limit);
  return (
    <section className="grid gap-2" aria-label={meta.name}>
      <div className="grid gap-0.5">
        <h2 className="text-[1.35rem]">{meta.name}</h2>
        <p className="max-w-prose text-sm text-ink-2">{meta.line}</p>
        <p className="text-sm font-semibold">{meta.our_take}</p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((id) => (
          <AreaRow key={id} id={id} region={regions.get(id)!} />
        ))}
      </ul>
      {list.length > shown.length ? (
        <button className="justify-self-start text-sm font-semibold text-accent" onClick={() => setAll(true)}>
          {list.length - shown.length} more ▾
        </button>
      ) : null}
    </section>
  );
}

/** One area: a picture, its name and prefecture, what you do there, and where it stands for us. */
function AreaRow({ id, region }: { id: string; region: Region }) {
  const a = areaInfo(id)!;
  const v = a.verdict!;
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
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <VerdictPill state={v.state} small />
            <span className="text-muted">{v.fit}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}
