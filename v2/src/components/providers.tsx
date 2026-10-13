"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadSnapshot } from "@/lib/data/loader";
import { localStore, useLocalStore, useSystemDark } from "@/lib/localStore";
import type { RulesContext } from "@/lib/rules";
import { browserSupabase } from "@/lib/supabase/client";
import type { Comment, PlanHistoryEntry, Reaction, Role, Snapshot, Stay, Suggestion, SuggestionDiff, Version, Vote, VoteKind } from "@/lib/types";
import { describeDiff, newId } from "@/lib/versions";

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
}
const EMPTY_DEMO: DemoState = { versions: [], votes: [], suggestions: [], comments: [], reactions: [], history: [], planOverride: null, rankRevealed: false };
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
  saveVersion: (v: Version, note?: string) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;
  setVote: (kind: VoteKind, value: unknown) => Promise<void>;
  revealRanks: () => Promise<void>;
  suggest: (fromVersionId: string | null, diff: SuggestionDiff, comment: string) => Promise<void>;
  decideSuggestion: (id: string, decision: "accepted" | "declined") => Promise<void>;
  withdrawSuggestion: (id: string) => Promise<void>;
  revertHistory: (id: string) => Promise<void>;
  addComment: (targetType: Comment["target_type"], targetId: string, body: string) => Promise<void>;
  toggleReaction: (targetType: string, targetId: string, kind: Reaction["kind"]) => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

type Row = Record<string, unknown>;

