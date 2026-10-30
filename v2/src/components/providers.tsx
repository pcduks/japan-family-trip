"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { localStore, useLocalStore, useSystemDark } from "@/lib/localStore";
import type { RulesContext } from "@/lib/rules";
import type { Comment, PlanHistoryEntry, Reaction, Role, Snapshot, Stay, Suggestion, SuggestionDiff, Version, Vote, VoteKind } from "@/lib/types";
import { describeDiff, newId } from "@/lib/versions";
import { afterAccept, mergeOnto, sameRoute, stopNames, validRoute } from "@/lib/merge";

/* ------------------------------------------------------------ prefs */

export type ThemePref = "system" | "light" | "dark";
export interface Prefs {
  theme: ThemePref;
  largeText: boolean;
}
const DEFAULT_PREFS: Prefs = { theme: "system", largeText: false };
const PREFS_KEY = "jp-prefs";

/** Runs before paint so theme and text size never flash. */
export const PREFS_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}");var r=document.documentElement;var t=p.theme==="light"||p.theme==="dark"?p.theme:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");r.dataset.theme=t;if(p.largeText)r.dataset.text="large"}catch(e){}})()`;

const prefsStore = localStore<Prefs>(PREFS_KEY, DEFAULT_PREFS, (raw) => ({ ...DEFAULT_PREFS, ...(raw as Partial<Prefs>) }));

/* ------------------------------------------------------------ store */

export interface Me {
  travellerId: string;
  name: string;
  role: Role;
}

interface DemoState {
  versions: Version[];
  votes: Vote[];
  suggestions: Suggestion[];
  comments: Comment[];
  reactions: Reaction[];
  history: PlanHistoryEntry[];
  planOverride: Version | null;
  rankRevealed: boolean;
  doneDeadlines: string[];
}
const EMPTY_DEMO: DemoState = { versions: [], votes: [], suggestions: [], comments: [], reactions: [], history: [], planOverride: null, rankRevealed: false, doneDeadlines: [] };
const demoStore = localStore<DemoState>("jp-demo", EMPTY_DEMO, (raw) => ({ ...EMPTY_DEMO, ...(raw as Partial<DemoState>) }));
const demoMe = localStore<string | null>("jp-demo-me", null);

export interface Store {
  snapshot: Snapshot;
  demo: boolean;
  me: Me | null;
  isPlanner: boolean;
  setDemoMe: (id: string) => void;
  prefs: Prefs;
  resolvedTheme: "light" | "dark";
  setPrefs: (p: Partial<Prefs>) => void;
  rules: RulesContext;
  rankRevealed: boolean;
  error: string | null;
  busy: boolean;
  refresh: () => Promise<void>;
  /** Resolves to null when saved, else why not. With `base`, a change to the route that moved on meanwhile is refused unless `onTop`. */
  saveVersion: (v: Version, note?: string, opts?: { base?: Stay[]; onTop?: boolean }) => Promise<string | null>;
  deleteVersion: (id: string) => Promise<void>;
  setVote: (kind: VoteKind, value: unknown) => Promise<void>;
  revealRanks: () => Promise<void>;
  suggest: (fromVersionId: string | null, diff: SuggestionDiff, comment: string) => Promise<string | null>;
  /** With `applied`, the planner already saved the change on the trip: only mark it accepted. */
  decideSuggestion: (id: string, decision: "accepted" | "declined", note?: string, applied?: boolean) => Promise<string | null>;
  withdrawSuggestion: (id: string) => Promise<void>;
  revertHistory: (id: string) => Promise<string | null>;
  setDeadlineDone: (id: string, done: boolean) => Promise<void>;
  addComment: (targetType: Comment["target_type"], targetId: string, body: string) => Promise<void>;
  toggleReaction: (targetType: string, targetId: string, kind: Reaction["kind"]) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

/** Posts one write to the server. Throws with the server's message on failure. */
async function act(action: string, payload: Record<string, unknown>): Promise<void> {
  const r = await fetch("/api/act", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `${action} failed (${r.status})`);
  }
}

const POLL_MS = 15000;

export function Providers({ snapshot: initial, viewer, children }: { snapshot: Snapshot; viewer: Me | null | "demo"; children: React.ReactNode }) {
  const demo = viewer === "demo";
  /** Shared mode: reads and writes go through the server, which holds the only database key. */
  const sb = !demo && viewer !== null;
  const router = useRouter();

  /* prefs */
  const prefs = useLocalStore(prefsStore);
  const systemDark = useSystemDark();
  const resolvedTheme = prefs.theme === "system" ? (systemDark ? "dark" : "light") : prefs.theme;
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = resolvedTheme;
    if (prefs.largeText) r.dataset.text = "large";
    else delete r.dataset.text;
  }, [prefs, resolvedTheme]);
  const setPrefs = useCallback((p: Partial<Prefs>) => prefsStore.set({ ...prefsStore.get(), ...p }), []);

  /* identity */
  const demoMeId = useLocalStore(demoMe);
  const me: Me | null = useMemo(() => {
    if (!demo) return viewer as Me | null;
    const t = initial.travellers.find((x) => x.id === demoMeId) ?? initial.travellers[0];
    return t ? { travellerId: t.id, name: t.name, role: t.role } : null;
  }, [demo, viewer, demoMeId, initial.travellers]);
  const setDemoMe = useCallback((id: string) => demoMe.set(id), []);

  /* shared data */
  const [remote, setRemote] = useState<Snapshot>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const demoState = useLocalStore(demoStore);
  const [rankRevealedRemote, setRankRevealedRemote] = useState(false);

  const refresh = useCallback(async () => {
    if (!sb) return;
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      if (r.status === 401) {
        router.push("/login");
        return;
      }
      const j = (await r.json()) as { snapshot?: Snapshot; rankRevealed?: boolean; error?: string };
      if (!r.ok || !j.snapshot) throw new Error(j.error ?? "Could not load");
      setRemote(j.snapshot);
      setRankRevealedRemote(Boolean(j.rankRevealed));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [sb, router]);

  // No websockets in the beta: poll while the tab is visible and refetch when it comes back.
  useEffect(() => {
    if (!sb) return;
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [sb, refresh]);

  const snapshot: Snapshot = useMemo(() => {
    if (sb) return remote;
    // Demo: overlay local edits on the bundled file.
    const versions = initial.versions.map((v) => (v.status === "plan" && demoState.planOverride ? demoState.planOverride : v)).concat(demoState.versions);
    const deadlines = initial.deadlines.map((d) => (d.id && demoState.doneDeadlines.includes(d.id) ? { ...d, done: true } : d));
    return { ...initial, versions, deadlines, votes: demoState.votes, suggestions: demoState.suggestions, comments: demoState.comments, reactions: demoState.reactions, history: demoState.history };
  }, [sb, remote, initial, demoState]);

  const rankRevealed = sb
    ? rankRevealedRemote || (snapshot.votes.filter((v) => v.kind === "rank").length >= snapshot.travellers.length && snapshot.travellers.length > 0)
    : demoState.rankRevealed || snapshot.votes.filter((v) => v.kind === "rank").length >= snapshot.travellers.length;

  const rules: RulesContext = useMemo(
    () => ({ trip: snapshot.trip, calendar: snapshot.calendar, pace: snapshot.pace, regions: snapshot.regions, places: snapshot.places }),
    [snapshot],
  );

  const isPlanner = !!me && me.role === "planner";

  /** One write. Resolves to null when it worked, else the reason; a quiet write leaves the reason to the caller to show. */
  const run = useCallback(
    async (action: string, payload: Record<string, unknown>, quiet = false): Promise<string | null> => {
      setBusy(true);
      try {
        await act(action, payload);
        setError(null);
        await refresh();
        return null;
      } catch (e) {
        if (!quiet) setError((e as Error).message);
        await refresh();
        return (e as Error).message;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const patchDemo = (fn: (d: DemoState) => DemoState) => demoStore.set(fn(demoStore.get()));

  const saveVersion = useCallback(
    async (v: Version, note?: string, opts?: { base?: Stay[]; onTop?: boolean }): Promise<string | null> => {
      const who = me;
      if (!who) return "Sign in first";
      const isPlan = v.status === "plan";
      const before = !sb && isPlan ? (demoStore.get().planOverride ?? snapshot.versions.find((x) => x.id === v.id)) : snapshot.versions.find((x) => x.id === v.id);
      if (!sb) {
        if (isPlan && before) {
          const bad = validRoute(v.stays, snapshot.trip.start, snapshot.trip.nights);
          if (bad) return bad;
          if (opts?.base && !sameRoute(opts.base, before.stays)) {
            if (!opts.onTop) return `changed:${describeDiff(opts.base, before.stays, snapshot.regions).join("; ")}`;
            const m = mergeOnto(opts.base, v.stays, before.stays, snapshot.trip.start);
            if (m.kind === "clash") return `Your change and the newer one both touch ${stopNames(m.stops, snapshot.regions)}. Look at the route first.`;
            if (m.kind === "already") return null;
            v = { ...v, stays: m.stays };
          }
        }
        const summary = before ? describeDiff(before.stays, v.stays, snapshot.regions) : [`created “${v.name}”`];
        patchDemo((d) => {
          const history = isPlan && before ? [{ id: newId(), version_id: v.id, actor_id: who.travellerId, change: { summary: note ? [note, ...summary] : summary, before: before.stays, after: v.stays }, at: new Date().toISOString() }, ...d.history] : d.history;
          if (isPlan) return { ...d, planOverride: v, history };
          const others = d.versions.filter((x) => x.id !== v.id);
          return { ...d, versions: [...others, { ...v, updated_at: new Date().toISOString() }], history };
        });
        return null;
      }
      return run("saveVersion", { version: v, note, base: opts?.base, onTop: opts?.onTop }, !!opts?.base);
    },
    [sb, run, snapshot.versions, snapshot.regions, snapshot.trip, me],
  );

  const deleteVersion = useCallback(
    async (id: string) => {
      if (!sb) return patchDemo((d) => ({ ...d, versions: d.versions.filter((v) => v.id !== id) }));
      await run("deleteVersion", { id });
    },
    [sb, run],
  );

  const setVote = useCallback(
    async (kind: VoteKind, value: unknown) => {
      const who = me;
      if (!who) return;
      const vote: Vote = { traveller_id: who.travellerId, kind, value, updated_at: new Date().toISOString() };
      if (!sb) return patchDemo((d) => ({ ...d, votes: [...d.votes.filter((v) => !(v.traveller_id === who.travellerId && v.kind === kind)), vote] }));
      await run("setVote", { kind, value: vote.value });
    },
    [sb, run, me],
  );

  const revealRanks = useCallback(async () => {
    if (!sb) return patchDemo((d) => ({ ...d, rankRevealed: true }));
    await run("revealRanks", {});
  }, [sb, run]);

  const suggest = useCallback(
    async (fromVersionId: string | null, diff: SuggestionDiff, comment: string): Promise<string | null> => {
      const who = me;
      if (!who) return "Sign in first";
      if (!sb) {
        const bad = validRoute(diff.stays, snapshot.trip.start, snapshot.trip.nights);
        if (bad) return bad;
        // Read the demo route from storage, not the render this callback was made in: a toast can call it later.
        const plan = demoStore.get().planOverride ?? snapshot.versions.find((v) => v.status === "plan");
        const stored: SuggestionDiff = { ...diff, base: diff.base ?? plan?.stays };
        patchDemo((d) => ({
          ...d,
          // One open suggestion per person: sending again replaces the earlier one.
          suggestions: [{ id: newId(), from_version_id: fromVersionId, author_id: who.travellerId, diff: stored, comment, status: "open", created_at: new Date().toISOString() }, ...d.suggestions.filter((x) => !(x.author_id === who.travellerId && x.status === "open"))],
        }));
        return null;
      }
      return run("suggest", { fromVersionId, diff, comment }, true);
    },
    [sb, run, me, snapshot.trip, snapshot.versions],
  );

  const decideSuggestion = useCallback(
    async (id: string, decision: "accepted" | "declined", note?: string, applied?: boolean): Promise<string | null> => {
      const who = me;
      if (!who) return "Sign in first";
      if (!sb) {
        const s = demoStore.get().suggestions.find((x) => x.id === id);
        // Read the demo route from storage, not the render this callback was made in: a toast can call it later.
        const plan = demoStore.get().planOverride ?? snapshot.versions.find((v) => v.status === "plan");
        if (!s || !plan) return "That suggestion is not open";
        const r = decision === "accepted" && !applied ? afterAccept(s.diff, plan.stays, snapshot.trip, snapshot.regions) : ({ ok: true, stays: null } as const);
        if (!r.ok) return r.message;
        patchDemo((d) => {
          const suggestions = d.suggestions.map((x) => (x.id === id ? { ...x, status: decision, decided_by: who.travellerId, decided_at: new Date().toISOString(), diff: { ...x.diff, decision_note: note?.trim() || null } } : x));
          if (!r.stays) return { ...d, suggestions };
          const next: Version = { ...plan, stays: r.stays, pace: s.diff.pace ?? plan.pace };
          return {
            ...d,
            suggestions,
            planOverride: next,
            history: [{ id: newId(), version_id: plan.id, actor_id: who.travellerId, change: { summary: describeDiff(plan.stays, r.stays, snapshot.regions), before: plan.stays, after: r.stays, suggestion_id: id }, at: new Date().toISOString() }, ...d.history],
          };
        });
        return null;
      }
      return run("decideSuggestion", { id, decision, note, applied }, true);
    },
    [sb, run, snapshot.versions, snapshot.trip, snapshot.regions, me],
  );

  const withdrawSuggestion = useCallback(
    async (id: string) => {
      if (!sb) return patchDemo((d) => ({ ...d, suggestions: d.suggestions.filter((s) => s.id !== id) }));
      await run("withdrawSuggestion", { id });
    },
    [sb, run],
  );

  const revertHistory = useCallback(
    async (id: string): Promise<string | null> => {
      const who = me;
      if (!who) return "Sign in first";
      if (!sb) {
        const h = demoStore.get().history.find((x) => x.id === id);
        // Read the demo route from storage, not the render this callback was made in: a toast can call it later.
        const plan = demoStore.get().planOverride ?? snapshot.versions.find((v) => v.status === "plan");
        if (!h || !plan) return "No such change";
        // Undo only while the route is still what that change left; otherwise it would wipe a newer change.
        if (!sameRoute(plan.stays, h.change.after)) return "The route has changed since. Undo the newest change first.";
        patchDemo((d) => ({
          ...d,
          planOverride: { ...plan, stays: h.change.before },
          suggestions: h.change.suggestion_id ? d.suggestions.map((x) => (x.id === h.change.suggestion_id ? { ...x, status: "open", decided_by: null, decided_at: null } : x)) : d.suggestions,
          history: [{ id: newId(), version_id: plan.id, actor_id: who.travellerId, change: { summary: ["undid a change"], before: plan.stays, after: h.change.before }, at: new Date().toISOString() }, ...d.history],
        }));
        return null;
      }
      return run("revertHistory", { id }, true);
    },
    [sb, run, snapshot.versions, me],
  );

  const setDeadlineDone = useCallback(
    async (id: string, done: boolean) => {
      if (!sb) return patchDemo((d) => ({ ...d, doneDeadlines: done ? [...d.doneDeadlines.filter((x) => x !== id), id] : d.doneDeadlines.filter((x) => x !== id) }));
      await run("setDeadlineDone", { id, done });
    },
    [sb, run],
  );

  const addComment = useCallback(
    async (targetType: Comment["target_type"], targetId: string, body: string) => {
      const who = me;
      if (!who || !body.trim()) return;
      if (!sb) return patchDemo((d) => ({ ...d, comments: [...d.comments, { id: newId(), author_id: who.travellerId, target_type: targetType, target_id: targetId, body: body.trim(), created_at: new Date().toISOString() }] }));
      await run("addComment", { targetType, targetId, body: body.trim() });
    },
    [sb, run, me],
  );

  const toggleReaction = useCallback(
    async (targetType: string, targetId: string, kind: Reaction["kind"]) => {
      const who = me;
      if (!who) return;
      const existing = snapshot.reactions.find((r) => r.traveller_id === who.travellerId && r.target_type === targetType && r.target_id === targetId && r.kind === kind);
      if (!sb)
        return patchDemo((d) => ({
          ...d,
          reactions: existing ? d.reactions.filter((r) => r.id !== existing.id) : [...d.reactions, { id: newId(), traveller_id: who.travellerId, target_type: targetType, target_id: targetId, kind }],
        }));
      await run("toggleReaction", { targetType, targetId, kind });
    },
    [sb, run, snapshot.reactions, me],
  );

  const value: Store = {
    snapshot,
    demo,
    me,
    isPlanner,
    setDemoMe,
    prefs,
    resolvedTheme,
    setPrefs,
    rules,
    rankRevealed,
    error,
    busy,
    refresh,
    saveVersion,
    deleteVersion,
    setVote,
    revealRanks,
    suggest,
    decideSuggestion,
    withdrawSuggestion,
    revertHistory,
    setDeadlineDone,
    addComment,
    toggleReaction,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
