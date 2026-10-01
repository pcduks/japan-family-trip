"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useMemo, useState } from "react";
import { boardStop, boardStopForPlace, guideFor } from "@/lib/guides";
import { deleteRow, insertRow, useTable } from "@/lib/tables";
import { directionsUrl, mapsSearchUrl, youtubeSearchUrl } from "@/lib/links";
import { formatDay, placeInRoute, previousStop } from "@/lib/trip";
import type { GooglePhoto, MediaItem, Place, PlaceDetails, Route } from "@/lib/types";
import { placeStamp } from "@/lib/stamps";
import { EkiStamp } from "./EkiStamp";
import { useStore } from "./providers";
import { photoSrc, usePlaceDetails } from "./usePlaceDetails";

/** Order photos: planner-pinned first, hidden ones removed. */
export function curatedPhotos(photos: GooglePhoto[], media: MediaItem[], placeId: string): GooglePhoto[] {
  const mine = media.filter((m) => m.placeId === placeId && m.type === "photo");
  const hidden = new Set(mine.filter((m) => !m.pinned).map((m) => m.sourceRef));
  const pinnedOrder = mine.filter((m) => m.pinned).sort((a, b) => a.sort - b.sort).map((m) => m.sourceRef);
  const rank = (p: GooglePhoto) => {
    const i = pinnedOrder.indexOf(p.name);
    return i === -1 ? 1000 : i;
  };
  return photos.filter((p) => !hidden.has(p.name)).sort((a, b) => rank(a) - rank(b));
}

