"use client";

import { useState } from "react";
import { GUIDES, type GuideSlot } from "@/lib/guides";
import { mapsSearchUrl, youtubeSearchUrl } from "@/lib/links";
import { placeStamp } from "@/lib/stamps";
import { EkiStamp } from "./EkiStamp";
import { PageHeader, Pill } from "./ui";

const WHO_PT: Record<GuideSlot["who"], string> = { all: "Todos", early: "Turma da madrugada", bump: "Opção tranquila" };
const TIME_PT: Record<string, string> = { Morning: "Manhã", Afternoon: "Tarde", Evening: "Noite" };

const FILTERS = [
  ["all", "Todos"],
  ["food", "Comida"],
  ["night", "Noite"],
  ["shopping", "Compras"],
  ["culture", "Cultura"],
  ["calm", "Parques e calma"],
  ["gems", "Joias escondidas"],
];

/** The "Tokyo for Six" and "Kyoto for Six" guides, imported as data (F1a). */
export function GuideView({ city }: { city: "tokyo" | "kyoto" }) {
  const g = GUIDES[city];
  const [day, setDay] = useState(0);
  const [filter, setFilter] = useState("all");
  const map = (q: string) => mapsSearchUrl({ query: `${q}, ${g.mapSuffix}`, googlePlaceId: null });
  const d = g.days[day];
  const st = placeStamp(city);

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-5 pb-12">
      <div className="grid gap-3">
        <div className="flex items-end justify-between gap-3">
          <PageHeader eyebrow="Nosso guia" title={<>{g.mapSuffix}<br />para seis</>} />
          <EkiStamp motif={st.motif} ink={st.ink} top={g.mapSuffix} bottom="Guia · 2026" size={88} rotate={7} seed={city.length} label="" />
        </div>
        <p className="text-[1.02rem] text-ink-2">
          Roteiros com pausas para descanso, os bairros que valem o tempo e noites que funcionam para seis. Qualquer dia daqui entra no
          plano pela aba Dias.
        </p>
      </div>

      <section className="grid gap-3" aria-labelledby="gd-h">
        <h2 id="gd-h" className="text-[1.9rem]">
          Roteiros do dia
        </h2>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="tablist">
          {g.days.map((x, i) => (
            <button
              key={x.title}
              role="tab"
              aria-selected={i === day}
              className="chip !h-auto !min-h-12 max-w-[15rem] shrink-0 !py-1.5 !whitespace-normal text-left"
              onClick={() => setDay(i)}
            >
              <span>
                <span className="block font-mono text-[0.65rem] uppercase opacity-70">{x.label}</span>
                <span className="text-sm">{x.title}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="card grid gap-2 p-4" role="tabpanel">
          <p className="eyebrow">{d.label}</p>
          <h3 className="font-display text-[1.6rem] leading-tight">{d.title}</h3>
          <p className="text-sm text-ink-2">{d.summary}</p>
          <ol className="grid">
            {d.slots.map((s, i) => (
              <li key={i} className="grid grid-cols-[3.4rem_minmax(0,1fr)] gap-3 border-t border-dashed border-rule py-3">
                <span className="font-mono text-sm">{TIME_PT[s.time] ?? s.time}</span>
                <div className="grid gap-1">
                  <p className="flex flex-wrap items-baseline gap-2">
                    <b>{s.title}</b>
                    {s.who !== "all" ? <Pill tone={s.who === "early" ? "accent" : "ok"}>{WHO_PT[s.who]}</Pill> : null}
                    {s.query ? (
                      <a href={map(s.query)} target="_blank" rel="noreferrer" className="text-xs underline">
                        Mapa
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
        <h2 id="gn-h" className="text-[1.9rem]">
          Para sair à noite
        </h2>
        <ul className="card divide-y divide-rule">
          {g.nights.map((n) => (
            <li key={n.name} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <div>
                <p className="font-display text-[1.35rem] leading-tight">{n.name}</p>
                <p className="font-mono text-xs text-muted">{n.fit}</p>
              </div>
              <p className="text-sm">
                {n.text}{" "}
                <a href={map(n.query)} target="_blank" rel="noreferrer" className="underline">
                  Mapa
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3" aria-labelledby="gh-h">
        <h2 id="gh-h" className="text-[1.9rem]">
          Bairros
        </h2>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Filtrar bairros">
          {FILTERS.map(([k, label]) => (
            <button key={k} className="chip shrink-0" aria-pressed={filter === k} onClick={() => setFilter(k)}>
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
                  <h3 className="font-display text-[1.45rem] leading-tight">{h.name}</h3>
                  {h.flag ? <Pill tone="accent">{g.flagLabel}</Pill> : null}
                </div>
                <p className="eyebrow">{h.area}</p>
                <p className="text-sm text-muted">{h.vibe}</p>
                <dl className="grid gap-1.5 text-sm">
                  {(
                    [
                      ["O que fazer", h.do],
                      ["Comer e beber", h.eat],
                      ["Compras", h.shop],
                      ["Para ela", h.forHer],
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
                <p className="flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-rule pt-2 text-sm">
                  <a href={map(h.query)} target="_blank" rel="noreferrer" className="underline">
                    Google Maps
                  </a>
                  <a href={youtubeSearchUrl(`${h.name.split(/ &|,/)[0]} ${g.mapSuffix} walk 4K`)} target="_blank" rel="noreferrer" className="underline">
                    Vídeos de caminhada
                  </a>
                </p>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