export function Providers({ snapshot: initial, viewer, children }: { snapshot: Snapshot; viewer: Me | null | "demo"; children: React.ReactNode }) {
  const demo = viewer === "demo";
  const sb = demo ? null : browserSupabase();

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
      const [snap, settings] = await Promise.all([loadSnapshot(sb), sb.from("settings").select("value").eq("key", "votes").maybeSingle()]);
      setRemote(snap);
      setRankRevealedRemote(Boolean((settings.data?.value as { rank_revealed?: boolean } | null)?.rank_revealed));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [sb]);

  useEffect(() => {
    if (!sb) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(t);
      t = setTimeout(refresh, 200);
    };
    const channel = sb.channel("trip-live");
    for (const table of ["votes", "versions", "stays", "suggestions", "comments", "reactions"]) {
      channel.on("postgres_changes", { event: "*", schema: "trip", table }, bump);
    }
    channel.subscribe();
    return () => {
      clearTimeout(t);
      sb.removeChannel(channel);
    };
  }, [sb, refresh]);

  const snapshot: Snapshot = useMemo(() => {
    if (sb) return remote;
    // Demo: overlay local edits on the bundled file.
    const versions = initial.versions.map((v) => (v.status === "plan" && demoState.planOverride ? demoState.planOverride : v)).concat(demoState.versions);
    return { ...initial, versions, votes: demoState.votes, suggestions: demoState.suggestions, comments: demoState.comments, reactions: demoState.reactions, history: demoState.history };
  }, [sb, remote, initial, demoState]);

  const rankRevealed = sb
    ? rankRevealedRemote || (snapshot.votes.filter((v) => v.kind === "rank").length >= snapshot.travellers.length && snapshot.travellers.length > 0)
    : demoState.rankRevealed || snapshot.votes.filter((v) => v.kind === "rank").length >= snapshot.travellers.length;

  const rules: RulesContext = useMemo(
    () => ({ trip: snapshot.trip, calendar: snapshot.calendar, pace: snapshot.pace, regions: snapshot.regions, places: snapshot.places }),
    [snapshot],
  );

  const isPlanner = !!me && me.role === "planner";

  const run = useCallback(
    async (fn: () => PromiseLike<{ error: { message: string } | null } | void> | { error: { message: string } | null }) => {
      setBusy(true);
      try {
        const r = await fn();
        if (r && r.error) setError(r.error.message);
        else setError(null);
        await refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const patchDemo = (fn: (d: DemoState) => DemoState) => demoStore.set(fn(demoStore.get()));

  const saveVersion = useCallback(
    async (v: Version, note?: string) => {
      const who = me;
      if (!who) return;
      const before = snapshot.versions.find((x) => x.id === v.id);
      const isPlan = v.status === "plan";
      const summary = before ? describeDiff(before.stays, v.stays, snapshot.regions) : [`created “${v.name}”`];
      if (!sb) {
        patchDemo((d) => {
          const history = isPlan && before ? [{ id: newId(), version_id: v.id, actor_id: who.travellerId, change: { summary: note ? [note, ...summary] : summary, before: before.stays, after: v.stays }, at: new Date().toISOString() }, ...d.history] : d.history;
          if (isPlan) return { ...d, planOverride: v, history };
          const others = d.versions.filter((x) => x.id !== v.id);
          return { ...d, versions: [...others, { ...v, updated_at: new Date().toISOString() }], history };
        });
        return;
      }
      await run(async () => {
        const row: Row = {
          id: v.id,
          name: v.name,
          owner_id: v.status === "personal" ? v.owner : before && before.owner !== "planners" ? before.owner : null,
          pace: v.pace,
          status: v.status,
          parent_version_id: v.parent_version_id ?? null,
          gains: v.gains,
          gives_up: v.gives_up,
          shared: v.shared ?? true,
          updated_at: new Date().toISOString(),
        };
        const up = await sb.from("versions").upsert(row, { onConflict: "id" });
        if (up.error) return up;
        const del = await sb.from("stays").delete().eq("version_id", v.id);
        if (del.error) return del;
        const ins = await sb.from("stays").insert(
          v.stays.map((s: Stay, i: number) => ({ version_id: v.id, region_id: s.region, start_date: s.from, end_date: s.to, lodging_type: s.lodging, note: s.note, sort: i })),
        );
        if (ins.error) return ins;
        if (isPlan && before) {
          return sb.from("plan_history").insert({ version_id: v.id, actor_id: who.travellerId, change: { summary: note ? [note, ...summary] : summary, before: before.stays, after: v.stays } });
        }
      });
    },
    [sb, run, snapshot.versions, snapshot.regions, me],
  );

  const deleteVersion = useCallback(
    async (id: string) => {
      if (!sb) return patchDemo((d) => ({ ...d, versions: d.versions.filter((v) => v.id !== id) }));
      await run(() => sb.from("versions").delete().eq("id", id));
    },
    [sb, run],
  );

  const setVote = useCallback(
    async (kind: VoteKind, value: unknown) => {
      const who = me;
      if (!who) return;
      const vote: Vote = { traveller_id: who.travellerId, kind, value, updated_at: new Date().toISOString() };
      if (!sb) return patchDemo((d) => ({ ...d, votes: [...d.votes.filter((v) => !(v.traveller_id === who.travellerId && v.kind === kind)), vote] }));
      await run(() => sb.from("votes").upsert(vote, { onConflict: "traveller_id,kind" }));
    },
    [sb, run, me],
  );

  const revealRanks = useCallback(async () => {
    if (!sb) return patchDemo((d) => ({ ...d, rankRevealed: true }));
    await run(() => sb.from("settings").upsert({ key: "votes", value: { rank_revealed: true }, updated_at: new Date().toISOString() }, { onConflict: "key" }));
  }, [sb, run]);

  const suggest = useCallback(
    async (fromVersionId: string | null, diff: SuggestionDiff, comment: string) => {
      const who = me;
      if (!who) return;
      if (!sb)
        return patchDemo((d) => ({
          ...d,
          suggestions: [{ id: newId(), from_version_id: fromVersionId, author_id: who.travellerId, diff, comment, status: "open", created_at: new Date().toISOString() }, ...d.suggestions],
        }));
      await run(() => sb.from("suggestions").insert({ from_version_id: fromVersionId, author_id: who.travellerId, diff, comment }));
    },
    [sb, run, me],
  );

  const decideSuggestion = useCallback(
    async (id: string, decision: "accepted" | "declined") => {
      const who = me;
      if (!who) return;
      if (!sb) {
        const s = demoStore.get().suggestions.find((x) => x.id === id);
        if (!s) return;
        const plan = snapshot.versions.find((v) => v.status === "plan");
        patchDemo((d) => {
          const suggestions = d.suggestions.map((x) => (x.id === id ? { ...x, status: decision, decided_by: who.travellerId, decided_at: new Date().toISOString() } : x));
          if (decision === "declined" || !plan) return { ...d, suggestions };
          const next: Version = { ...plan, stays: s.diff.stays, pace: s.diff.pace ?? plan.pace };
          return {
            ...d,
            suggestions,
            planOverride: next,
            history: [{ id: newId(), version_id: plan.id, actor_id: who.travellerId, change: { summary: s.diff.summary, before: plan.stays, after: next.stays, suggestion_id: id }, at: new Date().toISOString() }, ...d.history],
          };
        });
        return;
      }
      await run(async () => {
        if (decision === "accepted") return sb.rpc("accept_suggestion", { sid: id });
        return sb.from("suggestions").update({ status: "declined", decided_by: who.travellerId, decided_at: new Date().toISOString() }).eq("id", id);
      });
    },
    [sb, run, snapshot.versions, me],
  );

  const withdrawSuggestion = useCallback(
    async (id: string) => {
      if (!sb) return patchDemo((d) => ({ ...d, suggestions: d.suggestions.filter((s) => s.id !== id) }));
      await run(() => sb.from("suggestions").delete().eq("id", id));
    },
    [sb, run],
  );

  const revertHistory = useCallback(
    async (id: string) => {
      const who = me;
      if (!who) return;
      if (!sb) {
        const h = demoStore.get().history.find((x) => x.id === id);
        const plan = snapshot.versions.find((v) => v.status === "plan");
        if (!h || !plan) return;
        patchDemo((d) => ({
          ...d,
          planOverride: { ...plan, stays: h.change.before },
          history: [{ id: newId(), version_id: plan.id, actor_id: who.travellerId, change: { summary: ["reverted a change"], before: plan.stays, after: h.change.before }, at: new Date().toISOString() }, ...d.history],
        }));
        return;
      }
      await run(() => sb.rpc("revert_plan", { hid: id }));
    },
    [sb, run, snapshot.versions, me],
  );

  const addComment = useCallback(
    async (targetType: Comment["target_type"], targetId: string, body: string) => {
      const who = me;
      if (!who || !body.trim()) return;
      if (!sb) return patchDemo((d) => ({ ...d, comments: [...d.comments, { id: newId(), author_id: who.travellerId, target_type: targetType, target_id: targetId, body: body.trim(), created_at: new Date().toISOString() }] }));
      await run(() => sb.from("comments").insert({ author_id: who.travellerId, target_type: targetType, target_id: targetId, body: body.trim() }));
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
      await run(() => (existing ? sb.from("reactions").delete().eq("id", existing.id) : sb.from("reactions").insert({ traveller_id: who.travellerId, target_type: targetType, target_id: targetId, kind })));
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
    addComment,
    toggleReaction,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
