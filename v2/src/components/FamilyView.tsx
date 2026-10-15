"use client";

import { useState } from "react";
import { useStore } from "./providers";
import { Avatar, Back, Page, PageHeader, Section } from "./ui";

const IDS: { id: string; label: string; notes?: string }[] = [
  { id: "pedro", label: "Pedro" },
  { id: "wife", label: "Pedro’s wife", notes: "29 weeks pregnant at departure, about 32 at return" },
  { id: "brother", label: "Brother" },
  { id: "sister_in_law", label: "Sister-in-law" },
  { id: "father", label: "Dad" },
  { id: "mother", label: "Mum" },
  { id: "sister", label: "Sister", notes: "May join; room sharing undecided" },
];

export function FamilyView() {
  const { snapshot, isPlanner, demo, refresh, me } = useStore();
  const free = IDS.filter((x) => !snapshot.travellers.some((t) => t.id === x.id));
  const [id, setId] = useState(free[0]?.id ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"planner" | "member">("member");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/travellers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name, email, role, notes: IDS.find((x) => x.id === id)?.notes ?? null }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? "Could not add.");
    setMsg(`Added ${name}. They get in with the family code and their name.`);
    setName("");
    setEmail("");
    await refresh();
    const next = IDS.filter((x) => x.id !== id && !snapshot.travellers.some((t) => t.id === x.id));
    setId(next[0]?.id ?? "");
  }

  async function remove(tid: string, tname: string) {
    if (!confirm(`Remove ${tname}? Their votes and versions go too.`)) return;
    const r = await fetch("/api/travellers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: tid }) });
    if (!r.ok) setMsg((await r.json()).error ?? "Could not remove.");
    await refresh();
  }

  async function invite() {
    const text = `Our Japan trip planner is live: ${location.origin}\nType the family code I sent you, tap your name, and vote on the pace, your two must-dos and the versions before 25 Oct.`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setMsg("Invite text copied.");
      }
    } catch {}
  }

  if (!isPlanner)
    return (
      <Page>
        <PageHeader title="Family">Only planners manage the family list.</PageHeader>
      </Page>
    );

  return (
    <Page>
      <Back href="/">Explore</Back>
      <PageHeader eyebrow="Planners" title="Family">
        Everyone on this list gets in with the family code and their name. Names that nobody has claimed yet show as “Brother”, “Dad” and so on until that person types their own.
      </PageHeader>
      <Section title="On the trip" aside={`${snapshot.travellers.length} of 7`}>
        <ul className="grid gap-2">
          {snapshot.travellers.map((t) => (
            <li key={t.id} className="card flex items-center gap-3 p-3">
              <Avatar traveller={t} travellers={snapshot.travellers} />
              <span className="min-w-0 flex-1">
                <b>{t.name}</b> <span className="text-sm text-muted">· {t.role} · {IDS.find((x) => x.id === t.id)?.label ?? t.id}</span>
                {t.notes ? <span className="block text-sm text-ink-2">{t.notes}</span> : null}
              </span>
              {t.id !== me?.travellerId && t.id !== "claude" ? (
                <button className="btn btn-sm text-danger" onClick={() => remove(t.id, t.name)}>
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <button className="btn" onClick={invite}>
          Share the invite text
        </button>
      </Section>
      {demo ? (
        <p className="text-muted">Demo mode has no shared database, so people cannot be added here.</p>
      ) : free.length ? (
        <Section title="Add someone">
          <form
            className="card grid gap-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <label className="grid gap-1">
              <span className="eyebrow">Who</span>
              <select value={id} onChange={(e) => setId(e.target.value)}>
                {free.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="eyebrow">Name shown in the app</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="off" />
            </label>
            <label className="grid gap-1">
              <span className="eyebrow">Email (optional)</span>
              <input type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <div className="seg" role="group" aria-label="Role">
              <button type="button" aria-pressed={role === "member"} onClick={() => setRole("member")}>
                Member
              </button>
              <button type="button" aria-pressed={role === "planner"} onClick={() => setRole("planner")}>
                Planner
              </button>
            </div>
            <button className="btn btn-primary" disabled={busy || !name.trim()}>
              Add
            </button>
          </form>
        </Section>
      ) : (
        <p className="text-muted">All seven are on the list.</p>
      )}
      {msg ? <p className={/Could not|Note:/.test(msg) ? "text-danger" : "text-ok"}>{msg}</p> : null}
    </Page>
  );
}
