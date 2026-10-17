"use client";

/**
 * Changing the route on the route page itself: a draft kept on this phone, one
 * more or one fewer night with the other stop chosen in a sheet, and a bar that
 * sends it to the planners (members) or updates the route (planners).
 */
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { budgetOf, fmtSgd } from "@/lib/budget";
import { legBetween } from "@/lib/legs";
import { fmtLegHours } from "./JourneyMap";
import { addDays, fmtDay, todayIso } from "@/lib/dates";
import { localStore, useLocalStore } from "@/lib/localStore";
import { changedStops, mergeOnto, sameRoute, stopKeys } from "@/lib/merge";
import { nightOptions, nyeIndex } from "@/lib/nightMoves";
import { firstName, plannerNames } from "@/lib/people";
import type { Region, Stay, Suggestion, Version } from "@/lib/types";
import { describeDiff, relayout } from "@/lib/versions";
import { useStore } from "./providers";

interface Draft {
  who: string;
  base: Stay[];
  stays: Stay[];
  /** Set while a planner looks at someone's suggestion on the trip. */
  review?: string | null;
}

const draftStore = localStore<Draft | null>("jp-route-draft", null);

/** A stop's name, with "at the end" for the second Tokyo. */
export function stopName(stays: Pick<Stay, "region">[], i: number, regions: Region[]): string {
  const name = (regions.find((r) => r.id === stays[i].region)?.name ?? stays[i].region).replace(/ \(.*\)$/, "");
  return stopKeys(stays)[i].includes(":") ? `${name} at the end` : name;
}

export interface Notice {
  text: string;
  actions?: { label: string; run: () => void }[];
}

export interface RouteEditor {
  editing: boolean;
  base: Stay[];
  stays: Stay[];
  dirty: boolean;
  review: Suggestion | null;
  notice: Notice | null;
  setNotice: (n: Notice | null) => void;
  start: (from?: { suggestion?: Suggestion; review?: boolean }) => void;
  apply: (stays: Stay[]) => void;
  undo: () => void;
  canUndo: boolean;
  /** Leave edit mode; the draft stays on the phone unless `discard`. */
  leave: (discard: boolean) => void;
}

/** Their change, put on top of the route as it is now; the route when it no longer fits. */
function onTopOfNow(base: Stay[] | undefined, theirs: Stay[], now: Stay[], tripStart: string): { stays: Stay[]; fits: boolean } {
  if (!base) return { stays: sameRoute(theirs, now) ? now : theirs, fits: sameRoute(theirs, now) };
  const m = mergeOnto(base, theirs, now, tripStart);
  if (m.kind === "clean") return { stays: m.stays, fits: true };
  if (m.kind === "already") return { stays: now, fits: true };
  return { stays: now, fits: false };
}

