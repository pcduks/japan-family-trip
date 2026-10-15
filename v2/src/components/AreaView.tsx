"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import foodGuide from "../../data/food-guide.json";
import why from "../../data/why.json";
import { areaInfo, cardsFor, sourceHref, type CatalogCard } from "@/lib/areas";
import { fitLabel, regionColor } from "@/lib/colors";
import { fmtDay } from "@/lib/dates";
import { legBetween } from "@/lib/legs";
import { lodgingFor, TIER_LABEL } from "@/lib/lodging";
import { suggestNights } from "@/lib/nights";
import type { Pace, Place } from "@/lib/types";
import { swapInRegion } from "@/lib/versions";
import { FoodCard } from "./Food";
import { JapanMap } from "./JapanMap";
import { PlacePhoto } from "./PlacePhoto";
import { useStore } from "./providers";
import { Back, Page, RegionDot, Section } from "./ui";

const FOOD_REGION: Record<string, string> = { tokyo: "tokyo", kanazawa: "kanazawa", shirakawago: "kanazawa", takayama: "takayama", gero: "takayama", okuhida: "takayama", kyoto: "kyoto", nara: "kyoto", hakone: "hakone", kawaguchiko: "hakone" };
const NOT_CHOSEN = (why as { not_chosen: { items: { region: string; why: string; comeback: string }[] } }).not_chosen.items;
const FOOD = foodGuide as unknown as { regions: Record<string, { title: string; dishes: string[]; intro: string; for_her: string; dates: string }> };
const SIZE_LABEL: Record<string, string> = { main: "Main outing", short: "Short visit", day_trip: "Day trip", evening: "Evening", meal: "Meal" };

