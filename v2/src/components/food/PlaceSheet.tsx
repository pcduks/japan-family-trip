"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtDay, weekday } from "@/lib/dates";
import { isConfirmed, placeId } from "@/lib/food";
import type { DeepCity, DeepPlace } from "@/lib/foodDeep";
import { CHANNEL_LABEL, critic, mapsUrl, openOn, PREG_MARK, SEVEN_MARK, shortArea } from "@/lib/foodView";
import type { FoodBooking } from "@/lib/types";
import { useStore } from "../providers";
import { TabelogTile } from "./Marks";

const STEPS: { status: FoodBooking["status"] | null; label: string }[] = [
  { status: null, label: "Not yet" },
  { status: "idea", label: "Picked" },
  { status: "held", label: "Requested" },
  { status: "booked", label: "Booked" },
];

export function BookingStatus({ b }: { b: FoodBooking }) {
  const when = b.date ? `${fmtDay(b.date)}${b.meal ? ` ${b.meal}` : ""}${b.time ? ` ${b.time}` : ""}` : "";
  if (isConfirmed(b)) return <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[0.72rem] font-bold text-ok">予約 Booked{when ? ` · ${when}` : ""}</span>;
  if (b.status === "held") return <span className="rounded-full bg-ask/15 px-2 py-0.5 text-[0.72rem] font-bold text-ask">Requested{when ? ` · ${when}` : ""}</span>;
  return <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[0.72rem] font-bold text-ink-2">Picked{when ? ` · ${when}` : ""}</span>;
}

