import type { ReactNode } from "react";
import type { DeepCity, DeepTopic, Pregnancy } from "@/lib/foodDeep";

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q}, Japan`)}`;

const PREG: Record<Pregnancy, { label: string; cls: string }> = {
  ok: { label: "Fine for Fernanda", cls: "text-ok" },
  careful: { label: "Fernanda: with care", cls: "text-warn" },
  avoid: { label: "Fernanda: not this trip", cls: "text-danger" },
};

function Ja({ ja, romaji }: { ja?: string; romaji?: string }) {
  if (!ja && !romaji) return null;
  return (
    <span className="text-sm text-muted">
      {ja ? <span lang="ja">{ja}</span> : null}
      {ja && romaji ? " · " : null}
      {romaji ? <i>{romaji}</i> : null}
    </span>
  );
}

function Row({ k, children }: { k: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2 text-sm">
      <dt className="font-semibold text-muted">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Fold({ title, count, open = false, children }: { title: string; count?: number; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group grid gap-3">
      <summary className="flex cursor-pointer items-baseline justify-between gap-3 py-1">
        <h3 className="text-[1.25rem]">{title}</h3>
        <span className="text-sm text-muted">
          {count ? `${count} · ` : ""}
          <span className="group-open:hidden">show</span>
          <span className="hidden group-open:inline">hide</span>
        </span>
      </summary>
      <div className="grid gap-3 pt-2">{children}</div>
    </details>
  );
}

function Sources({ list }: { list?: string[] }) {
  if (!list?.length) return null;
  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer">Sources ({list.length})</summary>
      <ul className="mt-1 grid gap-0.5 break-all">
        {list.map((s) => (
          <li key={s}>{/^https?:/.test(s) ? <a href={s} target="_blank" rel="noreferrer">{s}</a> : s}</li>
        ))}
      </ul>
    </details>
  );
}

/** One city's deep food guide, rendered under its Food tab. */
export function DeepCityGuide({ city, heading = false }: { city: DeepCity; heading?: boolean }) {
  const dishes = [...(city.meibutsu ?? []).filter((m) => m.must), ...(city.meibutsu ?? []).filter((m) => !m.must)];
  const places = city.places ?? [];
  return (
    <section className="grid gap-4 border-t border-rule pt-4" aria-label={`The food guide: ${city.name}`}>
      {heading ? <h2 className="display text-[1.8rem] leading-none">{city.name}</h2> : null}
      {city.tagline ? <p className="text-[1.05rem] font-semibold text-ink-2">{city.tagline}</p> : null}

      {city.history?.length ? (
        <Fold title="Why they eat like this" open={!heading}>
          {city.history.map((p, i) => (
            <p key={i} className="max-w-prose leading-relaxed text-ink-2">
              {p}
            </p>
          ))}
          {city.winter ? (
            <p className="rounded-xl bg-bg-2 p-3 text-sm">
              <b>In winter: </b>
              {city.winter}
            </p>
          ) : null}
        </Fold>
      ) : null}

      {dishes.length ? (
        <Fold title="What to try" count={dishes.length} open>
          <ul className="grid gap-3 sm:grid-cols-2">
            {dishes.map((m) => (
              <li key={m.name} className="card grid content-start gap-1.5 p-4">
                <p className="flex flex-wrap items-baseline gap-2">
                  <b className="text-[1.05rem]">{m.name}</b>
                  {m.must ? <span className="chip">must</span> : null}
                </p>
                <Ja ja={m.name_ja} romaji={m.romaji} />
                <p className="text-sm text-ink-2">{m.what}</p>
                <dl className="grid gap-1">
                  <Row k="Where">{m.where}</Row>
                  <Row k="Price">{m.price}</Row>
                </dl>
                {m.pregnancy && m.pregnancy !== "ok" ? (
                  <p className={`text-sm ${PREG[m.pregnancy].cls}`}>
                    <b>{PREG[m.pregnancy].label}.</b> {m.pregnancy_note}
                  </p>
                ) : m.pregnancy_note ? (
                  <p className="text-sm text-ink-2">For Fernanda: {m.pregnancy_note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Fold>
      ) : null}

      {city.areas?.length ? (
        <Fold title="Markets and neighbourhoods" count={city.areas.length}>
          <ul className="grid gap-3">
            {city.areas.map((a) => (
              <li key={a.name} className="card grid gap-1.5 p-4">
                <p className="flex flex-wrap items-baseline gap-2">
                  <b className="text-[1.05rem]">{a.name}</b>
                  {a.kind ? <span className="chip">{a.kind}</span> : null}
                </p>
                <Ja ja={a.name_ja} />
                <p className="text-sm text-ink-2">{a.story}</p>
                {a.eat?.length ? (
                  <ul className="grid list-disc gap-0.5 pl-5 text-sm">
                    {a.eat.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                ) : null}
                <dl className="grid gap-1">
                  <Row k="Tip">{a.tips}</Row>
                  <Row k="Our dates">{a.dec_jan}</Row>
                </dl>
                {a.query ? (
                  <a href={maps(a.query)} target="_blank" rel="noreferrer" className="text-xs">
                    Map
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </Fold>
      ) : null}

      {places.length ? (
        <Fold title="Where to eat, checked on Tabelog" count={places.length} open={!heading}>
          <p className="text-sm text-muted">Scores from Tabelog, where Japanese diners rate (October 2026), backed by Japanese guides and awards. A critic you follow appears only when there is a link to show they went.</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {places.map((p) => (
              <li key={p.name} className="card grid content-start gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="grid">
                    <b className="text-[1.1rem] leading-tight">{p.name}</b>
                    <Ja ja={p.name_ja} />
                  </p>
                  {p.tabelog?.score ? (
                    <a href={p.tabelog.url} target="_blank" rel="noreferrer" className="chip shrink-0 no-underline" title="Tabelog score">
                      Tabelog <b>{p.tabelog.score.toFixed(2)}</b>
                    </a>
                  ) : null}
                </div>
                <p className="text-sm text-muted">{[p.genre, p.area, p.price].filter(Boolean).join(" · ")}</p>
                {p.tabelog?.awards ? <p className="text-sm">🏅 {p.tabelog.awards}</p> : null}
                {p.why ? <p className="text-sm text-ink-2">{p.why}</p> : null}
                <dl className="grid gap-1">
                  <Row k="Order">{p.order}</Row>
                  <Row k="Seven of us">{p.group}</Row>
                  <Row k="Booking">{p.booking}</Row>
                  <Row k="Our dates">{p.dec_jan}</Row>
                  {p.pregnancy_note ? (
                    <Row k="Fernanda">
                      <span className="text-warn">{p.pregnancy_note}</span>
                    </Row>
                  ) : null}
                </dl>
                {p.critics?.length ? (
                  <ul className="grid gap-1 rounded-xl bg-bg-2 p-2.5 text-sm">
                    {p.critics.map((c, i) => (
                      <li key={i}>
                        <b>{c.who}</b>
                        {c.note ? <span className="text-ink-2">: {c.note}</span> : null}{" "}
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-xs">
                            source
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {p.query ? (
                  <a href={maps(p.query)} target="_blank" rel="noreferrer" className="btn btn-sm justify-self-start">
                    Map
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </Fold>
      ) : null}

      {city.shops?.length ? (
        <Fold title="Shops, markets and tours" count={city.shops.length}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {city.shops.map((s) => (
              <li key={s.name} className="card grid content-start gap-1.5 p-4">
                <b>{s.name}</b>
                <Ja ja={s.name_ja} />
                <p className="text-sm text-ink-2">{s.what}</p>
                <dl className="grid gap-1">
                  <Row k="Buy">{s.buy}</Row>
                  <Row k="Price">{s.price}</Row>
                  <Row k="Our dates">{s.dec_jan}</Row>
                </dl>
                {s.query ? (
                  <a href={maps(s.query)} target="_blank" rel="noreferrer" className="text-xs">
                    Map
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </Fold>
      ) : null}

      <Sources list={city.sources} />
    </section>
  );
}

/** A how-to guide (calendar, depachika, station food, konbini, manners). */
export function DeepTopicGuide({ topic }: { topic: DeepTopic }) {
  return (
    <section className="grid gap-5" aria-labelledby={`topic-${topic.slug}`}>
      <h2 id={`topic-${topic.slug}`} className="display text-[2rem] leading-none">
        {topic.title}
      </h2>
      {topic.intro?.map((p, i) => (
        <p key={i} className="max-w-prose leading-relaxed text-ink-2">
          {p}
        </p>
      ))}
      {topic.sections.map((s, i) => (
        <Fold key={s.title} title={s.title} count={s.items?.length} open={i < 2}>
          {s.body ? <p className="max-w-prose text-ink-2">{s.body}</p> : null}
          {s.items?.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {s.items.map((it) => (
                <li key={it.name} className="card grid content-start gap-1.5 p-4">
                  <p className="flex flex-wrap items-baseline gap-2">
                    <b>{it.name}</b>
                    {it.must ? <span className="chip">must</span> : null}
                  </p>
                  <Ja ja={it.name_ja} />
                  {it.what ? <p className="text-sm text-ink-2">{it.what}</p> : null}
                  <dl className="grid gap-1">
                    <Row k="Where">{it.where}</Row>
                    <Row k="Price">{it.price}</Row>
                    <Row k="Tip">{it.tip}</Row>
                  </dl>
                  {it.pregnancy && it.pregnancy !== "ok" ? <p className={`text-sm font-semibold ${PREG[it.pregnancy].cls}`}>{PREG[it.pregnancy].label}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Fold>
      ))}
      <Sources list={topic.sources} />
    </section>
  );
}
