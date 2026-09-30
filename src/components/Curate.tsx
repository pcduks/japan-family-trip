"use client";

import Link from "next/link";
import { useState } from "react";
import type { Place } from "@/lib/types";
import { curatedPhotos } from "./PlaceSheet";
import { useStore } from "./providers";
import { PageHeader, Section } from "./ui";
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
            <Link href={`/curate/${p.slug}`} className="card flex items-center justify-between gap-3 p-3 no-underline transition-transform hover:-translate-y-0.5">
              <span className="min-w-0">
                <span className="block truncate font-bold">{p.name}</span>
                <span className="block text-xs text-muted">{p.kind === "food" ? p.category : p.region}</span>
              </span>
              <span className={`shrink-0 font-mono text-xs tabular-nums ${v >= TARGET_VIDEOS ? "font-bold text-pine" : "text-muted"}`}>
                {v} vídeo{v === 1 ? "" : "s"}
                {ph ? ` · ${ph} foto${ph === 1 ? "" : "s"}` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-5 pb-12">
      <PageHeader eyebrow="Mesa do Pedro" title="Curadoria">
        {done} de {tripPlaces.length} lugares da viagem já têm pelo menos {TARGET_VIDEOS} vídeos. Cada busca no YouTube gasta cerca de 200
        das 10.000 unidades diárias da cota.
      </PageHeader>
      <Section title="Lugares da viagem" id="trip-h">
        {list(tripPlaces)}
      </Section>
      <Section title="Comida em Tokyo" id="food-h">
        {list(food)}
      </Section>
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
      <main className="mx-auto grid max-w-md gap-3 px-5 py-16">
        <h1 className="text-[2.6rem] leading-none">Lugar desconhecido</h1>
        <Link href="/curate">Voltar à lista</Link>
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
      if (!res.ok) throw new Error(body.error ?? `A busca falhou (${res.status})`);
      setResults(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-5 pb-12">
      <div className="grid gap-1">
        <Link href="/curate" className="text-sm">
          ← Todos os lugares
        </Link>
        <PageHeader eyebrow="Curadoria" title={place.name}>
          {place.blurb}
        </PageHeader>
      </div>

      <section className="grid gap-3" aria-labelledby="pinned-h">
        <h2 id="pinned-h" className="text-[1.75rem]">
          Vídeos fixados ({pinned.length})
        </h2>
        {pinned.length ? (
          <ol className="grid gap-2">
            {pinned.map((m, i) => (
              <li key={m.id} className="card flex items-center gap-3 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${m.sourceRef}/mqdefault.jpg`} alt="" width={120} height={68} className="h-[68px] w-[120px] rounded object-cover" />
                <span className="min-w-0 flex-1 text-sm font-medium">{m.title ?? m.sourceRef}</span>
                <span className="flex shrink-0 gap-1">
                  <button className="btn btn-sm" onClick={() => moveMedia(m.id, -1)} disabled={i === 0} aria-label="Subir">
                    ↑
                  </button>
                  <button className="btn btn-sm" onClick={() => moveMedia(m.id, 1)} disabled={i === pinned.length - 1} aria-label="Descer">
                    ↓
                  </button>
                  <button className="btn btn-sm" onClick={() => removeMedia(m.id)}>
                    Soltar
                  </button>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">Nenhum ainda. Busque abaixo e fixe de 2 a 4 vídeos.</p>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="search-h">
        <h2 id="search-h" className="text-[1.75rem]">
          Buscar vídeos
        </h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) search(q.trim());
          }}
        >
          <label className="sr-only" htmlFor="yt-q">
            Busca no YouTube
          </label>
          <input id="yt-q" className="input min-w-0" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary shrink-0" disabled={searching}>
            {searching ? "Buscando…" : "Buscar"}
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
                        {v.views != null ? ` · ${Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v.views)} visualizações` : ""}
                      </span>
                      <button className="btn btn-sm" disabled={isPinned} onClick={() => pinVideo(place.id, v.id, v.title)}>
                        {isPinned ? "Fixado ✓" : "Fixar"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhum vídeo incorporável encontrado. Tente outra busca.</p>
          )
        ) : null}
      </section>

      <section className="grid gap-3" aria-labelledby="photos-h">
        <h2 id="photos-h" className="text-[1.75rem]">
          Fotos
        </h2>
        <p className="text-sm text-muted">Fixar põe a foto em primeiro no carrossel; Esconder tira ela de lá.</p>
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
                        {st === "pinned" ? "★ Fixada" : "Fixar"}
                      </button>
                      <button className="btn btn-sm flex-1" aria-pressed={st === "hidden"} onClick={() => setPhotoState(place.id, p.name, st === "hidden" ? "default" : "hidden")}>
                        {st === "hidden" ? "Mostrar" : "Esconder"}
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
          <p className="text-sm text-muted">Carregando fotos…</p>
        )}
      </section>
    </main>
  );
}

export function PlannerOnly() {
  return (
    <main className="mx-auto grid max-w-md gap-3 px-5 py-16">
      <h1 className="text-[2.6rem] leading-none">Só para o Pedro</h1>
      <p className="text-ink-2">A curadoria de fotos e vídeos fica na mesa de quem planeja a viagem.</p>
    </main>
  );
}
