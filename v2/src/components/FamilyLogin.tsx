"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { personColor } from "@/lib/colors";

interface Person {
  id: string;
  name: string;
  role: string;
  notes: string | null;
}

const SLOT: Record<string, string> = { pedro: "Pedro", wife: "Pedro’s wife", brother: "Brother", sister_in_law: "Sister-in-law", father: "Dad", mother: "Mum", sister: "Sister" };

/** Two taps to get in: the family code, then your name. Nothing else. */
export function FamilyLogin({ step: initialStep, people: initialPeople, next }: { step: "code" | "who"; people: Person[]; next: string }) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [people, setPeople] = useState(initialPeople);
  const [code, setCode] = useState("");
  const [picked, setPicked] = useState<Person | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setBusy(false);
      return setError(j.error ?? "That did not work.");
    }
    const list = await fetch("/api/family").then((x) => x.json()).catch(() => ({ travellers: [] }));
    setPeople(list.travellers ?? []);
    setBusy(false);
    setStep("who");
  }

  async function choose(p: Person, newName?: string) {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ me: p.id, name: newName }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "That did not work.");
    router.push(next || "/");
    router.refresh();
  }

  const placeholderName = (p: Person) => p.name === (SLOT[p.id] ?? p.id) || p.name === p.id;

  return (
    <div className="grid gap-5">
      <AnimatePresence mode="wait" initial={false}>
        {step === "code" ? (
          <motion.form key="code" onSubmit={sendCode} className="grid gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            <div className="grid gap-2">
              <p className="eyebrow">Japan, 20 Dec 2026 – 9 Jan 2027</p>
              <h1 className="display text-[2.4rem] leading-none">Come in</h1>
              <p className="text-ink-2">Type the family code Pedro sent you. Once is enough; this phone remembers it.</p>
            </div>
            <input autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="family code" value={code} onChange={(e) => setCode(e.target.value)} className="text-center text-2xl tracking-[0.2em]" aria-label="Family code" />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <button className="btn btn-primary" disabled={busy || !code.trim()}>
              {busy ? "Checking…" : "Open the door"}
            </button>
          </motion.form>
        ) : picked ? (
          <motion.div key="name" className="grid gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            <div className="grid gap-2">
              <p className="eyebrow">{SLOT[picked.id] ?? picked.id}</p>
              <h1 className="display text-[2.2rem] leading-none">{placeholderName(picked) ? "What should we call you?" : `Hi ${picked.name.split(" ")[0]}`}</h1>
              <p className="text-ink-2">{placeholderName(picked) ? "Your first name is enough. It shows next to your votes and comments." : "That’s you? Tap below and you’re in."}</p>
            </div>
            <input autoFocus placeholder={placeholderName(picked) ? "Your name" : picked.name} value={name} onChange={(e) => setName(e.target.value)} className="text-center text-2xl" aria-label="Your name" />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex gap-2">
              <button className="btn" onClick={() => setPicked(null)} disabled={busy}>
                Not me
              </button>
              <button className="btn btn-primary flex-1" onClick={() => choose(picked, name.trim() || undefined)} disabled={busy || (placeholderName(picked) && !name.trim())}>
                {busy ? "One moment…" : "That’s me"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="who" className="grid gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            <div className="grid gap-2">
              <p className="eyebrow">Japan, 20 Dec 2026 – 9 Jan 2027</p>
              <h1 className="display text-[2.4rem] leading-none">Who are you?</h1>
              <p className="text-ink-2">Tap your name. No password, no email.</p>
            </div>
            {people.length ? (
              <ul className="grid grid-cols-2 gap-3">
                {people.map((p, i) => (
                  <motion.li key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 }}>
                    <button className="card grid w-full gap-1 p-4 text-left transition-transform active:scale-95" onClick={() => setPicked(p)} disabled={busy}>
                      <span className="grid size-10 place-items-center rounded-full text-lg font-bold text-white" style={{ background: personColor(i) }} aria-hidden="true">
                        {(placeholderName(p) ? SLOT[p.id] ?? p.name : p.name).trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="display text-[1.3rem] leading-tight">{placeholderName(p) ? SLOT[p.id] ?? p.name : p.name}</span>
                      <span className="text-xs text-muted">{placeholderName(p) ? "not named yet" : SLOT[p.id] ?? p.role}</span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">The family list is empty. Run the seed first.</p>
            )}
            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
