"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar, firstName } from "./ui";
import { useStore, type ThemePref } from "./providers";
import { clearOfflineData } from "./ServiceWorker";

const I = {
  home: "M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13zM11 4h7.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H11",
  today: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  trip: "M8 7V5.5C8 4.7 8.7 4 9.5 4h5c.8 0 1.5.7 1.5 1.5V7M5 7h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm4 0v13m6-13v13",
  passport: "M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm6 5.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 17.5h6",
};

const TRIP_PATHS = ["/viagem", "/food", "/mala", "/contas", "/guides", "/documents", "/plan", "/mesa", "/compare", "/curate", "/more"];

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[0.72rem] no-underline ${active ? "font-bold text-ink" : "text-muted"}`}
      >
        {active ? <span className="absolute top-0 h-[3px] w-8 rounded-b bg-vermilion" aria-hidden="true" /> : null}
        <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const home = path === "/" || is("/rotas") || is("/votar");
  if (is("/login")) return null;
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
        <NavItem href="/" label="Início" icon={I.home} active={home} />
        <NavItem href="/today" label="Hoje" icon={I.today} active={is("/today")} />
        <li className="flex flex-1 items-center justify-center">
          <Link
            href="/anotar"
            aria-label="Anotar"
            aria-current={is("/anotar") ? "page" : undefined}
            className="grid h-12 w-16 place-items-center rounded-full bg-ink text-paper no-underline shadow-md transition-transform active:scale-95"
          >
            <span className="flex items-center gap-1 text-sm font-bold text-paper">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </Link>
        </li>
        <NavItem href="/viagem" label="Viagem" icon={I.trip} active={TRIP_PATHS.some(is)} />
        <NavItem href="/passaporte" label="Passaporte" icon={I.passport} active={is("/passaporte")} />
      </ul>
    </nav>
  );
}

export function AppHeader() {
  const { me, demo, trip, setDemoMe, prefs, setPrefs, error } = useStore();
  const path = usePathname();
  const idx = trip.travellers.findIndex((t) => t.id === me?.travellerId);
  if (path.startsWith("/login")) return null;
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pb-1" style={{ paddingTop: "max(0.9rem, env(safe-area-inset-top))" }}>
      {path === "/" ? (
        <span />
      ) : (
        <Link href="/" className="font-display text-xl no-underline">
          Seis pelo Japão
        </Link>
      )}
      <Dialog.Root>
        <Dialog.Trigger className="flex items-center gap-2 rounded-full border border-rule bg-card py-1 pr-3 pl-1 text-sm" aria-label="Você e ajustes">
          <Avatar name={me?.name ?? "?"} index={Math.max(idx, 0)} size={28} />
          <span>
            {me ? firstName(me.name) : "Quem é você?"} <span className="text-muted">· trocar</span>
          </span>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="card fixed inset-x-3 top-16 z-50 mx-auto grid max-w-sm gap-5 p-5">
            <Dialog.Title className="text-3xl">Ajustes</Dialog.Title>
            <Dialog.Description className="sr-only">Quem você é, tema e tamanho do texto</Dialog.Description>

            {demo ? (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-bold">Quem é você? (modo demonstração)</legend>
                <div className="grid grid-cols-3 gap-2">
                  {trip.travellers.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={me?.travellerId === t.id}
                      onClick={() => setDemoMe(t.id)}
                      className="grid justify-items-center gap-1 rounded-xl border border-rule p-2 text-sm aria-pressed:border-ink aria-pressed:bg-paper-2"
                    >
                      <Avatar name={t.name} index={i} size={36} />
                      <span className="truncate">{firstName(t.name)}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : (
              <>
                <p className="text-sm">
                  Você entrou como <b>{me?.name}</b>
                  {me?.role === "planner" ? " (quem organiza)" : ""}.
                </p>
                {me?.canSwitch ? <SwitchPerson /> : null}
              </>
            )}

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-bold">Tema</legend>
              <div className="flex gap-2" role="radiogroup">
                {(
                  [
                    ["system", "Automático"],
                    ["light", "Claro"],
                    ["dark", "Escuro"],
                  ] as [ThemePref, string][]
                ).map(([t, label]) => (
                  <button key={t} role="radio" aria-checked={prefs.theme === t} className="chip flex-1 justify-center" onClick={() => setPrefs({ theme: t })}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <Toggle label="Letras grandes" hint="Texto e botões maiores em todas as telas." checked={prefs.largeText} onChange={(v) => setPrefs({ largeText: v })} />
            <Toggle label="Só as fotos" hint="Fotos grandes e o essencial; avaliações e vídeos ficam recolhidos." checked={prefs.simple} onChange={(v) => setPrefs({ simple: v })} />

            {error ? <p className="text-sm text-danger">Problema ao sincronizar: {error}</p> : null}

            <div className="flex justify-between gap-2">
              {!demo ? (
                <form action="/auth/signout" method="post" onSubmit={clearOfflineData}>
                  <button className="btn btn-sm">Sair</button>
                </form>
              ) : (
                <span />
              )}
              <Dialog.Close className="btn btn-sm btn-primary">Pronto</Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}

/** Planner-only "Ver como": become another traveller to test, no email code. */
async function switchTo(id: string): Promise<string | null> {
  const res = await fetch("/auth/switch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null);
  if (res?.ok) {
    // Full reload: the server must re-render with the new session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
    return null;
  }
  return (await res?.json().catch(() => null))?.error ?? "Não deu para trocar.";
}

/** Shown while the planner is testing as someone else. */
export function ActingBanner() {
  const { me } = useStore();
  const [busy, setBusy] = useState(false);
  if (!me?.actingFor) return null;
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-plum px-4 py-1.5 text-sm text-paper">
      <span>
        Vendo como <b>{firstName(me.name)}</b>
      </span>
      <button
        type="button"
        disabled={busy}
        className="rounded-full border border-paper/60 px-2.5 py-0.5 text-xs font-bold"
        onClick={async () => {
          setBusy(true);
          if (await switchTo(me.actingFor!.id)) setBusy(false);
        }}
      >
        {busy ? "Voltando…" : `Voltar para ${firstName(me.actingFor.name)}`}
      </button>
    </div>
  );
}

function SwitchPerson() {
  const { trip, me } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function go(id: string) {
    setBusy(id);
    setErr(null);
    const e = await switchTo(id);
    if (e) {
      setBusy(null);
      setErr(e);
    }
  }
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-bold">Ver como (para testar)</legend>
      <div className="grid grid-cols-3 gap-2">
        {trip.travellers.map((t, i) => (
          <button
            key={t.id}
            type="button"
            disabled={!!busy}
            aria-pressed={me?.travellerId === t.id}
            onClick={() => me?.travellerId !== t.id && go(t.id)}
            className="grid justify-items-center gap-1 rounded-xl border border-rule p-2 text-sm aria-pressed:border-ink aria-pressed:bg-paper-2 disabled:opacity-60"
          >
            <Avatar name={t.name} index={i} size={36} />
            <span className="truncate">{busy === t.id ? "…" : firstName(t.name)}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">Sem código. O que você fizer fica no nome da pessoa escolhida.</p>
      {err ? <p className="text-xs text-danger">{err}</p> : null}
    </fieldset>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <input type="checkbox" role="switch" className="mt-1 size-5 accent-[var(--vermilion)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** Signed in to Supabase but not on the travellers list. */
export function NotInvited() {
  return (
    <main className="mx-auto grid max-w-sm gap-4 px-5 py-24">
      <h1 className="text-4xl">Você não está na lista da viagem</h1>
      <p className="text-muted">Este app é só para as seis pessoas da viagem. Peça ao Pedro para incluir o seu e-mail.</p>
      <form action="/auth/signout" method="post">
        <button className="btn">Sair</button>
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
