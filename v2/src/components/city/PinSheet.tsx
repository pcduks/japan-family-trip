"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState } from "react";
import { LAYER_INK, LAYER_LABEL, WHEN_LABEL, isCat, savedBy, slugify, targetOf, type Fit, type Layer, type Pin } from "@/lib/city";
import type { PlannedDay } from "@/lib/days";
import { fmtDay } from "@/lib/dates";
import type { SpotHit } from "@/lib/google/places";
import { CAT_LABEL, mapsSearchUrl, todayInJapan, type SpotCat } from "@/lib/tokyo";
import type { PlaceDetails, Tip } from "@/lib/types";
import { useStore } from "../providers";
import { CatIcon } from "../tokyo/CatIcon";
import { Avatar } from "../ui";
import { Chip, LayerDot } from "./bits";
import { photoSrc, usePlaceDetails } from "./usePins";

export interface PinSheetProps {
  pin: Pin | null;
  hit: SpotHit | undefined;
  fit: Fit | null;
  /** Other layers that hold the same place. */
  alsoIn: Layer[];
  hearts: Map<string, string[]>;
  days: PlannedDay[];
  city: string;
  onClose: () => void;
  /** Open another pin from inside this one (a day's neighbour). */
  onOpen?: (id: string) => void;
}

const CAT_CHOICES: SpotCat[] = ["cafe", "bakery", "food", "sweets", "bar", "shop", "book", "culture", "park", "market", "view", "spa"];

