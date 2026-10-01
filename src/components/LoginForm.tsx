"use client";

import { useRef, useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";
import { Avatar } from "./ui";

export interface Persona {
  id: string;
  name: string;
}

type Step = { k: "pick" } | { k: "sending"; p: Persona } | { k: "code"; p: Persona; hint: string } | { k: "email" } | { k: "emailSent"; email: string };

/**
 * "Quem é você?": tap your name, get an email with a 6-digit code (and a
 * link, as a fallback), type the code here. Nobody ever types an email.
 */
export function LoginForm({ personas, next, initialError }: { personas: Persona[]; next: string; initialError: string | null }) {
  const [step, setStep] = useState<Step>(personas.length ? { k: "pick" } : { k: "email" });
  const [error, setError] = useState(initialError);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  async function send(p: Persona) {
    setError(null);
    setStep({ k: "sending", p });
    const r = await post({ action: "send", id: p.id, next });
    if (!r.ok) {
      setError(r.error);
      setStep({ k: "pick" });
      return;
    }
    setCode("");
    setStep({ k: "code", p, hint: r.hint ?? "" });
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  async function verify(p: Persona, value: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await post({ action: "verify", id: p.id, code: value, next });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    // Full navigation so the server sees the new session cookie.
    window.location.assign(r.next ?? "/");
  }

  if (step.k === "code" || step.k === "sending") {
    const p = step.p;
    return (
      <div className="grid gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={p.name} index={personas.indexOf(p)} size={44} />
          <p className="text-[1.05rem]">
            {step.k === "sending" ? (
              "Enviando o e-mail…"
            ) : (
              <>
                Mandamos um e-mail para <b>{step.hint || firstName(p.name)}</b>. Digite o código de 6 números ou toque no link do e-mail.
              </>
            )}
          </p>
        </div>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void verify(p, code);
          }}
        >
          <label htmlFor="otp" className="eyebrow">
            Código
          </label>
          <input
            id="otp"
            ref={codeRef}
            className="input text-center font-mono !text-[2rem] tracking-[0.45em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••••"
            value={code}
            disabled={step.k === "sending"}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              if (v.length === 6) void verify(p, v);
            }}
          />
          <button className="btn btn-primary" disabled={code.length < 6 || busy || step.k === "sending"}>
            {busy ? "Conferindo…" : "Entrar"}
          </button>
        </form>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <button type="button" className="underline" onClick={() => setStep({ k: "pick" })}>
            ← Não sou {firstName(p.name)}
          </button>
          {step.k === "code" ? (
            <button type="button" className="underline" onClick={() => send(p)}>
              Mandar de novo
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (step.k === "email" || step.k === "emailSent") return <EmailFallback next={next} initialError={error} onBack={personas.length ? () => setStep({ k: "pick" }) : null} />;

  return (
    <div className="grid gap-4">
      <ul className="grid grid-cols-2 gap-3" aria-label="Quem é você?">
        {personas.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => send(p)} className="card flex w-full items-center gap-3 p-3 text-left transition-transform hover:-translate-y-0.5">
              <Avatar name={p.name} index={i} size={40} />
              <span className="min-w-0 truncate font-display text-[1.4rem] leading-tight">{firstName(p.name)}</span>
            </button>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button type="button" className="justify-self-start text-sm text-muted underline" onClick={() => setStep({ k: "email" })}>
        Entrar com e-mail
      </button>
    </div>
  );
}

/** The old way in: type your email, get a link. */
function EmailFallback({ next, initialError, onBack }: { next: string; initialError: string | null; onBack: (() => void) | null }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState(initialError);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = browserSupabase();
    if (!sb) {
      setError("O Supabase não está configurado; o app está em modo demonstração.");
      return;
    }
    setState("sending");
    setError(null);
    const redirect = new URL("/auth/confirm", window.location.origin);
    redirect.searchParams.set("next", next);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      // Travellers are created by the seed script; nobody else can sign up.
      options: { shouldCreateUser: false, emailRedirectTo: redirect.toString() },
    });
    if (error) {
      setState("idle");
      setError(/signups? not allowed|not found|otp_disabled/i.test(error.message) ? "Esse e-mail não está na lista da viagem. Confira ou fale com o Pedro." : error.message);
    } else setState("sent");
  }

  if (state === "sent")
    return (
      <p role="status" className="card p-4">
        Confira <b>{email}</b>: chegou um link para entrar. Pode fechar esta aba.
      </p>
    );

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium">
        E-mail
        <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
      </label>
      <button className="btn btn-primary" disabled={state === "sending"}>
        {state === "sending" ? "Enviando…" : "Mandar o link"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {onBack ? (
        <button type="button" className="justify-self-start text-sm underline" onClick={onBack}>
          ← Voltar para “Quem é você?”
        </button>
      ) : null}
    </form>
  );
}

async function post(body: Record<string, string>): Promise<{ ok: true; hint?: string; next?: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("/auth/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, ...j } : { ok: false, error: j.error ?? "Algo deu errado. Tente de novo." };
  } catch {
    return { ok: false, error: "Sem internet. Tente de novo quando voltar o sinal." };
  }
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}