/** A restaurant, as a sheet over its city: why, what Fernanda can have, seven of us, our dates, what to order, and the booking. */
export function PlaceSheet({ city, place: p, dates, onClose }: { city: DeepCity; place: DeepPlace; dates: string[]; onClose: () => void }) {
  const { snapshot, me, toggleReaction } = useStore();
  const id = placeId(city.slug, p.name);
  const saved = snapshot.reactions.some((r) => r.target_type === "food" && r.target_id === id && r.kind === "heart" && r.traveller_id === me?.travellerId);
  const savers = snapshot.reactions.filter((r) => r.target_type === "food" && r.target_id === id && r.kind === "heart").length;
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
  const map = mapsUrl(p.query ?? `${p.name} ${city.name}`);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button aria-label="Close" className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-[22px] bg-card shadow-2xl">
        <div className="grid place-items-center pt-2">
          <span className="h-[5px] w-10 rounded-full bg-rule" />
        </div>
        <div className="grid gap-3 overflow-y-auto px-4 pt-2 pb-4">
          <div className="grid grid-cols-[1fr_56px] items-start gap-3">
            <div className="grid gap-0.5">
              <h2 id="sheet-title" className="font-display text-[1.75rem] leading-[1.1] font-semibold">
                {p.name}
              </h2>
              {p.name_ja ? <span className="jp text-[1.1rem] text-ink-2">{p.name_ja}</span> : null}
              <span className="text-[0.82rem] text-muted">{[p.genre, shortArea(p.area), p.price].filter(Boolean).join(" · ")}</span>
            </div>
            <TabelogTile score={p.tabelog?.score} awards={p.tabelog?.awards} size={56} />
          </div>

          {p.why ? <p className="text-[0.98rem] text-ink-2">{p.why}</p> : null}
          {p.tabelog?.awards ? <p className="text-xs text-muted">Tabelog: {p.tabelog.awards}</p> : null}

          <div className="grid grid-cols-2 gap-2">
            <Fact title="Fernanda">
              <span className={`font-semibold ${preg.cls}`}>
                {preg.glyph} {preg.label}
              </span>
              {p.pregnancy_note ? <span className="text-[0.78rem] text-ink-2">{p.pregnancy_note.replace(/^For Fernanda:\s*/i, "")}</span> : null}
            </Fact>
            <Fact title="Seven of us">
              <span className="font-semibold">{seven ? `${seven.short.replace("✕ for 7", "✕")} · ${seven.long}` : "⑦ Not known"}</span>
              {p.group ? <span className="text-[0.78rem] text-ink-2">{p.group}</span> : null}
            </Fact>
            <Fact title="Our dates">
              {dates.length ? (
                <span className="flex flex-wrap gap-x-1.5 text-[0.88rem] font-semibold">
                  {dates.map((d) => {
                    const o = openOn(p, d);
                    return (
                      <span key={d} className={o === "open" ? "text-ok" : o === "closed" ? "text-muted line-through" : "text-ink-2"}>
                        {weekday(d)} {Number(d.slice(8))}
                        {o === "open" ? " ✓" : o === "check" ? "?" : ""}
                      </span>
                    );
                  })}
                </span>
              ) : (
                <span className="text-[0.88rem] text-muted">Not on the route</span>
              )}
              {p.dec_jan ? <span className="text-[0.78rem] text-ink-2">{p.dec_jan}</span> : null}
            </Fact>
            <Fact title="Order">
              <span className="text-[0.82rem] text-ink-2">{p.order ?? "Ask what's in season."}</span>
              {p.meals?.length ? <span className="text-[0.78rem] text-muted">{p.meals.join(" and ")}</span> : null}
            </Fact>
          </div>

          <Booking city={city} place={p} id={id} dates={dates} />

          {p.critics?.length ? (
            <ul className="grid gap-2">
              {p.critics.map((c, i) => {
                const who = critic(c.who);
                return (
                  <li key={i} className="flex items-start gap-2 text-[0.85rem] text-ink-2">
                    <span className="mt-0.5 grid size-[26px] shrink-0 place-items-center rounded-full bg-indigo text-[10px] font-bold text-white">{who.initials}</span>
                    <span>
                      <b className="text-ink">{who.name}</b>
                      {who.handle ? <span className="text-muted"> {who.handle}</span> : null}
                      {c.note ? <> · {c.note}</> : null}
                      {c.url ? (
                        <>
                          {" "}
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-accent">
                            source
                          </a>
                        </>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
            <Link href="/food/staff" className="text-accent">
              Show staff, in Japanese ›
            </Link>
            {p.tabelog?.url ? (
              <a href={p.tabelog.url} target="_blank" rel="noreferrer" className="text-accent">
                Tabelog ›
              </a>
            ) : null}
            {p.website ? (
              <a href={p.website} target="_blank" rel="noreferrer" className="text-accent">
                Website ›
              </a>
            ) : null}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-rule px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <a href={map} target="_blank" rel="noreferrer" className="btn">
            Map
          </a>
          <button className={`btn ${saved ? "border-accent text-accent" : ""}`} aria-pressed={saved} onClick={() => toggleReaction("food", id, "heart")}>
            {saved ? "♥" : "♡"} Save{savers > 1 ? ` · ${savers}` : ""}
          </button>
          <button className="btn" onClick={share}>
            {shared ? "Copied" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Fact({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-0.5 rounded-xl bg-bg-2 px-3 py-2.5">
      <span className="text-[0.66rem] font-bold tracking-[0.08em] text-muted uppercase">{title}</span>
      {children}
    </div>
  );
}

/** The booking box: how and when it books, and, for the planner, where it stands. */
function Booking({ city, place: p, id, dates }: { city: DeepCity; place: DeepPlace; id: string; dates: string[] }) {
  const { snapshot, isPlanner, setFoodBooking, clearFoodBooking, busy } = useStore();
  const b = snapshot.food_bookings.find((x) => x.target_id === id) ?? null;
  const deadline = snapshot.deadlines.find((d) => d.place === id && !d.done);
  const [date, setDate] = useState(b?.date ?? "");
  const [meal, setMeal] = useState<FoodBooking["meal"]>(b?.meal ?? (p.meals?.length === 1 ? p.meals[0] : "dinner"));
  const [time, setTime] = useState(b?.time ?? "");
  const [ref, setRef] = useState(b?.ref ?? "");
  const [err, setErr] = useState<string | null>(null);
  const current = b ? (isConfirmed(b) ? "booked" : b.status) : null;

  const save = async (status: FoodBooking["status"] | null) => {
    setErr(null);
    if (!status) return clearFoodBooking(id);
    const r = await setFoodBooking({ target_id: id, name: `${p.name} (${city.name})`, status, url: p.website ?? p.tabelog?.url ?? null, date: date || null, meal: meal ?? null, time: time || null, party: 7, ref: ref || null, note: b?.note ?? null });
    if (r) setErr(r);
  };

  return (
    <section className={`grid gap-2 rounded-2xl border-[1.5px] p-3 ${current === "booked" ? "border-ok" : "border-accent"}`} aria-label="Booking">
      <div className="flex items-baseline justify-between gap-2">
        <b>Booking</b>
        {deadline ? <span className="text-xs font-bold text-accent">book by {fmtDay(deadline.date, false)}</span> : p.booking_opens ? <span className="text-xs font-bold text-accent">opens {p.booking_opens}</span> : null}
      </div>
      {p.booking ? (
        <p className="text-[0.85rem] text-ink-2">
          {p.booking_channel ? <b>{CHANNEL_LABEL[p.booking_channel]}. </b> : null}
          {p.booking}
        </p>
      ) : null}
      {p.pregnancy === "careful" || p.pregnancy === "avoid" ? <p className="text-[0.8rem] text-ask">Say it when booking: 同行者が一名妊娠中のため、生ものは火を通したものに変更をお願いします。</p> : null}
      {isPlanner ? (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Where it stands">
            {STEPS.map((s) => (
              <button key={s.label} disabled={busy} className={`chip min-h-9 ${current === s.status ? "border-ink bg-ink text-bg" : ""}`} aria-pressed={current === s.status} onClick={() => save(s.status)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <label className="grid gap-0.5">
              <span className="text-xs text-muted">Night</span>
              <select value={date} onChange={(e) => setDate(e.target.value)} className="min-h-10 py-1">
                <option value="">—</option>
                {dates.map((d) => (
                  <option key={d} value={d}>
                    {fmtDay(d)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-0.5">
              <span className="text-xs text-muted">Meal</span>
              <select value={meal ?? ""} onChange={(e) => setMeal((e.target.value || null) as FoodBooking["meal"])} className="min-h-10 py-1">
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="breakfast">Breakfast</option>
              </select>
            </label>
            <label className="grid gap-0.5">
              <span className="text-xs text-muted">Time</span>
              <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="18:30" className="min-h-10 py-1" />
            </label>
            <label className="grid gap-0.5">
              <span className="text-xs text-muted">Ref</span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="#" className="min-h-10 py-1" />
            </label>
          </div>
          {b && (date !== (b.date ?? "") || time !== (b.time ?? "") || ref !== (b.ref ?? "") || meal !== b.meal) ? (
            <button className="btn btn-sm btn-primary justify-self-start" disabled={busy} onClick={() => save(b.status)}>
              Save changes
            </button>
          ) : null}
          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </>
      ) : b ? (
        <BookingStatus b={b} />
      ) : (
        <p className="text-[0.82rem] text-muted">{snapshot.travellers.find((t) => t.role === "planner")?.name ?? "The planner"} books. Not booked yet.</p>
      )}
    </section>
  );
}
