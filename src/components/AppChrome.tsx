"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore, type ThemePref } from "./providers";

const NAV = [
  { href: "/", label: "Routes", icon: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zm6-2v14m6-12v14" },
  { href: "/compare", label: "Compare", icon: "M4 5h16M4 12h16M4 19h16M9 3v18M15 3v18" },
  { href: "/vote", label: "Vote", icon: "M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" },
  { href: "/food", label: "Tokyo food", icon: "M7 3v8a2 2 0 0 0 2 2v8M11 3v8M15 3c2 0 3 2 3 5s-1 5-3 5v8" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { me } = useStore();
  const items = me?.role === "planner" ? [...NAV, { href: "/curate", label: "Curate", icon: "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" }] : NAV;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-3xl justify-around">
        {items.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <li key={n.href} className="flex-1">
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs no-underline ${active ? "font-bold text-ink" : "text-muted"}`}
              >
                <Icon d={n.icon} />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppHeader() {
  const { me, demo, trip, setDemoMe, prefs, setPrefs, error } = useStore();
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-4 pb-2" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
      <div className="min-w-0">
        <p className="eyebrow">20 Dec – 9 Jan · six travellers</p>
        <p className="font-display text-xl font-extrabold">Six Across Japan</p>
      </div>
      <Dialog.Root>
        <Dialog.Trigger className="btn btn-sm" aria-label="Settings">
          <span className="max-w-[9rem] truncate">{me?.name ?? "Settings"}</span>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="card fixed inset-x-3 top-16 z-50 mx-auto grid max-w-sm gap-5 p-5 shadow-xl">
            <Dialog.Title className="text-xl font-extrabold">Settings</Dialog.Title>
            <Dialog.Description className="sr-only">Display settings and account</Dialog.Description>

            {demo ? (
              <label className="grid gap-1 text-sm font-medium">
                I am (demo mode)
                <select className="input" value={me?.travellerId ?? ""} onChange={(e) => setDemoMe(e.target.value)}>
                  {trip.travellers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm">
                Signed in as <b>{me?.name}</b>
                {me?.role === "planner" ? " (planner)" : ""}
              </p>
            )}

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Theme</legend>
              <div className="flex gap-2" role="radiogroup">
                {(["system", "light", "dark"] as ThemePref[]).map((t) => (
                  <button key={t} role="radio" aria-checked={prefs.theme === t} className="chip flex-1 justify-center capitalize" onClick={() => setPrefs({ theme: t })}>
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>

            <Toggle label="Large text" hint="Bigger type and buttons everywhere." checked={prefs.largeText} onChange={(v) => setPrefs({ largeText: v })} />
            <Toggle label="Just show me the photos" hint="Big photos and the short description; reviews and videos fold away." checked={prefs.simple} onChange={(v) => setPrefs({ simple: v })} />

            {error ? <p className="text-sm text-danger">Sync problem: {error}</p> : null}

            <div className="flex justify-between gap-2">
              {!demo ? (
                <form action="/auth/signout" method="post">
                  <button className="btn btn-sm">Sign out</button>
                </form>
              ) : (
                <span />
              )}
              <Dialog.Close className="btn btn-sm btn-primary">Done</Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <input type="checkbox" role="switch" className="mt-1 size-5 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** Signed in to Supabase but not on the travellers list. */
export function NotInvited() {
  return (
    <main className="mx-auto grid max-w-sm gap-4 px-4 py-24">
      <h1 className="text-2xl font-extrabold">You&apos;re not on the trip list</h1>
      <p className="text-muted">This app is private to six invited travellers. Ask the planner to add your email.</p>
      <form action="/auth/signout" method="post">
        <button className="btn">Sign out</button>
      </form>
    </main>
  );
}

export function Gate({ children }: { children: React.ReactNode }) {
  const { me } = useStore();
  const path = usePathname();
  if (!me && !path.startsWith("/login")) return <NotInvited />;
  return <>{children}</>;
}
