"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import why from "../../data/why.json";
import { AREA_TAGS, areaInfo, cardsFor } from "@/lib/areas";
import { fitLabel } from "@/lib/colors";
import { fmtDay } from "@/lib/dates";
import { JapanMap } from "./JapanMap";
import { useStore } from "./providers";
import { PlacePhoto } from "./PlacePhoto";
import { Page, RegionDot } from "./ui";

const GROUPS: { k: string; label: string; blurb: string }[] = [
  { k: "in_plan", label: "In the route", blurb: "where we sleep or stop" },
  { k: "option", label: "Options", blurb: "in one version, or a day trip" },
  { k: "candidate_fits", label: "Would fit", blurb: "each could replace a stop" },
  { k: "candidate_maybe", label: "Maybe", blurb: "if rooms or the weather allow" },
  { k: "day_trip", label: "Day trips", blurb: "no nights change" },
  { k: "not_this_trip", label: "Not this trip", blurb: "worth a trip of their own" },
];

/** Step one: the whole country, the areas we researched, and a way in to each. */
export function Explore() {
  const { snapshot } = useStore();
  const [tag, setTag] = useState<string | null>(null);
  const [view, setView] = useState<"heart" | "japan">("heart");
  const regions = snapshot.regions;
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const weight = (id: string) => Math.min(3, 1 + Math.floor((snapshot.places.filter((p) => p.region === id).length + cardsFor(id).length) / 8));
  const highlight = useMemo(() => (tag ? new Set(regions.filter((r) => areaInfo(r.id)?.tags.includes(tag)).map((r) => r.id)) : null), [tag, regions]);
  const intro = (why as { intro: string }).intro;

  return (
    <Page wide>
      <section className="grid gap-2 pt-1">
        <p className="eyebrow">{fmtDay(snapshot.trip.start, false)} – {fmtDay(snapshot.trip.end, false)} · {snapshot.trip.nights} nights · {snapshot.travellers.length} of us</p>
        <h1 className="display text-[2.4rem] leading-[1.02] sm:text-5xl">
          Japan, <em className="text-accent not-italic">researched</em>
        </h1>
        <p className="max-w-prose text-ink-2">{intro.split(". ").slice(0, 3).join(". ")}. Tap any area to see what it is known for, what it is like in our window, and why it is in or out.</p>
      </section>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button className={`chip shrink-0 ${!tag ? "bg-accent text-accent-ink" : ""}`} onClick={() => setTag(null)}>
          Everything
        </button>
        {Object.entries(AREA_TAGS).map(([k, label]) => (
          <button key={k} className={`chip shrink-0 ${tag === k ? "bg-accent text-accent-ink" : ""}`} aria-pressed={tag === k} onClick={() => setTag(tag === k ? null : k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        <JapanMap regions={regions} highlight={highlight} weight={weight} view={view} className="shadow-[var(--glow)]" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>Bigger stamp, more we found. Tap a stamp to dive in.</span>
          <span className="seg">
            <button aria-pressed={view === "heart"} onClick={() => setView("heart")} className="!min-h-8 !py-1 !text-xs">
              Where we go
            </button>
            <button aria-pressed={view === "japan"} onClick={() => setView("japan")} className="!min-h-8 !py-1 !text-xs">
              All of Japan
            </button>
          </span>
        </div>
      </div>

      <Link href="/route" className="card flex items-center justify-between gap-3 border-accent/40 p-4 no-underline">
        <span className="grid gap-0.5">
          <span className="eyebrow text-accent">Step two</span>
          <span className="display text-[1.35rem] leading-tight">The route that came out of this, and why</span>
          <span className="text-sm text-ink-2">{plan ? `${new Set(plan.stays.map((s) => s.region)).size} bases over ${snapshot.trip.nights} nights, the three facts behind it, and what we could change.` : ""}</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-muted">
          →
        </span>
      </Link>

      {GROUPS.map((g) => {
        const list = regions.filter((r) => r.status === g.k && (!highlight || highlight.has(r.id)));
        if (!list.length) return null;
        return (
          <section key={g.k} className="grid gap-3" aria-label={g.label}>
            <p className="flex items-baseline gap-2">
              <span className="text-[1.35rem]">{g.label}</span> <span className="text-sm text-muted">{g.blurb}</span>
            </p>
            <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {list.map((r) => {
                const a = areaInfo(r.id);
                return (
                  <li key={r.id} className="w-[64%] shrink-0 snap-start sm:w-[36%] lg:w-[24%]">
                    <Link href={`/areas/${r.id}`} className="block no-underline">
                      <PlacePhoto placeId={a?.known_for.find((k) => k.place)?.place} regionId={r.id} className="hero-fade aspect-[4/5] rounded-2xl shadow-[var(--glow)]">
                        <span className="absolute top-3 left-3 z-10 rounded-full bg-black/45 px-2 py-0.5 text-[0.68rem] font-bold text-white backdrop-blur">{fitLabel(r.status)}</span>
                        <span className="absolute inset-x-3 bottom-3 z-10 grid gap-0.5 text-white">
                          <span className="flex items-center gap-1.5 text-[0.7rem] opacity-90">
                            <RegionDot id={r.id} size={8} /> {a?.prefecture ?? ""}
                          </span>
                          <span className="display text-[1.4rem] leading-none">{r.name.replace(/ \(.*\)$/, "")}</span>
                          <span className="line-clamp-2 text-xs opacity-90">{r.summary}</span>
                        </span>
                      </PlacePhoto>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="text-sm text-muted">
        Everything here comes from nine research reports written in October 2026 and the plan that followed; each area page links to its sources. <Link href="/plan">The full report</Link> · <Link href="/guide">How this app works</Link>
      </p>
    </Page>
  );
}
