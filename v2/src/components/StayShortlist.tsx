"use client";

import { useState } from "react";
import { lodgingTarget, type Shortlist, type ShortlistPlace } from "@/lib/shortlists";
import { Comments } from "./Comments";
import { useStore } from "./providers";

const TIER: Record<ShortlistPlace["tier"], string> = {
  budget: "Budget",
  mid: "Mid-range",
  splurge: "Splurge",
};

/**
 * The places to stay we found for one stop, best first for the seven of us:
 * how we would sleep, what matters for Fernanda, New Year, price and links.
 * Everyone can mark a place and talk it over; the enquiry email is ready to copy.
 */
export function StayShortlist({ list, stopKey }: { list: Shortlist; stopKey: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? list.candidates : list.candidates.slice(0, 4);
  return (
    <section className="grid gap-2" aria-label="Places to stay">
      <p className="eyebrow">
        Places to stay · {list.candidates.length} for {list.dates}
      </p>
      <p className="text-ink-2">{list.summary}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((p, i) => (
          <PlaceCard key={p.id} p={p} n={i + 1} stopKey={stopKey} />
        ))}
      </ul>
      {list.candidates.length > shown.length ? (
        <button className="btn btn-sm justify-self-start" onClick={() => setAll(true)}>
          Show {list.candidates.length - shown.length} more
        </button>
      ) : null}
      <p className="text-xs text-muted">
        Checked{" "}
        {new Date(list.checked).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
        . Prices and rooms change fast; the links show today’s.
      </p>
      {list.notes?.map((n) => (
        <details key={n.title} className="card p-3">
          <summary className="cursor-pointer font-semibold">{n.title}</summary>
          <p className="pt-2 text-ink-2">{n.text}</p>
        </details>
      ))}
      <Enquiry en={list.enquiry.en} ja={list.enquiry.ja} />
      <details className="card p-3">
        <summary className="cursor-pointer font-semibold">Talk it over</summary>
        <div className="pt-2">
          <Comments targetType="stay" targetId={`lodging:${stopKey}`} />
        </div>
      </details>
    </section>
  );
}

function PlaceCard({ p, n, stopKey }: { p: ShortlistPlace; n: number; stopKey: string }) {
  const { snapshot, me, toggleReaction } = useStore();
  const target = lodgingTarget(stopKey, p.id);
  const who = (kind: "heart" | "not_for_us") => snapshot.reactions.filter((r) => r.target_type === "lodging" && r.target_id === target && r.kind === kind);
  const names = (rs: { traveller_id: string }[]) => rs.map((r) => snapshot.travellers.find((t) => t.id === r.traveller_id)?.name.split(" ")[0] ?? r.traveller_id).join(", ");
  const likes = who("heart");
  const nots = who("not_for_us");
  const mine = (rs: { traveller_id: string }[]) => rs.some((r) => r.traveller_id === me?.travellerId);
  const facts: [string, string][] = [
    ["Rooms", p.rooms_for_us],
    ["Beds", p.beds],
    ["Lift", p.lift],
    ["Bath", p.private_bath],
    ["New Year", p.new_year],
    ["Price", p.price],
    ["Cancelling", p.cancellation],
    ...(p.licence ? ([["Licence", p.licence]] as [string, string][]) : []),
  ];
  return (
    <li className="card grid content-start gap-1.5 p-3">
      <div className="flex items-start justify-between gap-2">
        <b className="leading-snug text-ink">
          {n}. {p.name}
        </b>
        <span className="chip shrink-0">{TIER[p.tier]}</span>
      </div>
      <p className="text-xs text-muted">
        {p.kind} · {p.area}
        {p.in_pick_area ? "" : " · outside our pick"}
      </p>
      <p className="text-ink-2">{p.why}</p>
      <p className="text-ink-2">
        <b>For Fernanda:</b> {p.for_fernanda}
      </p>
      {p.watch_out ? (
        <p className="text-ink-2">
          <span className="text-warn">!</span> {p.watch_out}
        </p>
      ) : null}
      <details>
        <summary className="cursor-pointer text-xs text-muted">Rooms, beds, price and rules</summary>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 pt-1 text-xs">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </details>
      <p className="flex flex-wrap gap-2">
        {p.book.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="btn btn-sm">
            {l.label}
          </a>
        ))}
      </p>
      {me ? (
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <button className={`btn btn-sm ${mine(likes) ? "btn-primary" : ""}`} aria-pressed={mine(likes)} onClick={() => toggleReaction("lodging", target, "heart")}>
            ♥ We like it
          </button>
          <button className="btn btn-sm" aria-pressed={mine(nots)} onClick={() => toggleReaction("lodging", target, "not_for_us")}>
            {mine(nots) ? "✓ " : ""}Not for us
          </button>
        </p>
      ) : null}
      {likes.length || nots.length ? (
        <p className="text-xs text-muted">
          {likes.length ? <span className="text-ok">♥ {names(likes)}</span> : null}
          {likes.length && nots.length ? " · " : ""}
          {nots.length ? <span>Not for {names(nots)}</span> : null}
        </p>
      ) : null}
    </li>
  );
}

/** The email to send a place, in English and Japanese, with [PLACE] for its name. */
function Enquiry({ en, ja }: { en: string; ja: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {}
  }
  return (
    <details className="card p-3">
      <summary className="cursor-pointer font-semibold">Email to send a place</summary>
      <div className="grid gap-2 pt-2">
        <p className="text-xs text-muted">
          Put the place’s name where it says [PLACE]. Small Japanese inns answer the Japanese one faster; send both in one email. Book only on the place’s own site or a big booking site, and never pay
          through a link someone sends you: fake “confirm your booking” messages went out this autumn after a ryokan booking system was hacked.
        </p>
        {(
          [
            ["English", en],
            ["Japanese", ja],
          ] as const
        ).map(([label, text]) => (
          <div key={label} className="grid gap-1">
            <div className="flex items-center justify-between gap-2">
              <b>{label}</b>
              <button className="btn btn-sm" onClick={() => copy(label, text)}>
                {copied === label ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="rounded-lg bg-bg p-2 text-xs whitespace-pre-wrap text-ink-2">{text}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
