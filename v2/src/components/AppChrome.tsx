"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, type ThemePref } from "./providers";
import { Avatar } from "./ui";

const I = {
  versions: "M8 4h12v12M4 8h12v12H4z",
  places: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  trip: "M4 15V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8M4 15h16M4 15l-1 4M20 15l1 4M8 19h8M8 8h8",
  food: "M4 11h16a8 8 0 0 1-16 0zM8 4l1 4M12 3v5M16 4l-1 4M9 19h6",
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
        <NavItem href="/" label="Trip" icon={I.trip} active={path === "/" || is("/plan") || is("/guide")} />
        <NavItem href="/places" label="Japan" icon={I.places} active={is("/places") || is("/areas")} />
        <NavItem href="/routes" label="What if" icon={I.versions} active={is("/routes") || is("/build") || is("/board")} />
        <NavItem href="/food" label="Food" icon={I.food} active={is("/food")} />
      </ul>
    </nav>
  );
}

export function AppHeader() {
  const { me, demo, snapshot, setDemoMe, prefs, setPrefs, error, isPlanner } = useStore();
  // Planners see every route waiting for a decision; everyone else, their own.
  const waiting = snapshot.suggestions.filter((s) => s.status === "open" && (isPlanner || s.author_id === me?.travellerId)).length;
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (path.startsWith("/login")) return null;
  const leave = async (scope: "me" | "all") => {
    await fetch("/api/family", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scope }) });
    setOpen(false);
    router.push("/login");
    router.refresh();
  };
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-1" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
      <Link href="/" className="flex min-w-0 items-center gap-2 no-underline">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink">冬</span>
        <span className="display truncate text-[1.15rem] whitespace-nowrap">
          <span className="sm:hidden">Japan ’26</span>
          <span className="hidden sm:inline">Japan, winter 2026</span>
        </span>
        {demo ? <span className="chip">demo</span> : null}
      </Link>
      <span className="flex min-w-0 items-center gap-2">
      <Link href="/inbox" aria-label={waiting ? `Inbox, ${waiting} waiting` : "Inbox"} className="relative grid size-10 shrink-0 place-items-center rounded-full border border-rule bg-card no-underline">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM4 13h4.5l1 2h5l1-2H20" />
        </svg>
        {waiting ? <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.68rem] font-bold text-accent-ink">{waiting}</span> : null}
      </Link>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button className="flex min-w-0 items-center gap-2 rounded-full border border-rule bg-card py-1 pr-3 pl-1 text-sm" aria-label={me ? `Settings, signed in as ${me.name}` : "Settings"}>
            {me ? <Avatar traveller={me.travellerId} travellers={snapshot.travellers} /> : null}
            <span className="truncate font-semibold">{me?.name ?? "—"}</span>
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

            <fieldset className="grid gap-2">
              <legend className="eyebrow">More</legend>
              <div className="flex flex-wrap gap-2">
                <Link href="/inbox" className="btn btn-sm" onClick={() => setOpen(false)}>
                  Inbox{waiting ? ` · ${waiting}` : ""}
                </Link>
                <Link href="/plan" className="btn btn-sm" onClick={() => setOpen(false)}>
                  All the details
                </Link>
                <Link href="/guide" className="btn btn-sm" onClick={() => setOpen(false)}>
                  How this works
                </Link>
                {isPlanner ? (
                  <Link href="/family" className="btn btn-sm" onClick={() => setOpen(false)}>
                    Family
                  </Link>
                ) : null}
              </div>
            </fieldset>
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
                  You are {me?.name} ({me?.role}). Wrong person? Switch below.
                </p>
                <div className="flex gap-2">
                  <button className="btn btn-sm" onClick={() => leave("me")}>
                    Switch person
                  </button>
                  <button className="btn btn-sm" onClick={() => leave("all")}>
                    Forget this phone
                  </button>
                </div>
              </div>
            )}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      </span>
    </header>
  );
}
