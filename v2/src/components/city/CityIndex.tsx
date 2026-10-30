"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LAYER_INK, LAYER_LABEL, allPins, cityDays, thePlan, type Layer } from "@/lib/city";
import { fmtRange } from "@/lib/dates";
import { kanji } from "@/lib/journey";
import { useStore } from "../providers";
import { RegionCover } from "../RegionCover";
import { LayerDot } from "./bits";

/** The route's stops as postcards: one city page each, with what we know about it. */
export function CityIndex() {
  const { snapshot } = useStore();
  const plan = thePlan(snapshot);
  const stops = useMemo(() => {
    const out: { region: string; stop: number; ranges: { from: string; to: string }[] }[] = [];
    for (const s of plan?.stays ?? []) {
      const have = out.find((o) => o.region === s.region);
      if (have) have.ranges.push({ from: s.from, to: s.to });
      else out.push({ region: s.region, stop: out.length + 1, ranges: [{ from: s.from, to: s.to }] });
    }
    return out;
  }, [plan]);
  const ours = snapshot.tips.length + snapshot.food_list.length;
  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 pt-3 pb-8">
      <header className="grid gap-1.5">
        <p className="eyebrow">One page per stop</p>
        <h1 className="display text-[2.1rem] leading-[1.05]">Our cities</h1>
        <p className="max-w-2xl text-ink-2">
          Everything we know about each place on one map: the plan’s days, the walks, the food guide, and what the family saved and dropped. Tap a place for where it fits and when it goes.{ours ? ` ${ours} of the pins are ours so far.` : ""}
        </p>
      </header>
      <ol className="grid gap-4 sm:grid-cols-2">
        {stops.map((s) => (
          <li key={s.region}>
            <StopCard region={s.region} stop={s.stop} ranges={s.ranges} />
          </li>
        ))}
      </ol>
      {!stops.length ? <p className="rounded-2xl border border-dashed border-rule p-5 text-center text-muted">The route has no stops yet.</p> : null}
    </main>
  );
}

function StopCard({ region, stop, ranges }: { region: string; stop: number; ranges: { from: string; to: string }[] }) {
  const { snapshot } = useStore();
  const name = snapshot.regions.find((r) => r.id === region)?.name ?? region;
  const pins = useMemo(() => allPins(region, snapshot, snapshot.tips), [region, snapshot]);
  const days = useMemo(() => cityDays(region, snapshot).length, [region, snapshot]);
  const layers = (["plan", "walk", "guide", "ours"] as Layer[]).map((l) => [l, pins.filter((p) => p.layer === l).length] as const).filter(([, n]) => n > 0);
  const jp = kanji(region);
  return (
    <Link href={`/city/${region}`} className="card block overflow-hidden no-underline">
      <RegionCover regionId={region} className="aspect-[16/9]" position="center 65%" sizes="(max-width: 640px) 100vw, 400px">
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-x-4 bottom-3 text-white">
          <p className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase opacity-90">
            Stop {stop} · {ranges.map((r) => fmtRange(r.from, r.to)).join(" and ")}
          </p>
          <p className="flex items-baseline gap-2">
            <span className="display text-[1.8rem] leading-tight">{name}</span>
            {jp ? <span className="jp text-[1.05rem] opacity-90">{jp}</span> : null}
          </p>
        </div>
      </RegionCover>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
        <span className="text-ink-2">
          {days} {days === 1 ? "day" : "days"} · {pins.length} places
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted">
          {layers.map(([l, n]) => (
            <span key={l} className="inline-flex items-center gap-1" title={LAYER_LABEL[l]} style={l === "ours" ? { color: LAYER_INK.ours, fontWeight: 700 } : undefined}>
              <LayerDot layer={l} size={8} /> {n}
            </span>
          ))}
        </span>
      </div>
    </Link>
  );
}