/** One area, the same shape whether it is in the route or not: known for, in our window, feel, getting there, what we would do, eat, sleep, for her, our verdict, sources. */
export function AreaView({ id }: { id: string }) {
  const { snapshot, me, saveVersion } = useStore();
  const router = useRouter();
  const region = snapshot.regions.find((r) => r.id === id);
  const a = areaInfo(id);
  const [pace, setPace] = useState<Pace>("balanced");
  const [trying, setTrying] = useState(false);
  if (!region || !a)
    return (
      <Page>
        <Back href="/">Explore</Back>
        <p className="text-muted">No such area.</p>
      </Page>
    );
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const stays = plan?.stays.filter((s) => s.region === id) ?? [];
  const inRoute = stays.length > 0;
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
  const alt = snapshot.versions.find((v) => v.status === "alternative" && v.stays.some((s) => s.region === id) && !inRoute);
  const food = FOOD.regions[FOOD_REGION[id] ?? id];
  const lodging = lodgingFor(id);
  const fromTokyo = legBetween("tokyo", id, snapshot.regions);
  const prev = plan ? plan.stays[plan.stays.findIndex((s) => s.region === id) - 1] : undefined;
  const fromPrev = prev && prev.region !== "tokyo" ? legBetween(prev.region, id, snapshot.regions) : null;
  const nights = suggestNights(region, pace, snapshot.places, snapshot.pace, stays[0] ?? null, mustVotes.filter((m) => places.some((p) => p.id === m)));
  const sourceList = [...region.sources, ...places.map((p) => p.links?.source).filter((s): s is string => !!s), ...cards.map((c) => sourceHref(c.source)).filter((s): s is string => !!s)];
  const sourceHost = (s: string) => s.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  // One link per site, the first URL we met for it.
  const sources = Array.from(new Map(sourceList.map((s) => [sourceHost(s), s] as const).reverse()).values()).reverse();
  const herLabel = (p: Place) => (p.status === "avoid_for_her" ? "not for her" : p.effort_for_her === "high" ? "hard for her" : p.effort_for_her === "moderate" ? "moderate for her" : "easy for her");

  async function tryIt() {
    if (!plan || !me) return;
    setTrying(true);
    const { version } = swapInRegion(plan, region!, snapshot.versions, me.travellerId, snapshot.trip.start);
    await saveVersion(version);
    router.push(`/versions/${version.id}#stops`);
  }

  return (
    <Page wide>
      <Back href="/">Explore</Back>
      <PlacePhoto placeId={a.known_for.find((k) => k.place)?.place} regionId={id} className="hero-fade -mx-4 aspect-[4/3] sm:mx-0 sm:aspect-[5/2] sm:rounded-2xl sm:shadow-[var(--glow)]">
        <div className="absolute inset-x-4 bottom-4 z-10 grid gap-1 text-white">
          <p className="flex items-center gap-2 text-[0.72rem] font-semibold tracking-wide uppercase opacity-90">
            <RegionDot id={id} size={8} /> {a.prefecture}
          </p>
          <h1 className="display text-[2.4rem] leading-[0.98]">{region.name.replace(/ \(.*\)$/, "")}</h1>
          <p className="text-sm opacity-90">{region.summary}</p>
        </div>
      </PlacePhoto>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="chip" style={{ borderColor: "var(--accent)" }}>
          {fitLabel(region.status)}
          {inRoute ? ` · ${stays.reduce((n, s) => n + s.nights, 0)} nights` : ""}
        </span>
        <span className="text-ink-2">{inRoute ? stays.map((s) => `${fmtDay(s.from, false)} – ${fmtDay(s.to, false)}`).join(" and ") : (verdict?.why ?? region.fit ?? "")}</span>
      </p>

      <Section title="Known for">
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

      <Section title="In our window" aside="20 Dec – 9 Jan">
        <ul className="grid gap-2 text-ink-2">
          {a.window.map((w, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true" className="text-accent">
                ●
              </span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
        {cards.length ? (
          <details className="rounded-xl bg-bg-2 p-3 text-sm">
            <summary className="cursor-pointer font-semibold">{cards.length} experiences from the research catalogue, with how each one suits her</summary>
            <ul className="grid gap-2 pt-2">
              {cards.map((c) => (
                <CardRow key={c.id} c={c} />
              ))}
            </ul>
          </details>
        ) : null}
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="What it is like">
          <p className="text-ink-2">{a.feel}</p>
          {region.videos[0] ? (
            <a href={region.videos[0]} target="_blank" rel="noreferrer" className="btn btn-sm justify-self-start">
              Watch a video
            </a>
          ) : null}
        </Section>
        <Section title="Getting there">
          <p className="text-ink-2">{a.getting_there}</p>
          <p className="text-sm text-muted">
            From Tokyo about {fromTokyo.hours}{fromTokyo.curated ? "" : "~"} h ({fromTokyo.how.toLowerCase()}).
            {fromPrev && prev ? ` From ${snapshot.regions.find((r) => r.id === prev.region)?.name ?? prev.region} about ${fromPrev.hours} h (${fromPrev.how.toLowerCase()}).` : ""}
          </p>
        </Section>
      </div>

      {sights.length ? (
        <Section title={inRoute ? "What we would do here" : "If we spent nights here"} aside={
          <span className="seg">
            {(["gentle", "balanced", "full"] as Pace[]).map((p) => (
              <button key={p} aria-pressed={pace === p} onClick={() => setPace(p)} className="!min-h-8 !py-1 !text-xs">
                {p}
              </button>
            ))}
          </span>
        }>
          {nights.nights != null ? (
            <p className="text-sm text-ink-2">
              <b>{nights.nights} night{nights.nights === 1 ? "" : "s"} at {pace}.</b> {nights.reason}
            </p>
          ) : null}
          <Tier title="Must do" blurb="anchors a day" list={must} planned={planned} her={herLabel} />
          <Tier title="Nice to do" blurb="fits an afternoon" list={nice} planned={planned} her={herLabel} />
          <Tier title="Nice to have" blurb="if there is time" list={maybe} planned={planned} her={herLabel} />
        </Section>
      ) : null}

      {food || meals.length ? (
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
              <p className="text-ink-2">{food.intro}</p>
              <p className="rounded-xl bg-bg-2 p-3 text-sm">
                <b>For her:</b> {food.for_her}
              </p>
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

      {lodging ? (
        <Section title="Sleep">
          <p className="text-ink-2">
            <b>{lodging.type === "rental" ? "A whole house" : lodging.type === "ryokan" ? "A ryokan" : "A hotel"}.</b> {lodging.why}
          </p>
          <p className="text-sm text-ink-2">
            <b>For seven:</b> {lodging.fit} <b>Outlook:</b> {lodging.outlook}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {lodging.candidates.slice(0, 4).map((c) => (
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
          {inRoute && plan ? (
            <p className="text-sm">
              <Link href={`/versions/${plan.id}#stops`}>All candidates and booking links, on the route →</Link>
            </p>
          ) : null}
        </Section>
      ) : null}

      <Section title="For Fernanda">
        <p className="text-ink-2">{a.for_her}</p>
      </Section>

      <Section title="Our verdict">
        <p className="text-ink-2">
          <b>{fitLabel(region.status)}.</b> {inRoute ? (plan && stayWhy(id)) ?? region.summary : (verdict?.why ?? region.fit ?? region.summary)}
          {verdict?.comeback && verdict.comeback !== "no" ? ` It comes back as ${verdict.comeback}.` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {inRoute && plan ? (
            <Link href={`/versions/${plan.id}#stops`} className="btn btn-sm">
              See it on the route
            </Link>
          ) : alt ? (
            <Link href={`/route?show=${alt.id}`} className="btn btn-sm btn-primary">
              Draw “{alt.name}” on the map
            </Link>
          ) : null}
          {!inRoute && plan && region.status !== "not_this_trip" && region.status !== "day_trip" ? (
            <button className="btn btn-sm" onClick={tryIt} disabled={trying || !me}>
              {trying ? "Making your version…" : "Try it in the route"}
            </button>
          ) : null}
          <Link href="/route" className="btn btn-sm">
            The route and why
          </Link>
        </div>
      </Section>

      <JapanMap regions={snapshot.regions} stays={plan?.stays} selected={id} view="heart" className="shadow-[var(--glow)]" />

      <p className="text-xs text-muted">
        Sources:{" "}
        {sources.slice(0, 24).map((s, i) => (
            <span key={s}>
              {i ? " · " : ""}
              <a href={s} target="_blank" rel="noreferrer">
                {sourceHost(s)}
              </a>
            </span>
          ))}
      </p>
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
                {SIZE_LABEL[p.size] ?? p.size} · {her(p)}
                {planned.get(p.id)?.length ? ` · ${fmtDay(planned.get(p.id)![0])}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardRow({ c }: { c: CatalogCard }) {
  const href = sourceHref(c.source);
  const bump = c.bump == null ? "" : c.bump >= 4 ? "easy for her" : c.bump === 3 ? "ok for her" : "hard for her";
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
