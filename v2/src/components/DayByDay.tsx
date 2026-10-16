"use client";

import Link from "next/link";
import { fmtDay } from "@/lib/dates";
import type { Day } from "@/lib/types";
import { useStore } from "./providers";
import { RegionDot } from "./ui";

const SLOT: Record<string, string> = { early: "dawn", morning: "morning", afternoon: "afternoon", evening: "evening", rest: "rest" };

export function DayByDay({ days }: { days: Day[] }) {
  const { snapshot } = useStore();
  const plan = snapshot.versions.find((v) => v.id === days[0]?.version_id);
  const baseOn = (date: string) => plan?.stays.find((s) => s.from <= date && s.to > date)?.region ?? plan?.stays[plan.stays.length - 1]?.region;
  return (
    <ol className="grid gap-2">
      {days.map((d) => {
        const base = baseOn(d.date);
        const region = snapshot.regions.find((r) => r.id === base);
        const kind = d.kind ?? "";
        const tone = /move/i.test(kind) ? "text-info" : /easy|free|arrive|fly/i.test(kind) ? "text-ok" : "text-ink";
        return (
          <li key={d.date} className="card grid gap-1.5 p-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <b className="shrink-0">{fmtDay(d.date)}</b>
              {region ? (
                <span className="flex items-center gap-1 text-sm text-muted">
                  <RegionDot id={region.id} size={8} /> {region.name}
                </span>
              ) : null}
              {kind ? <span className={`chip ${tone}`}>{kind}</span> : null}
            </div>
            {d.title ? <p className="text-ink-2">{d.title}</p> : null}
            {d.items.length ? (
              <ul className="flex flex-wrap gap-1.5 pt-0.5">
                {d.items.map((it, i) => {
                  const p = it.place_id ? snapshot.places.find((x) => x.id === it.place_id) : null;
                  const label = p?.name ?? it.note ?? "";
                  const crew = it.crew === "early" ? " · early start, optional" : it.crew === "easy" ? " · easy option" : "";
                  const cls = `chip ${it.crew === "early" ? "border-info/50" : it.crew === "easy" ? "border-ok/50" : ""}`;
                  return p ? (
                    <Link key={i} href={`/places/${p.id}`} className={`${cls} no-underline`} title={it.note ?? undefined}>
                      {SLOT[it.slot]} · {label}
                      {crew}
                    </Link>
                  ) : (
                    <span key={i} className={`${cls} text-muted`}>
                      {SLOT[it.slot]} · {label}
                      {crew}
                    </span>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
