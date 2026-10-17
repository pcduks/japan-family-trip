"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Place, Size } from "@/lib/types";
import { fmtDay, fmtRange } from "@/lib/dates";
import { planDays } from "@/lib/days";
import { useStore } from "./providers";
import { Back, Empty, Page, PageHeader, RegionDot } from "./ui";

const SIZE_LABEL: Record<Size, string> = { main: "Half a day", short: "An hour or two", day_trip: "Day trip", evening: "Evening", meal: "Meal" };
const EFFORT: Record<string, string> = { low: "easy for her", moderate: "moderate for her", high: "hard for her" };

/** Lazy photo: only asks the server once the card is near the viewport. */
export function PlaceThumb({ place, className = "" }: { place: Place; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [attr, setAttr] = useState<{ name: string; uri?: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || src || failed) return;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      try {
        const r = await fetch(`/api/places/${place.id}?photo=1`);
        if (!r.ok) throw new Error();
        const j = (await r.json()) as { photo?: { name: string; author?: { displayName: string; uri?: string } } };
        if (!j.photo) throw new Error();
        setSrc(`/api/photo/${j.photo.name}?w=480`);
        setAttr(j.photo.author ? { name: j.photo.author.displayName, uri: j.photo.author.uri } : null);
      } catch {
        setFailed(true);
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [place.id, src, failed]);
  return (
    <div ref={ref} className={`relative overflow-hidden bg-bg-2 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-2xl text-muted" aria-hidden="true">
          {failed ? "" : "…"}
        </span>
      )}
      {attr ? (
        <span className="absolute right-1 bottom-1 rounded bg-black/55 px-1 text-[0.6rem] text-white">
          {attr.uri ? (
            <a href={attr.uri} target="_blank" rel="noreferrer" className="text-white">
              {attr.name}
            </a>
          ) : (
            attr.name
          )}
        </span>
      ) : null}
    </div>
  );
}

export function PlacesList() {
  const { snapshot, me } = useStore();
  const params = useSearchParams();
  const regionParam = params.get("region");
  // The URL picks the region until the person taps a chip; then their choice wins.
  const [picked, setPicked] = useState<{ forParam: string | null; region: string } | null>(null);
  const region = picked && picked.forParam === regionParam ? picked.region : (regionParam ?? "");
  const setRegion = (r: string) => setPicked({ forParam: regionParam, region: r });
  const [size, setSize] = useState<string>("");
  const [inPlan, setInPlan] = useState<"" | "yes" | "no">(params.get("in") === "plan" ? "yes" : "");
  const [q, setQ] = useState("");
  const plan = snapshot.versions.find((v) => v.status === "plan");
  // What the route's days visit, as the days are now (they follow any change to the route).
  const plannedDates = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of plan ? planDays(plan, snapshot) : []) for (const it of d.items) if (it.place_id) m.set(it.place_id, [...(m.get(it.place_id) ?? []), d.date]);
    return m;
  }, [plan, snapshot]);
  const [photosPref, setPhotosPref] = useState<boolean | null>(null);
  const photos = photosPref ?? Boolean(region);
  const setPhotos = (b: boolean) => setPhotosPref(b);

  // Areas in the order of the route, then the rest by name.
  const regions = useMemo(() => {
    const ids = new Set(snapshot.places.map((p) => p.region));
    const onRoute = (plan?.stays ?? []).map((s) => s.region).filter((id, i, all) => ids.has(id) && all.indexOf(id) === i);
    const rest = Array.from(ids).filter((id) => !onRoute.includes(id)).sort((a, b) => (snapshot.regions.find((r) => r.id === a)?.name ?? a).localeCompare(snapshot.regions.find((r) => r.id === b)?.name ?? b));
    return [...onRoute, ...rest].map((id) => snapshot.regions.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r);
  }, [snapshot, plan]);

  const mustVotes = snapshot.votes.filter((v) => v.kind === "mustdo");
  const mustCount = (id: string) => mustVotes.filter((v) => ((v.value as { places?: string[] }).places ?? []).includes(id)).length;
  const hearts = (id: string) => snapshot.reactions.filter((r) => r.target_type === "place" && r.target_id === id && r.kind === "heart").length;
  const myMust = ((snapshot.votes.find((v) => v.kind === "mustdo" && v.traveller_id === me?.travellerId)?.value as { places?: string[] } | undefined)?.places ?? []);

  const list = snapshot.places.filter(
    (p) =>
      (!region || p.region === region) &&
      (!size || p.size === size) &&
      (!inPlan || (inPlan === "yes") === plannedDates.has(p.id)) &&
      (!q.trim() || `${p.name} ${p.kind} ${p.why ?? ""} ${p.food?.type ?? ""} ${p.food?.recommended_by ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );
  const plannedCount = snapshot.places.filter((p) => plannedDates.has(p.id)).length;

  const card = (p: Place) => {
    const area = snapshot.regions.find((r) => r.id === p.region);
    const mc = mustCount(p.id);
    const h = hearts(p.id);
    return (
      <li key={p.id}>
        <Link href={`/places/${p.id}`} className="card flex h-full gap-3 overflow-hidden no-underline">
          {photos ? <PlaceThumb place={p} className="w-28 shrink-0 sm:w-32" /> : null}
          <div className="grid flex-1 content-start gap-1 p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <RegionDot id={p.region} size={8} /> {area?.name} · {SIZE_LABEL[p.size]}
            </p>
            <h3 className="text-[1.05rem] leading-tight">{p.name}</h3>
            {p.why ? <p className="line-clamp-2 text-sm text-ink-2">{p.why}</p> : null}
            {p.food?.recommended_by ? (
              <p className="text-xs text-muted">
                {p.food.type ? `${p.food.type} · ` : ""}
                {p.food.price_band ? `${p.food.price_band} · ` : ""}recommended by {p.food.recommended_by}
              </p>
            ) : null}
            <p className="flex flex-wrap gap-1 pt-1 text-xs">
              {plannedDates.has(p.id) ? <span className="chip text-ok">on the route · {plannedDates.get(p.id)!.map((d) => fmtDay(d, false)).join(", ")}</span> : null}
              {p.status === "avoid_for_her" ? <span className="chip text-danger">avoid for her</span> : p.effort_for_her !== "low" ? <span className={`chip ${p.effort_for_her === "high" ? "text-danger" : "text-warn"}`}>{EFFORT[p.effort_for_her]}</span> : null}
              {p.closures.length ? <span className="chip">closed {p.closures.map((c) => (c.start === c.end ? fmtDay(c.start, false) : fmtRange(c.start, c.end))).join(", ")}</span> : null}
              {p.closed_weekdays.length ? <span className="chip">closed {p.closed_weekdays.join("/")}</span> : null}
              {mc ? <span className="chip">★ {mc} must-do</span> : null}
              {myMust.includes(p.id) ? <span className="chip text-ok">my must-do</span> : null}
              {h ? <span className="chip">♥ {h}</span> : null}
            </p>
          </div>
        </Link>
      </li>
    );
  };

  return (
    <Page wide>
      <Back href="/places">Places</Back>
      <PageHeader eyebrow={`${snapshot.places.length} places · ${regions.length} areas · ${plannedCount} on the route`} title="Places">
        Everything we researched, by area: tap one to open it, or search. A green badge means the route’s days go there. Each place has its hours, closures and effort for Fernanda; photos and reviews come from Google when you open one.
      </PageHeader>
      <div className="grid gap-2">
        <input placeholder="Search… ramen, museum, snow, onsen" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search places" />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button className={`chip shrink-0 ${!region ? "bg-accent text-accent-ink" : ""}`} onClick={() => setRegion("")}>
            All
          </button>
          {regions.map((r) => (
            <button key={r.id} className={`chip shrink-0 ${region === r.id ? "bg-accent text-accent-ink" : ""}`} onClick={() => setRegion(region === r.id ? "" : r.id)}>
              <RegionDot id={r.id} size={8} /> {r.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="seg">
            {(["", "main", "short", "day_trip", "meal"] as const).map((s) => (
              <button key={s} aria-pressed={size === s} onClick={() => setSize(s)}>
                {s ? SIZE_LABEL[s as Size] : "Any"}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="On the route">
            {(["", "yes", "no"] as const).map((v) => (
              <button key={v} aria-pressed={inPlan === v} onClick={() => setInPlan(v)}>
                {v === "" ? "All" : v === "yes" ? "On the route" : "Not yet"}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input type="checkbox" className="min-h-0" checked={photos} onChange={(e) => setPhotos(e.target.checked)} /> Photos
          </label>
        </div>
      </div>

      {!list.length ? (
        <Empty>Nothing matches.</Empty>
      ) : region || q.trim() ? (
        <ul className={`grid gap-3 ${photos ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
          {list.map((p) => (
            card(p)
          ))}
        </ul>
      ) : (
        <div className="grid gap-2">
          {regions.map((r) => {
            const here = list.filter((p) => p.region === r.id);
            if (!here.length) return null;
            const onRoute = here.filter((p) => plannedDates.has(p.id)).length;
            return (
              <details key={r.id} className="card group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
                  <RegionDot id={r.id} size={10} />
                  <span className="display flex-1 text-[1.1rem] leading-tight">{r.name}</span>
                  <span className="text-xs text-muted">
                    {here.length} {here.length === 1 ? "place" : "places"}
                    {onRoute ? ` · ${onRoute} on the route` : ""}
                  </span>
                  <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <ul className={`grid gap-3 border-t border-rule p-3 ${photos ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
                  {here.map((p) => (
                    card(p)
                  ))}
                </ul>
                <p className="px-3 pb-3 text-sm">
                  <Link href={`/areas/${r.id}`}>All about {r.name} →</Link>
                </p>
              </details>
            );
          })}
        </div>
      )}
    </Page>
  );
}
