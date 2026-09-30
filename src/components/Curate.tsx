"use client";

import Link from "next/link";
import { useState } from "react";
import type { Place } from "@/lib/types";
import { curatedPhotos } from "./PlaceSheet";
import { useStore } from "./providers";
import { photoSrc, usePlaceDetails } from "./usePlaceDetails";

interface VideoResult {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumbnail: string;
  durationSeconds: number;
  views: number | null;
}

const TARGET_VIDEOS = 2;

/** P1.4 index: every place with its curation progress. */
export function CurateIndex() {
  const { trip, media } = useStore();
  const count = (p: Place, type: "video" | "photo") => media.filter((m) => m.placeId === p.id && m.type === type && (type === "photo" || m.pinned)).length;
  const tripPlaces = trip.places.filter((p) => p.kind !== "food");
  const food = trip.places.filter((p) => p.kind === "food");
  const done = tripPlaces.filter((p) => count(p, "video") >= TARGET_VIDEOS).length;

  const list = (places: Place[]) => (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {places.map((p) => {
        const v = count(p, "video");
        const ph = count(p, "photo");
        return (
          <li key={p.id}>
            <Link href={`/curate/${p.slug}`} className="card flex items-center justify-between gap-3 p-3 no-underline hover:border-ink">
              <span className="min-w-0">
                <span className="block truncate font-bold">{p.name}</span>
                <span className="block text-xs text-muted">{p.kind === "food" ? p.category : p.region}</span>
              </span>
              <span className={`shrink-0 text-sm tabular-nums ${v >= TARGET_VIDEOS ? "font-bold text-ok" : "text-muted"}`}>
                ▶ {v}
                {ph ? ` · 📷 ${ph}` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-4">
      <div>
        <h1 className="text-2xl font-extrabold">Curate media</h1>
        <p className="text-sm text-muted">
          {done} of {tripPlaces.length} trip places have at least {TARGET_VIDEOS} videos. Each YouTube search uses about 200 of the
          10,000 daily quota units.
        </p>
      </div>
      <h2 className="text-lg font-extrabold">Trip places</h2>
      {list(tripPlaces)}
      <h2 className="text-lg font-extrabold">Tokyo food list</h2>
      {list(food)}
    </main>
  );
}

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function CuratePlace({ slug }: { slug: string }) {
  const { trip, media, pinVideo, removeMedia, moveMedia, setPhotoState } = useStore();
  const place = trip.places.find((p) => p.slug === slug);
  const details = usePlaceDetails(place ? slug : null);
  const suggestions = place
    ? place.kind === "food"
      ? [`${place.name} Tokyo`, `${place.name} review`]
      : [`${place.name} winter`, `${place.name} walking tour`, `${place.name} food`, `${place.name} travel guide`]
    : [];
  const [q, setQ] = useState(suggestions[0] ?? "");
  const [results, setResults] = useState<VideoResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!place)
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-extrabold">Unknown place</h1>
        <Link href="/curate">Back to the list</Link>
      </main>
    );

  const pinned = media.filter((m) => m.placeId === place.id && m.type === "video").sort((a, b) => a.sort - b.sort);
  const photoMedia = media.filter((m) => m.placeId === place.id && m.type === "photo");
  const photoState = (name: string) => {
    const m = photoMedia.find((x) => x.sourceRef === name);
    return m ? (m.pinned ? "pinned" : "hidden") : "default";
  };

  async function search(query: string) {
    setQ(query);
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/search?q=${encodeURIComponent(query)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Search failed (${res.status})`);
      setResults(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4">
      <div>
        <Link href="/curate" className="text-sm">
          ← All places
        </Link>
        <h1 className="text-2xl font-extrabold">{place.name}</h1>
        <p className="text-sm text-muted">{place.blurb}</p>
      </div>

      <section className="grid gap-3" aria-labelledby="pinned-h">
        <h2 id="pinned-h" className="text-lg font-extrabold">
          Pinned videos ({pinned.length})
        </h2>
        {pinned.length ? (
          <ol className="grid gap-2">
            {pinned.map((m, i) => (
              <li key={m.id} className="card flex items-center gap-3 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${m.sourceRef}/mqdefault.jpg`} alt="" width={120} height={68} className="h-[68px] w-[120px] rounded object-cover" />
                <span className="min-w-0 flex-1 text-sm font-medium">{m.title ?? m.sourceRef}</span>
                <span className="flex shrink-0 gap-1">
                  <button className="btn btn-sm" onClick={() => moveMedia(m.id, -1)} disabled={i === 0} aria-label="Move up">
                    ↑
                  </button>
                  <button className="btn btn-sm" onClick={() => moveMedia(m.id, 1)} disabled={i === pinned.length - 1} aria-label="Move down">
                    ↓
                  </button>
                  <button className="btn btn-sm" onClick={() => removeMedia(m.id)}>
                    Unpin
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">None yet. Search below and pin 2–4 videos.</p>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="search-h">
        <h2 id="search-h" className="text-lg font-extrabold">
          Find videos
        </h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) search(q.trim());
          }}
        >
          <label className="sr-only" htmlFor="yt-q">
            YouTube search
          </label>
          <input id="yt-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary shrink-0" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} className="chip !min-h-8 text-sm" onClick={() => search(s)} disabled={searching}>
              {s}
            </button>
          ))}
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {results ? (
          results.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((v) => {
                const isPinned = pinned.some((m) => m.sourceRef === v.id);
                return (
                  <li key={v.id} className="card grid gap-2 overflow-hidden">
                    <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="relative block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.thumbnail} alt="" className="aspect-video w-full object-cover" />
                      <span className="absolute right-1 bottom-1 rounded bg-black/80 px-1 font-mono text-xs text-white">{fmtDuration(v.durationSeconds)}</span>
                    </a>
                    <div className="grid gap-1 px-3 pb-3">
                      <span className="line-clamp-2 text-sm font-bold">{v.title}</span>
                      <span className="text-xs text-muted">
                        {v.channel} · {v.publishedAt.slice(0, 4)}
                        {v.views != null ? ` · ${Intl.NumberFormat("en", { notation: "compact" }).format(v.views)} views` : ""}
                      </span>
                      <button className="btn btn-sm" disabled={isPinned} onClick={() => pinVideo(place.id, v.id, v.title)}>
                        {isPinned ? "Pinned ✓" : "Pin"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">No embeddable videos found. Try another search.</p>
          )
        ) : null}
      </section>

      <section className="grid gap-3" aria-labelledby="photos-h">
        <h2 id="photos-h" className="text-lg font-extrabold">
          Photos
        </h2>
        <p className="text-sm text-muted">Pin puts a photo first in the carousel; Hide removes it.</p>
        {details.status === "ok" ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[...curatedPhotos(details.data.photos, photoMedia.filter((m) => m.pinned), place.id), ...details.data.photos.filter((p) => photoState(p.name) === "hidden")].map(
              (p) => {
                const st = photoState(p.name);
                return (
                  <li key={p.name} className="card grid gap-2 overflow-hidden" style={st === "hidden" ? { opacity: 0.45 } : undefined}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc(p.name, 400)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    <span className="truncate px-2 text-xs text-muted">© {p.authorAttributions[0]?.displayName}</span>
                    <div className="flex gap-1 px-2 pb-2">
                      <button className="btn btn-sm flex-1" aria-pressed={st === "pinned"} onClick={() => setPhotoState(place.id, p.name, st === "pinned" ? "default" : "pinned")}>
                        {st === "pinned" ? "★ Pinned" : "Pin"}
                      </button>
                      <button className="btn btn-sm flex-1" aria-pressed={st === "hidden"} onClick={() => setPhotoState(place.id, p.name, st === "hidden" ? "default" : "hidden")}>
                        {st === "hidden" ? "Show" : "Hide"}
                      </button>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        ) : details.status === "error" ? (
          <p className="text-sm text-danger">{details.error}</p>
        ) : (
          <p className="text-sm text-muted">Loading photos…</p>
        )}
      </section>
    </main>
  );
}

export function PlannerOnly() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-extrabold">Planner only</h1>
      <p className="text-muted">Media curation is limited to the trip planner.</p>
    </main>
  );
}