export function PlaceSheet({
  place,
  route,
  onClose,
}: {
  place: Place | null;
  /** The route being viewed, for "how you get there" and directions. */
  route: Route | null;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={!!place} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl border border-rule bg-paper shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[30rem] sm:rounded-none sm:rounded-l-2xl"
          aria-describedby={undefined}
        >
          {place ? <SheetBody place={place} route={route} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SheetBody({ place, route }: { place: Place; route: Route | null }) {
  const { trip, media, hearts, me, toggleHeart } = useStore();
  const details = usePlaceDetails(place.slug);
  const P = useMemo(() => new Map(trip.places.map((p) => [p.slug, p])), [trip.places]);
  const hearted = !!me && hearts.some((h) => h.placeId === place.id && h.travellerId === me.travellerId);
  const heartCount = hearts.filter((h) => h.placeId === place.id).length;
  const videos = media.filter((m) => m.placeId === place.id && m.type === "video" && m.pinned).sort((a, b) => a.sort - b.sort);
  const google = details.status === "ok" ? details.data : null;
  const photos = google ? curatedPhotos(google.photos, media, place.id) : [];
  const withGoogleId = google ? { ...place, googlePlaceId: google.placeId } : place;

  const prevSlug = route ? previousStop(route, place.slug) : null;
  const prev = prevSlug ? P.get(prevSlug) : null;
  const stay = route?.stays.find((s) => s.place === place.slug);
  const isFood = place.kind === "food";
  const stayIndex = route?.stays.findIndex((s) => s.place === place.slug) ?? -1;
  const board =
    stayIndex >= 0 && route?.isCandidate ? boardStop(route.code, stayIndex) : place.kind !== "food" ? boardStopForPlace(place.slug, place.name) : null;
  const guide = guideFor(place.slug);
  const stamp = placeStamp(place.slug, place.kind);

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-rule px-5 pt-3 pb-3">
        <div className="min-w-0">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-rule sm:hidden" aria-hidden="true" />
          <p className="eyebrow">
            {isFood ? `${place.category ?? "Comida"}${place.area ? " · " + place.area : ""}` : `${place.region} · ${kindLabel(place.kind)}`}
          </p>
          <Dialog.Title className="text-[2rem] leading-tight">{place.name}</Dialog.Title>
          {google?.rating ? (
            <p className="mt-0.5 text-sm">
              <span className="font-bold">★ {google.rating.toFixed(1)}</span>{" "}
              <span className="text-muted">({google.userRatingCount?.toLocaleString("pt-BR")} avaliações no Google)</span>
            </p>
          ) : null}
        </div>
        <EkiStamp motif={stamp.motif} ink={stamp.ink} size={58} rotate={-8} seed={place.slug.length} label="" className="ml-auto shrink-0" />
        <Dialog.Close className="btn btn-sm shrink-0" aria-label="Fechar">
          ✕
        </Dialog.Close>
      </div>

      <div className="grid gap-5 overflow-y-auto overscroll-contain px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Photos place={place} details={details} photos={photos} />

        {place.closedNote ? <p className="rounded-xl border border-danger p-3 text-sm text-danger">{place.closedNote}</p> : null}
        {place.blurb ? <p className="text-[1.05rem]">{place.blurb}</p> : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={hearted}
            onClick={() => toggleHeart(place.id)}
            className="btn col-span-2"
            style={hearted ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-ink)" } : undefined}
          >
            {hearted ? "♥ Quero ir" : "♡ Quero ir"}
            {heartCount ? <span className="font-normal opacity-80">· {heartCount}</span> : null}
          </button>
          <a className="btn" href={google?.googleMapsUri ?? mapsSearchUrl(withGoogleId)} target="_blank" rel="noreferrer">
            Abrir no Google Maps
          </a>
          {prev ? (
            <a className="btn" href={directionsUrl(prev, withGoogleId)} target="_blank" rel="noreferrer">
              Rota desde {prev.name.replace(/ \(.*\)$/, "")}
            </a>
          ) : (
            <a className="btn" href={youtubeSearchUrl(`${place.name} Japan winter`)} target="_blank" rel="noreferrer">
              Mais no YouTube
            </a>
          )}
        </div>

        <section className="simple-hide grid gap-2" aria-label="Nossas notas">
          <h3 className="text-[1.4rem]">Nossas notas</h3>
          <dl className="grid gap-2 text-sm">
            {isFood ? (
              <>
                {place.note ? <Fact k="Dica">{place.note}</Fact> : null}
                {place.listRating ? <Fact k="Na lista">★ {place.listRating} quando salvamos</Fact> : null}
                {!place.area ? <Fact k="Área">Confira a unidade certa no mapa</Fact> : null}
              </>
            ) : (
              <>
                {place.winter ? <Fact k="Inverno">{place.winter}</Fact> : null}
                {place.bump ? <Fact k="Para ela">{place.bump}</Fact> : null}
                {stay?.legNote ? <Fact k="Como chegar">{stay.legNote}</Fact> : null}
                <Fact k="Datas">
                  <RouteDates place={place} routes={trip.routes} modules={trip.modules} />
                </Fact>
              </>
            )}
          </dl>
        </section>

        {videos.length ? (
          <section className="grid gap-3" aria-label="Vídeos">
            <h3 className="text-[1.4rem]">Vídeos</h3>
            <details className="simple-only">
              <summary className="btn btn-sm w-full">Ver {videos.length} vídeos</summary>
              <VideoList videos={videos} />
            </details>
            <div className="simple-hide">
              <VideoList videos={videos} />
            </div>
          </section>
        ) : null}

        {board ? (
          <section className="simple-hide grid gap-2" aria-label="Ideias">
            <h3 className="text-[1.4rem]">Ideias para aproveitar</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {board.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            {board.eat ? (
              <p className="text-sm">
                <b>Comer:</b> {board.eat}
              </p>
            ) : null}
            {board.bump ? (
              <p className="text-sm">
                <b className="text-plum">Para ela:</b> {board.bump}
              </p>
            ) : null}
          </section>
        ) : null}
        {guide ? (
          <Link href={`/guides/${guide.city}`} className="btn">
            Nosso guia de {guide.mapSuffix}: roteiros e bairros
          </Link>
        ) : null}

        <Tips slug={place.slug} />

        <Reviews details={details} />
      </div>
    </>
  );
}

function VideoList({ videos }: { videos: MediaItem[] }) {
  return (
    <div className="mt-2 grid gap-3">
      {videos.map((v) => (
        <div key={v.id} className="overflow-hidden rounded-xl border border-rule bg-black">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube.com/embed/${encodeURIComponent(v.sourceRef)}?rel=0&playsinline=1`}
            title={v.title ?? "Vídeo do YouTube"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ))}
    </div>
  );
}

function Photos({ place, details, photos }: { place: Place; details: ReturnType<typeof usePlaceDetails>; photos: GooglePhoto[] }) {
  if (details.status === "loading" || details.status === "idle")
    return <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-soft" aria-label="Carregando fotos" />;
  // No Google key yet: stay quiet instead of showing a config error to the family.
  if (details.status === "error" && /not set|not configured/i.test(details.error)) return null;
  if (details.status === "error")
    return (
      <p className="rounded-xl border border-rule bg-soft p-3 text-sm text-muted">
        Fotos e avaliações não estão disponíveis agora ({details.error}).
      </p>
    );
  if (!photos.length) return null;
  return (
    <figure className="-mx-4 grid gap-1">
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-4" aria-label={`Fotos de ${place.name}`}>
        {photos.map((p, i) => (
          <li key={p.name} className="w-[88%] shrink-0 snap-center sm:w-[92%]">
            {/* eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host */}
            <img
              src={photoSrc(p.name, 900)}
              alt={i === 0 && place.blurb ? `${place.name}: ${place.blurb}` : `${place.name}, foto ${i + 1} de ${photos.length}`}
              loading={i < 2 ? "eager" : "lazy"}
              className="aspect-[4/3] w-full rounded-xl bg-soft object-cover"
              width={900}
              height={675}
            />
            <figcaption className="mt-1 truncate text-xs text-muted">
              Foto:{" "}
              {p.authorAttributions.map((a, k) => (
                <span key={k}>
                  {k ? ", " : ""}
                  {a.uri ? (
                    <a href={a.uri} target="_blank" rel="noreferrer" className="underline">
                      {a.displayName}
                    </a>
                  ) : (
                    a.displayName
                  )}
                </span>
              ))}{" "}
              · Google Maps
            </figcaption>
          </li>
        ))}
      </ul>
    </figure>
  );
}

function Reviews({ details }: { details: ReturnType<typeof usePlaceDetails> }) {
  if (details.status !== "ok" || !details.data.reviews.length) return null;
  const d: PlaceDetails = details.data;
  return (
    <section className="grid gap-3" aria-label="Avaliações do Google">
      <details className="simple-only">
        <summary className="btn btn-sm w-full">Ver avaliações</summary>
        <ReviewList d={d} />
      </details>
      <div className="simple-hide">
        <h3 className="text-[1.4rem]">Avaliações recentes</h3>
        <ReviewList d={d} />
      </div>
    </section>
  );
}

function ReviewList({ d }: { d: PlaceDetails }) {
  return (
    <>
      <ul className="mt-2 grid gap-3">
        {d.reviews.map((r, i) => (
          <li key={i} className="card grid gap-1 p-3 text-sm">
            <div className="flex items-center gap-2">
              {r.author.photoUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.author.photoUri} alt="" width={24} height={24} className="size-6 rounded-full" referrerPolicy="no-referrer" />
              ) : null}
              {r.author.uri ? (
                <a href={r.author.uri} target="_blank" rel="noreferrer" className="font-bold underline">
                  {r.author.displayName}
                </a>
              ) : (
                <span className="font-bold">{r.author.displayName}</span>
              )}
              <span className="ml-auto text-muted" aria-label={`${r.rating} de 5 estrelas`}>
                {"★".repeat(Math.round(r.rating))}
              </span>
            </div>
            <p className="text-xs text-muted">{r.relativeTime}</p>
            <p className="whitespace-pre-line">{r.text}</p>
            {r.googleMapsUri ? (
              <a href={r.googleMapsUri} target="_blank" rel="noreferrer" className="text-xs underline">
                Ver no Google Maps
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Avaliações do Google Maps (em inglês).{" "}
        {d.googleMapsUri ? (
          <a href={d.googleMapsUri} target="_blank" rel="noreferrer" className="underline">
            Ver todas as {d.userRatingCount?.toLocaleString("pt-BR")} avaliações
          </a>
        ) : null}
      </p>
    </>
  );
}

function Fact({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2">
      <dt className="pt-0.5 font-mono text-[0.7rem] tracking-wider text-muted uppercase">{k}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function RouteDates({ place, routes, modules }: { place: Place; routes: Route[]; modules: string[] }) {
  const rows = routes
    .filter((r) => r.isCandidate)
    .flatMap((r) =>
      placeInRoute(r, place.slug).map((x) => {
        const what = x.role === "base" ? "base" : x.role === "via" ? "parada no caminho" : "bate-volta";
        const when =
          x.role === "via" ? formatDay(x.from) : `${formatDay(x.from)} – ${formatDay(x.to)}`;
        return `${r.code}: ${what}, ${when}`;
      }),
    );
  if (!rows.length) return <>{modules.includes(place.slug) ? "Extra opcional; ainda fora das rotas" : "Fora das rotas"}</>;
  return (
    <ul>
      {rows.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}

function kindLabel(k: Place["kind"]): string {
  return (
    {
      city: "Cidade",
      daytrip: "Bate-volta",
      ryokan: "Noite em ryokan",
      stopover: "Parada no caminho",
      village: "Vilarejo",
      temple: "Noite em templo",
      module: "Extra opcional",
      food: "Comida",
    } as const
  )[k];
}

/** Tips pasted from Instagram posts, friends or articles. */
function Tips({ slug }: { slug: string }) {
  const { me, trip } = useStore();
  const { rows } = useTable("tips");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const tips = rows.filter((t) => t.place_slug === slug).sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const names = new Map(trip.travellers.map((t) => [t.id, t.name]));
  return (
    <section className="simple-hide grid gap-2" aria-label="Dicas">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[1.4rem]">Dicas{tips.length ? ` (${tips.length})` : ""}</h3>
        {me && !open ? (
          <button type="button" className="text-sm underline" onClick={() => setOpen(true)}>
            + Dar uma dica
          </button>
        ) : null}
      </div>
      {tips.map((t) => (
        <div key={t.id} className="card grid gap-1 p-3 text-sm">
          {t.text ? <p className="whitespace-pre-line">{t.text}</p> : null}
          <p className="flex flex-wrap gap-3 text-xs text-muted">
            {t.url ? (
              <a href={t.url} target="_blank" rel="noreferrer" className="underline">
                {sourceLabel(t.url)}
              </a>
            ) : null}
            {t.created_by ? <span>{names.get(t.created_by) ?? ""}</span> : null}
            {me && (me.role === "planner" || me.travellerId === t.created_by) ? (
              <button type="button" className="underline" onClick={() => deleteRow("tips", t.id)}>
                Apagar
              </button>
            ) : null}
          </p>
        </div>
      ))}
      {open ? (
        <form
          className="card grid gap-2 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim() && !url.trim()) return;
            await insertRow("tips", {
              place_slug: slug,
              url: url.trim() || null,
              text: text.trim(),
              source: url.trim() ? sourceLabel(url.trim()) : null,
              created_by: me?.travellerId ?? null,
              created_at: new Date().toISOString(),
            });
            setUrl("");
            setText("");
            setOpen(false);
          }}
        >
          <input className="input" type="url" placeholder="Link (post do Instagram, matéria…)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Link" />
          <textarea className="input min-h-16" placeholder="Qual é a dica? Ex.: peça o corte especial" value={text} onChange={(e) => setText(e.target.value)} aria-label="Dica" />
          <div className="flex gap-2">
            <button className="btn btn-sm btn-primary">Salvar dica</button>
            <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export function sourceLabel(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (h.endsWith("instagram.com")) return "Instagram";
    if (h.endsWith("tiktok.com")) return "TikTok";
    if (h.endsWith("youtube.com") || h === "youtu.be") return "YouTube";
    if (h.includes("google.")) return "Google Maps";
    return h;
  } catch {
    return "Link";
  }
}
