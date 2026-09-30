"use client";

import { formatDay, inClosureZone, isPeak, stayOnNight, tripDates, weekday } from "@/lib/trip";
import type { Place, Route } from "@/lib/types";

/** P1.6: 20 Dec – 9 Jan with the New Year closure zone and travel peaks. */
export function CalendarStrip({
  route,
  places,
  color,
  onColor,
  onSelect,
}: {
  route: Route;
  places: Map<string, Place>;
  color: string;
  onColor: string;
  onSelect: (slug: string) => void;
}) {
  const dates = tripDates();
  return (
    <section aria-labelledby="cal-h" className="card grid gap-3 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="cal-h" className="text-[1.5rem]">
          Noite a noite
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded-sm" style={{ background: "var(--closure)", outline: "1px dashed var(--accent)" }} />
            Fechado no Ano-Novo
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-accent">▲</span> Pico de viagem
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">→</span> Dia de mudar
          </li>
        </ul>
      </div>
      <ol className="no-scrollbar -mx-4 flex snap-x gap-1 overflow-x-auto px-4 pb-1" aria-label="Calendário da viagem">
        {dates.map((d, i) => {
          const stay = stayOnNight(route, d);
          const place = stay ? places.get(stay.place) : null;
          const moving = stay ? stay.startDate === d && i > 0 : i === dates.length - 1;
          const peak = isPeak(d);
          const closure = inClosureZone(d);
          const label = [
            `${weekday(d)} ${formatDay(d)}`,
            place ? `noite em ${place.name}` : "voo para casa",
            moving ? "dia de mudar" : "",
            peak ? "pico de viagem" : "",
            closure ? "fechado no Ano-Novo" : "",
          ]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={d} className="snap-start">
              <button
                type="button"
                aria-label={label}
                title={label}
                onClick={() => place && onSelect(place.slug)}
                className="grid w-[4.25rem] gap-1 rounded-xl border border-rule p-1.5 text-left"
                style={{ background: closure ? "var(--closure)" : "var(--card)", borderStyle: closure ? "dashed" : "solid" }}
              >
                <span className="flex items-center justify-between font-mono text-[0.68rem] text-muted">
                  {weekday(d)}
                  {peak ? <span className="text-accent" aria-hidden="true">▲</span> : null}
                </span>
                <span className="font-display text-lg leading-none">{formatDay(d)}</span>
                <span
                  className="truncate rounded px-1 text-[0.7rem] leading-5 font-medium"
                  style={place ? { background: color, color: onColor } : { background: "var(--soft)" }}
                >
                  {moving ? "→ " : ""}
                  {place ? place.name.replace(/ \(.*\)$/, "").replace(/^Lake /, "") : "✈ Casa"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
