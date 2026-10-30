"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtDay } from "@/lib/dates";
import { placeId } from "@/lib/food";
import type { DeepCity, DeepPlace } from "@/lib/foodDeep";
import { CHANNEL_LABEL, critic, mapsUrl, openOn, PREG_MARK, SEVEN_MARK, shortArea } from "@/lib/foodView";
import { useStore } from "../providers";
import { TabelogTile } from "./Marks";

/** What to say when booking a place with raw courses. */
const BOOKING_NOTE = "同行者が一名妊娠中のため、生ものは火を通したものに変更をお願いします。";

/** A restaurant, as a sheet over its city: why go, what to order, what Fernanda can have, and how to book. */
export function PlaceSheet({ city, place: p, dates, onClose }: { city: DeepCity; place: DeepPlace; dates: string[]; onClose: () => void }) {
  const { snapshot, me, toggleReaction } = useStore();
  const id = placeId(city.slug, p.name);
  const saved = snapshot.reactions.some((r) => r.target_type === "food" && r.target_id === id && r.kind === "heart" && r.traveller_id === me?.travellerId);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {
      /* the share sheet was closed */
    }
  };

  const preg = PREG_MARK[p.pregnancy ?? "unknown"];
  const seven = p.seven ? SEVEN_MARK[p.seven] : null;
  const closed = dates.filter((d) => openOn(p, d) === "closed");
  const open = dates.filter((d) => openOn(p, d) === "open");

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button aria-label="Close" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[24px] bg-card shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-2">
          <span className="w-14" />
          <span className="h-[5px] w-10 rounded-full bg-rule" />
          <button onClick={onClose} className="min-h-10 w-14 text-right text-sm font-semibold text-muted">
            Close
          </button>
        </div>
        <div className="grid gap-4 overflow-y-auto px-5 pt-1 pb-5">
          <div className="grid grid-cols-[1fr_56px] items-start gap-3">
            <div className="grid gap-0.5">
              <h2 id="sheet-title" className="font-display text-[1.8rem] leading-[1.1] font-semibold">
                {p.name}
              </h2>
              {p.name_ja ? <span className="jp text-[1.1rem] text-ink-2">{p.name_ja}</span> : null}
              <span className="text-[0.85rem] text-muted">{[p.genre, shortArea(p.area), p.price].filter(Boolean).join(" · ")}</span>
            </div>
            <TabelogTile score={p.tabelog?.score} awards={p.tabelog?.awards} size={56} />
          </div>

          {p.why ? <p className="font-display text-[1.08rem] leading-relaxed">{p.why}</p> : null}

          <dl className="grid gap-3 text-[0.92rem]">
            {p.order ? <Fact k="Order">{p.order}</Fact> : null}
            <Fact k="Fernanda">
              <span className={`block font-semibold ${preg.cls}`}>
                {preg.glyph} {preg.label}
              </span>
              {p.pregnancy_note ? capital(p.pregnancy_note.replace(/^For Fernanda:\s*/i, "")) : null}
            </Fact>
            {seven || p.group ? (
              <Fact k="Seven of us">
                {seven ? <span className="font-semibold">{seven.long}. </span> : null}
                {p.group}
              </Fact>
            ) : null}
            {dates.length ? (
              <Fact k="Our dates">
                {closed.length ? <span className="font-semibold">Closed {closed.map((d) => fmtDay(d)).join(", ")}. </span> : open.length ? <span className="font-semibold">Open on our dates. </span> : null}
                {p.dec_jan}
              </Fact>
            ) : null}
          </dl>

          <HowToBook place={p} id={id} />

          {p.critics?.length ? (
            <div className="grid gap-2">
              <p className="eyebrow">Who recommends it</p>
              <ul className="grid gap-2">
                {p.critics.map((c, i) => {
                  const who = critic(c.who);
                  return (
                    <li key={i} className="text-[0.88rem] text-ink-2">
                      <b className="text-ink">{who.name}</b>
                      {c.note ? <> · {c.note}</> : null}
                      {c.url ? (
                        <>
                          {" "}
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-accent">
                            source
                          </a>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {p.tabelog?.awards ? <p className="text-xs text-muted">Tabelog: {p.tabelog.awards}</p> : null}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-rule px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <a href={mapsUrl(p.query ?? `${p.name} ${city.name}`)} target="_blank" rel="noreferrer" className="btn">
            Map
          </a>
          <button className={`btn ${saved ? "border-accent text-accent" : ""}`} aria-pressed={saved} onClick={() => toggleReaction("food", id, "heart")}>
            {saved ? "♥ Saved" : "♡ Save"}
          </button>
          <button className="btn" onClick={share}>
            {shared ? "Copied" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Fact({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.2rem_1fr] gap-2">
      <dt className="text-[0.72rem] font-bold tracking-[0.08em] text-muted uppercase">{k}</dt>
      <dd className="min-w-0 text-ink-2">{children}</dd>
    </div>
  );
}

/** How and when it books, the links to do it, and the line to paste about Fernanda. Booking itself happens on the restaurant's own channel. */
function HowToBook({ place: p, id }: { place: DeepPlace; id: string }) {
  const { snapshot } = useStore();
  const [copied, setCopied] = useState(false);
  const deadline = snapshot.deadlines.find((d) => d.place === id && !d.done);
  const walkIn = p.booking_channel === "walk-in" || p.booking_channel === "queue";
  const book = p.website ?? p.tabelog?.url;
  if (!p.booking && !book && !deadline) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(BOOKING_NOTE);
      setCopied(true);
    } catch {
      /* no clipboard: the text is on screen to copy by hand */
    }
  };
  return (
    <section className="grid gap-2.5 rounded-2xl bg-bg-2 p-4" aria-label="How to book">
      <div className="flex items-baseline justify-between gap-2">
        <b>{walkIn ? "No booking: walk in" : "How to book"}</b>
        {deadline ? <span className="text-xs font-bold text-accent">{fmtDay(deadline.date, false)}</span> : p.booking_opens ? <span className="text-xs font-bold text-accent">{p.booking_opens}</span> : null}
      </div>
      {deadline ? <p className="text-[0.88rem] font-semibold">{deadline.item}</p> : null}
      {p.booking ? (
        <p className="text-[0.88rem] text-ink-2">
          {p.booking_channel && !new RegExp(`^${p.booking_channel}`, "i").test(p.booking) && !/^by /i.test(p.booking) ? <b>{CHANNEL_LABEL[p.booking_channel]}. </b> : null}
          {p.booking}
        </p>
      ) : null}
      {(p.pregnancy === "careful" || p.pregnancy === "avoid") && !walkIn ? (
        <div className="grid gap-1 rounded-xl bg-card p-3">
          <span className="text-xs text-muted">Add to the booking note</span>
          <span lang="ja" className="jp text-[0.95rem]">
            {BOOKING_NOTE}
          </span>
          <span className="text-xs text-ink-2">“One of us is pregnant: please swap raw dishes for cooked ones.”</span>
          <button onClick={copy} className="justify-self-start text-xs font-semibold text-accent">
            {copied ? "Copied ✓" : "Copy the Japanese"}
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {book ? (
          <a href={book} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">
            {p.website ? "Restaurant’s site" : "Open on Tabelog"}
          </a>
        ) : null}
        {p.website && p.tabelog?.url ? (
          <a href={p.tabelog.url} target="_blank" rel="noreferrer" className="btn btn-sm">
            Tabelog
          </a>
        ) : null}
        <Link href="/food/staff" className="btn btn-sm">
          Show staff
        </Link>
      </div>
    </section>
  );
}