export function useRouteEditor(plan: Version | undefined): RouteEditor {
  const { snapshot, me } = useStore();
  const saved = useLocalStore(draftStore);
  const who = me?.travellerId ?? "";
  const draft = saved && saved.who === who && plan ? saved : null;
  const [editing, setEditing] = useState(false);
  const [stack, setStack] = useState<Stay[][]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const now = useMemo(() => plan?.stays ?? [], [plan]);
  const review = draft?.review ? (snapshot.suggestions.find((s) => s.id === draft.review) ?? null) : null;
  const tripStart = snapshot.trip.start;

  const start = useCallback(
    (from?: { suggestion?: Suggestion; review?: boolean }) => {
      if (!plan || !who) return;
      setStack([]);
      setNotice(null);
      const s = from?.suggestion;
      if (s) {
        const r = s.diff.whole ? { stays: s.diff.stays, fits: true } : onTopOfNow(s.diff.base, s.diff.stays, now, tripStart);
        draftStore.set({ who, base: now, stays: r.stays, review: from?.review ? s.id : null });
        if (!r.fits) setNotice({ text: `The route has changed since this was sent, on the same stops: ${s.diff.summary.join("; ")}. Make the change again by hand.` });
        setEditing(true);
        return;
      }
      const d = draftStore.get();
      if (d && d.who === who && !sameRoute(d.base, now)) {
        const was = describeDiff(d.base, now, snapshot.regions).join("; ");
        const r = onTopOfNow(d.base, d.stays, now, tripStart);
        if (r.fits) {
          draftStore.set({ ...d, base: now, stays: r.stays });
          setNotice({ text: `The route changed while you were away (${was}). Your changes still fit.` });
        } else {
          setNotice({
            text: `The route changed while you were away (${was}), on the stops you changed.`,
            actions: [
              {
                label: "Start again from the route",
                run: () => {
                  draftStore.set({ who, base: now, stays: now });
                  setNotice(null);
                },
              },
              { label: "Keep mine", run: () => setNotice(null) },
            ],
          });
        }
      } else if (!d || d.who !== who) draftStore.set({ who, base: now, stays: now });
      setEditing(true);
    },
    [plan, who, now, tripStart, snapshot.regions],
  );

  const apply = useCallback(
    (stays: Stay[]) => {
      const d = draftStore.get();
      if (!d) return;
      setStack((st) => [...st, d.stays]);
      draftStore.set({ ...d, stays });
    },
    [],
  );

  const undo = useCallback(() => {
    const d = draftStore.get();
    if (!d) return;
    setStack((st) => {
      if (!st.length) return st;
      draftStore.set({ ...d, stays: st[st.length - 1] });
      return st.slice(0, -1);
    });
  }, []);

  const leave = useCallback((discard: boolean) => {
    const d = draftStore.get();
    if (discard || (d && sameRoute(d.base, d.stays)) || d?.review) draftStore.set(null);
    setEditing(false);
    setStack([]);
    setNotice(null);
  }, []);

  const base = draft?.base ?? now;
  const stays = draft?.stays ?? now;
  return { editing: editing && !!draft, base, stays, dirty: !!draft && !sameRoute(base, stays), review, notice, setNotice, start, apply, undo, canUndo: stack.length > 0, leave };
}

/** The unsent draft, for the button that leads into it: "Carry on with your suggestion". */
export function useDraftCount(): number {
  const { me } = useStore();
  const d = useLocalStore(draftStore);
  return d && d.who === me?.travellerId && !d.review ? changedStops(d.base, d.stays).length : 0;
}

