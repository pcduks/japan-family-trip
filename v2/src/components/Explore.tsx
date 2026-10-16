"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import why from "../../data/why.json";
import { AREA_TAGS, areaInfo, cardsFor, ZONES } from "@/lib/areas";
import { fitColor, fitLabel } from "@/lib/colors";
import { fmtDay } from "@/lib/dates";
import { exposure } from "@/lib/exposure";
import type { Region } from "@/lib/types";
import { JapanMap } from "./JapanMap";
import { PlacePhoto } from "./PlacePhoto";
import { useStore } from "./providers";
import { Page, RegionDot } from "./ui";
import { WishBox } from "./WishBox";

const STATUS_ORDER = ["in_plan", "option", "candidate_fits", "candidate_maybe", "day_trip", "not_this_trip"];

/** Home: the whole country, the areas we researched, grouped by where they are, and a way in to each. */
export function Explore() {
  const { snapshot } = useStore();
  const [tag, setTag] = useState<string | null>(null);
  const [view, setView] = useState<"heart" | "japan">("heart");
  const regions = snapshot.regions;
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const weight = (id: string) => Math.min(3, 1 + Math.floor((snapshot.places.filter((p) => p.region === id).length + cardsFor(id).length) / 8));
  const indoorShare = (id: string) => {
    const list = snapshot.places.filter((p) => p.region === id && p.size !== "meal");
    return list.length >= 3 ? list.filter((p) => exposure(p) === "indoors").length / list.length : 0;
  };
  const highlight = useMemo(() => {
    if (!tag) return null;
    if (tag === "indoors") return new Set(regions.filter((r) => indoorShare(r.id) >= 0.45).map((r) => r.id));
    return new Set(regions.filter((r) => areaInfo(r.id)?.tags.includes(tag)).map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, regions, snapshot.places]);
  const intro = (why as { intro: string }).intro;

  // On the route, in travel order; day trips that are part of the plan (Nara) go after their base.
  const route: Region[] = [];
  for (const s of plan?.stays ?? []) {
    const r = regions.find((x) => x.id === s.region);
    if (r && !route.includes(r)) route.push(r);
  }
  for (const r of regions.filter((x) => x.status === "in_plan" && !route.includes(x))) {
    const kyoto = route.findIndex((x) => x.id === "kyoto");
    route.splice(kyoto >= 0 ? kyoto + 1 : route.length, 0, r);
  }
  const zoneOf = (r: Region) => (route.includes(r) ? "route" : (areaInfo(r.id)?.zone ?? "near"));
  const groups: { k: string; label: string; blurb: string; list: Region[] }[] = [
    { k: "route", label: "On the route", blurb: "in travel order", list: route },
    ...ZONES.map(([k, label]) => ({ k, label, blurb: k === "near" ? "day trips and easy swaps" : "researched, not on this route", list: regions.filter((r) => zoneOf(r) === k) })),
  ];
  const seen = new Set(groups.flatMap((g) => g.list.map((r) => r.id)));
  const rest = regions.filter((r) => !seen.has(r.id));
  if (rest.length) groups.push({ k: "rest", label: "Elsewhere", blurb: "", list: rest });
  const statusesShown = STATUS_ORDER.filter((s) => regions.some((r) => r.status === s));

  return (
    <Page wide>
      <section className="grid gap-2 pt-1">
        <p className="eyebrow">{fmtDay(snapshot.trip.start, false)} – {fmtDay(snapshot.trip.end, false)} · {snapshot.trip.nights} nights · {snapshot.travellers.length} of us</p>
        <h1 className="display text-[2.4rem] leading-[1.02] sm:text-5xl">
          Japan, <em className="text-accent not-italic">researched</em>
        </h1>
        <p className="max-w-prose text-ink-2">{intro.split(". ").slice(0, 3).join(". ")}. Tap any area to see what it is known for, what it is like in our dates, and why it is in or out.</p>
      </section>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button className={`chip shrink-0 ${!tag ? "bg-accent text-accent-ink" : ""}`} onClick={() => setTag(null)}>
          Everything
        </button>
        <button className={`chip shrink-0 ${tag === "indoors" ? "bg-accent text-accent-ink" : ""}`} aria-pressed={tag === "indoors"} onClick={() => setTag(tag === "indoors" ? null : "indoors")}>
          Mostly indoors
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
          <span>Bigger stamp, more we found. Tap a stamp to open the area.</span>
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
          <span className="eyebrow text-accent">Next</span>
          <span className="display text-[1.35rem] leading-tight">The route that came out of this, and why</span>
          <span className="text-sm text-ink-2">{plan ? `${new Set(plan.stays.map((s) => s.region)).size} bases over ${snapshot.trip.nights} nights, what each stop trades off, and what we could change.` : ""}</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-muted">
          →
        </span>
      </Link>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>Labels:</span>
        {statusesShown.map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: fitColor(s) }} />
            {fitLabel(s)}
          </span>
        ))}
      </p>

      {groups.map((g) => {
        const list = g.list.filter((r) => !highlight || highlight.has(r.id));
        if (!list.length) return null;
        return (
          <section key={g.k} className="grid gap-3" aria-label={g.label}>
            <p className="flex items-baseline gap-2">
              <span className="text-[1.35rem]">{g.label}</span> <span className="text-sm text-muted">{g.blurb}</span>
            </p>
            <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {list.map((r, i) => {
                const a = areaInfo(r.id);
                return (
                  <li key={r.id} className="w-[64%] shrink-0 snap-start sm:w-[36%] lg:w-[24%]">
                    <Link href={`/areas/${r.id}`} className="block no-underline">
                      <PlacePhoto placeId={a?.known_for.find((k) => k.place)?.place} regionId={r.id} className="hero-fade aspect-[4/5] rounded-2xl shadow-[var(--glow)]">
                        <span className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[0.68rem] font-bold text-white backdrop-blur">
                          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: fitColor(r.status) }} />
                          {g.k === "route" ? `Stop ${i + 1}` : fitLabel(r.status)}
                        </span>
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

      <WishBox targetId="trip" title="Something missing?" hint="A place you want to see, a thing you want to do, a worry. One line is enough; Pedro and Fernanda read them all." />

      <p className="text-sm text-muted">
        Everything here comes from nine research reports written in October 2026 and the route that followed; each area page links to its sources. <Link href="/plan">The full report</Link> · <Link href="/guide">How this app works</Link>
      </p>
    </Page>
  );
}
