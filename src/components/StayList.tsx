"use client";

import { addDays, formatDay, isPeak } from "@/lib/trip";
import type { Place, Route } from "@/lib/types";

export function StayList({
  route,
  places,
  color,
  heartCount,
  selected,
  onSelect,
}: {
  route: Route;
  places: Map<string, Place>;
  color: string;
  heartCount: (placeId: string) => number;
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <section aria-labelledby="stays-h" className="grid gap-3">
      <h2 id="stays-h" className="text-lg font-extrabold">
        {route.isCandidate ? `Stays on route ${route.code}` : `Stays on ${route.name}`}
      </h2>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {route.stays.map((s, i) => {
          const p = places.get(s.place);
          if (!p) return null;
          const extras = [...s.via.map((v) => ({ slug: v, via: true })), ...s.daytrips.map((d) => ({ slug: d, via: false }))];
          const hearts = heartCount(p.id);
          return (
            <li key={s.id}>
              <div
                className="card grid h-full gap-1 p-3"
                style={{ borderLeft: `5px solid ${color}`, outline: selected === p.slug ? "2px solid var(--ink)" : undefined, outlineOffset: -1 }}
              >
                <button type="button" onClick={() => onSelect(p.slug)} className="grid gap-0.5 text-left">
                  <span className="font-mono text-xs text-muted">
                    {i + 1} · {formatDay(s.startDate)} – {formatDay(addDays(s.startDate, s.nights))} · {s.nights} night{s.nights > 1 ? "s" : ""}
                  </span>
                  <span className="text-base font-bold">
                    {p.name}
                    {hearts ? <span className="ml-2 text-sm font-medium text-accent">♥ {hearts}</span> : null}
                  </span>
                </button>
                {s.legNote ? (
                  <p className="text-sm text-muted">
                    {isPeak(s.startDate) && i > 0 ? <span className="mr-1 text-accent" title="Travel peak">▲</span> : null}
                    {s.legNote}
                  </p>
                ) : null}
                {extras.length ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {extras.map((x) => (
                      <button key={x.slug} type="button" className="chip !min-h-8 !px-2.5 !py-0.5 text-sm" onClick={() => onSelect(x.slug)}>
                        {x.via ? "On the way: " : "Day trip: "}
                        {places.get(x.slug)?.name ?? x.slug}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
