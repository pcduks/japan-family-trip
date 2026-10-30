"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { fmtDay } from "@/lib/dates";
import type { SpotHit } from "@/lib/google/places";
import { CAT_LABEL, COMMENT_TYPE, HOODS, REACTION_TYPE, mapsSearchUrl, nyNote, todayInJapan, walkByN, walkingUrl, type Spot } from "@/lib/tokyo";
import type { PlaceDetails } from "@/lib/types";
import { useStore } from "../providers";
import { Avatar } from "../ui";
import { CatIcon } from "./CatIcon";
import { photoSrc, useSpotDetails } from "./useTokyoSpots";

export interface SpotSheetProps {
  spot: Spot | null;
  hit: SpotHit | undefined;
  /** Who in the family saved it. */
  savedBy: string[];
  /** The day this spot's walk is pinned to, for New Year notes. */
  walkDate: string | null;
  onClose: () => void;
}

/** A guide spot as a sheet: Google photos, hours and reviews, the family's hearts and notes, and the links out. */
export function SpotSheet(p: SpotSheetProps) {
  return (
    <Dialog.Root open={!!p.spot} onOpenChange={(o) => !o && p.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content className="sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[24px] bg-card shadow-2xl outline-none" aria-describedby={undefined}>
          {p.spot ? <Body key={p.spot.id} {...p} spot={p.spot} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body(p: SpotSheetProps & { spot: Spot }) {
  const { spot, hit } = p;
  const { snapshot, me, toggleReaction, addComment } = useStore();
  const details = useSpotDetails(spot.id);
  const google = details.status === "ok" ? details.data : null;
  const hood = HOODS[spot.hood];
  const walk = walkByN(spot.walk);
  const saved = !!me && p.savedBy.includes(me.travellerId);
  const ny = nyNote(spot, p.walkDate, snapshot.calendar.new_year_closures);
  const notes = snapshot.comments.filter((c) => c.target_type === COMMENT_TYPE && c.target_id === spot.id);
  const [note, setNote] = useState("");
  const [shared, setShared] = useState(false);
  const mapsHref = google?.googleMapsUri ?? hit?.googleMapsUri ?? mapsSearchUrl(spot.query, hit?.placeId);
  const photos = google?.photos ?? [];
  const jaDay = new Date(todayInJapan() + "T00:00:00Z").getUTCDay();

  const share = async () => {
    const url = `${window.location.origin}/tokyo?walk=${spot.walk}&spot=${spot.id}`;
    try {
      if (navigator.share) await navigator.share({ title: spot.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {
      /* the share sheet was closed */
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-2">
        <span className="w-14" />
        <span className="h-[5px] w-10 rounded-full bg-rule" />
        <Dialog.Close className="min-h-10 w-14 text-right text-sm font-semibold text-muted">Close</Dialog.Close>
      </div>
      <div className="grid gap-4 overflow-y-auto px-5 pt-1 pb-5">
        <div className="grid gap-0.5">
          <p className="eyebrow flex items-center gap-1.5">
            <CatIcon cat={spot.cat} size={13} /> {CAT_LABEL[spot.cat]} · {hood?.name}
            {walk ? ` · Walk ${walk.n}` : " · Rest day"}
          </p>
          <Dialog.Title className="font-display text-[1.8rem] leading-[1.1] font-semibold">{spot.name}</Dialog.Title>
          {google?.rating ? (
            <p className="text-[0.85rem] text-muted">
              <b className="text-ink">★ {google.rating.toFixed(1)}</b> ({google.userRatingCount?.toLocaleString("en")} on Google)
              {google.priceLevel ? ` · ${"¥".repeat(google.priceLevel)}` : ""}
              {hit?.type ? ` · ${hit.type}` : ""}
            </p>
          ) : hit?.type ? (
            <p className="text-[0.85rem] text-muted">{hit.type}</p>
          ) : null}
        </div>

        <Photos spot={spot} hit={hit} photos={photos} status={details.status} error={details.status === "error" ? details.error : null} />

        {spot.note ? <p className="font-display text-[1.08rem] leading-relaxed">{spot.note}</p> : null}
        {google?.summary ? <p className="text-[0.92rem] text-ink-2">{google.summary}</p> : null}
        {ny ? (
          <p className="rounded-xl p-3 text-sm" style={{ background: ny.level === "warn" ? "var(--ny)" : "color-mix(in srgb, var(--warn) 12%, transparent)" }}>
            <b className={ny.level === "warn" ? "text-accent" : "text-warn"}>{p.walkDate ? fmtDay(p.walkDate) : ""}:</b> {ny.text}
          </p>
        ) : null}

        {p.savedBy.length ? (
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
            {p.savedBy.map((id) => (
              <Avatar key={id} traveller={id} travellers={snapshot.travellers} size={24} />
            ))}
            <span>
              {p.savedBy.length === 1 ? "saved it" : `${p.savedBy.length} of us saved it`}
            </span>
          </p>
        ) : null}

        <dl className="grid gap-3 text-[0.92rem]">
          {google?.weekdayHours?.length ? (
            <Fact k="Hours">
              {google.openNow != null ? <span className={`block font-semibold ${google.openNow ? "text-ok" : "text-accent"}`}>{google.openNow ? "Open now" : "Closed now"}</span> : null}
              <ul className="grid gap-0.5">
                {google.weekdayHours.map((line, i) => (
                  // Google lists Monday first; JS weekday 0 is Sunday.
                  <li key={line} className={(i + 1) % 7 === jaDay ? "font-semibold text-ink" : ""}>
                    {line}
                  </li>
                ))}
              </ul>
            </Fact>
          ) : null}
          {hood ? (
            <Fact k="Getting there">
              From {hood.station.replace(/ Station$/, "")} station:{" "}
              <a href={walkingUrl(hood.station, spot.query, hit?.placeId)} target="_blank" rel="noreferrer" className="text-accent">
                walking directions
              </a>
              {google?.address ? <span className="block text-xs text-muted">{google.address}</span> : null}
            </Fact>
          ) : null}
          {google?.website ? (
            <Fact k="Website">
              <a href={google.website} target="_blank" rel="noreferrer" className="text-accent">
                {google.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")}
              </a>
            </Fact>
          ) : null}
        </dl>

        <section className="grid gap-2 rounded-2xl bg-bg-2 p-4" aria-label="Family notes">
          <b>Notes for the family</b>
          {notes.length ? (
            <ul className="grid gap-2">
              {notes.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm">
                  <Avatar traveller={c.author_id} travellers={snapshot.travellers} size={22} />
                  <span className="min-w-0 text-ink-2">{c.body}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {me ? (
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!note.trim()) return;
                await addComment(COMMENT_TYPE, spot.id, note);
                setNote("");
              }}
            >
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="A tip, a question, a yes please…" aria-label="A note" maxLength={280} className="min-w-0 flex-1" />
              <button className="btn btn-sm" disabled={!note.trim()}>
                Add
              </button>
            </form>
          ) : null}
        </section>

        {google?.reviews.length ? (
          <section className="grid gap-2" aria-label="Reviews from Google">
            <p className="eyebrow">What people say</p>
            <ul className="grid gap-2">
              {google.reviews.slice(0, 3).map((r, i) => (
                <li key={i} className="rounded-xl border border-rule p-3 text-sm">
                  <div className="flex items-center gap-2">
                    {r.author.uri ? (
                      <a href={r.author.uri} target="_blank" rel="noreferrer" className="font-semibold">
                        {r.author.displayName}
                      </a>
                    ) : (
                      <span className="font-semibold">{r.author.displayName}</span>
                    )}
                    <span className="ml-auto text-muted" aria-label={`${r.rating} of 5`}>
                      {"★".repeat(Math.round(r.rating))}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-4 whitespace-pre-line text-ink-2">{r.text}</p>
                  <p className="mt-1 text-xs text-muted">{r.relativeTime}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              Reviews from Google.{" "}
              {google.googleMapsUri ? (
                <a href={google.googleMapsUri} target="_blank" rel="noreferrer" className="underline">
                  See all {google.userRatingCount?.toLocaleString("en")}
                </a>
              ) : null}
            </p>
          </section>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-rule px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a href={mapsHref} target="_blank" rel="noreferrer" className="btn btn-primary">
          Map
        </a>
        <button className={`btn ${saved ? "border-accent text-accent" : ""}`} aria-pressed={saved} disabled={!me} onClick={() => toggleReaction(REACTION_TYPE, spot.id, "heart")}>
          {saved ? "♥ Saved" : "♡ Save"}
        </button>
        <button className="btn" onClick={share}>
          {shared ? "Copied" : "Share"}
        </button>
      </div>
    </>
  );
}

function Fact({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.2rem_1fr] gap-2">
      <dt className="text-[0.72rem] font-bold tracking-[0.08em] text-muted uppercase">{k}</dt>
      <dd className="min-w-0 text-ink-2">{children}</dd>
    </div>
  );
}

function Photos({ spot, hit, photos, status, error }: { spot: Spot; hit: SpotHit | undefined; photos: PlaceDetails["photos"]; status: string; error: string | null }) {
  if (status === "loading" || status === "idle") {
    return hit?.photo ? (
      // eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host
      <img src={photoSrc(hit.photo, 900)} alt={spot.name} className="aspect-[4/3] w-full rounded-2xl bg-bg-2 object-cover" width={900} height={675} />
    ) : (
      <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-bg-2" aria-label="Loading photos" />
    );
  }
  if (error && /not set|not configured/i.test(error)) return null;
  if (error) return <p className="rounded-xl border border-rule bg-bg-2 p-3 text-sm text-muted">Photos and reviews are not available right now ({error}).</p>;
  if (!photos.length) return null;
  return (
    <figure className="-mx-5 grid gap-1">
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-5" aria-label={`Photos of ${spot.name}`}>
        {photos.slice(0, 6).map((ph, i) => (
          <li key={ph.name} className="w-[88%] shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host */}
            <img src={photoSrc(ph.name, 900)} alt={`${spot.name}, photo ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} className="aspect-[4/3] w-full rounded-2xl bg-bg-2 object-cover" width={900} height={675} />
            <figcaption className="mt-1 truncate text-xs text-muted">Photo: {ph.authorAttributions.map((a) => a.displayName).join(", ") || "Google"} · Google Maps</figcaption>
          </li>
        ))}
      </ul>
    </figure>
  );
}
