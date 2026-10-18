import Link from "next/link";
import type { ReactNode } from "react";
import { mapsSearchUrl } from "@/lib/links";
import type { FoodCity, FoodPlace, FoodTopic, Meibutsu, Pregnancy, TopicItem } from "@/lib/foodGuide/types";
import { PageHeader, Pill } from "./ui";

const PREG_LABEL: Record<Pregnancy, string> = { ok: "Ok na gravidez", cuidado: "Gravidez: cuidado", evitar: "Gravidez: evitar" };
const PREG_TONE = { ok: "ok", cuidado: "warn", evitar: "accent" } as const;

const maps = (query: string) => mapsSearchUrl({ query, googlePlaceId: null });

function Jp({ ja, romaji }: { ja?: string; romaji?: string }) {
  if (!ja && !romaji) return null;
  return (
    <span className="text-sm text-muted">
      {ja ? <span lang="ja">{ja}</span> : null}
      {ja && romaji ? " · " : null}
      {romaji ? <i>{romaji}</i> : null}
    </span>
  );
}

function Preg({ p, note }: { p?: Pregnancy; note?: string }) {
  if (!p || p === "ok") return note ? <p className="text-sm text-ink-2">🤰 {note}</p> : null;
  return (
    <p className="flex flex-wrap items-baseline gap-2 text-sm">
      <Pill tone={PREG_TONE[p]}>{PREG_LABEL[p]}</Pill>
      {note ? <span className="text-ink-2">{note}</span> : null}
    </p>
  );
}

function Line({ label, children }: { label: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="text-sm">
      <b className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">{label}</b> <span className="text-ink-2">{children}</span>
    </p>
  );
}

function Jump({ links }: { links: [string, string, number][] }) {
  const shown = links.filter(([, , n]) => n > 0);
  if (shown.length < 2) return null;
  return (
    <nav aria-label="Seções" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
      {shown.map(([id, label, n]) => (
        <a key={id} href={`#${id}`} className="chip shrink-0 no-underline">
          {label} <span className="font-mono text-xs opacity-70">{n}</span>
        </a>
      ))}
    </nav>
  );
}

function Back() {
  return (
    <Link href="/comida" className="text-sm no-underline">
      ← Guia de comida
    </Link>
  );
}

function Sources({ list }: { list?: string[] }) {
  if (!list?.length) return null;
  return (
    <details className="text-sm text-muted">
      <summary className="cursor-pointer">Fontes ({list.length})</summary>
      <ul className="mt-2 grid gap-1 break-all">
        {list.map((s) => (
          <li key={s}>{/^https?:/.test(s) ? <a href={s} target="_blank" rel="noreferrer">{s}</a> : s}</li>
        ))}
      </ul>
    </details>
  );
}

function MeibutsuCard({ m }: { m: Meibutsu }) {
  return (
    <li className="card grid gap-1.5 p-4">
      <p className="flex flex-wrap items-baseline gap-2">
        <b className="font-display text-[1.35rem] leading-tight">{m.name_pt}</b>
        {m.must ? <Pill tone="accent">Imperdível</Pill> : null}
      </p>
      <Jp ja={m.name_ja} romaji={m.romaji} />
      <p className="text-[0.98rem]">{m.what_pt}</p>
      <Line label="Onde">{m.where_pt}</Line>
      <Line label="Quanto">{m.price_pt}</Line>
      <Preg p={m.pregnancy} note={m.pregnancy_pt} />
    </li>
  );
}

function TabelogBadge({ t }: { t: FoodPlace["tabelog"] }) {
  if (!t?.score) return null;
  const body = (
    <span className="inline-flex items-baseline gap-1 rounded-md border border-rule px-2 py-0.5 font-mono text-sm" title="Nota no Tabelog">
      <span className="text-[0.65rem] uppercase text-muted">Tabelog</span>
      <b>{t.score.toFixed(2)}</b>
      {t.reviews ? <span className="text-xs text-muted">({t.reviews.toLocaleString("pt-BR")})</span> : null}
    </span>
  );
  return t.url ? (
    <a href={t.url} target="_blank" rel="noreferrer" className="no-underline">
      {body}
    </a>
  ) : (
    body
  );
}

