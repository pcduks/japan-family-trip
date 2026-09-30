"use client";

import { useMemo, useState } from "react";
import type { Place } from "@/lib/types";
import { insertRow, useTable } from "@/lib/tables";
import { PlaceSheet, sourceLabel } from "./PlaceSheet";
import { useStore } from "./providers";

/** Group the saved list's free-text categories into a few filters. */
export function foodGroup(cat: string | null | undefined): string {
  const c = (cat ?? "").toLowerCase();
  if (/bar|club|beer|wine|izakaya|yokoch/.test(c)) return "Drinks & nightlife";
  if (/coffee|cafe|breakfast|brunch/.test(c)) return "Coffee & breakfast";
  if (/sushi/.test(c)) return "Sushi";
  if (/ramen|udon|tsukemen/.test(c)) return "Noodles";
  if (/museum/.test(c)) return "Other";
  return "Restaurants";
}

const GROUPS = ["All", "Restaurants", "Sushi", "Noodles", "Coffee & breakfast", "Drinks & nightlife", "Other"];

export function FoodView({ initialPlace }: { initialPlace: string | null }) {
  const { trip, hearts, me } = useStore();
  const food = useMemo(() => trip.places.filter((p) => p.kind === "food"), [trip.places]);
  const [group, setGroup] = useState("All");
  const [area, setArea] = useState("All areas");
  const [q, setQ] = useState("");
  const [onlyHearted, setOnlyHearted] = useState(false);
  const [open, setOpen] = useState<Place | null>(food.find((p) => p.slug === initialPlace) ?? null);

  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    food.forEach((p) => {
      const a = areaKey(p.area);
      counts.set(a, (counts.get(a) ?? 0) + 1);
    });
    return ["All areas", ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a)];
  }, [food]);

  const heartsFor = (id: string) => hearts.filter((h) => h.placeId === id).length;
  const mine = new Set(hearts.filter((h) => h.travellerId === me?.travellerId).map((h) => h.placeId));

  const shown = food.filter(
    (p) =>
      (group === "All" || foodGroup(p.category) === group) &&
      (area === "All areas" || areaKey(p.area) === area) &&
      (!onlyHearted || mine.has(p.id)) &&
      (!q || `${p.name} ${p.category} ${p.area} ${p.note}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-4">
      <div>
        <h1 className="text-2xl font-extrabold">Tokyo food and bars</h1>
        <p className="text-sm text-muted">
          {food.length} places from our own saved Google Maps list. Tap one for photos and reviews; heart the ones you want.
        </p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1" role="group" aria-label="Filter by type">
        {GROUPS.map((g) => (
          <button key={g} className="chip" aria-pressed={group === g} onClick={() => setGroup(g)}>
            {g}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-medium">
          Search
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="tonkatsu, whisky, Ginza…" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Area
          <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
            {areas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={onlyHearted} onChange={(e) => setOnlyHearted(e.target.checked)} />
          My hearts only
        </label>
      </div>

      <p className="text-sm text-muted" role="status">
        {shown.length} shown
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => {
          const n = heartsFor(p.id);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => setOpen(p)} className="card grid h-full w-full gap-1 p-3 text-left hover:border-ink">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-bold">{p.name}</span>
                  {n ? <span className="shrink-0 text-sm font-bold text-accent">{mine.has(p.id) ? "♥" : "♡"} {n}</span> : null}
                </span>
                <span className="text-sm text-muted">
                  {p.category}
                  {p.area ? ` · ${p.area}` : ""}
                </span>
                {p.note ? <span className="line-clamp-2 text-sm">{p.note}</span> : null}
                {p.closedNote ? <span className="text-sm font-medium text-danger">{p.closedNote}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>

      <TipsInbox food={food} onOpen={setOpen} />

      <PlaceSheet place={open} route={null} onClose={() => setOpen(null)} />
    </main>
  );
}

function areaKey(area: string | null | undefined): string {
  if (!area) return "Check on map";
  return area.split(/\s[/(]/)[0].trim();
}

/**
 * Paste a link from Instagram (or anywhere) with a short note. Scraping
 * Instagram breaks its terms, so tips come in by hand and link back to the post.
 */
function TipsInbox({ food, onOpen }: { food: Place[]; onOpen: (p: Place) => void }) {
  const { me, trip } = useStore();
  const { rows } = useTable("tips");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [slug, setSlug] = useState("");
  const P = new Map(trip.places.map((p) => [p.slug, p]));
  const tips = [...rows].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 30);
  return (
    <section className="grid gap-3" aria-labelledby="tips-h">
      <div>
        <h2 id="tips-h" className="text-lg font-extrabold">
          Tips inbox
        </h2>
        <p className="text-sm text-muted">Saw a good spot on Instagram? Paste the post link and what to order. Link it to a place if it&apos;s on our list.</p>
      </div>
      {me ? (
        <form
          className="card grid gap-2 p-3 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!url.trim() && !text.trim()) return;
            await insertRow("tips", {
              place_slug: slug || null,
              url: url.trim() || null,
              text: text.trim(),
              source: url.trim() ? sourceLabel(url.trim()) : null,
              created_by: me.travellerId,
              created_at: new Date().toISOString(),
            });
            setUrl("");
            setText("");
            setSlug("");
          }}
        >
          <input className="input" type="url" placeholder="https://www.instagram.com/p/…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Link" />
          <input className="input" placeholder="The tip" value={text} onChange={(e) => setText(e.target.value)} aria-label="Tip" />
          <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Place">
            <option value="">No place yet</option>
            {food.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary">Save</button>
        </form>
      ) : null}
      {tips.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {tips.map((t) => {
            const place = t.place_slug ? P.get(t.place_slug) : null;
            return (
              <li key={t.id} className="card grid gap-1 p-3 text-sm">
                {place ? (
                  <button type="button" className="text-left font-bold underline" onClick={() => onOpen(place)}>
                    {place.name}
                  </button>
                ) : null}
                {t.text ? <p>{t.text}</p> : null}
                {t.url ? (
                  <a href={t.url} target="_blank" rel="noreferrer" className="text-xs underline">
                    {t.source ?? sourceLabel(t.url)}
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">No tips yet.</p>
      )}
    </section>
  );
}
