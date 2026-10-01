"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { localStore, useLocalStore, useSystemDark } from "@/lib/localStore";
import { isCurrency, type Currency } from "@/lib/money";
import { browserSupabase } from "@/lib/supabase/client";
import { configureTables } from "@/lib/tables";
import type { Heart, MediaItem, Traveller, Trip, Vote } from "@/lib/types";

/* ------------------------------------------------------------ prefs */

export type ThemePref = "system" | "light" | "dark";
export interface Prefs {
  theme: ThemePref;
  largeText: boolean;
  simple: boolean;
  /** Home currency for the "≈" hint next to yen amounts. */
  currency: Currency;
}
const DEFAULT_PREFS: Prefs = { theme: "system", largeText: false, simple: false, currency: "BRL" };
const PREFS_KEY = "saj-prefs";

/** Inline script run before paint so the theme and text size never flash. */
export const PREFS_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}");var r=document.documentElement;var t=p.theme==="light"||p.theme==="dark"?p.theme:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");r.dataset.theme=t;if(p.largeText)r.dataset.text="large";if(p.simple)r.dataset.simple="1"}catch(e){}})()`;

const prefsStore = localStore<Prefs>(PREFS_KEY, DEFAULT_PREFS, (raw) => {
  const p = { ...DEFAULT_PREFS, ...(raw as Partial<Prefs>) };
  return isCurrency(p.currency) ? p : { ...p, currency: DEFAULT_PREFS.currency };
});
const arr = <T,>(raw: unknown) => (Array.isArray(raw) ? (raw as T[]) : []);

/* ------------------------------------------------------------ store */

export interface Me {
  travellerId: string;
  name: string;
  role: "planner" | "member";
  /** The planner can switch to any traveller ("Ver como") without an email code. */
  canSwitch?: boolean;
  /** Set while the planner is acting as someone else: who the planner really is. */
  actingFor?: { id: string; name: string } | null;
}

interface Store {
  trip: Trip;
  demo: boolean;
  me: Me | null;
  setDemoMe: (id: string) => void;
  prefs: Prefs;
  resolvedTheme: "light" | "dark";
  setPrefs: (p: Partial<Prefs>) => void;
  votes: Vote[];
  hearts: Heart[];
  media: MediaItem[];
  submitRanking: (routeIds: string[]) => Promise<void>;
  /** Vote on generated plans (candidate plans); votes carry the plan id as routeId. */
  submitPlanRanking: (planIds: string[]) => Promise<void>;
  toggleHeart: (placeId: string) => Promise<void>;
  pinVideo: (placeId: string, videoId: string, title: string) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  moveMedia: (id: string, dir: -1 | 1) => Promise<void>;
  setPhotoState: (placeId: string, name: string, state: "pinned" | "hidden" | "default") => Promise<void>;
  error: string | null;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

// Demo mode (no Supabase) keeps shared data in this browser only.
const local = {
  votes: localStore<Vote[]>("saj-votes", [], arr),
  hearts: localStore<Heart[]>("saj-hearts", [], arr),
  media: localStore<MediaItem[]>("saj-media", [], arr),
  me: localStore<string | null>("saj-demo-me", null),
};

export function Providers({
  trip,
  viewer,
  children,
}: {
  trip: Trip;
  viewer: Me | null | "demo";
  children: React.ReactNode;
}) {
  const demo = viewer === "demo";
  const sb = demo ? null : browserSupabase();
  configureTables(sb);

  /* prefs */
  const prefs = useLocalStore(prefsStore);
  const systemDark = useSystemDark();
  const resolvedTheme = prefs.theme === "system" ? (systemDark ? "dark" : "light") : prefs.theme;
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = resolvedTheme;
    if (prefs.largeText) r.dataset.text = "large";
    else delete r.dataset.text;
    if (prefs.simple) r.dataset.simple = "1";
    else delete r.dataset.simple;
  }, [prefs, resolvedTheme]);
  const setPrefs = useCallback((p: Partial<Prefs>) => prefsStore.set({ ...prefsStore.get(), ...p }), []);

  /* identity */
  const demoMeId = useLocalStore(local.me) ?? trip.travellers[0]?.id ?? null;
  const me: Me | null = useMemo(() => {
    if (!demo) return viewer as Me | null;
    const t: Traveller | undefined = trip.travellers.find((x) => x.id === demoMeId);
    // Everyone is a planner in demo mode so curation can be tried out.
    return t ? { travellerId: t.id, name: t.name, role: "planner" } : null;
  }, [demo, viewer, demoMeId, trip.travellers]);
  const setDemoMe = useCallback((id: string) => local.me.set(id), []);

  /* shared data */
  const localVotes = useLocalStore(local.votes);
  const localHearts = useLocalStore(local.hearts);
  const localMedia = useLocalStore(local.media);
  const [remote, setRemote] = useState<{ votes: Vote[]; hearts: Heart[]; media: MediaItem[] }>({ votes: [], hearts: [], media: [] });
  const [error, setError] = useState<string | null>(null);
  const votes = sb ? remote.votes : localVotes;
  const hearts = sb ? remote.hearts : localHearts;
  const media = sb ? remote.media : localMedia;
  const setHeartsOptimistic = (next: Heart[]) => setRemote((r) => ({ ...r, hearts: next }));

  const refresh = useCallback(async () => {
    if (!sb) return;
    const [v, pv, h, m] = await Promise.all([
      sb.from("votes").select("traveller_id,route_id,rank"),
      sb.from("plan_votes").select("traveller_id,plan_id,rank"),
      sb.from("hearts").select("traveller_id,place_id"),
      sb.from("place_media").select("id,place_id,type,source_ref,pinned,sort,title").order("sort"),
    ]);
    const err = v.error ?? h.error ?? m.error;
    const planVotes = pv.error ? [] : pv.data!.map((r) => ({ travellerId: r.traveller_id, routeId: r.plan_id, rank: r.rank }));
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setRemote({
      votes: [...v.data!.map((r) => ({ travellerId: r.traveller_id, routeId: r.route_id, rank: r.rank })), ...planVotes],
      hearts: h.data!.map((r) => ({ travellerId: r.traveller_id, placeId: r.place_id })),
      media: m.data!.map((r) => ({
        id: r.id,
        placeId: r.place_id,
        type: r.type,
        sourceRef: r.source_ref,
        pinned: r.pinned,
        sort: r.sort,
        title: r.title,
      })),
    });
  }, [sb]);

  useEffect(() => {
    if (!sb) return;
    // Live updates (F6): tables are tiny, so refetch on any change.
    let t: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(t);
      t = setTimeout(refresh, 150);
    };
    bump();
    const channel = sb
      .channel("trip-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_votes" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "hearts" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "place_media" }, bump)
      .subscribe();
    return () => {
      clearTimeout(t);
      sb.removeChannel(channel);
    };
  }, [sb, refresh]);

  const run = useCallback(
    async (p: PromiseLike<{ error: { message: string } | null }>) => {
      const { error } = await p;
      if (error) setError(error.message);
      await refresh();
    },
    [refresh],
  );

  const submitRanking = useCallback(
    async (routeIds: string[]) => {
      if (!me) return;
      if (!sb) {
        const others = votes.filter((v) => v.travellerId !== me.travellerId);
        const mine = routeIds.map((routeId, i) => ({ travellerId: me.travellerId, routeId, rank: i + 1 }));
        local.votes.set([...others, ...mine]);
        return;
      }
      const codes = routeIds.map((id) => trip.routes.find((r) => r.id === id)!.code);
      await run(sb.rpc("submit_ranking", { route_codes: codes }));
    },
    [me, sb, votes, trip.routes, run],
  );

  const submitPlanRanking = useCallback(
    async (planIds: string[]) => {
      if (!me) return;
      if (!sb) {
        const others = votes.filter((v) => v.travellerId !== me.travellerId);
        const mine = planIds.map((routeId, i) => ({ travellerId: me.travellerId, routeId, rank: i + 1 }));
        local.votes.set([...others, ...mine]);
        return;
      }
      await run(sb.rpc("submit_plan_ranking", { plan_ids: planIds }));
    },
    [me, sb, votes, run],
  );

  const toggleHeart = useCallback(
    async (placeId: string) => {
      if (!me) return;
      const has = hearts.some((h) => h.travellerId === me.travellerId && h.placeId === placeId);
      // Optimistic update so the heart responds instantly.
      const next = has
        ? hearts.filter((h) => !(h.travellerId === me.travellerId && h.placeId === placeId))
        : [...hearts, { travellerId: me.travellerId, placeId }];
      if (!sb) return local.hearts.set(next);
      setHeartsOptimistic(next);
      await run(
        has
          ? sb.from("hearts").delete().match({ traveller_id: me.travellerId, place_id: placeId })
          : sb.from("hearts").insert({ traveller_id: me.travellerId, place_id: placeId }),
      );
    },
    [me, hearts, sb, run],
  );

  const pinVideo = useCallback(
    async (placeId: string, videoId: string, title: string) => {
      const sort = Math.max(0, ...media.filter((m) => m.placeId === placeId && m.type === "video").map((m) => m.sort + 1));
      if (!sb) {
        if (media.some((m) => m.placeId === placeId && m.type === "video" && m.sourceRef === videoId)) return;
        const item: MediaItem = { id: crypto.randomUUID(), placeId, type: "video", sourceRef: videoId, pinned: true, sort, title };
        return local.media.set([...media, item]);
      }
      await run(
        sb.from("place_media").upsert(
          { place_id: placeId, type: "video", source_ref: videoId, pinned: true, sort, title },
          { onConflict: "place_id,type,source_ref" },
        ),
      );
    },
    [media, sb, run],
  );

  const removeMedia = useCallback(
    async (id: string) => {
      if (!sb) return local.media.set(media.filter((m) => m.id !== id));
      await run(sb.from("place_media").delete().eq("id", id));
    },
    [media, sb, run],
  );

  const moveMedia = useCallback(
    async (id: string, dir: -1 | 1) => {
      const item = media.find((m) => m.id === id);
      if (!item) return;
      const list = media
        .filter((m) => m.placeId === item.placeId && m.type === item.type)
        .sort((a, b) => a.sort - b.sort);
      const i = list.findIndex((m) => m.id === id);
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      const resorted = list.map((m, k) => ({ ...m, sort: k }));
      if (!sb) {
        const others = media.filter((m) => !resorted.some((r) => r.id === m.id));
        return local.media.set([...others, ...resorted]);
      }
      for (const m of resorted) {
        const { error } = await sb.from("place_media").update({ sort: m.sort }).eq("id", m.id);
        if (error) setError(error.message);
      }
      await refresh();
    },
    [media, sb, refresh],
  );

  const setPhotoState = useCallback(
    async (placeId: string, name: string, state: "pinned" | "hidden" | "default") => {
      const existing = media.find((m) => m.placeId === placeId && m.type === "photo" && m.sourceRef === name);
      if (state === "default") {
        if (existing) await removeMedia(existing.id);
        return;
      }
      const pinned = state === "pinned";
      const sort = Math.max(0, ...media.filter((m) => m.placeId === placeId && m.type === "photo").map((m) => m.sort + 1));
      if (!sb) {
        const rest = media.filter((m) => m !== existing);
        const item: MediaItem = existing
          ? { ...existing, pinned }
          : { id: crypto.randomUUID(), placeId, type: "photo", sourceRef: name, pinned, sort };
        return local.media.set([...rest, item]);
      }
      await run(
        sb.from("place_media").upsert(
          { place_id: placeId, type: "photo", source_ref: name, pinned, sort: existing?.sort ?? sort },
          { onConflict: "place_id,type,source_ref" },
        ),
      );
    },
    [media, sb, removeMedia, run],
  );

  const value: Store = {
    trip,
    demo,
    me,
    setDemoMe,
    prefs,
    resolvedTheme,
    setPrefs,
    votes,
    hearts,
    media,
    submitRanking,
    submitPlanRanking,
    toggleHeart,
    pinVideo,
    removeMedia,
    moveMedia,
    setPhotoState,
    error,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