/** Any pin as a sheet: photos, where it fits and when it goes, hours, who saved it, notes, the links out. Tips can be edited. */
export function PinSheet(p: PinSheetProps) {
  return (
    <Dialog.Root open={!!p.pin} onOpenChange={(o) => !o && p.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content className="sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[24px] bg-card shadow-2xl outline-none" aria-describedby={undefined}>
          {p.pin ? <Body key={p.pin.id} {...p} pin={p.pin} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body(p: PinSheetProps & { pin: Pin }) {
  const { pin, hit } = p;
  const { snapshot, me, isPlanner, toggleReaction, addComment, updateTip, deleteTip } = useStore();
  const tip: Tip | null = pin.ref.kind === "tip" ? (snapshot.tips.find((t) => t.id === (pin.ref as { id: string }).id) ?? null) : null;
  const placeId = tip?.google_place_id ?? hit?.placeId ?? null;
  const details = usePlaceDetails(placeId);
  const google = details.status === "ok" ? details.data : null;
  const target = targetOf(pin);
  const saved = savedBy(pin, p.hearts);
  const mine = !!me && saved.includes(me.travellerId);
  const notes = snapshot.comments.filter((c) => c.target_type === target.type && c.target_id === target.id);
  const canEdit = !!tip && !!me && (isPlanner || tip.author_id === me.travellerId);
  const [note, setNote] = useState("");
  const [shared, setShared] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mapsHref = tip?.maps_uri ?? google?.googleMapsUri ?? hit?.googleMapsUri ?? mapsSearchUrl(pin.query, hit?.placeId);
  const photos = google?.photos ?? [];
  const firstPhoto = tip?.photo ?? pin.photo ?? hit?.photo ?? null;
  const jaDay = new Date(todayInJapan() + "T00:00:00Z").getUTCDay();
  const author = pin.author ? snapshot.travellers.find((t) => t.id === pin.author) : null;
  const onDay = pin.date ? p.days.find((d) => d.date === pin.date) : null;
  const regionName = snapshot.regions.find((r) => r.id === p.city)?.name ?? p.city;

  const share = async () => {
    const url = `${window.location.origin}/city/${p.city}?pin=${encodeURIComponent(pin.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: pin.name, url });
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
        <div className="grid gap-1">
          <p className="eyebrow flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <LayerDot layer={pin.layer} /> {LAYER_LABEL[pin.layer]}
            {p.alsoIn.map((l) => (
              <span key={l} className="inline-flex items-center gap-1 normal-case tracking-normal">
                + <LayerDot layer={l} size={8} /> {LAYER_LABEL[l].toLowerCase()}
              </span>
            ))}
            <span aria-hidden="true">·</span>
            <CatIcon cat={pin.cat} size={13} /> {CAT_LABEL[pin.cat]}
            {pin.area ? ` · ${pin.area}` : p.fit?.area ? ` · ${p.fit.area.name}` : ""}
          </p>
          <Dialog.Title className="font-display text-[1.8rem] leading-[1.1] font-semibold">{pin.name}</Dialog.Title>
          {google?.rating ? (
            <p className="text-[0.85rem] text-muted">
              <b className="text-ink">★ {google.rating.toFixed(1)}</b> ({google.userRatingCount?.toLocaleString("en")} on Google)
              {google.priceLevel ? ` · ${"¥".repeat(google.priceLevel)}` : ""}
              {hit?.type ?? tip?.type ? ` · ${hit?.type ?? tip?.type}` : ""}
            </p>
          ) : hit?.type || tip?.type ? (
            <p className="text-[0.85rem] text-muted">{hit?.type ?? tip?.type}</p>
          ) : null}
        </div>

        <Photos name={pin.name} first={firstPhoto} photos={photos} status={details.status} error={details.status === "error" ? details.error : null} />

        {/* where it fits, when it goes */}
        <FitChips pin={pin} fit={p.fit} onDay={onDay ?? null} days={p.days} />

        {pin.line && !editing ? <p className="font-display text-[1.08rem] leading-relaxed">{pin.line}</p> : null}
        {author ? (
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <Avatar traveller={author.id} travellers={snapshot.travellers} size={22} />
            <span>
              {author.name} added it{tip?.source === "instagram" ? " from Instagram" : tip?.source === "maps" ? " from Google Maps" : tip?.source === "screenshot" ? " from a screenshot" : tip?.source === "list" ? " from a saved list" : ""}
              {tip?.source_handle ? ` · @${tip.source_handle.replace(/^@/, "")}` : ""}
            </span>
            {tip?.source_url ? (
              <a href={tip.source_url} target="_blank" rel="noreferrer" className="ml-auto text-xs text-accent">
                the post ↗
              </a>
            ) : null}
          </p>
        ) : null}
        {google?.summary ? <p className="text-[0.92rem] text-ink-2">{google.summary}</p> : null}

        {canEdit && tip ? <TipEditor tip={tip} days={p.days} editing={editing} setEditing={setEditing} onSave={(patch) => updateTip(tip.id, patch)} /> : null}

        {saved.length ? (
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-ink-2">
            {saved.map((id) => (
              <Avatar key={id} traveller={id} travellers={snapshot.travellers} size={24} />
            ))}
            <span>{saved.length === 1 ? "saved it" : `${saved.length} of us saved it`}</span>
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
          {google?.address || hit?.address || tip?.address ? <Fact k="Where">{google?.address ?? hit?.address ?? tip?.address}</Fact> : null}
          {google?.website ? (
            <Fact k="Website">
              <a href={google.website} target="_blank" rel="noreferrer" className="text-accent">
                {google.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")}
              </a>
            </Fact>
          ) : null}
        </dl>

        <Elsewhere pin={pin} city={p.city} regionName={regionName} />

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
                await addComment(target.type, target.id, note);
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
                    <span className="font-semibold">{r.author.displayName}</span>
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

        {canEdit && tip ? (
          <div className="flex justify-end">
            {confirmDelete ? (
              <span className="flex items-center gap-2 text-sm">
                Remove this tip?
                <button type="button" className="btn btn-sm text-danger" onClick={async () => (await deleteTip(tip.id)) === null && p.onClose()}>
                  Remove
                </button>
                <button type="button" className="btn btn-sm" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" className="text-xs text-muted underline" onClick={() => setConfirmDelete(true)}>
                Remove this tip
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-rule px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a href={mapsHref} target="_blank" rel="noreferrer" className="btn btn-primary">
          Map
        </a>
        <button className={`btn ${mine ? "border-accent text-accent" : ""}`} aria-pressed={mine} disabled={!me} onClick={() => toggleReaction(target.type, target.id, "heart")}>
          {mine ? "♥ Saved" : "♡ Save"}
        </button>
        <button className="btn" onClick={share}>
          {shared ? "Copied" : "Share"}
        </button>
      </div>
    </>
  );
}

/** "Fits Tue 22 · near Senso-ji", "On walk 3", "Morning": the computed fit, as chips. */
function FitChips({ pin, fit, onDay, days }: { pin: Pin; fit: Fit | null; onDay: PlannedDay | null; days: PlannedDay[] }) {
  const when = fit?.when ?? null;
  const fitDays = (fit?.days ?? []).filter((d) => d.date !== pin.date).slice(0, 3);
  if (!onDay && !fitDays.length && !fit?.walks.length && !when) return null;
  return (
    <ul className="flex flex-wrap gap-1.5 text-[0.8rem]" aria-label="Where it fits">
      {onDay ? (
        <li className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold text-white" style={{ background: LAYER_INK[pin.layer] }}>
          {pin.layer === "plan" ? "On the plan" : "Put on"} · {fmtDay(onDay.date)}
        </li>
      ) : null}
      {fitDays.map((d) => (
        <li key={d.date} className="inline-flex items-center gap-1 rounded-full border border-rule bg-bg-2 px-2.5 py-1 font-semibold" title={`${Math.round(d.km * 1000)} m from ${d.near}`}>
          Fits {fmtDay(d.date)} <span className="font-normal text-muted">· near {shortName(d.near)}</span>
        </li>
      ))}
      {fit?.walks.map((n) => (
        <li key={n}>
          <Link href={`/tokyo?walk=${n}`} className="inline-flex items-center gap-1 rounded-full border border-rule bg-bg-2 px-2.5 py-1 font-semibold no-underline">
            On walk {n}
          </Link>
        </li>
      ))}
      {when && when !== "any" ? <li className="inline-flex items-center rounded-full border border-dashed border-rule px-2.5 py-1 text-muted">{WHEN_LABEL[when]}</li> : null}
      {!onDay && !fitDays.length && days.length && pin.layer !== "plan" ? <li className="inline-flex items-center rounded-full border border-dashed border-rule px-2.5 py-1 text-muted">Not near any of our days yet</li> : null}
    </ul>
  );
}

/** Edit a tip: its line, its type, the day it goes on. */
function TipEditor({ tip, days, editing, setEditing, onSave }: { tip: Tip; days: PlannedDay[]; editing: boolean; setEditing: (b: boolean) => void; onSave: (patch: Partial<Pick<Tip, "note" | "cat" | "planned_for">>) => Promise<string | null> }) {
  const [note, setNote] = useState(tip.note ?? "");
  const [cat, setCat] = useState<SpotCat>(isCat(tip.cat) ? tip.cat : "food");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const putOn = async (date: string | null) => {
    setBusy(true);
    setErr(await onSave({ planned_for: date }));
    setBusy(false);
  };
  return (
    <section className="grid gap-2 rounded-2xl border border-rule p-3" aria-label="Your tip">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-1">Put it on a day</span>
        {days.map((d) => (
          <Chip key={d.date} pressed={tip.planned_for === d.date} disabled={busy} onClick={() => putOn(tip.planned_for === d.date ? null : d.date)} tone={LAYER_INK.ours}>
            {fmtDay(d.date, false)}
          </Chip>
        ))}
      </div>
      {editing ? (
        <form
          className="grid gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await onSave({ note: note.trim() || null, cat });
            setBusy(false);
            setErr(r);
            if (!r) setEditing(false);
          }}
        >
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Why it's worth it, what to order, who told you…" aria-label="Your line" className="w-full" />
          <div className="flex flex-wrap gap-1.5">
            {CAT_CHOICES.map((c) => (
              <Chip key={c} pressed={cat === c} onClick={() => setCat(c)}>
                <CatIcon cat={c} size={13} /> {CAT_LABEL[c]}
              </Chip>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn btn-sm btn-primary" disabled={busy}>
              Save
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="justify-self-start text-sm font-semibold text-accent" onClick={() => setEditing(true)}>
          Edit the line or the type
        </button>
      )}
      {err ? <p className="text-xs text-danger">{err}</p> : null}
    </section>
  );
}

/** Where else this place lives in the app. */
function Elsewhere({ pin, city, regionName }: { pin: Pin; city: string; regionName: string }) {
  const r = pin.ref;
  let href: string | null = null;
  let label: string | null = null;
  if (r.kind === "place") {
    href = `/places/${r.id}`;
    label = `Its page in the plan`;
  } else if (r.kind === "spot") {
    href = `/tokyo?walk=${pin.walk ?? 1}&spot=${encodeURIComponent(r.id)}`;
    label = `Walk ${pin.walk} on Tokyo on foot`;
  } else if (r.kind === "deep") {
    href = `/food/${r.city}?place=${slugify(r.name)}`;
    label = `The food guide for ${regionName}`;
  } else if (r.kind === "shop") {
    href = `/food/${r.city}?view=explore`;
    label = `Shops in the ${regionName} food guide`;
  } else if (r.kind === "list") {
    href = `/food/${city}?view=explore`;
    label = "Pedro's saved list";
  }
  if (!href) return null;
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-rule px-3 py-2.5 text-sm font-semibold no-underline">
      {label}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function shortName(s: string): string {
  const t = s.replace(/\s*\(.*$/, "");
  return t.length > 28 ? t.slice(0, 27) + "…" : t;
}

function Fact({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.2rem_1fr] gap-2">
      <dt className="text-[0.72rem] font-bold tracking-[0.08em] text-muted uppercase">{k}</dt>
      <dd className="min-w-0 text-ink-2">{children}</dd>
    </div>
  );
}

function Photos({ name, first, photos, status, error }: { name: string; first: string | null; photos: PlaceDetails["photos"]; status: string; error: string | null }) {
  if (status === "loading" || status === "idle") {
    return first ? (
      // eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host
      <img src={photoSrc(first, 900)} alt={name} className="aspect-[4/3] w-full rounded-2xl bg-bg-2 object-cover" width={900} height={675} />
    ) : status === "idle" ? null : (
      <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-bg-2" aria-label="Loading photos" />
    );
  }
  if (error && /not set|not configured/i.test(error)) return null;
  if (error) return <p className="rounded-xl border border-rule bg-bg-2 p-3 text-sm text-muted">Photos and reviews are not available right now ({error}).</p>;
  if (!photos.length) return null;
  return (
    <figure className="-mx-5 grid gap-1">
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-5" aria-label={`Photos of ${name}`}>
        {photos.slice(0, 6).map((ph, i) => (
          <li key={ph.name} className="w-[88%] shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host */}
            <img src={photoSrc(ph.name, 900)} alt={`${name}, photo ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} className="aspect-[4/3] w-full rounded-2xl bg-bg-2 object-cover" width={900} height={675} />
            <figcaption className="mt-1 truncate text-xs text-muted">Photo: {ph.authorAttributions.map((a) => a.displayName).join(", ") || "Google"} · Google Maps</figcaption>
          </li>
        ))}
      </ul>
    </figure>
  );
}
