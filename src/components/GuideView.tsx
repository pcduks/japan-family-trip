"use client";

import { useState } from "react";
import { GUIDES, WHO_LABEL } from "@/lib/guides";
import { mapsSearchUrl, youtubeSearchUrl } from "@/lib/links";

const FILTERS = [
  ["all", "All"],
  ["food", "Food"],
  ["night", "Night"],
  ["shopping", "Shopping"],
  ["culture", "Culture"],
  ["calm", "Parks & calm"],
  ["gems", "Hidden gems"],
];

/** The "Tokyo for Six" and "Kyoto for Six" guides, imported as data (F1a). */
export function GuideView({ city }: { city: "tokyo" | "kyoto" }) {
  const g = GUIDES[city];
  const [day, setDay] = useState(0);
  const [filter, setFilter] = useState("all");
  const map = (q: string) => mapsSearchUrl({ query: `${q}, ${g.mapSuffix}`, googlePlaceId: null });
  const d = g.days[day];

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4">
      <div>
        <p className="eyebrow">Our guide</p>
        <h1 className="text-3xl font-extrabold">{g.mapSuffix} for Six</h1>
        <p className="text-sm text-muted">
          Day plans with rest windows, the neighbourhoods worth your time, and nights out that work for six. Add any day to the itinerary
          from the Days tab.
        </p>
      </div>

      <section className="grid gap-3" aria-labelledby="gd-h">
        <h2 id="gd-h" className="text-xl font-extrabold">
          Day plans
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist">
          {g.days.map((x, i) => (
            <button
              key={x.title}
              role="tab"
              aria-selected={i === day}
              className="chip !h-auto !min-h-12 !py-1.5 !whitespace-normal text-left"
              onClick={() => setDay(i)}
            >
              <span>
                <span className="block font-mono text-[0.65rem] text-muted uppercase">{x.label}</span>
                <span className="text-sm">{x.title}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="card grid gap-2 p-4" role="tabpanel">
          <h3 className="text-lg font-extrabold">{d.title}</h3>
          <p className="text-sm text-muted">{d.summary}</p>
          <ol className="grid">
            {d.slots.map((s, i) => (
              <li key={i} className="grid grid-cols-[4rem_1fr] gap-3 border-t border-line py-3">
                <span className="font-mono text-sm">{s.time}</span>
                <div className="grid gap-1">
                  <p className="flex flex-wrap items-baseline gap-2">
                    <b>{s.title}</b>
                    {s.who !== "all" ? <span className={`tag ${s.who === "early" ? "!text-accent" : "!text-ok"}`}>{WHO_LABEL[s.who]}</span> : null}
                    {s.query ? (
                      <a href={map(s.query)} target="_blank" rel="noreferrer" className="text-xs underline">
                        Map
                      </a>
                    ) : null}
                  </p>
                  {s.text ? <p className="text-sm">{s.text}</p> : null}
                  {s.alt ? <p className="text-sm text-muted">{s.alt}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid gap-3" aria-labelledby="gn-h">
        <h2 id="gn-h" className="text-xl font-extrabold">
          Nights out
        </h2>
        <ul className="card divide-y divide-line">
          {g.nights.map((n) => (
            <li key={n.name} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <div>
                <p className="font-bold">{n.name}</p>
                <p className="font-mono text-xs text-muted">{n.fit}</p>
              </div>
              <p className="text-sm">
                {n.text}{" "}
                <a href={map(n.query)} target="_blank" rel="noreferrer" className="underline">
                  Map
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3" aria-labelledby="gh-h">
        <h2 id="gh-h" className="text-xl font-extrabold">
          Neighbourhoods
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter neighbourhoods">
          {FILTERS.map(([k, label]) => (
            <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {g.hoods
            .filter((h) => filter === "all" || h.tags.includes(filter))
            .map((h) => (
              <li key={h.name} className="card grid content-start gap-2 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-base font-extrabold">{h.name}</h3>
                  {h.flag ? <span className="tag !bg-accent !text-accent-ink">{g.flagLabel}</span> : null}
                </div>
                <p className="font-mono text-[0.7rem] tracking-wider text-muted uppercase">{h.area}</p>
                <p className="text-sm text-muted">{h.vibe}</p>
                <dl className="grid gap-1.5 text-sm">
                  {(
                    [
                      ["Do", h.do],
                      ["Eat & drink", h.eat],
                      ["Shop", h.shop],
                      ["For her", h.forHer],
                    ] as const
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="font-mono text-[0.65rem] tracking-wider text-muted uppercase">{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                </dl>
                <p className="flex gap-4 border-t border-line pt-2 text-sm">
                  <a href={map(h.query)} target="_blank" rel="noreferrer" className="underline">
                    Google Maps
                  </a>
                  <a href={youtubeSearchUrl(`${h.name.split(/ &|,/)[0]} ${g.mapSuffix} walk 4K`)} target="_blank" rel="noreferrer" className="underline">
                    Walking videos
                  </a>
                </p>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
