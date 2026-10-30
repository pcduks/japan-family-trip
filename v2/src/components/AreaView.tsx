"use client";

import Link from "next/link";
import { EkiStamp } from "./EkiStamp";
import { useState } from "react";
import foodGuide from "../../data/food-guide.json";
import why from "../../data/why.json";
import { areaIds, areaInfo, cardsFor, REGIONS, sourceHref, type CatalogCard } from "@/lib/areas";
import { fitLabel, regionColor } from "@/lib/colors";
import { placeGuide, REPUTATION_SHORT } from "@/lib/placesGuide";
import { exposure, EXPOSURE_LABEL } from "@/lib/exposure";
import { IDLE_LABEL, regionStayGuide, versionGuide } from "@/lib/guide";
import { PrefTally } from "./PlacePrefs";
import { WishBox } from "./WishBox";
import { fmtDay } from "@/lib/dates";
import { legBetween } from "@/lib/legs";
import { lodgingFor, TIER_LABEL } from "@/lib/lodging";
import type { Place } from "@/lib/types";
import { FoodCard } from "./Food";
import { PlacePhoto } from "./PlacePhoto";
import { useStore } from "./providers";
import { useFits } from "./useFits";
import { VerdictPill } from "./Verdict";
import { Back, Page, RegionDot, Section } from "./ui";

const FOOD_REGION: Record<string, string> = { tokyo: "tokyo", kanazawa: "kanazawa", shirakawago: "kanazawa", takayama: "takayama", gero: "takayama", okuhida: "takayama", kyoto: "kyoto", nara: "kyoto", kawaguchiko: "kawaguchiko", hakone: "hakone" };
const NOT_CHOSEN = (why as { not_chosen: { items: { region: string; why: string; comeback: string }[] } }).not_chosen.items;
const FOOD = foodGuide as unknown as { regions: Record<string, { title: string; dishes: string[]; intro: string; for_her: string; dates: string }> };
const SIZE_LABEL: Record<string, string> = { main: "Half a day", short: "An hour or two", day_trip: "Day trip", evening: "Evening", meal: "Meal" };