/** A sheet from the bottom on a phone, a dialog in the middle on a wide screen. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[81] mx-auto grid max-h-[85vh] w-full max-w-md gap-3 overflow-auto rounded-t-2xl bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[var(--glow)] outline-none sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-[1.2rem] leading-tight">{title}</Dialog.Title>
            <Dialog.Close className="btn btn-sm shrink-0" aria-label="Close">
              ✕
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** "Kyoto: 4 → 5 nights. Which stop gives up a night?" One tap picks a stop and closes. */
export function NightSheet({ stays, index, dir, onPick, onClose, note }: { stays: Stay[]; index: number; dir: "more" | "fewer"; onPick: (stays: Stay[]) => void; onClose: () => void; note?: string }) {
  const { snapshot } = useStore();
  const name = (i: number, s: Pick<Stay, "region">[] = stays) => stopName(s, i, snapshot.regions);
  const n = stays[index].nights;
  const opts = nightOptions(stays, index, dir, snapshot.trip.start);
  const regionName = (id: string) => (snapshot.regions.find((r) => r.id === id)?.name ?? id).replace(/ \(.*\)$/, "");
  return (
    <Sheet title={`${name(index)}: ${n} → ${dir === "more" ? n + 1 : n - 1} ${dir === "more" || n - 1 !== 1 ? "nights" : "night"}`} onClose={onClose}>
      <p className="text-sm text-ink-2">
        {dir === "more" ? "Which stop gives up a night?" : "Which stop gets the night?"} The trip stays at {snapshot.trip.nights} nights.
      </p>
      <ul className="grid gap-2">
        {opts.map((o) => (
          <li key={o.index}>
            <button
              className={`card grid w-full gap-0.5 p-3 text-left ${o.suggested ? "border-accent" : ""} ${o.blocked ? "opacity-50" : ""}`}
              disabled={!!o.blocked}
              onClick={() => {
                onPick(o.stays);
                onClose();
              }}
            >
              <span className="flex items-baseline justify-between gap-2">
                <b>{name(o.index)}</b>
                <span className="text-sm">
                  {o.from} → {o.to} {o.to === 1 ? "night" : "nights"}
                </span>
              </span>
              {o.suggested ? <span className="text-xs font-semibold text-accent">Suggested</span> : null}
              {o.blocked ? <span className="text-xs text-muted">{o.blocked}</span> : null}
              {o.movesNye && !o.blocked ? <span className="text-xs text-warn">Moves New Year’s Eve to {regionName(o.movesNye)}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
    </Sheet>
  );
}

/**
 * Where else New Year's Eve could be: staying on at the stop before, going on early
 * to the stop after, or a place other routes spend it, with the journeys either side.
 */
export function NyeSheet({ stays, onPick, onClose }: { stays: Stay[]; onPick: (stays: Stay[]) => void; onClose: () => void }) {
  const { snapshot } = useStore();
  const i = nyeIndex(stays);
  const here = stays[i]?.region;
  const prev = stays[i - 1]?.region;
  const next = stays[i + 1]?.region;
  const options = useMemo(() => {
    const seen = new Map<string, Stay>();
    for (const v of snapshot.versions) {
      if (v.status === "personal") continue;
      const s = v.stays[nyeIndex(v.stays)];
      if (s && s.region !== here && s.region !== prev && s.region !== next && !seen.has(s.region)) seen.set(s.region, s);
    }
    return Array.from(seen.values())
      .map((s) => {
        const a = prev ? legBetween(prev, s.region, snapshot.regions) : null;
        const b = next ? legBetween(s.region, next, snapshot.regions) : null;
        return { s, inH: a?.hours ?? 0, outH: b?.hours ?? 0, checked: (a?.curated ?? true) && (b?.curated ?? true) };
      })
      .filter((o) => o.inH <= 4.5 && o.outH <= 4.5)
      .sort((a, b) => Number(b.checked) - Number(a.checked) || a.inH + a.outH - (b.inH + b.outH));
  }, [snapshot.versions, snapshot.regions, here, prev, next]);
  if (i < 0) return null;
  const name = (id: string) => (snapshot.regions.find((r) => r.id === id)?.name ?? id).replace(/ \(.*\)$/, "");
  /** The New Year stop's nights go to a neighbour, and the stop goes. */
  const giveTo = (k: number) => relayout(stays.flatMap((x, n) => (n === i ? [] : n === k ? [{ ...x, nights: x.nights + stays[i].nights }] : [x])), snapshot.trip.start);
  const pick = (next: Stay[]) => {
    onPick(next);
    onClose();
  };
  const neighbours = [
    prev ? { k: i - 1, label: `Stay on in ${name(prev)}`, line: `${name(prev)} ${stays[i - 1].nights} → ${stays[i - 1].nights + stays[i].nights} nights, and no ${name(here)}` } : null,
    next ? { k: i + 1, label: `Go on to ${name(next)} early`, line: `${name(next)} from ${fmtDay(stays[i].from, false)}, ${stays[i + 1].nights + stays[i].nights} nights, and no ${name(here)}` } : null,
  ].filter((x): x is { k: number; label: string; line: string } => !!x);
  return (
    <Sheet title="Spend New Year somewhere else" onClose={onClose}>
      <p className="text-sm text-ink-2">
        New Year’s Eve is in {name(here)} now, {fmtDay(stays[i].from, false)} – {fmtDay(stays[i].to, false)}.
      </p>
      <ul className="grid gap-2">
        {neighbours.map((o) => (
          <li key={o.k}>
            <button className="card grid w-full gap-0.5 p-3 text-left" onClick={() => pick(giveTo(o.k))}>
              <b>{o.label}</b>
              <span className="text-sm text-ink-2">{o.line}</span>
            </button>
          </li>
        ))}
      </ul>
      {options.length ? <p className="eyebrow pt-1">Or a place other routes spend it</p> : null}
      <ul className="grid gap-2">
        {options.map(({ s, inH, outH, checked }) => (
          <li key={s.region}>
            <button className="card grid w-full gap-0.5 p-3 text-left" onClick={() => pick(stays.map((x, k) => (k === i ? { ...x, region: s.region, lodging: s.lodging } : x)))}>
              <b>{name(s.region)}</b>
              <span className="text-sm text-ink-2">{snapshot.regions.find((r) => r.id === s.region)?.summary}</span>
              <span className="text-xs text-muted">
                {prev ? `From ${name(prev)} ${checked ? "" : "about "}${fmtLegHours(inH)}` : ""}
                {prev && next ? " · " : ""}
                {next ? `on to ${name(next)} ${checked ? "" : "about "}${fmtLegHours(outH)}` : ""}
                {checked ? "" : " (a rough guess, not checked)"}
              </span>
              <Link href={`/areas/${s.region}`} className="text-xs" onClick={(e) => e.stopPropagation()}>
                Is it for us? →
              </Link>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

/** The band at the top while changing: whose change it is, and that the route stays as it is until it is saved. */
export function EditBand({ mode, author, onClose }: { mode: "member" | "planner" | "review"; author?: string; onClose: () => void }) {
  const { snapshot } = useStore();
  const planners = plannerNames(snapshot.travellers);
  const tone = mode === "member" ? "bg-[color-mix(in_oklab,var(--warn)_16%,var(--card))] border-warn" : mode === "review" ? "bg-[color-mix(in_oklab,var(--indigo)_14%,var(--card))] border-indigo" : "bg-ink text-bg border-ink";
  return (
    <div className={`sticky top-0 z-30 -mx-4 flex items-start justify-between gap-3 border-b-2 px-4 py-2.5 ${tone}`}>
      <p className="text-sm leading-snug">
        <b className="block text-base">{mode === "member" ? "Your suggestion" : mode === "review" ? `${author ?? "A"}’s suggestion` : "Changing the route for everyone"}</b>
        {mode === "member" ? `The route stays as it is until ${planners} say yes.` : mode === "review" ? "Change anything you like before you say yes." : "Everyone sees it once you save."}
      </p>
      <button className={`btn btn-sm shrink-0 ${mode === "planner" ? "border-bg text-bg" : ""}`} onClick={onClose}>
        ✕ Close
      </button>
    </div>
  );
}

/** The bar that takes the tab bar's place while changing: the change in words, then one button. */
export function EditBar({ base, stays, primary, onPrimary, busy, secondary, canUndo, onUndo, error }: { base: Stay[]; stays: Stay[]; primary: string; onPrimary: () => void; busy: boolean; secondary?: { label: string; run: () => void }; canUndo: boolean; onUndo: () => void; error?: string | null }) {
  const { snapshot } = useStore();
  const lines = describeDiff(base, stays, snapshot.regions);
  const delta = budgetOf({ stays, pace: "balanced" }, snapshot.regions).perCoupleSgd - budgetOf({ stays: base, pace: "balanced" }, snapshot.regions).perCoupleSgd;
  const nyeFrom = base[nyeIndex(base)]?.region;
  const nyeTo = stays[nyeIndex(stays)]?.region;
  const name = (id?: string) => (snapshot.regions.find((r) => r.id === id)?.name ?? id ?? "").replace(/ \(.*\)$/, "");
  const changed = lines.length > 0;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-rule bg-card shadow-[0_-12px_30px_-18px_rgba(0,0,0,0.35)]">
      <div className="mx-auto grid max-w-3xl gap-2 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3 text-sm">
          <p className="min-w-0">
            {changed ? (
              <>
                <b>{lines.join(" · ")}</b>
                {delta ? <span className="text-muted"> · {delta > 0 ? "+" : "−"}{fmtSgd(Math.abs(delta))} per couple</span> : null}
                {nyeFrom !== nyeTo ? <span className="block text-warn">New Year’s Eve: {name(nyeFrom)} → {name(nyeTo)}</span> : null}
              </>
            ) : (
              <span className="text-muted">Tap + or − on a stop. The trip stays at {snapshot.trip.nights} nights.</span>
            )}
          </p>
          {canUndo ? (
            <button className="shrink-0 font-semibold text-accent" onClick={onUndo}>
              Undo
            </button>
          ) : null}
        </div>
        {error ? (
          <p className="text-sm text-warn" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary w-full" disabled={!changed || busy} onClick={onPrimary}>
          {busy ? "One moment…" : primary}
        </button>
        {secondary ? (
          <button className="justify-self-center text-sm font-semibold text-muted" onClick={secondary.run}>
            {secondary.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** A short message at the bottom, with an optional action such as Undo. */
export function Toast({ text, action, onDone }: { text: string; action?: { label: string; run: () => void }; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 10000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div role="status" className="fixed inset-x-4 bottom-24 z-[70] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-bg shadow-[var(--glow)]">
      <span>{text}</span>
      {action ? (
        <button className="shrink-0 font-semibold underline" onClick={action.run}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

/** What happened to what I sent: waiting, added, or kept as it is, with what I can do next. */
export function MySuggestion({ onChangeAgain }: { onChangeAgain: (s: Suggestion) => void }) {
  const { snapshot, me, withdrawSuggestion } = useStore();
  const [busy, setBusy] = useState(false);
  const planners = plannerNames(snapshot.travellers);
  const mine = snapshot.suggestions
    .filter((s) => s.author_id === me?.travellerId)
    .sort((a, b) => (b.decided_at ?? b.created_at ?? "").localeCompare(a.decided_at ?? a.created_at ?? ""))[0];
  if (!mine) return null;
  const recent = mine.decided_at ? mine.decided_at.slice(0, 10) >= addDays(todayIso(), -7) : false;
  const who = firstName(snapshot.travellers, mine.decided_by);
  const what = mine.diff.whole ? (snapshot.versions.find((v) => v.id === mine.from_version_id)?.name ?? "another route") : mine.diff.summary.join(" · ");
  if (mine.status === "open")
    return (
      <div className="card grid gap-2 border-l-4 border-l-warn p-4 text-sm">
        <p>
          <b>Your suggestion is with {planners}:</b> {what}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
          <Link href="/inbox">See it →</Link>
          <button
            className="text-muted"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await withdrawSuggestion(mine.id);
              setBusy(false);
            }}
          >
            Cancel my suggestion
          </button>
        </div>
      </div>
    );
  if (!recent) return null;
  return (
    <div className={`card grid gap-2 border-l-4 p-4 text-sm ${mine.status === "accepted" ? "border-l-ok" : "border-l-rule"}`}>
      <p>
        <b>{mine.status === "accepted" ? `${who} added your change to the route.` : `${who} kept the route as it is.`}</b> {what}
      </p>
      {mine.diff.decision_note ? <p className="text-ink-2">“{mine.diff.decision_note}”</p> : null}
      {mine.status === "declined" && !mine.diff.whole ? (
        <button className="justify-self-start font-semibold text-accent" onClick={() => onChangeAgain(mine)}>
          Change it and send again
        </button>
      ) : null}
    </div>
  );
}
