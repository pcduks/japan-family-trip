"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { FALLBACK_FX, fromYen, type FxRates } from "@/lib/money";
import { useStore } from "./providers";

const KEY = "saj-fx";
let current: FxRates | null = null;
let started = false;
const listeners = new Set<() => void>();

function read(): FxRates {
  if (current) return current;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as FxRates | null;
    if (raw?.perYen) current = raw;
  } catch {}
  return current ?? FALLBACK_FX;
}

function load() {
  if (started) return;
  started = true;
  fetch("/api/fx")
    .then((r) => (r.ok ? (r.json() as Promise<FxRates>) : null))
    .then((fx) => {
      if (!fx?.perYen) return;
      // Keep a cached live rate rather than replacing it with the fallback.
      if (!fx.date && read().date) return;
      current = fx;
      try {
        localStorage.setItem(KEY, JSON.stringify(fx));
      } catch {}
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}

/** Today's rates (cached offline) and a yen → home-currency formatter in the viewer's currency. */
export function useMoney() {
  const { prefs } = useStore();
  const fx = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => FALLBACK_FX,
  );
  useEffect(load, []);
  const cur = prefs.currency;
  const home = useCallback((jpy: number) => fromYen(jpy, cur, fx), [cur, fx]);
  return { fx, currency: cur, home };
}