function PlaceCard({ p }: { p: FoodPlace }) {
  return (
    <li className="card grid gap-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="grid">
          <b className="font-display text-[1.35rem] leading-tight">{p.name}</b>
          <Jp ja={p.name_ja} />
        </p>
        <TabelogBadge t={p.tabelog} />
      </div>
      <p className="text-sm text-muted">{[p.genre_pt, p.area, p.price_pt].filter(Boolean).join(" · ")}</p>
      {p.tabelog?.awards ? <p className="text-sm">🏅 {p.tabelog.awards}</p> : null}
      {p.why_pt ? <p className="text-[0.98rem]">{p.why_pt}</p> : null}
      <Line label="Peça">{p.order_pt}</Line>
      {p.critics?.length ? (
        <ul className="grid gap-1">
          {p.critics.map((c, i) => (
            <li key={i} className="text-sm">
              <b>{c.who}</b>
              {c.note_pt ? <span className="text-ink-2">: {c.note_pt}</span> : null}{" "}
              {c.url ? (
                <a href={c.url} target="_blank" rel="noreferrer" className="text-xs">
                  fonte
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Grupo, reserva, gravidez e fim de ano</summary>
        <div className="mt-2 grid gap-1.5">
          <Line label="Grupo de 6">{p.group_pt}</Line>
          <Line label="Reserva">{p.booking_pt}</Line>
          <Line label="Dez–jan">{p.dec_jan_pt}</Line>
          {p.pregnancy_pt ? <p className="text-ink-2">🤰 {p.pregnancy_pt}</p> : null}
        </div>
      </details>
      {p.query ? (
        <a href={maps(p.query)} target="_blank" rel="noreferrer" className="text-sm">
          Abrir no mapa
        </a>
      ) : null}
    </li>
  );
}

export function FoodCityView({ city }: { city: FoodCity }) {
  const m = city.meibutsu ?? [];
  const must = [...m.filter((x) => x.must), ...m.filter((x) => !x.must)];
  const areas = city.areas ?? [];
  const places = city.places ?? [];
  const shops = city.shops ?? [];

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      <div className="grid gap-3">
        <Back />
        <PageHeader eyebrow="Guia de comida" title={city.name} hand={city.tagline_pt} />
        <Jump
          links={[
            ["historia", "História", city.history_pt?.length ?? 0],
            ["pratos", "O que provar", m.length],
            ["lugares", "Bairros e mercados", areas.length],
            ["restaurantes", "Restaurantes", places.length],
            ["lojas", "Lojas", shops.length],
          ]}
        />
      </div>

      {city.history_pt?.length ? (
        <section id="historia" className="grid gap-3">
          <h2 className="text-[1.75rem]">Por que se come assim aqui</h2>
          {city.history_pt.map((p, i) => (
            <p key={i} className="text-[1.02rem] leading-relaxed">
              {p}
            </p>
          ))}
          {city.winter_pt ? (
            <p className="card-flat rounded-lg p-3 text-[0.98rem]">
              <b>No inverno: </b>
              {city.winter_pt}
            </p>
          ) : null}
        </section>
      ) : null}

      {must.length ? (
        <section id="pratos" className="grid gap-3">
          <h2 className="text-[1.75rem]">O que provar</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {must.map((x) => (
              <MeibutsuCard key={x.name_pt} m={x} />
            ))}
          </ul>
        </section>
      ) : null}

      {areas.length ? (
        <section id="lugares" className="grid gap-3">
          <h2 className="text-[1.75rem]">Bairros, mercados e ruas</h2>
          <ul className="grid gap-3">
            {areas.map((a) => (
              <li key={a.name} className="card grid gap-2 p-4">
                <p className="flex flex-wrap items-baseline gap-2">
                  <b className="font-display text-[1.35rem] leading-tight">{a.name}</b>
                  {a.kind ? <Pill>{a.kind}</Pill> : null}
                </p>
                <Jp ja={a.name_ja} />
                <p className="text-[0.98rem]">{a.story_pt}</p>
                {a.eat_pt?.length ? (
                  <ul className="grid list-disc gap-1 pl-5 text-[0.95rem]">
                    {a.eat_pt.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                ) : null}
                <Line label="Dica">{a.tips_pt}</Line>
                <Line label="Dez–jan">{a.dec_jan_pt}</Line>
                {a.query ? (
                  <a href={maps(a.query)} target="_blank" rel="noreferrer" className="text-sm">
                    Abrir no mapa
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {places.length ? (
        <section id="restaurantes" className="grid gap-3">
          <h2 className="text-[1.75rem]">Onde comer</h2>
          <p className="text-sm text-muted">Validados no Tabelog (nota de outubro de 2026) e por fontes japonesas; os críticos que você segue aparecem quando foram lá.</p>
          <ul className="grid gap-3">
            {places.map((p) => (
              <PlaceCard key={p.name} p={p} />
            ))}
          </ul>
        </section>
      ) : null}

      {shops.length ? (
        <section id="lojas" className="grid gap-3">
          <h2 className="text-[1.75rem]">Lojas e passeios</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {shops.map((s) => (
              <li key={s.name} className="card grid gap-1.5 p-4">
                <b className="font-display text-[1.25rem] leading-tight">{s.name}</b>
                <Jp ja={s.name_ja} />
                <p className="text-[0.95rem]">{s.what_pt}</p>
                <Line label="Leve">{s.buy_pt}</Line>
                <Line label="Quanto">{s.price_pt}</Line>
                <Line label="Dez–jan">{s.dec_jan_pt}</Line>
                {s.query ? (
                  <a href={maps(s.query)} target="_blank" rel="noreferrer" className="text-sm">
                    Abrir no mapa
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Sources list={city.sources} />
    </main>
  );
}

function TopicItemCard({ it }: { it: TopicItem }) {
  return (
    <li className="card grid gap-1.5 p-4">
      <p className="flex flex-wrap items-baseline gap-2">
        <b className="font-display text-[1.25rem] leading-tight">{it.name}</b>
        {it.must ? <Pill tone="accent">Imperdível</Pill> : null}
      </p>
      <Jp ja={it.name_ja} />
      {it.what_pt ? <p className="text-[0.95rem]">{it.what_pt}</p> : null}
      <Line label="Onde">{it.where_pt}</Line>
      <Line label="Quanto">{it.price_pt}</Line>
      <Line label="Dica">{it.tip_pt}</Line>
      <Preg p={it.pregnancy} />
    </li>
  );
}

export function FoodTopicView({ topic }: { topic: FoodTopic }) {
  const ids = topic.sections.map((_, i) => `s${i}`);
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      <div className="grid gap-3">
        <Back />
        <PageHeader eyebrow="Guia de comida" title={topic.title_pt} />
        {topic.intro_pt?.map((p, i) => (
          <p key={i} className="text-[1.02rem] leading-relaxed">
            {p}
          </p>
        ))}
        <Jump links={topic.sections.map((s, i) => [ids[i], s.title_pt, s.items?.length || 1] as [string, string, number])} />
      </div>
      {topic.sections.map((s, i) => (
        <section key={s.title_pt} id={ids[i]} className="grid gap-3">
          <h2 className="text-[1.6rem] leading-tight">{s.title_pt}</h2>
          {s.body_pt ? <p className="text-[1.02rem] leading-relaxed">{s.body_pt}</p> : null}
          {s.items?.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {s.items.map((it) => (
                <TopicItemCard key={it.name} it={it} />
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <Sources list={topic.sources} />
    </main>
  );
}
