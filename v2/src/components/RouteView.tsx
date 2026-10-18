"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMotionValue, useMotionValueEvent, type MotionValue } from "motion/react";
import { regionColor } from "@/lib/colors";
import { kanji, travelAt } from "@/lib/journey";
import why from "../../data/why.json";
import { budgetOf, fmtSgd } from "@/lib/budget";
import { fmtRange } from "@/lib/dates";
import { planDays } from "@/lib/days";
import { avgOutdoorHours, exposure, EXPOSURE_LABEL } from "@/lib/exposure";
import { IDLE_LABEL, stayNote, stayStory, stayTradeoff, type VersionGuide } from "@/lib/guide";
import { areaInfo, VERDICT_LABEL } from "@/lib/areas";
import type { Place, Version } from "@/lib/types";
import { firstName, plannerNames } from "@/lib/people";
import { describeDiff, movesOf, paceLabel, statsOf } from "@/lib/versions";
import { guideFor } from "@/lib/autoGuide";
import { STYLE_LABEL, styleOf } from "@/lib/styles";
import { BudgetCard } from "./Budget";
import { Comments } from "./Comments";
import { fmtLegHours, JourneyMap } from "./JourneyMap";
import { PictureScroll } from "./PictureScroll";
import { PlacePrefs } from "./PlacePrefs";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { StayLodging } from "./StayLodging";
import { Back, Empty, Page, RegionDot, Section } from "./ui";
import { WhatsNext } from "./WhatsNext";
import { EditBand, EditBar, MySuggestion, NightSheet, NyeSheet, Sheet, Toast, useDraftCount, useRouteEditor } from "./RouteEdit";
import { nyeIndex } from "@/lib/nightMoves";
import { stopKeys } from "@/lib/merge";

type Src = { label: string; url: string };
const WHY = why as unknown as { facts: { title: string; text: string; sources: Src[] }[]; route: { intro: string; steps: { region: string; title: string; text: string }[]; sources: Src[] }; for_whom: { who: string; text: string; ids?: string[] }[]; trust: { points: string[]; links: { label: string; href: string }[] } };

