"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState } from "react";
import type { FoodMark } from "@/lib/family";
import { foodMarkId } from "@/lib/family";
import type { SpotHit } from "@/lib/google/places";
import { directionsUrl, mapsSearchUrl } from "@/lib/links";
import type { Activity } from "@/lib/plan";
import { todayInJapan } from "@/lib/plan";
import { deleteRow, insertRow, upsertRow } from "@/lib/tables";
import { CAT_LABEL, HOODS, markSlug, nyNote, routeByN, spotActivity, type Spot, type TokyoDay } from "@/lib/tokyo";
import { formatDay, weekday } from "@/lib/trip";
import type { PlaceDetails, Traveller } from "@/lib/types";
import { photoSrc } from "../usePlaceDetails";
import { Avatar, firstName } from "../ui";
import { CatIcon } from "./CatIcon";
import { useSpotDetails } from "./useTokyoSpots";

export interface SpotSheetProps {
  spot: Spot | null;
  hit: SpotHit | undefined;
  marks: FoodMark[];
  planned: Activity[];
  days: TokyoDay[];
  planId: string | null;
  /** The day this spot's route is pinned to, for New Year notes. */
  routeDate: string | null;
  me: { travellerId: string; name: string } | null;
  travellers: Traveller[];
  color: string;
  onClose: () => void;
}

