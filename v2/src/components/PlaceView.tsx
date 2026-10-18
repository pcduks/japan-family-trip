"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { youtubeId } from "@/lib/google/ids";
import { placeGuide, REPUTATION } from "@/lib/placesGuide";
import { PlacePrefs } from "./PlacePrefs";
import type { PlaceDetails, Size } from "@/lib/types";
import { Comments } from "./Comments";
import { RegionCover } from "./RegionCover";
import { reportTabForRegion } from "./PlanReport";
import { fmtDay, fmtRange } from "@/lib/dates";
import { routeVisits } from "@/lib/days";
import { useStore } from "./providers";
import { Avatar, Back, Checked, Page, PageHeader, RegionDot, Section } from "./ui";

const SIZE_LABEL: Record<Size, string> = { main: "Half a day", short: "An hour or two", day_trip: "A whole day", evening: "Evening", meal: "Meal" };

export function PlaceView({ id }: { id: string }) {
  const { snapshot, me, isPlanner, toggleReaction, demo } = useStore();
  const p = snapshot.places.find((x) => x.id === id);
  const [fetched, setFetched] = useState<{ id: string; details: PlaceDetails | null; error: string | null } | null>(null);
  const details = fetched?.id === id ? fetched.details : null;
  const detailsError = fetched?.id === id ? fetched.error : null;
  const [videoQ, setVideoQ] = useState("");
  const [videos, setVideos] = useState<{ id: string; title: string; channel: string; thumbnail: string }[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/places/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
        return r.json();
      })
      .then((d: PlaceDetails) => !cancelled && setFetched({ id, details: d, error: null }))
      .catch((e: Error) => !cancelled && setFetched({ id, details: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!p)
    return (
      <Page>
        <Back href="/places">Japan</Back>
        <p className="text-muted">No such place.</p>
      </Page>
    );
  const region = snapshot.regions.find((r) => r.id === p.region);
  const hearts = snapshot.reactions.filter((r) => r.target_type === "place" && r.target_id === p.id && r.kind === "heart");
  const mine = hearts.some((r) => r.traveller_id === me?.travellerId);
  const mustBy = snapshot.votes.filter((v) => v.kind === "mustdo" && ((v.value as { places?: string[] }).places ?? []).includes(p.id)).map((v) => v.traveller_id);
  const vid = video ?? youtubeId(p.links?.video) ?? youtubeId(region?.videos?.[0]);
  const staysHere = snapshot.versions.find((v) => v.status === "plan")?.stays.filter((s) => s.region === p.region) ?? [];
  const plannedOn = routeVisits(snapshot).get(p.id) ?? [];
  const guideTab = reportTabForRegion(p.region);
  const guide = placeGuide(p.id);

  async function searchVideos() {
    const r = await fetch(`/api/videos/search?q=${encodeURIComponent(videoQ || `${p!.name} ${region?.name ?? ""} Japan`)}`);
    if (r.ok) setVideos(await r.json());
  }

  return (
    <Page>
      <Back href={`/areas/${p.region}`}>{region?.name ?? "Places"}</Back>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5">
            <RegionDot id={p.region} size={8} /> {region?.name} · {p.kind} · {SIZE_LABEL[p.size]}
          </span>
        }
        title={p.name}
        action={
          <button className={`btn btn-sm shrink-0 ${mine ? "btn-primary" : ""}`} onClick={() => toggleReaction("place", p.id, "heart")} aria-pressed={mine}>
            ♥ {hearts.length || ""}
          </button>
        }
      >
        {p.why ? <p className="text-[1.05rem]">{p.why}</p> : null}
        <p className="flex flex-wrap gap-1.5 pt-1 text-sm">
          {plannedOn.length ? (
            plannedOn.map((x, i) => (
              <span key={i} className="chip text-ok">
                On the route · {fmtDay(x.date)} {x.slot === "early" ? "dawn" : x.slot}
                {x.crew === "early" ? " · early start, optional" : x.crew === "easy" ? " · easy option" : ""}
              </span>
            ))
          ) : (
            <span className="chip text-muted">Not on the route yet · a candidate near {region?.name ?? "our base"}</span>
          )}
        </p>
        <div className="pt-1">
          <PlacePrefs placeId={p.id} />
        </div>
      </PageHeader>

      {details?.photos.length ? (
        <div className="no-scrollbar -mx-4 -mt-2 flex snap-x gap-2 overflow-x-auto px-4">
          {details.photos.map((ph) => (
            <figure key={ph.name} className="relative w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl bg-bg-2 shadow-[var(--glow)] sm:w-[60%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photo/${ph.name}?w=800`} alt={`${p.name} photo`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <figcaption className="absolute right-1 bottom-1 rounded bg-black/55 px-1.5 py-0.5 text-[0.65rem] text-white">
                {ph.authorAttributions.map((a, i) => (
                  <a key={i} href={a.uri} target="_blank" rel="noreferrer" className="text-white">
                    {a.displayName}
                  </a>
                ))}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : detailsError ? (
        <p className="text-sm text-muted">Google details unavailable: {detailsError}</p>
      ) : (
        <RegionCover regionId={p.region} className="aspect-[4/3] w-full rounded-2xl" />
      )}

      {guide ? (
        <section className="card grid gap-2 p-4" aria-label="What to expect">
          <p className="flex flex-wrap items-center gap-2">
            <span className={`chip ${guide.reputation === "photo" ? "text-warn" : "text-ok"}`}>{REPUTATION[guide.reputation] ?? guide.reputation}</span>
          </p>
          <p>
            <b>Famous for:</b> {guide.famous_for}
          </p>
          <p className="text-ink-2">{guide.expect}</p>
          {guide.links.length ? (
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {guide.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              ))}
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="card grid gap-3 p-4">
        <dl className="grid gap-2 text-sm">
          <Row k="Hours">
            {p.hours ?? "—"}
            {details?.weekdayHours ? (
              <details className="mt-1">
                <summary className="cursor-pointer text-muted">Google hours</summary>
                <ul className="pl-3 text-muted">
                  {details.weekdayHours.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Row>
          {p.closed_weekdays.length ? <Row k="Closed">{p.closed_weekdays.join(", ")}</Row> : null}
          {p.closures.length ? (
            <Row k="Closures">
              <ul className="grid gap-0.5">
                {p.closures.map((c, i) => (
                  <li key={i}>
                    <b>
                      {c.start.slice(5).replace("-", "/")}–{c.end.slice(5).replace("-", "/")}
                    </b>{" "}
                    {c.note}{" "}
                    {c.source ? (
                      <a href={c.source} target="_blank" rel="noreferrer" className="text-muted">
                        source
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Row>
          ) : null}
          <Row k="For Fernanda">
            <span className={p.status === "avoid_for_her" ? "text-danger" : p.effort_for_her === "high" ? "text-danger" : p.effort_for_her === "moderate" ? "text-warn" : "text-ok"}>
              {p.status === "avoid_for_her" ? "Avoid" : `${p.effort_for_her} effort`}
            </span>
            {p.effort_note ? ` · ${p.effort_note}` : ""}
          </Row>
          {p.price ? <Row k="Price">{p.price}</Row> : null}
          {p.booking ? <Row k="Booking">{p.booking}</Row> : null}
          {p.food ? (
            <>
              <Row k="What">{[p.food.type, p.food.price_band].filter(Boolean).join(" · ") || "—"}</Row>
              <Row k="Says who">
                {p.food.recommended_by ? <b>{p.food.recommended_by}</b> : <span className="text-muted">source not recorded</span>}
                {p.links?.source ? (
                  <>
                    {" "}
                    <a href={p.links.source} target="_blank" rel="noreferrer" className="text-muted">
                      read the recommendation
                    </a>
                  </>
                ) : null}
              </Row>
              {p.food.group_of_6 ? <Row k="Six of us">{p.food.group_of_6}</Row> : null}
              {p.food.pregnancy_note ? (
                <Row k={/raw|pregnan|her\b|sushi|sashimi|alcohol|smok/i.test(p.food.pregnancy_note) ? "For Fernanda" : "Note"}>
                  <span className="text-warn">{p.food.pregnancy_note}</span>
                </Row>
              ) : null}
            </>
          ) : null}
          {staysHere.length ? (
            <Row k="We’re here">
              {staysHere.map((s) => fmtRange(s.from, s.to)).join(", ")} on the route
            </Row>
          ) : null}
          {mustBy.length ? (
            <Row k="Must-do for">
              <span className="flex gap-1">
                {mustBy.map((t) => (
                  <Avatar key={t} traveller={t} travellers={snapshot.travellers} size={22} />
                ))}
              </span>
            </Row>
          ) : null}
        </dl>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {p.links?.source ? (
            <a href={p.links.source} target="_blank" rel="noreferrer">
              Source
            </a>
          ) : null}
          <a href={details?.googleMapsUri ?? p.links?.map ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + " " + (region?.name ?? ""))}`} target="_blank" rel="noreferrer">
            Google Maps
          </a>
          {p.links?.instagram ? (
            <a href={p.links.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
          ) : null}
          {p.links?.photos ? (
            <a href={p.links.photos} target="_blank" rel="noreferrer">
              More photos
            </a>
          ) : null}
        </p>
        <Checked checkedAt={p.checked_at} verified={p.verified} updatedBy={p.updated_by} />
      </div>

      {details?.rating ? (
        <Section title={`★ ${details.rating} on Google`} aside={`${details.userRatingCount?.toLocaleString()} ratings`}>
          <ul className="grid gap-3">
            {details.reviews.map((r, i) => (
              <li key={i} className="grid gap-1 text-sm">
                <p className="flex items-center gap-2">
                  {r.author.photoUri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.author.photoUri} alt="" className="size-6 rounded-full" />
                  ) : null}
                  <a href={r.author.uri} target="_blank" rel="noreferrer" className="font-semibold">
                    {r.author.displayName}
                  </a>
                  <span className="text-muted">
                    {"★".repeat(Math.round(r.rating))} · {r.relativeTime}
                  </span>
                </p>
                <p className="line-clamp-4 text-ink-2">{r.text}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Reviews from Google.{" "}
            {details.googleMapsUri ? (
              <a href={details.googleMapsUri} target="_blank" rel="noreferrer">
                See all on Google Maps
              </a>
            ) : null}
          </p>
        </Section>
      ) : null}

      {vid ? (
        <Section title="Video">
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe src={`https://www.youtube-nocookie.com/embed/${vid}`} title={`${p.name} video`} className="size-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
          </div>
        </Section>
      ) : null}

      {isPlanner ? (
        <Section title="Find a video" aside="planners · YouTube search">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              searchVideos();
            }}
          >
            <input className="min-w-0 flex-1" placeholder={`${p.name} ${region?.name ?? ""}`} value={videoQ} onChange={(e) => setVideoQ(e.target.value)} aria-label="Video search" />
            <button className="btn btn-sm">Search</button>
          </form>
          {videos.length ? (
            <ul className="grid gap-2">
              {videos.map((v) => (
                <li key={v.id} className="flex items-center gap-2 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt="" className="w-20 rounded" />
                  <span className="flex-1">
                    {v.title} <span className="text-muted">· {v.channel}</span>
                  </span>
                  <button className="btn btn-sm" onClick={() => setVideo(v.id)}>
                    Preview
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {video ? (
            <p className="text-xs text-muted">
              To keep this video on the place, {demo ? "set links.video in trip-data.json" : "import it through the API or set links.video in trip-data.json"}: https://www.youtube.com/watch?v={video}
            </p>
          ) : null}
        </Section>
      ) : null}

      <Comments targetType="place" targetId={p.id} />
      <p className="text-xs text-muted">
        <Link href={`/areas/${p.region}`}>More in {region?.name}</Link>
        {guideTab ? (
          <>
            {" "}
            · <Link href={`/plan?tab=${guideTab}`}>Read the {region?.name} guide</Link>
          </>
        ) : null}
      </p>
    </Page>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <dt className="font-semibold text-muted">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
