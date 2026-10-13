"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore, type ThemePref } from "./providers";
import { Avatar } from "./ui";

const I = {
  board: "M4 6h16M4 12h10M4 18h13",
  vote: "M5 13l4 4L19 7",
  versions: "M8 4h12v12M4 8h12v12H4z",
  places: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
};

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <li className="flex-1">
      <Link href={href} aria-current={active ? "page" : undefined} className={`relative flex min-h-[3.6rem] flex-col items-center justify-center gap-0.5 text-[0.72rem] no-underline ${active ? "font-bold text-ink" : "text-muted"}`}>
        {active ? <span className="absolute top-0 h-[3px] w-8 rounded-b bg-accent" aria-hidden="true" /> : null}
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={icon} />
        </svg>
        {label}
      </Link>
    </li>
  );
}

export function BottomNav() {
  const path = usePathname();
  const is = (p: string) => path === p || path.startsWith(p + "/");
  if (is("/login")) return null;
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-bg/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
        <NavItem href="/" label="Board" icon={I.board} active={path === "/" || is("/missing")} />
        <NavItem href="/versions" label="Versions" icon={I.versions} active={is("/versions")} />
        <NavItem href="/vote" label="Vote" icon={I.vote} active={is("/vote")} />
        <NavItem href="/places" label="Places" icon={I.places} active={is("/places") || is("/regions")} />
        <NavItem href="/map" label="Map" icon={I.map} active={is("/map")} />
      </ul>
    </nav>
  );
}

export function AppHeader() {
  const { me, demo, snapshot, setDemoMe, prefs, setPrefs, error, isPlanner } = useStore();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  if (path.startsWith("/login")) return null;
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-1" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
      <Link href="/" className="flex items-center gap-2 no-underline">
        <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink">日</span>
        <span className="font-bold">Japan trip</span>
        {demo ? <span className="chip">demo</span> : null}
      </Link>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button className="flex items-center gap-2 rounded-full border border-rule bg-card py-1 pr-3 pl-1 text-sm" aria-label="Settings">
            {me ? <Avatar traveller={me.travellerId} travellers={snapshot.travellers} /> : null}
            <span className="font-semibold">{me?.name ?? "—"}</span>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="card fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto grid max-w-md gap-5 p-5 outline-none">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-bold">Settings</Dialog.Title>
              <Dialog.Close className="btn btn-sm">Close</Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Theme, text size and who you are.</Dialog.Description>

            <fieldset className="grid gap-2">
              <legend className="eyebrow">Theme</legend>
              <div className="seg">
                {(["system", "light", "dark"] as ThemePref[]).map((t) => (
                  <button key={t} aria-pressed={prefs.theme === t} onClick={() => setPrefs({ theme: t })}>
                    {t === "system" ? "Auto" : t === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="eyebrow">Text size</legend>
              <div className="seg">
                <button aria-pressed={!prefs.largeText} onClick={() => setPrefs({ largeText: false })}>
                  Normal
                </button>
                <button aria-pressed={prefs.largeText} onClick={() => setPrefs({ largeText: true })}>
                  Large
                </button>
              </div>
            </fieldset>

            {isPlanner ? (
              <Link href="/family" className="btn btn-sm" onClick={() => setOpen(false)}>
                Family · who can sign in
              </Link>
            ) : null}
            {demo ? (
              <fieldset className="grid gap-2">
                <legend className="eyebrow">I am… (demo mode, this browser only)</legend>
                <div className="flex flex-wrap gap-2">
                  {snapshot.travellers.map((t) => (
                    <button key={t.id} className={`btn btn-sm ${me?.travellerId === t.id ? "btn-primary" : ""}`} onClick={() => setDemoMe(t.id)}>
                      {t.name}
                      {t.role === "planner" ? " ·planner" : ""}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted">No Supabase keys are set, so nothing is shared. Everyone can act as a planner to try things out.</p>
              </fieldset>
            ) : (
              <div className="grid gap-2">
                <p className="text-sm text-muted">
                  Signed in as {me?.name} ({me?.role}).
                </p>
                <form action="/auth/signout" method="post">
                  <button className="btn btn-sm">Sign out</button>
                </form>
              </div>
            )}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
