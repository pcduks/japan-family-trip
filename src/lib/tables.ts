"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useSyncExternalStore } from "react";
import type { Activity, Booking, Plan, Setting, Tip } from "./plan";
import { newId } from "./plan";

/**
 * One store per table. With Supabase it loads every row (the tables are tiny),
 * follows Realtime changes and keeps a localStorage snapshot so the itinerary
 * still opens offline (P3.2). Without Supabase (demo mode) localStorage is the
 * source of truth.
 */
export interface TableRows {
  plans: Plan;
  activities: Activity;
  bookings: Booking;
  tips: Tip;
  settings: Setting;
}
export type TableName = keyof TableRows;

type Listener = () => void;

interface Store<T extends { id: string }> {
  rows: T[];
  loaded: boolean;
  error: string | null;
  listeners: Set<Listener>;
  started: boolean;
  snapshot: { rows: T[]; loaded: boolean; error: string | null };
}

const stores = new Map<TableName, Store<{ id: string }>>();
let client: SupabaseClient | null = null;
let demo = true;

/** Called once by the provider. */
export function configureTables(sb: SupabaseClient | null) {
  client = sb;
  demo = !sb;
}

const cacheKey = (t: TableName) => `saj-${demo ? "demo" : "cache"}-${t}`;

function store<K extends TableName>(t: K): Store<TableRows[K]> {
  let s = stores.get(t);
  if (!s) {
    s = { rows: [], loaded: false, error: null, listeners: new Set(), started: false, snapshot: { rows: [], loaded: false, error: null } };
    stores.set(t, s);
  }
  return s as unknown as Store<TableRows[K]>;
}

function emit<K extends TableName>(t: K) {
  const s = store(t);
  s.snapshot = { rows: s.rows, loaded: s.loaded, error: s.error };
  s.listeners.forEach((l) => l());
}

function setRows<K extends TableName>(t: K, rows: TableRows[K][], persist = true) {
  const s = store(t);
  s.rows = rows;
  s.loaded = true;
  if (persist) {
    try {
      localStorage.setItem(cacheKey(t), JSON.stringify(rows));
    } catch {}
  }
  emit(t);
}

function readCache<K extends TableName>(t: K): TableRows[K][] | null {
  try {
    const raw = localStorage.getItem(cacheKey(t));
    return raw ? (JSON.parse(raw) as TableRows[K][]) : null;
  } catch {
    return null;
  }
}

async function fetchAll<K extends TableName>(t: K) {
  if (!client) return;
  const { data, error } = await client.from(t).select("*");
  const s = store(t);
  if (error) {
    // Offline or failing: keep showing the cached snapshot.
    s.error = error.message;
    s.loaded = true;
    emit(t);
    return;
  }
  s.error = null;
  setRows(t, data as TableRows[K][]);
}

function start<K extends TableName>(t: K) {
  const s = store(t);
  if (s.started || typeof window === "undefined") return;
  s.started = true;
  const cached = readCache(t);
  if (cached) setRows(t, cached, false);
  if (demo) {
    s.loaded = true;
    emit(t);
    window.addEventListener("storage", (e) => {
      if (e.key === cacheKey(t)) setRows(t, readCache(t) ?? [], false);
    });
    return;
  }
  fetchAll(t);
  let timer: ReturnType<typeof setTimeout> | undefined;
  client!
    .channel(`live-${t}`)
    .on("postgres_changes", { event: "*", schema: "public", table: t }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => fetchAll(t), 150);
    })
    .subscribe();
  window.addEventListener("online", () => fetchAll(t));
}

export function useTable<K extends TableName>(t: K) {
  const s = store(t);
  useEffect(() => start(t), [t]);
  const snap = useSyncExternalStore(
    (l) => {
      s.listeners.add(l);
      return () => s.listeners.delete(l);
    },
    () => s.snapshot,
    () => EMPTY as Store<TableRows[K]>["snapshot"],
  );
  return snap;
}
const EMPTY = { rows: [], loaded: false, error: null };

/* ------------------------------------------------------------- writes */

async function run<K extends TableName>(t: K, op: () => PromiseLike<{ error: { message: string } | null }>) {
  if (demo || !client) return;
  const { error } = await op();
  if (error) {
    store(t).error = error.message;
    await fetchAll(t); // roll back the optimistic change
  }
}

export async function insertRow<K extends TableName>(t: K, row: Omit<TableRows[K], "id"> & { id?: string }): Promise<TableRows[K]> {
  const full = { ...row, id: row.id ?? newId() } as TableRows[K];
  setRows(t, [...store(t).rows, full]);
  await run(t, () => client!.from(t).insert(full));
  return full;
}

export async function updateRow<K extends TableName>(t: K, id: string, patch: Partial<TableRows[K]>) {
  const extra = t === "plans" || t === "bookings" || t === "settings" ? { updated_at: new Date().toISOString() } : {};
  const next = { ...patch, ...extra };
  setRows(
    t,
    store(t).rows.map((r) => (r.id === id ? { ...r, ...next } : r)),
  );
  await run(t, () => client!.from(t).update(next).eq("id", id));
}

export async function upsertRow<K extends TableName>(t: K, row: TableRows[K]) {
  const rows = store(t).rows;
  setRows(t, rows.some((r) => r.id === row.id) ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row]);
  await run(t, () => client!.from(t).upsert(row));
}

export async function deleteRow<K extends TableName>(t: K, id: string) {
  setRows(
    t,
    store(t).rows.filter((r) => r.id !== id),
  );
  await run(t, () => client!.from(t).delete().eq("id", id));
}

/** Mark one plan as chosen and clear the others (one chosen plan at a time). */
export async function choosePlan(id: string | null) {
  const rows = store("plans").rows;
  setRows(
    "plans",
    rows.map((p) => ({ ...p, is_chosen: p.id === id })),
  );
  if (demo || !client) return;
  const cur = rows.find((p) => p.is_chosen);
  if (cur && cur.id !== id) await run("plans", () => client!.from("plans").update({ is_chosen: false }).eq("id", cur.id));
  if (id) await run("plans", () => client!.from("plans").update({ is_chosen: true }).eq("id", id));
}

/* ----------------------------------------------------------- settings */

export function useSetting<T>(key: string, fallback: T): [T, (v: T) => void] {
  const { rows } = useTable("settings");
  const row = rows.find((r) => r.id === key);
  return [(row?.value as T) ?? fallback, (v: T) => void upsertRow("settings", { id: key, value: v })];
}
