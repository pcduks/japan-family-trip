"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Pages saved for offline use as soon as the app is opened online. */
const WARM = ["/today", "/plan/days", "/plan/bookings", "/plan/budget", "/food", "/", "/guides/tokyo", "/guides/kyoto"];

export function ServiceWorker({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (reg) => {
        await navigator.serviceWorker.ready;
        if (signedIn) (reg.active ?? navigator.serviceWorker.controller)?.postMessage({ type: "warm", urls: WARM });
      })
      .catch(() => {});
  }, [signedIn]);
  return null;
}

/** Remove offline copies (on sign-out, so a shared phone keeps nothing). */
export function clearOfflineData() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "clear" });
    Object.keys(localStorage)
      .filter((k) => k.startsWith("saj-cache-"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className="bg-accent px-4 py-1.5 text-center text-sm font-medium text-accent-ink">
      Offline: showing the copy saved on this phone.
    </p>
  );
}