/** Bottom sheet for one guide spot: Google photos, hours and reviews, the family's marks, and "put it on a day". */
export function SpotSheet(p: SpotSheetProps) {
  return (
    <Dialog.Root open={!!p.spot} onOpenChange={(o) => !o && p.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl border border-rule bg-paper shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[30rem] sm:rounded-none sm:rounded-l-2xl"
          aria-describedby={undefined}
        >
          {p.spot ? <Body key={p.spot.id} {...p} spot={p.spot} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body(p: SpotSheetProps & { spot: Spot }) {
  const { spot, hit, me } = p;
  const details = useSpotDetails(spot.id);
  const google = details.status === "ok" ? details.data : null;
  const hood = HOODS[spot.hood];
  const route = routeByN(spot.route);
  const mine = me ? p.marks.find((m) => m.traveller_id === me.travellerId) : undefined;
  const idx = new Map(p.travellers.map((t, i) => [t.id, i]));
  const names = new Map(p.travellers.map((t) => [t.id, t.name]));
  const ny = nyNote(spot, p.routeDate);
  const [adding, setAdding] = useState(false);
  const mapsHref = google?.googleMapsUri ?? hit?.googleMapsUri ?? mapsSearchUrl({ query: spot.query, googlePlaceId: hit?.placeId ?? null });
  const photos = google?.photos ?? [];
  const jaDay = new Date(todayInJapan() + "T00:00:00Z").getUTCDay();

  async function mark(status: FoodMark["status"] | null) {
    if (!me) return;
    const id = foodMarkId(me.travellerId, markSlug(spot.id));
    if (!status || mine?.status === status) return deleteRow("food_marks", id);
    await upsertRow("food_marks", { id, traveller_id: me.travellerId, place_slug: markSlug(spot.id), status, rating: null, updated_at: new Date().toISOString() });
  }

  async function addToDay(date: string) {
    if (!p.planId) return;
    await insertRow("activities", spotActivity(spot, p.planId, date, 50));
    setAdding(false);
  }

  return (
    <>
      <div className="flex items-start gap-3 border-b border-rule px-5 pt-3 pb-3">
        <div className="min-w-0 flex-1">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-rule sm:hidden" aria-hidden="true" />
          <p className="eyebrow flex items-center gap-1.5">
            <CatIcon cat={spot.cat} size={13} /> {CAT_LABEL[spot.cat]} · {hood?.name}
            {route ? ` · Rota ${route.n}` : " · Descanso"}
          </p>
          <Dialog.Title className="text-[1.9rem] leading-tight">{spot.name}</Dialog.Title>
          {google?.rating ? (
            <p className="mt-0.5 text-sm">
              <span className="font-bold">★ {google.rating.toFixed(1)}</span> <span className="text-muted">({google.userRatingCount?.toLocaleString("pt-BR")} no Google)</span>
              {google.priceLevel ? <span className="text-muted"> · {"¥".repeat(google.priceLevel)}</span> : null}
            </p>
          ) : hit?.type ? (
            <p className="mt-0.5 text-sm text-muted">{hit.type}</p>
          ) : null}
        </div>
        <Dialog.Close className="btn btn-sm shrink-0" aria-label="Fechar">
          ✕
        </Dialog.Close>
      </div>

      <div className="grid gap-5 overflow-y-auto overscroll-contain px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Photos spot={spot} hit={hit} photos={photos} status={details.status} error={details.status === "error" ? details.error : null} />

        {spot.note ? <p className="hand text-xl">{spot.note}</p> : null}
        {google?.summary ? <p className="text-[1.02rem]">{google.summary}</p> : null}
        {ny ? (
          <p className="rounded-xl p-3 text-sm" style={{ background: ny.level === "warn" ? "var(--closure)" : "color-mix(in srgb, var(--amber) 12%, transparent)" }}>
            <b className={ny.level === "warn" ? "text-vermilion" : "text-amber"}>{p.routeDate ? formatDay(p.routeDate) : ""}:</b> {ny.text}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn"
            aria-pressed={mine?.status === "want"}
            disabled={!me}
            onClick={() => mark("want")}
            style={mine?.status === "want" ? { background: "var(--vermilion)", borderColor: "var(--vermilion)", color: "var(--accent-ink)" } : undefined}
          >
            {mine?.status === "want" ? "♥ Quero ir" : "♡ Quero ir"}
          </button>
          <button
            type="button"
            className="btn"
            aria-pressed={mine?.status === "been"}
            disabled={!me}
            onClick={() => mark("been")}
            style={mine?.status === "been" ? { background: "var(--pine)", borderColor: "var(--pine)", color: "var(--accent-ink)" } : undefined}
          >
            {mine?.status === "been" ? "✓ Já fomos" : "Já fomos"}
          </button>
          <a className="btn btn-primary col-span-2" href={mapsHref} target="_blank" rel="noreferrer">
            Abrir no Google Maps
          </a>
          {hood ? (
            <a className="btn" href={directionsUrl({ query: hood.station, googlePlaceId: null }, { query: spot.query, googlePlaceId: hit?.placeId ?? null }, "walking")} target="_blank" rel="noreferrer">
              A pé desde {hood.station.replace(/ Station$/, "")}
            </a>
          ) : null}
          {google?.website ? (
            <a className="btn" href={google.website} target="_blank" rel="noreferrer">
              Site
            </a>
          ) : (
            <span />
          )}
        </div>

        {p.marks.length ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {p.marks.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1">
                <Avatar name={names.get(m.traveller_id) ?? "?"} index={idx.get(m.traveller_id) ?? 0} size={22} />
                {firstName(names.get(m.traveller_id) ?? "")} {m.status === "been" ? "já foi" : "quer ir"}
              </span>
            ))}
          </p>
        ) : null}

        <section className="grid gap-2" aria-label="No plano">
          <h3 className="text-[1.35rem]">No plano</h3>
          {p.planned.length ? (
            <ul className="grid gap-1 text-sm">
              {p.planned.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span>
                    <b>{weekday(a.date)} {formatDay(a.date)}</b>
                    {a.time ? ` · ${a.time}` : ""}
                  </span>
                  <span className="flex gap-3 text-xs">
                    <Link href={`/plan/days?plan=${a.plan_id}&d=${a.date}`} className="underline">
                      Ver o dia
                    </Link>
                    {me ? (
                      <button type="button" className="underline" onClick={() => deleteRow("activities", a.id)}>
                        Tirar
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {!p.planId ? (
            <p className="text-sm text-muted">Quando houver um plano com Tokyo, dá para pôr este lugar num dia.</p>
          ) : !p.days.length ? (
            <p className="text-sm text-muted">Tokyo não está no plano atual. Se entrar, este lugar pode ir para um dia.</p>
          ) : adding ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Escolha o dia">
              {p.days.map((d) => (
                <button key={d.date} type="button" className="chip !min-h-9 text-sm" onClick={() => addToDay(d.date)}>
                  {weekday(d.date)} {formatDay(d.date)}
                  {d.arrival ? " · chegada" : d.departure ? " · manhã" : ""}
                </button>
              ))}
              <button type="button" className="chip !min-h-9 text-sm text-muted" onClick={() => setAdding(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-sm justify-self-start" disabled={!me} onClick={() => setAdding(true)}>
              + Pôr num dia em Tokyo
            </button>
          )}
        </section>

        {google?.openingHours?.weekday.length ? (
          <section className="simple-hide grid gap-1" aria-label="Horários">
            <h3 className="text-[1.35rem]">
              Horários{" "}
              {google.openingHours.openNow != null ? (
                <span className={`text-sm ${google.openingHours.openNow ? "text-pine" : "text-vermilion"}`}>{google.openingHours.openNow ? "· aberto agora" : "· fechado agora"}</span>
              ) : null}
            </h3>
            <ul className="grid gap-0.5 text-sm">
              {google.openingHours.weekday.map((line, i) => {
                // Google lists Monday first; JS weekday 0 is Sunday.
                const isToday = (i + 1) % 7 === jaDay;
                return (
                  <li key={line} className={isToday ? "font-bold" : "text-ink-2"}>
                    {line}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {google?.address ? <p className="text-xs text-muted">{google.address}</p> : null}

        {google?.reviews.length ? (
          <section className="simple-hide grid gap-2" aria-label="Avaliações do Google">
            <h3 className="text-[1.35rem]">O que dizem</h3>
            <ul className="grid gap-2">
              {google.reviews.slice(0, 3).map((r, i) => (
                <li key={i} className="card grid gap-1 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{r.author.displayName}</span>
                    <span className="ml-auto text-muted" aria-label={`${r.rating} de 5`}>
                      {"★".repeat(Math.round(r.rating))}
                    </span>
                  </div>
                  <p className="line-clamp-4 whitespace-pre-line">{r.text}</p>
                  <p className="text-xs text-muted">{r.relativeTime}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              Avaliações do Google Maps, em inglês.{" "}
              {google.googleMapsUri ? (
                <a href={google.googleMapsUri} target="_blank" rel="noreferrer" className="underline">
                  Ver todas
                </a>
              ) : null}
            </p>
          </section>
        ) : null}
      </div>
    </>
  );
}

function Photos({ spot, hit, photos, status, error }: { spot: Spot; hit: SpotHit | undefined; photos: PlaceDetails["photos"]; status: string; error: string | null }) {
  if (status === "loading" || status === "idle") {
    return hit?.photo ? (
      // eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host
      <img src={photoSrc(hit.photo, 900)} alt={spot.name} className="-mx-1 aspect-[4/3] w-[calc(100%+0.5rem)] max-w-none rounded-xl bg-soft object-cover" width={900} height={675} />
    ) : (
      <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-soft" aria-label="Carregando fotos" />
    );
  }
  if (error && /not set|not configured/i.test(error)) return null;
  if (error) return <p className="rounded-xl border border-rule bg-soft p-3 text-sm text-muted">Fotos e avaliações não estão disponíveis agora ({error}).</p>;
  if (!photos.length) return null;
  return (
    <figure className="-mx-4 grid gap-1">
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-4" aria-label={`Fotos de ${spot.name}`}>
        {photos.slice(0, 6).map((ph, i) => (
          <li key={ph.name} className="w-[88%] shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host */}
            <img src={photoSrc(ph.name, 900)} alt={`${spot.name}, foto ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} className="aspect-[4/3] w-full rounded-xl bg-soft object-cover" width={900} height={675} />
            <figcaption className="mt-1 truncate text-xs text-muted">
              Foto: {ph.authorAttributions.map((a) => a.displayName).join(", ") || "Google"} · Google Maps
            </figcaption>
          </li>
        ))}
      </ul>
    </figure>
  );
}