/** A route's page: the map, the 21 days, the stops, and why. With no id it is the route we are taking (the Trip tab). */
export function RouteView({ id }: { id?: string }) {
  const { snapshot, me, isPlanner, suggest, saveVersion, decideSuggestion, revertHistory } = useStore();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const editor = useRouteEditor(plan);
  const draftCount = useDraftCount();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<{ text: string; action?: { label: string; run: () => void } } | null>(null);
  const [barError, setBarError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [confirmNye, setConfirmNye] = useState(false);
  const [note, setNote] = useState("");
  // The toast's Undo runs after the save has refreshed the history, so it reads the latest, not the one it was made with.
  const historyRef = useRef(snapshot.history);
  useEffect(() => {
    historyRef.current = snapshot.history;
  }, [snapshot.history]);
  const [openFacts, setOpenFacts] = useState<number | null>(null);
  const [feelOpen, setFeelOpen] = useState(false);
  const regionName = (rid: string) => snapshot.regions.find((r) => r.id === rid)?.name ?? rid;
  const listRef = useRef<HTMLOListElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const t = useStopScroll(listRef, stickyRef);
  const [activeStop, setActiveStop] = useState(0);
  const found = id ? snapshot.versions.find((x) => x.id === id) : undefined;
  const stopCount = (found ?? plan)?.stays.length ?? 0;
  useMotionValueEvent(t, "change", (val) => {
    const { stop, travel } = travelAt(val, stopCount);
    const now = travel > 0.5 ? Math.min(stopCount - 1, stop + 1) : stop;
    setActiveStop((prev) => (prev === now ? prev : now));
  });
  const wide = useWide();
  /** Bring stop i into view just under the pinned map. */
  const scrollToStop = useCallback((i: number) => {
    const card = listRef.current?.querySelector<HTMLElement>(`[data-stop="${i}"]`);
    if (!card) return;
    const pinned = wide ? 0 : (stickyRef.current?.offsetHeight ?? 0);
    window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - pinned - 20, behavior: "smooth" });
  }, [wide]);
  // A link to a stop (/#stop-3) opens that stop's card.
  useEffect(() => {
    const m = window.location.hash.match(/^#stop-(\d+)$/);
    const el = m ? document.querySelector<HTMLDetailsElement>(`#stop-${m[1]} details`) : null;
    if (!el) return;
    el.open = true;
    requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
  }, []);
  const editingPlan = !id && editor.editing;
  const draftStays = editor.stays;
  const days = useMemo(() => (found ?? plan ? planDays(editingPlan ? { ...plan!, stays: draftStays } : (found ?? plan!), snapshot) : []), [found, plan, snapshot, editingPlan, draftStays]);
  // From the Inbox, "See it on the trip" opens the planner's edit mode with that suggestion applied.
  const reviewId = useRef<string | null>(null);
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get("review");
    if (!want || reviewId.current === want || !isPlanner) return;
    const s = snapshot.suggestions.find((x) => x.id === want && x.status === "open");
    if (!s) return;
    reviewId.current = want;
    editor.start({ suggestion: s, review: true });
    window.history.replaceState(null, "", "/");
  }, [snapshot.suggestions, isPlanner, editor]);
  // "Edit the route" or "Suggest a change" on What if lands here as /?edit=1.
  useEffect(() => {
    if (id || new URLSearchParams(window.location.search).get("edit") !== "1") return;
    window.history.replaceState(null, "", "/");
    const sent = snapshot.suggestions.find((x) => x.author_id === me?.travellerId && x.status === "open");
    editor.start(sent && !isPlanner && !draftCount ? { suggestion: sent } : undefined);
  }, [id, snapshot.suggestions, me, isPlanner, draftCount, editor]);
  if (!plan) return null;
  if (id && !found)
    return (
      <Page>
        <Back href="/routes">What if</Back>
        <Empty>No route with that name. It may have been deleted, or it is still private to the person drafting it.</Empty>
      </Page>
    );

  const isPlan = (found ?? plan).id === plan.id;
  const editing = isPlan && editor.editing;
  const v: Version = editing ? { ...plan, stays: editor.stays } : (found ?? plan);
  const baseNights = new Map(stopKeys(editor.base).map((k, i) => [k, editor.base[i].nights]));
  const keys = stopKeys(v.stays);
  const planners = plannerNames(snapshot.travellers);
  const mySent = snapshot.suggestions.find((s) => s.author_id === me?.travellerId && s.status === "open");
  const reviewing = editor.review;
  const mode: "member" | "planner" | "review" = reviewing ? "review" : isPlanner ? "planner" : "member";
  const nyeChanged = editing && editor.base[nyeIndex(editor.base)]?.region !== editor.stays[nyeIndex(editor.stays)]?.region;
  const latestHistory = () => historyRef.current.filter((h) => h.version_id === plan.id).sort((a, b) => b.at.localeCompare(a.at))[0];
  const undoToast = (text: string) =>
    setToast({
      text,
      action: {
        label: "Undo",
        run: async () => {
          const h = latestHistory();
          const why = h ? await revertHistory(h.id) : "Nothing to undo";
          setToast({ text: why ?? "Undone. The route is as it was." });
        },
      },
    });
  /** Open edit mode, then the night sheet for that stop. */
  const changeNights = (i: number, dir: "more" | "fewer") => {
    if (!editing) editor.start(mySent && !isPlanner ? { suggestion: mySent } : undefined);
    setSheet({ kind: "night", index: i, dir });
  };
  const startEditing = () => editor.start(mySent && !isPlanner && !draftCount ? { suggestion: mySent } : undefined);
  async function updateRoute(onTop = false) {
    if (nyeChanged && !confirmNye && !onTop) return setConfirmNye(true);
    setWriting(true);
    setBarError(null);
    const why = await saveVersion({ ...plan!, stays: editor.stays }, undefined, { base: editor.base, onTop });
    setWriting(false);
    if (why?.startsWith("changed:")) return setSheet({ kind: "conflict", lines: why.slice(8) });
    if (why) return setBarError(why);
    setConfirmNye(false);
    setSheet(null);
    editor.leave(true);
    undoToast("Route updated for everyone.");
  }
  async function acceptReview() {
    if (!reviewing) return;
    setWriting(true);
    setBarError(null);
    let why: string | null = null;
    if (!editor.canUndo) why = await decideSuggestion(reviewing.id, "accepted");
    else {
      why = await saveVersion({ ...plan!, stays: editor.stays }, undefined, { base: editor.base });
      if (!why) why = await decideSuggestion(reviewing.id, "accepted", undefined, true);
    }
    setWriting(false);
    if (why) return setBarError(why.startsWith("changed:") ? `The route changed meanwhile: ${why.slice(8)}. Close and open it again.` : why);
    editor.leave(true);
    undoToast(`${firstName(snapshot.travellers, reviewing.author_id)}’s change is part of the route.`);
  }
  const g = guideFor(v, snapshot);
  const mine = v.status === "personal";
  const author = snapshot.travellers.find((x) => x.id === v.owner)?.name.split(" ")[0];
  const planBudget = budgetOf(plan, snapshot.regions).perCoupleSgd;
  const stats = statsOf(v, snapshot);
  const moves = movesOf(v.stays, snapshot.regions);
  const budget = budgetOf(v, snapshot.regions).perCoupleSgd;
  const byId = new Map(snapshot.places.map((p) => [p.id, p]));

  /** The places this route's days visit at a stop, one list per day. */
  const placesFor = (stayIndex: number): { places: Place[]; days: Place[][] } => {
    const list = days.filter((d) => d.stayIndex === stayIndex).map((d) => d.items.map((it) => (it.place_id ? byId.get(it.place_id) : undefined)).filter((p): p is Place => !!p && p.size !== "meal"));
    const seen = new Set<string>();
    return { places: list.flat().filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))), days: list };
  };

  const steps = (region: string, i: number) => {
    if (!isPlan || !g.written) return stayNote(v.id, v.stays, i) ?? v.stays[i].note ?? null;
    const sameBefore = v.stays.slice(0, i).filter((s) => s.region === region).length;
    const matches = WHY.route.steps.filter((x) => x.region === region);
    return (matches[sameBefore] ?? matches[0])?.text ?? stayNote(v.id, v.stays, i) ?? v.stays[i].note ?? null;
  };

  return (
    <Page wide>
      {editing ? <EditBand mode={mode} author={reviewing ? firstName(snapshot.travellers, reviewing.author_id) : undefined} onClose={() => (editor.dirty && !reviewing ? setSheet({ kind: "leave" }) : editor.leave(!!reviewing))} /> : null}
      {editor.notice && editing ? (
        <div className="card grid gap-2 border-l-4 border-l-warn p-3 text-sm" role="status">
          <p>{editor.notice.text}</p>
          {editor.notice.actions ? (
            <div className="flex flex-wrap gap-2">
              {editor.notice.actions.map((a) => (
                <button key={a.label} className="btn btn-sm" onClick={a.run}>
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {isPlan ? null : <Back href="/routes">What if</Back>}
      {editing ? null : (
      <section className="grid gap-2">
        <p className="eyebrow">{isPlan ? `The route · ${fmtRange(snapshot.trip.start, snapshot.trip.end)}` : mine ? `${author ? `${author}’s` : "A family"} route · ${fmtStamp(v.updated_at)}` : v.status === "legacy" ? "An earlier idea · kept for reference, it no longer passes our checks" : `A change to our route · ${STYLE_LABEL[styleOf(v.id)] ?? ""} · ${paceLabel(v.pace)}`}</p>
        <h1 className="display text-[2.3rem] leading-[1.02] sm:text-5xl">{g.theme}</h1>
        <p className="max-w-prose text-ink-2">{g.tagline}</p>
        {isPlan && g.written && g.story ? (
          <a href="#why" className="chip justify-self-start no-underline">
            Why this route · 2 min ↓
          </a>
        ) : null}
      </section>
      )}

      {editing ? null : (
      <div className="grid gap-2">
        <JourneyMap regions={snapshot.regions} stays={v.stays} ghost={isPlan ? null : plan.stays} aspect={wide ? 1.9 : 1.2} onStop={scrollToStop} />
        <p className="text-sm text-muted">
          <b className="text-ink">
            {stats.bases} bases · {stats.moves} check-ins
          </b>{" "}
          · about {stats.travelHours} h between bases · New Year’s Eve in {regionName(stats.newYearsEve?.region ?? "")} · {fmtSgd(budget)} per couple
          {!isPlan ? ` · ${budget - planBudget >= 0 ? "+" : "−"}${fmtSgd(Math.abs(budget - planBudget))} vs the route` : ""}
        </p>
        {isPlan ? (
          <ChangeButton
            onClick={startEditing}
            label={isPlanner ? "Edit the route" : draftCount ? "Carry on with your suggestion" : mySent ? "Change your suggestion" : "Suggest a change"}
            caption={isPlanner ? "Everyone sees the change once you save it." : draftCount ? `${draftCount} ${draftCount === 1 ? "change" : "changes"}, not sent yet.` : mySent ? `It replaces the one you sent on ${fmtStamp(mySent.created_at ?? "")}.` : `${planners} see it before anything changes.`}
          />
        ) : mine ? (
          <ChangeButton href={`/build?from=${v.id}`} label={v.owner === me?.travellerId ? "Edit my route" : "Change this route"} caption={v.owner === me?.travellerId ? "Only you see changes until you send it." : "Start from this route and make it yours."} />
        ) : (
          <>
            <ChangeButton onClick={() => setSheet({ kind: "whole" })} label={isPlanner ? "Make this the route" : "Suggest this route"} caption={isPlanner ? "It replaces the route for everyone, with Undo." : `${planners} see it with a note from you.`} />
            <Link href={`/build?from=${v.id}`} className="justify-self-start text-sm">
              Or start your own from it →
            </Link>
          </>
        )}
      </div>
      )}

      {isPlan && !editing && !isPlanner ? <MySuggestion onChangeAgain={(s) => editor.start({ suggestion: s })} /> : null}
      {isPlan && !editing ? <WhatsNext /> : null}
      {editing ? null : (
        <Link href="/routes" className="justify-self-start text-sm font-semibold">
          {isPlan ? "Other routes →" : "All routes →"}
        </Link>
      )}
      {mine && v.owner === me?.travellerId ? <SendRoute v={v} /> : null}

      {editing ? null : (
        <Section title="The 21 days" aside="tap a day">
          <PictureScroll version={v} onStop={scrollToStop} />
        </Section>
      )}

      <Section id="stops" title="Stop by stop" aside={`${v.stays.length} stops · tap one`}>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
          <div ref={stickyRef} className="sticky top-0 z-[5] -mx-4 mb-3 bg-gradient-to-b from-bg from-80% to-transparent px-3 pt-2 pb-4 lg:order-2 lg:top-6 lg:mx-0 lg:bg-none lg:p-0">
            <JourneyMap regions={snapshot.regions} stays={v.stays} ghost={editing && editor.dirty ? editor.base : null} t={t} aspect={wide ? 1.05 : editing ? 2.4 : 1.9} onStop={scrollToStop} label="The route, following the stop you are reading" />
          </div>
          <ol ref={listRef} className="grid gap-2">
            {v.stays.map((s, i) => {
              const story = stayStory(v.id, v.stays, i);
              const text = story ? null : steps(s.region, i);
              const leg = moves.find((m) => m.index === i);
              const tr = stayTradeoff(v.id, v.stays, i);
              const { places, days: placeDays } = placesFor(i);
              const outside = avgOutdoorHours(placeDays);
              return (
                <li key={s.id ?? i} className="grid gap-1.5" data-stop={i} id={`stop-${i}`}>
                  {leg ? (
                    <p className="flex items-center gap-2.5 pl-3 text-xs text-muted">
                      <span aria-hidden="true" className="h-5 border-l-2 border-dotted border-ink/40" />
                      <span>
                        <b className="text-ink">
                          {leg.curated ? "" : "about "}
                          {fmtLegHours(leg.hours)}
                        </b>{" "}
                        · {leg.how}
                      </span>
                    </p>
                  ) : null}
                  <details className={`card group isolate overflow-hidden transition-shadow duration-300 ${editing && (baseNights.get(keys[i]) ?? 0) > s.nights ? "border-2 border-dashed border-warn" : ""}`} style={editing && baseNights.get(keys[i]) !== s.nights ? { boxShadow: `0 0 0 2px var(--accent), var(--shadow)` } : activeStop === i ? { boxShadow: `0 0 0 2px ${regionColor(s.region)}, var(--shadow)` } : undefined}>
                    <summary className="grid cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <RegionCover regionId={s.region} className="hero-fade h-32 sm:h-40" sizes="(max-width: 1024px) 100vw, 560px">
          <span aria-hidden="true" className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                        <span className="absolute inset-x-3 bottom-2.5 z-10 flex items-end justify-between gap-2 text-white">
                          <span className="flex min-w-0 items-baseline gap-2">
                            <span className="display text-[1.25rem] leading-none opacity-90">{i + 1}</span>
                            <RegionDot id={s.region} size={10} />
                            <span className="display truncate text-[1.5rem] leading-tight">{regionName(s.region)}</span>
                            {kanji(s.region) ? <span className="hidden text-sm opacity-80 min-[380px]:inline">{kanji(s.region)}</span> : null}
                          </span>
                          <span className="shrink-0 text-right text-sm leading-tight">
                            <b>{s.nights}</b> {s.nights === 1 ? "night" : "nights"}
                            <span className="block text-xs opacity-90">{fmtRange(s.from, s.to)}</span>
                          </span>
                        </span>
                      </RegionCover>
                      {editing ? (
                        <span className="flex items-center justify-between gap-3 px-3 pt-2.5">
                          <span className="text-sm">
                            <b>
                              {s.nights} {s.nights === 1 ? "night" : "nights"}
                            </b>
                            {baseNights.get(keys[i]) !== s.nights ? <span className="text-muted"> (was {baseNights.get(keys[i]) ?? 0})</span> : null}
                            {i === nyeIndex(v.stays) ? <span className="block text-xs text-accent">New Year’s Eve here</span> : null}
                          </span>
                          <span className="flex gap-2">
                            <button
                              className="btn h-12 min-w-12 text-xl"
                              aria-label={`One fewer night in ${regionName(s.region)}`}
                              disabled={s.nights <= 1}
                              title={s.nights <= 1 ? "Every stop needs at least one night" : undefined}
                              onClick={(e) => {
                                e.preventDefault();
                                changeNights(i, "fewer");
                              }}
                            >
                              −
                            </button>
                            <button
                              className="btn h-12 min-w-12 text-xl"
                              aria-label={`One more night in ${regionName(s.region)}`}
                              onClick={(e) => {
                                e.preventDefault();
                                changeNights(i, "more");
                              }}
                            >
                              +
                            </button>
                          </span>
                        </span>
                      ) : null}
                      {story ? (
                        <span className="grid gap-0.5 px-3 pt-2.5 text-sm">
                          <b className="text-ink">{story.hook}</b>
                          <span className="line-clamp-2 text-ink-2 group-open:line-clamp-none">{story.note}</span>
                        </span>
                      ) : text ? (
                        <span className="line-clamp-2 px-3 pt-2.5 text-sm text-ink-2 group-open:line-clamp-none">{text}</span>
                      ) : null}
                      <span className="px-3 pt-1 pb-2.5 text-xs font-semibold text-accent group-open:hidden">Where to stay, the trade-offs and the places ▾</span>
                    </summary>
                    <div className="grid gap-2 border-t border-rule px-3 py-3 text-sm">
                      <StayLodging stay={s} region={snapshot.regions.find((r) => r.id === s.region)} />
                      {outside != null ? <p className="text-xs text-muted">About {outside} h outdoors a day on this stop’s days.</p> : null}
                      {tr ? (
                        <div className="grid gap-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <b>Stay longer or move on?</b>
                            <span className={`chip ${tr.idle === "real" ? "border-warn text-warn" : tr.idle === "some" ? "text-muted" : "text-ok"}`}>{IDLE_LABEL[tr.idle]}</span>
                          </p>
                          <p className="text-ink-2">{tr.note}</p>
                          <p className="text-ink-2">
                            <b>One more night:</b> {tr.longer}
                          </p>
                          <p className="text-ink-2">
                            <b>One fewer:</b> {tr.shorter}
                          </p>
                          {isPlan && !editing ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button className="btn btn-sm" onClick={() => changeNights(i, "more")}>
                                + One more night
                              </button>
                              <button className="btn btn-sm" disabled={s.nights <= 1} onClick={() => changeNights(i, "fewer")}>
                                − One fewer
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {isPlan && i === nyeIndex(v.stays) ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--ny)] p-2.5">
                          <b className="text-accent">New Year’s Eve is here.</b>
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              if (!editing) editor.start(mySent && !isPlanner ? { suggestion: mySent } : undefined);
                              setSheet({ kind: "nye" });
                            }}
                          >
                            Spend New Year elsewhere
                          </button>
                        </div>
                      ) : null}
                      {places.length ? (
                        <div className="grid gap-1.5">
                          <b>Where these days go · Must, Nice or Skip</b>
                          <ul className="grid gap-2">
                            {places.map((p) => (
                              <li key={p.id} className="grid gap-1 border-b border-rule pb-2 last:border-0">
                                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                                  <Link href={`/places/${p.id}`} className="font-semibold no-underline">
                                    {p.name}
                                  </Link>
                                  <span className="text-xs text-muted">
                                    {EXPOSURE_LABEL[exposure(p)]}
                                    {p.status === "avoid_for_her" ? " · not for Fernanda" : p.effort_for_her === "high" ? " · hard for Fernanda" : ""}
                                  </span>
                                </span>
                                {p.why ? <span className="text-ink-2">{p.why}</span> : null}
                                <PlacePrefs placeId={p.id} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <Link href={`/areas/${s.region}`}>More about {regionName(s.region)} →</Link>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </div>
      </Section>

      {!editing && g.nye ? (
        <p className="card max-w-prose border-l-4 border-l-accent p-4 text-sm leading-relaxed text-ink-2">
          <b className="block pb-1 text-ink">New Year’s Eve</b>
          {g.nye}
        </p>
      ) : null}

      {editing ? null : isPlan && g.written && g.story ? (
        <PlanWhy g={g} />
      ) : (
      <Section title="Why this route">
        <div className="grid max-w-prose justify-items-start gap-1">
          <p className={`leading-relaxed text-ink-2 ${feelOpen ? "" : "line-clamp-5"}`}>{g.feel}</p>
          {g.feel.length > 420 ? (
            <button className="text-sm font-semibold text-accent" onClick={() => setFeelOpen(!feelOpen)} aria-expanded={feelOpen}>
              {feelOpen ? "Show less" : "Read it all"}
            </button>
          ) : null}
        </div>
        <details className="card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">{isPlan ? "What chose it, and who it suits" : "Why it exists, who it suits, what it gives up"}</summary>
          <div className="grid gap-3 pt-3 text-ink-2">
            {isPlan && g.written ? (
              <>
                <ol className="grid gap-2">
                  {WHY.facts.map((f, i) => (
                    <li key={f.title}>
                      <button className="flex w-full items-baseline gap-2 text-left" onClick={() => setOpenFacts(openFacts === i ? null : i)} aria-expanded={openFacts === i}>
                        <span className="display text-[1.3rem] leading-none text-accent">{i + 1}</span>
                        <b className="flex-1 text-ink">{f.title}</b>
                        <span className="text-muted">{openFacts === i ? "▴" : "▾"}</span>
                      </button>
                      {openFacts === i ? <p className="pt-1 pl-6">{f.text}</p> : null}
                    </li>
                  ))}
                </ol>
                <ul className="grid gap-1.5">
                  {WHY.for_whom.map((w) => (
                    <li key={w.who}>
                      <b className="text-ink">{w.who}:</b> {w.text}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                <b className="text-ink">Why it exists:</b> {g.why} <b className="text-ink">Suits:</b> {g.suits} <b className="text-ink">Gives up:</b> {g.trade}
              </p>
            )}
            {isPlan ? (
              <ul className="grid gap-1">
                {WHY.trust.points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      ●
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {(g.sources ?? (isPlan ? WHY.route.sources : [])).length ? (
              <p className="text-xs text-muted">
                Sources:{" "}
                {(g.sources ?? WHY.route.sources).map((s, k) => (
                  <span key={s.url}>
                    {k ? " · " : ""}
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                    </a>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </details>
      </Section>
      )}

      {editing ? (
        <div aria-hidden="true" className="h-48" />
      ) : (
        <>
          <BudgetCard v={v} regions={snapshot.regions} regionName={regionName} title="What it costs, per couple" />
          <Comments targetType="version" targetId={v.id} />
        </>
      )}

      {editing ? (
        <EditBar
          base={editor.base}
          stays={editor.stays}
          busy={writing}
          error={barError}
          canUndo={editor.canUndo}
          onUndo={editor.undo}
          primary={mode === "review" ? "Make it part of the route" : mode === "planner" ? (confirmNye ? "Yes, change New Year’s Eve" : "Update the route") : `Send to ${planners}`}
          onPrimary={mode === "review" ? acceptReview : mode === "planner" ? () => updateRoute() : () => setSheet({ kind: "send" })}
          secondary={mode === "review" ? { label: "Keep the route as it is", run: () => setSheet({ kind: "decline" }) } : undefined}
        />
      ) : null}

      {sheet?.kind === "night" && editing ? (
        <NightSheet stays={editor.stays} index={sheet.index} dir={sheet.dir} onPick={editor.apply} onClose={() => setSheet(null)} note={mode === "member" ? `The route stays as it is until ${planners} say yes.` : undefined} />
      ) : null}
      {sheet?.kind === "nye" && editing ? <NyeSheet stays={editor.stays} onPick={editor.apply} onClose={() => setSheet(null)} /> : null}
      {sheet?.kind === "send" ? (
        <Sheet title="Send your suggestion" onClose={() => setSheet(null)}>
          <ul className="grid gap-1 text-sm">
            {describeDiff(editor.base, editor.stays, snapshot.regions).map((l) => (
              <li key={l}>• {l}</li>
            ))}
          </ul>
          {mySent ? <p className="text-sm text-muted">This replaces what you sent on {fmtStamp(mySent.created_at ?? "")}.</p> : null}
          <label className="grid gap-1 text-sm">
            <b>Anything to tell them?</b>
            <textarea className="min-h-20 rounded-xl border border-rule bg-bg p-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mum would like a rest day" />
          </label>
          {barError ? <p className="text-sm text-warn" role="alert">{barError}</p> : null}
          <button
            className="btn btn-primary w-full"
            disabled={writing}
            onClick={async () => {
              setWriting(true);
              const why = await suggest(plan.id, { stays: editor.stays, base: editor.base, summary: describeDiff(editor.base, editor.stays, snapshot.regions) }, note.trim());
              setWriting(false);
              if (why) return setBarError(why);
              setNote("");
              setSheet(null);
              editor.leave(true);
              setToast({ text: `Sent to ${planners}. They’ll see it in their inbox.` });
            }}
          >
            {writing ? "Sending…" : "Send"}
          </button>
          <p className="text-center text-xs text-muted">{planners} will see it in their inbox. Nothing changes until one of them says yes.</p>
        </Sheet>
      ) : null}
      {sheet?.kind === "leave" ? (
        <Sheet title="Throw away your changes?" onClose={() => setSheet(null)}>
          <p className="text-sm text-ink-2">{describeDiff(editor.base, editor.stays, snapshot.regions).join(" · ")}</p>
          <button className="btn btn-primary w-full" onClick={() => setSheet(null)}>
            Keep changing
          </button>
          <button
            className="btn w-full"
            onClick={() => {
              setSheet(null);
              editor.leave(false);
            }}
          >
            Keep them for later, on this phone
          </button>
          <button
            className="btn w-full text-danger"
            onClick={() => {
              setSheet(null);
              editor.leave(true);
            }}
          >
            Throw them away
          </button>
        </Sheet>
      ) : null}
      {sheet?.kind === "conflict" ? (
        <Sheet title="The route changed while you were editing" onClose={() => setSheet(null)}>
          <p className="text-sm text-ink-2">{sheet.lines}</p>
          <button className="btn btn-primary w-full" disabled={writing} onClick={() => updateRoute(true)}>
            Put mine on top
          </button>
          <button className="btn w-full" onClick={() => setSheet(null)}>
            Look first
          </button>
        </Sheet>
      ) : null}
      {sheet?.kind === "decline" && reviewing ? (
        <Sheet title="Keep the route as it is?" onClose={() => setSheet(null)}>
          <label className="grid gap-1 text-sm">
            <b>Anything to tell {firstName(snapshot.travellers, reviewing.author_id)}?</b>
            <textarea className="min-h-20 rounded-xl border border-rule bg-bg p-2" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button
            className="btn btn-primary w-full"
            disabled={writing}
            onClick={async () => {
              setWriting(true);
              const why = await decideSuggestion(reviewing.id, "declined", note.trim());
              setWriting(false);
              if (why) return setBarError(why);
              setNote("");
              setSheet(null);
              editor.leave(true);
              setToast({ text: "Kept the route as it is." });
            }}
          >
            Keep the route as it is
          </button>
        </Sheet>
      ) : null}
      {sheet?.kind === "whole" ? (
        <Sheet title={isPlanner ? "Make this the route?" : "Suggest this route"} onClose={() => setSheet(null)}>
          <ul className="grid gap-1 text-sm">
            {describeDiff(plan.stays, v.stays, snapshot.regions).slice(0, 6).map((l) => (
              <li key={l}>• {l}</li>
            ))}
          </ul>
          {isPlanner ? null : (
            <label className="grid gap-1 text-sm">
              <b>Anything to tell them?</b>
              <textarea className="min-h-20 rounded-xl border border-rule bg-bg p-2" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          )}
          {barError ? <p className="text-sm text-warn" role="alert">{barError}</p> : null}
          <button
            className="btn btn-primary w-full"
            disabled={writing}
            onClick={async () => {
              setWriting(true);
              setBarError(null);
              const why = isPlanner
                ? await saveVersion({ ...plan, stays: v.stays }, `Made “${g.theme}” the route`, { base: plan.stays })
                : await suggest(v.id, { stays: v.stays, whole: true, base: plan.stays, summary: describeDiff(plan.stays, v.stays, snapshot.regions) }, note.trim());
              setWriting(false);
              if (why) return setBarError(why.startsWith("changed:") ? "The route changed a moment ago. Look at it first." : why);
              setNote("");
              setSheet(null);
              if (isPlanner) undoToast("This is the route now.");
              else setToast({ text: `Sent to ${planners}.` });
            }}
          >
            {isPlanner ? "Make it the route" : "Send"}
          </button>
        </Sheet>
      ) : null}
      {toast ? <Toast text={toast.text} action={toast.action} onDone={() => setToast(null)} /> : null}
    </Page>
  );
}

/** A route someone built, sent to the planners: they make it the route, or keep it as an idea. */
function SendRoute({ v }: { v: Version }) {
  const { snapshot, suggest, withdrawSuggestion } = useStore();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const plan = snapshot.versions.find((x) => x.status === "plan");
  const planners = plannerNames(snapshot.travellers);
  const sent = snapshot.suggestions.find((x) => x.from_version_id === v.id);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  if (sent?.status === "open")
    return (
      <div className="card flex flex-wrap items-center justify-between gap-2 border-accent/40 p-3 text-sm">
        <span>
          <b>Sent to {planners}.</b> It is in their inbox.
        </span>
        <button className="btn btn-sm" disabled={busy} onClick={() => run(() => withdrawSuggestion(sent.id))}>
          Take it back
        </button>
      </div>
    );
  if (sent?.status === "accepted")
    return (
      <p className="card p-3 text-sm">
        <b>{firstName(snapshot.travellers, sent.decided_by)} made this the route.</b> <Link href="/">See it on Trip →</Link>
      </p>
    );
  return (
    <form
      className="card grid gap-2 border-accent/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!plan) return;
        run(() => suggest(v.id, { stays: v.stays, pace: v.pace, summary: describeDiff(plan.stays, v.stays, snapshot.regions) }, note.trim())).then(() => setNote(""));
      }}
    >
      <p className="text-sm">
        <b>{sent?.status === "declined" ? `${firstName(snapshot.travellers, sent.decided_by)} kept the route as it is for now.` : `Like it? Send it to ${planners}.`}</b> They can make it the route, or keep it as an idea.
      </p>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="A line on why (optional)" aria-label="A note for them" maxLength={280} />
      <button className="btn btn-sm btn-primary justify-self-start" disabled={busy}>
        {sent?.status === "declined" ? "Send it again" : `Send to ${planners}`}
      </button>
    </form>
  );
}

/**
 * Scroll position through the stop cards as a number: i when the reading line
 * (a little below the pinned map) is at the top of card i, i + 0.5 halfway to
 * the next, n - 1 + f through the last card.
 */
function useStopScroll(list: React.RefObject<HTMLOListElement | null>, pinned: React.RefObject<HTMLDivElement | null>): MotionValue<number> {
  const t = useMotionValue(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const cards = Array.from(list.current?.querySelectorAll<HTMLElement>("[data-stop]") ?? []);
      if (!cards.length) return;
      const pin = pinned.current?.getBoundingClientRect();
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const top = wide || !pin ? 0 : Math.max(0, pin.bottom);
      const line = top + (window.innerHeight - top) * 0.32;
      const tops = cards.map((c) => c.getBoundingClientRect().top);
      let i = 0;
      while (i + 1 < tops.length && tops[i + 1] <= line) i++;
      let v: number;
      if (line < tops[0]) v = 0;
      else if (i < tops.length - 1) v = i + (line - tops[i]) / Math.max(1, tops[i + 1] - tops[i]);
      else v = i + Math.min(1, (line - tops[i]) / Math.max(1, cards[i].offsetHeight));
      t.set(v);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const ro = new ResizeObserver(on);
    if (list.current) ro.observe(list.current);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      ro.disconnect();
    };
  }, [list, pinned, t]);
  return t;
}

function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}

function fmtStamp(iso: string | null | undefined): string {
  if (!iso) return "new";
  const d = new Date(iso);
  return `saved ${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}`;
}

/** The way into changing a route: outlined, full width, a pencil, and never paired with a twin, so it never reads as a switch that is already on. */
function ChangeButton({ href, onClick, label, caption }: { href?: string; onClick?: () => void; label: string; caption: string }) {
  const cls = "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink bg-card px-4 text-[1.05rem] font-semibold text-ink no-underline active:bg-bg-2";
  const inner = (
    <>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      {label}
    </>
  );
  return (
    <div className="grid max-w-[420px] gap-1">
      {href ? (
        <Link href={href} className={cls}>
          {inner}
        </Link>
      ) : (
        <button className={cls} onClick={onClick}>
          {inner}
        </button>
      )}
      <p className="text-sm text-muted">{caption}</p>
    </div>
  );
}

/** Why the route we are taking: the journey, what we looked for, what we left for another time, what is in it for you, and the practical reasons last. */
function PlanWhy({ g }: { g: VersionGuide }) {
  const { snapshot, me } = useStore();
  const [open, setOpen] = useState(false);
  const [openFacts, setOpenFacts] = useState<number | null>(null);
  const story = g.story ?? [];
  const mineFirst = WHY.for_whom.filter((w) => me && w.ids?.includes(me.travellerId));
  const others = WHY.for_whom.filter((w) => !mineFirst.includes(w));
  const regionName = (id: string) => snapshot.regions.find((r) => r.id === id)?.name.replace(/ \(.*\)$/, "") ?? id;
  return (
    <Section id="why" title="Why this route" aside="2 min">
      <div className="grid max-w-prose justify-items-start gap-3 leading-relaxed text-ink-2">
        {(open ? story : story.slice(0, 2)).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {story.length > 2 ? (
          <button className="text-sm font-semibold text-accent" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Show less" : "The whole journey ▾"}
          </button>
        ) : null}
      </div>

      {g.looked_for?.length ? (
        <div className="card grid max-w-prose gap-2 p-4">
          <h3 className="eyebrow">What we looked for</h3>
          <ul className="grid gap-1">
            {g.looked_for.map((l) => (
              <li key={l.title}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-baseline gap-2 py-0.5 [&::-webkit-details-marker]:hidden">
                    <span aria-hidden="true" className="text-accent">
                      ●
                    </span>
                    <b className="flex-1">{l.title}</b>
                    <span aria-hidden="true" className="text-xs text-muted group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <p className="pb-1 pl-5 text-sm text-ink-2">{l.text}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {g.left_out?.length ? (
        <div className="grid max-w-prose gap-2">
          <h3 className="eyebrow">Left for another time</h3>
          <ul className="grid gap-2">
            {g.left_out.map((id) => {
              const verdict = areaInfo(id)?.verdict;
              if (!verdict) return null;
              return (
                <li key={id}>
                  <Link href={`/areas/${id}`} className="card grid gap-0.5 p-3 text-sm no-underline">
                    <span className="flex items-baseline justify-between gap-2">
                      <b className="text-ink">{regionName(id)}</b>
                      <span className="shrink-0 text-xs text-muted">{VERDICT_LABEL[verdict.state]} →</span>
                    </span>
                    <span className="text-ink-2">{verdict.headline}</span>
                    <span className="text-xs text-muted">{verdict.fit}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="grid max-w-prose gap-2 text-sm">
        <h3 className="eyebrow">What’s in it for you</h3>
        {(mineFirst.length ? mineFirst : WHY.for_whom.slice(0, 1)).map((w) => (
          <p key={w.who} className="text-ink-2">
            <b className="text-ink">{w.who}:</b> {w.text}
          </p>
        ))}
        <details>
          <summary className="cursor-pointer font-semibold text-accent">For everyone else</summary>
          <div className="grid gap-2 pt-2">
            {(mineFirst.length ? others : WHY.for_whom.slice(1)).map((w) => (
              <p key={w.who} className="text-ink-2">
                <b className="text-ink">{w.who}:</b> {w.text}
              </p>
            ))}
          </div>
        </details>
      </div>

      <details className="card max-w-prose p-4 text-sm">
        <summary className="cursor-pointer font-semibold">The practical reasons</summary>
        <div className="grid gap-3 pt-3 text-ink-2">
          <ol className="grid gap-2">
            {WHY.facts.map((f, i) => (
              <li key={f.title}>
                <button className="flex w-full items-baseline gap-2 text-left" onClick={() => setOpenFacts(openFacts === i ? null : i)} aria-expanded={openFacts === i}>
                  <span className="display text-[1.3rem] leading-none text-accent">{i + 1}</span>
                  <b className="flex-1 text-ink">{f.title}</b>
                  <span className="text-muted">{openFacts === i ? "▴" : "▾"}</span>
                </button>
                {openFacts === i ? <p className="pt-1 pl-6">{f.text}</p> : null}
              </li>
            ))}
          </ol>
          <ul className="grid gap-2">
            {WHY.route.steps.map((st, i) => (
              <li key={i}>
                <b className="text-ink">{st.title}.</b> {st.text}
              </li>
            ))}
          </ul>
          <ul className="grid gap-1">
            {WHY.trust.points.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="text-accent">
                  ●
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            {WHY.trust.links.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </p>
          <p className="text-xs text-muted">
            Sources:{" "}
            {WHY.route.sources.map((src, k) => (
              <span key={src.url}>
                {k ? " · " : ""}
                <a href={src.url} target="_blank" rel="noreferrer">
                  {src.label}
                </a>
              </span>
            ))}
          </p>
        </div>
      </details>
    </Section>
  );
}

type SheetState =
  | null
  | { kind: "night"; index: number; dir: "more" | "fewer" }
  | { kind: "nye" }
  | { kind: "send" }
  | { kind: "leave" }
  | { kind: "conflict"; lines: string }
  | { kind: "decline" }
  | { kind: "whole" };
