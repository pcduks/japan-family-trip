"use client";

import { useState } from "react";

export function LoginForm({ travellers, next, error: initialError }: { travellers: { id: string; name: string }[]; next: string; error: string | null }) {
  const [who, setWho] = useState<{ id: string; name: string } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);

  async function send(t: { id: string; name: string }) {
    setBusy(true);
    setError(null);
    const r = await fetch("/auth/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", id: t.id, next }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Could not send the code.");
    setWho(t);
    setHint(j.hint);
  }

  async function verify() {
    if (!who) return;
    setBusy(true);
    setError(null);
    const r = await fetch("/auth/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", id: who.id, code, next }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Wrong code.");
    window.location.href = j.next ?? "/";
  }

  if (!travellers.length) return <p className="text-muted">No travellers yet. Run the seed with data/travellers.json first.</p>;

  if (who)
    return (
      <form
        className="card grid gap-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
      >
        <p>
          Hi {who.name}. We sent a code to <b>{hint}</b>. The email also has a link that works on its own.
        </p>
        <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} className="text-center text-2xl tracking-[0.4em]" aria-label="Code" />
        <button className="btn btn-primary" disabled={busy || code.replace(/\D/g, "").length < 6}>
          Sign in
        </button>
        <button type="button" className="text-sm text-muted" onClick={() => setWho(null)}>
          Not {who.name}? Go back
        </button>
        {error ? <p className="text-danger">{error}</p> : null}
      </form>
    );

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        {travellers.map((t) => (
          <button key={t.id} className="card display min-h-18 px-4 text-[1.35rem]" disabled={busy} onClick={() => send(t)}>
            {t.name}
          </button>
        ))}
      </div>
      {error ? <p className="text-danger">{error}</p> : null}
    </div>
  );
}