/** One area, the same shape whether it is in the route or not: known for, in our window, feel, getting there, what we would do, eat, sleep, for her, our verdict, sources. */
export function AreaView({ id }: { id: string }) {
  const { snapshot } = useStore();
  const fits = useFits();
  const region = snapshot.regions.find((r) => r.id === id);
  const a = areaInfo(id);
  if (!region || !a)
    return (
      <Page>
        <Back href="/places">Japan</Back>
        <p className="text-muted">No such area.</p>
      </Page>
    );
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const stays = plan?.stays.filter((s) => s.region === id) ?? [];
  const inRoute = stays.length > 0;
  const planStop = plan?.stays.findIndex((s) => s.region === id) ?? -1;
  const places = snapshot.places.filter((p) => p.region === id);
  const planned = new Map<string, string[]>();
  for (const d of snapshot.days) if (d.version_id === (plan?.id ?? "plan")) for (const it of d.items) if (it.place_id) planned.set(it.place_id, [...(planned.get(it.place_id) ?? []), d.date]);
  const mustVotes = snapshot.votes.filter((v) => v.kind === "mustdo").flatMap((v) => (v.value as { places?: string[] }).places ?? []);
  const sights = places.filter((p) => p.size !== "meal");
  const must = sights.filter((p) => (planned.has(p.id) && p.size === "main") || mustVotes.includes(p.id));
  const nice = sights.filter((p) => !must.includes(p) && (planned.has(p.id) || p.size === "main"));
  const maybe = sights.filter((p) => !must.includes(p) && !nice.includes(p));
  const meals = places.filter((p) => p.size === "meal");
  const cards = cardsFor(id);
  const verdict = NOT_CHOSEN.find((x) => x.region === id);
  const food = FOOD.regions[FOOD_REGION[id] ?? id];
  const lodging = lodgingFor(id);
  const fromTokyo = legBetween("tokyo", id, snapshot.regions);
  const prev = plan ? plan.stays[plan.stays.findIndex((s) => s.region === id) - 1] : undefined;
  const fromPrev = prev && prev.region !== "tokyo" ? legBetween(prev.region, id, snapshot.regions) : null;
  const sourceList = [...region.sources, ...places.map((p) => p.links?.source).filter((s): s is string => !!s), ...cards.map((c) => sourceHref(c.source)).filter((s): s is string => !!s)];
  const sourceHost = (s: string) => s.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  // One link per site, the first URL we met for it.
  const sources = Array.from(new Map(sourceList.map((s) => [sourceHost(s), s] as const).reverse()).values()).reverse();
  const herLabel = (p: Place) => (p.status === "avoid_for_her" ? "not for Fernanda" : p.effort_for_her === "high" ? "hard for Fernanda" : p.effort_for_her === "moderate" ? "moderate for Fernanda" : "easy for Fernanda");


  const v = a.verdict;
  const regionMeta = a.region ? REGIONS[a.region] : undefined;
  const nearby = a.region ? areaIds().filter((x) => x !== id && areaInfo(x)?.region === a.region && snapshot.regions.some((r) => r.id === x)) : [];
  const STATE_ORDER = ["route", "daytrip", "swap", "later"];
  nearby.sort((x, y) => STATE_ORDER.indexOf(fits.get(x)?.state ?? "later") - STATE_ORDER.indexOf(fits.get(y)?.state ?? "later"));
  // Worked out from the route as it is now; the words above it are ours.
  const fit = fits.get(id);
  const fitRoute = snapshot.versions.find((x) => x.status === "alternative" && x.stays.some((s) => s.region === id));
  const fitRouteName = fitRoute ? (versionGuide(fitRoute.id)?.theme ?? fitRoute.name) : null;
  const dayPicks = [...sights].sort((x, y) => (x.size === "main" ? 0 : 1) - (y.size === "main" ? 0 : 1)).slice(0, 3);

  return (
    <Page wide>
      <Back href="/places">Japan</Back>
      <PlacePhoto placeId={a.known_for.find((k) => k.place)?.place} regionId={id} className="hero-fade -mx-4 aspect-[4/3] sm:mx-0 sm:aspect-[5/2] sm:rounded-2xl sm:shadow-[var(--glow)]">
        <div className="absolute inset-x-4 bottom-4 z-10 grid gap-1 text-white">
          <p className="flex items-center gap-2 text-[0.72rem] font-semibold tracking-wide uppercase opacity-90">
            <RegionDot id={id} size={8} /> {a.prefecture}
            {regionMeta ? ` · ${regionMeta.name}` : ""}
          </p>
          <h1 className="display text-[2.4rem] leading-[0.98]">{region.name.replace(/ \(.*\)$/, "")}</h1>
          <p className="text-sm opacity-90">{a.do_line ?? region.summary}</p>
        </div>
      </PlacePhoto>

      <section className="card grid gap-2 p-4" aria-labelledby="for-us">
        <h2 id="for-us" className="eyebrow">
          Is it for us this trip?
        </h2>
        {v ? (
          <>
            <p className="flex flex-wrap items-center gap-2">
              <VerdictPill state={fit?.state ?? v.state} />
            </p>
            <p className="display text-[1.35rem] leading-tight">{v.headline}</p>
            <p className="max-w-prose text-ink-2">{v.text}</p>
            <p className="text-sm">
              <b>{fit?.fit === "route" ? "On the route: " : fit?.fit === "daytrip" ? "How: " : fit?.fit === "change" ? "What it would take: " : "Why not this time: "}</b>
              {fit?.line ?? v.fit}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
              {inRoute && planStop >= 0 ? <Link href={`/#stop-${planStop}`}>See those days on Trip →</Link> : null}
              {fitRoute && !inRoute ? <Link href={`/routes/${fitRoute.id}`}>See “{fitRouteName}” →</Link> : null}
            </div>
          </>
        ) : (
          <p className="text-ink-2">
            <b>{fitLabel(region.status)}.</b> {inRoute ? (plan && stayWhy(id)) ?? region.summary : (verdict?.why ?? region.fit ?? region.summary)}
          </p>
        )}
        {fit?.fit === "change" && plan ? (
          <Link href={`/build?add=${id}`} className="btn btn-sm justify-self-start no-underline">
            What would it take? →
          </Link>
        ) : null}
      </section>

      {id === "tokyo" ? (
        <Link href="/tokyo" className="card flex items-center gap-3 p-3 no-underline">
          <EkiStamp motif="tower" ink="var(--accent)" size={48} rotate={-8} label="" />
          <span className="min-w-0 flex-1">
            <span className="display block text-[1.25rem] leading-tight">Tokyo on foot</span>
            <span className="text-sm text-muted">Ten one-day walks through 28 neighbourhoods, on the map, pinned to our Tokyo days</span>
          </span>
          <span aria-hidden="true" className="text-xl text-muted">
            →
          </span>
        </Link>
      ) : null}

      <Section title="What people come for">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {a.known_for.map((k) => (
            <li key={k.title}>
              {k.place ? (
                <Link href={`/places/${k.place}`} className="block no-underline">
                  <PlacePhoto placeId={k.place} regionId={id} className="hero-fade aspect-square rounded-2xl">
                    <span className="absolute inset-x-2 bottom-2 z-10 display text-[1.05rem] leading-tight text-white">{k.title}</span>
                  </PlacePhoto>
                </Link>
              ) : (
                <div className="relative flex aspect-square items-end overflow-hidden rounded-2xl border border-line bg-bg-2 p-2" style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${regionColor(id)} 28%, var(--bg-2)), var(--bg-2) 70%)` }}>
                  <span aria-hidden="true" className="absolute top-2 right-2 h-3 w-3 rounded-full" style={{ background: regionColor(id) }} />
                  <span className="display text-[1.15rem] leading-tight">{k.title}</span>
                </div>
              )}
              <p className="pt-1.5 text-sm text-ink-2">{k.blurb}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="What it’s like">
        <p className="max-w-prose text-ink-2">{a.feel}</p>
        {region.videos[0] ? (
          <a href={region.videos[0]} target="_blank" rel="noreferrer" className="btn btn-sm justify-self-start">
            Watch a video
          </a>
        ) : null}
      </Section>

      {sights.length ? (
        inRoute ? (
          <Section title="What we’d do" aside={<Link href="/places/list">every place →</Link>}>
            <Tier title="Must do" blurb="worth building a day around" list={must} planned={planned} her={herLabel} />
            <Tier title="Nice to do" blurb="fits an afternoon" list={nice} planned={planned} her={herLabel} />
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-accent">{maybe.length} more, if there is time</summary>
              <div className="pt-2">
                <Tier title="Nice to have" blurb="if there is time" list={maybe} planned={planned} her={herLabel} />
              </div>
            </details>
          </Section>
        ) : (
          <Section title={v?.state === "later" ? "What people do here" : "A day here could look like"}>
            <Tier title={v?.state === "later" ? "The highlights" : "Three picks"} blurb="" list={dayPicks} planned={planned} her={herLabel} />
            {sights.length > dayPicks.length ? (
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold text-accent">All {sights.length} things to do here</summary>
                <div className="grid gap-2 pt-2">
                  <Tier title="Must do" blurb="worth building a day around" list={must} planned={planned} her={herLabel} />
                  <Tier title="Nice to do" blurb="fits an afternoon" list={nice} planned={planned} her={herLabel} />
                  <Tier title="Nice to have" blurb="if there is time" list={maybe} planned={planned} her={herLabel} />
                </div>
              </details>
            ) : null}
          </Section>
        )
      ) : null}

      {inRoute && (food || meals.length) ? (
        <Section title="Eat" aside={<Link href={`/food?region=${FOOD_REGION[id] ?? id}`}>the food page →</Link>}>
          {food ? (
            <>
              <ul className="flex flex-wrap gap-1.5">
                {food.dishes.map((d) => (
                  <li key={d} className="chip">
                    {d}
                  </li>
                ))}
              </ul>
              <p className="max-w-prose text-ink-2">{food.intro}</p>
            </>
          ) : null}
          {meals.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {meals.slice(0, 4).map((p) => (
                <FoodCard key={p.id} p={p} />
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {inRoute && lodging ? (
        <Section title="Sleep">
          <p className="max-w-prose text-ink-2">
            <b>{lodging.type === "rental" ? "A whole house" : lodging.type === "ryokan" ? "A ryokan" : "A hotel"}.</b> {lodging.why}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {lodging.candidates.slice(0, 2).map((c) => (
              <li key={c.name} className="card grid gap-0.5 p-3 text-sm">
                <span className="flex items-start justify-between gap-2">
                  <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold no-underline">
                    {c.name}
                  </a>
                  <span className="chip shrink-0">{TIER_LABEL[c.tier]}</span>
                </span>
                <span className="text-ink-2">{c.what}</span>
                <span>
                  <b>{c.price}</b>
                </span>
              </li>
            ))}
          </ul>
          {plan ? (
            <p className="text-sm">
              <Link href={planStop >= 0 ? `/#stop-${planStop}` : "/#stops"}>All the places to stay and booking links, on the route →</Link>
            </p>
          ) : null}
        </Section>
      ) : null}

      <p className="max-w-prose rounded-xl bg-bg-2 p-3 text-sm text-ink-2">
        <b className="text-ink">For Fernanda:</b> {a.for_her}
        {inRoute && food?.for_her ? ` ${food.for_her}` : ""}
      </p>

      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">The practical bits</summary>
        <div className="grid gap-4 pt-3 text-sm">
          <div className="grid gap-1.5">
            <b>Getting there</b>
            <p className="text-ink-2">{a.getting_there}</p>
            <p className="text-muted">
              From Tokyo about {fromTokyo.hours}{fromTokyo.curated ? "" : "~"} h ({fromTokyo.how.toLowerCase()}).
              {fromPrev && prev ? ` From ${snapshot.regions.find((r) => r.id === prev.region)?.name ?? prev.region} about ${fromPrev.hours} h (${fromPrev.how.toLowerCase()}).` : ""}
            </p>
          </div>
          <div className="grid gap-1.5">
            <b>In our dates, 20 Dec – 9 Jan</b>
            <ul className="grid gap-1.5 text-ink-2">
              {a.window.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    ●
                  </span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
          <StayLengths regionId={id} current={stays[0]?.nights ?? null} />
          {cards.length ? (
            <details className="rounded-xl bg-bg-2 p-3">
              <summary className="cursor-pointer font-semibold">{cards.length} more things to do here, with how each one suits Fernanda</summary>
              <ul className="grid gap-2 pt-2">
                {cards.map((c) => (
                  <CardRow key={c.id} c={c} />
                ))}
              </ul>
            </details>
          ) : null}
          <p className="text-xs text-muted">
            Read more:{" "}
            {sources.slice(0, 24).map((s, i) => (
              <span key={s}>
                {i ? " · " : ""}
                <a href={s} target="_blank" rel="noreferrer">
                  {sourceHost(s)}
                </a>
              </span>
            ))}
          </p>
        </div>
      </details>

      {nearby.length ? (
        <Section title={regionMeta ? `Nearby in ${regionMeta.name}` : "Nearby"}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {nearby.slice(0, 4).map((x) => {
              const ai = areaInfo(x)!;
              const r = snapshot.regions.find((rr) => rr.id === x)!;
              return (
                <li key={x}>
                  <Link href={`/areas/${x}`} className="card flex items-center gap-3 p-2 pr-3 no-underline">
                    <PlacePhoto placeId={ai.known_for.find((k) => k.place)?.place} regionId={x} className="h-14 w-14 shrink-0 rounded-xl" />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <b className="truncate text-ink">{r.name.replace(/ \(.*\)$/, "")}</b>
                      <span className="truncate text-xs text-muted">{ai.do_line ?? r.summary}</span>
                    </span>
                    {fits.get(x) ? <VerdictPill state={fits.get(x)!.state} small /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <WishBox targetId={id} title={`Something missing in ${region.name.replace(/ \(.*\)$/, "")}?`} />
    </Page>
  );
}

function stayWhy(id: string): string | null {
  const steps = (why as { route: { steps: { region: string; text: string }[] } }).route.steps;
  return steps.find((s) => s.region === id)?.text ?? null;
}

function Tier({ title, blurb, list, planned, her }: { title: string; blurb: string; list: Place[]; planned: Map<string, string[]>; her: (p: Place) => string }) {
  if (!list.length) return null;
  return (
    <div className="grid gap-1.5">
      <p className="flex items-baseline gap-2">
        <b>{title}</b> <span className="text-xs text-muted">{blurb}</span>
      </p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {list.map((p) => (
          <li key={p.id} className="card flex items-start gap-2 p-3 text-sm">
            <span className="min-w-0 flex-1">
              <Link href={`/places/${p.id}`} className="font-semibold no-underline">
                {p.name}
              </Link>
              {p.why ? <span className="block text-ink-2">{p.why}</span> : null}
              <span className="block text-xs text-muted">
                {SIZE_LABEL[p.size] ?? p.size} · {EXPOSURE_LABEL[exposure(p)].toLowerCase()} · {her(p)}
                {placeGuide(p.id) ? ` · ${REPUTATION_SHORT[placeGuide(p.id)!.reputation] ?? ""}` : ""}
                {planned.get(p.id)?.length ? ` · ${fmtDay(planned.get(p.id)![0])}` : ""}
              </span>
              <PrefTally placeId={p.id} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardRow({ c }: { c: CatalogCard }) {
  const href = sourceHref(c.source);
  const bump = c.bump == null ? "" : c.bump >= 4 ? "easy for Fernanda" : c.bump === 3 ? "ok for Fernanda" : "hard for Fernanda";
  return (
    <li className="grid gap-0.5 border-b border-rule pb-2 last:border-0">
      <span className="font-semibold">{c.name}</span>
      <span className="text-xs text-muted">
        {c.dates} · {c.ny} · {c.hours ? `${c.hours} h` : ""} {c.cost && c.cost !== "0" ? `· ¥${c.cost}` : "· free"} {bump ? `· ${bump}` : ""} {c.suits ? `· suits ${c.suits}` : ""}
        {href ? (
          <>
            {" · "}
            <a href={href} target="_blank" rel="noreferrer">
              source
            </a>
          </>
        ) : null}
      </span>
    </li>
  );
}

/** How long to stay here: what each length gives in our window, and the dates that change things. */
function StayLengths({ regionId, current }: { regionId: string; current: number | null }) {
  const g = regionStayGuide(regionId);
  const lengths = g ? Object.keys(g.nights).map(Number).sort((a, b) => a - b) : [];
  const [picked, setPicked] = useState<number | null>(null);
  if (!g || !lengths.length) return null;
  const n = picked ?? (current && lengths.includes(current) ? current : (lengths.find((x) => g.best?.startsWith(String(x))) ?? lengths[1] ?? lengths[0]));
  const e = g.nights[String(n)];
  return (
    <Section title="How long to stay">
      {g.best ? (
        <p className="text-sm text-ink-2">
          <b className="text-ink">Best:</b> {g.best}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-muted">Nights</span>
        <div className="seg" role="group" aria-label="Nights">
          {lengths.map((x) => (
            <button key={x} aria-pressed={x === n} onClick={() => setPicked(x)} aria-label={`${x} ${x === 1 ? "night" : "nights"}`} className="min-w-10">
              {x}
            </button>
          ))}
        </div>
      </div>
      {e ? (
        <div className="card grid gap-1.5 p-4 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <b>{n === current ? "As in the route" : `${n} ${n === 1 ? "night" : "nights"}`}</b>
            <span className={`chip ${e.idle === "real" ? "border-warn text-warn" : e.idle === "some" ? "text-muted" : "text-ok"}`}>{IDLE_LABEL[e.idle]}</span>
          </p>
          <p className="text-ink-2">{e.why}</p>
          <p className="text-ink-2">
            <b>One more night:</b> {e.longer}
          </p>
          <p className="text-ink-2">
            <b>One fewer:</b> {e.shorter}
          </p>
          <p className="text-muted">{e.note}</p>
        </div>
      ) : null}
      {g.date_notes?.length ? (
        <ul className="grid gap-1 text-sm text-ink-2">
          {g.date_notes.map((d) => (
            <li key={d} className="flex gap-2">
              <span aria-hidden="true" className="text-accent">
                ●
              </span>
              {d}
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
