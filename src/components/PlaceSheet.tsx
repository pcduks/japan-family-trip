"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo } from "react";
import { directionsUrl, mapsSearchUrl, youtubeSearchUrl } from "@/lib/links";
import { formatDay, placeInRoute, previousStop } from "@/lib/trip";
import type { GooglePhoto, MediaItem, Place, PlaceDetails, Route } from "@/lib/types";
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
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border border-line bg-paper shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[30rem] sm:rounded-none sm:rounded-l-2xl"
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

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 pt-3 pb-3">
        <div className="min-w-0">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
          <p className="eyebrow">
            {isFood ? `${place.category ?? "Food"}${place.area ? " · " + place.area : ""}` : `${place.region} · ${kindLabel(place.kind)}`}
          </p>
          <Dialog.Title className="text-2xl font-extrabold">{place.name}</Dialog.Title>
          {google?.rating ? (
            <p className="mt-0.5 text-sm">
              <span className="font-bold">★ {google.rating.toFixed(1)}</span>{" "}
              <span className="text-muted">({google.userRatingCount?.toLocaleString("en-US")} Google reviews)</span>
            </p>
          ) : null}
        </div>
        <Dialog.Close className="btn btn-sm shrink-0" aria-label="Close">
          ✕
        </Dialog.Close>
      </div>

      <div className="grid gap-5 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Photos place={place} details={details} photos={photos} />

        {place.closedNote ? <p className="rounded-lg border border-danger p-3 text-sm text-danger">{place.closedNote}</p> : null}
        {place.blurb ? <p className="text-[1.05rem]">{place.blurb}</p> : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={hearted}
            onClick={() => toggleHeart(place.id)}
            className="btn col-span-2"
            style={hearted ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-ink)" } : undefined}
          >
            {hearted ? "♥ Hearted" : "♡ Heart this place"}
            {heartCount ? <span className="font-normal opacity-80">· {heartCount}</span> : null}
          </button>
          <a className="btn" href={google?.googleMapsUri ?? mapsSearchUrl(withGoogleId)} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>
          {prev ? (
            <a className="btn" href={directionsUrl(prev, withGoogleId)} target="_blank" rel="noreferrer">
              Directions from {prev.name.replace(/ \(.*\)$/, "")}
            </a>
          ) : (
            <a className="btn" href={youtubeSearchUrl(`${place.name} Japan winter`)} target="_blank" rel="noreferrer">
              More on YouTube
            </a>
          )}
        </div>

        <section className="simple-hide grid gap-2" aria-label="Our notes">
          <h3 className="text-lg font-extrabold">Our notes</h3>
          <dl className="grid gap-2 text-sm">
            {isFood ? (
              <>
                {place.note ? <Fact k="Tip">{place.note}</Fact> : null}
                {place.listRating ? <Fact k="Saved list">★ {place.listRating} when we saved it</Fact> : null}
                {!place.area ? <Fact k="Area">Check the exact branch on the map</Fact> : null}
              </>
            ) : (
              <>
                {place.winter ? <Fact k="Winter">{place.winter}</Fact> : null}
                {place.bump ? <Fact k="Bump">{place.bump}</Fact> : null}
                {stay?.legNote ? <Fact k="Getting there">{stay.legNote}</Fact> : null}
                <Fact k="Dates">
                  <RouteDates place={place} routes={trip.routes} modules={trip.modules} />
                </Fact>
              </>
            )}
          </dl>
        </section>

        {videos.length ? (
          <section className="grid gap-3" aria-label="Videos">
            <h3 className="text-lg font-extrabold">Videos</h3>
            <details className="simple-only">
              <summary className="btn btn-sm w-full">Show {videos.length} videos</summary>
              <VideoList videos={videos} />
            </details>
            <div className="simple-hide">
              <VideoList videos={videos} />
            </div>
          </section>
        ) : null}

        <Reviews details={details} />
      </div>
    </>
  );
}

function VideoList({ videos }: { videos: MediaItem[] }) {
  return (
    <div className="mt-2 grid gap-3">
      {videos.map((v) => (
        <div key={v.id} className="overflow-hidden rounded-lg border border-line bg-black">
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube.com/embed/${encodeURIComponent(v.sourceRef)}?rel=0&playsinline=1`}
            title={v.title ?? "YouTube video"}
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
    return <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-soft" aria-label="Loading photos" />;
  if (details.status === "error")
    return (
      <p className="rounded-lg border border-line bg-soft p-3 text-sm text-muted">
        Photos and reviews aren&apos;t available right now ({details.error}).
      </p>
    );
  if (!photos.length) return null;
  return (
    <figure className="-mx-4 grid gap-1">
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-4" aria-label={`Photos of ${place.name}`}>
        {photos.map((p, i) => (
          <li key={p.name} className="w-[88%] shrink-0 snap-center sm:w-[92%]">
            {/* eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host */}
            <img
              src={photoSrc(p.name, 900)}
              alt={i === 0 && place.blurb ? `${place.name}: ${place.blurb}` : `${place.name}, photo ${i + 1} of ${photos.length}`}
              loading={i < 2 ? "eager" : "lazy"}
              className="aspect-[4/3] w-full rounded-xl bg-soft object-cover"
              width={900}
              height={675}
            />
            <figcaption className="mt-1 truncate text-xs text-muted">
              Photo:{" "}
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
    <section className="grid gap-3" aria-label="Google reviews">
      <details className="simple-only">
        <summary className="btn btn-sm w-full">Show reviews</summary>
        <ReviewList d={d} />
      </details>
      <div className="simple-hide">
        <h3 className="text-lg font-extrabold">Recent reviews</h3>
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
              <span className="ml-auto text-muted" aria-label={`${r.rating} out of 5 stars`}>
                {"★".repeat(Math.round(r.rating))}
              </span>
            </div>
            <p className="text-xs text-muted">{r.relativeTime}</p>
            <p className="whitespace-pre-line">{r.text}</p>
            {r.googleMapsUri ? (
              <a href={r.googleMapsUri} target="_blank" rel="noreferrer" className="text-xs underline">
                View on Google Maps
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Reviews from Google Maps.{" "}
        {d.googleMapsUri ? (
          <a href={d.googleMapsUri} target="_blank" rel="noreferrer" className="underline">
            See all {d.userRatingCount?.toLocaleString("en-US")} reviews
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
        const what = x.role === "base" ? "stay" : x.role === "via" ? "stop on the way" : "day trip";
        const when =
          x.role === "via" ? formatDay(x.from) : `${formatDay(x.from)} – ${formatDay(x.to)}`;
        return `${r.code}: ${what}, ${when}`;
      }),
    );
  if (!rows.length) return <>{modules.includes(place.slug) ? "Optional add-on; not in any route yet" : "Not in any route"}</>;
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
      city: "City",
      daytrip: "Day trip",
      ryokan: "Ryokan stay",
      stopover: "Stop on the way",
      village: "Village",
      temple: "Temple stay",
      module: "Optional add-on",
      food: "Food",
    } as const
  )[k];
}
