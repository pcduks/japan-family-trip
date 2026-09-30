"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny localStorage-backed store for useSyncExternalStore. Syncs across
 * tabs through the storage event and survives storage being unavailable.
 */
export interface LocalStore<T> {
  get: () => T;
  set: (v: T) => void;
  subscribe: (cb: () => void) => () => void;
  fallback: T;
}

export function localStore<T>(key: string, fallback: T, normalise: (raw: unknown) => T = (x) => x as T): LocalStore<T> {
  const listeners = new Set<() => void>();
  let lastRaw: string | null | undefined;
  let lastValue = fallback;
  let memory: string | null = null; // used when localStorage throws

  const read = (): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory;
    }
  };

  return {
    fallback,
    get() {
      const raw = read();
      if (raw !== lastRaw) {
        lastRaw = raw;
        try {
          lastValue = raw == null ? fallback : normalise(JSON.parse(raw));
        } catch {
          lastValue = fallback;
        }
      }
      return lastValue;
    },
    set(v) {
      const raw = JSON.stringify(v);
      try {
        localStorage.setItem(key, raw);
      } catch {
        memory = raw;
      }
      listeners.forEach((l) => l());
    },
    subscribe(cb) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => e.key === key && cb();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.fallback);
}

const darkQuery = "(prefers-color-scheme: dark)";
export function useSystemDark(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia(darkQuery);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => matchMedia(darkQuery).matches,
    () => false,
  );
}
