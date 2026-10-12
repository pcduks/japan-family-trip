"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "./providers";
import { Avatar, PageHeader, Pill, Section, firstName } from "./ui";

interface Row {
  id: string;
  name: string;
  email: string;
  role: "planner" | "member";
  couple: string | null;
  docs_access: boolean;
}

const COUPLES: { key: string; label: string }[] = [
  { key: "pedro", label: "Casal do Pedro" },
  { key: "irmao", label: "Irmão e cunhada" },
  { key: "pais", label: "Pais" },
];
const blank = { name: "", email: "", couple: "pedro", docs_access: false };

/** Mesa do Pedro → Família: who can sign in, which couple they belong to, and the invite to send. */
export function FamiliaView() {
  const { me, demo } = useStore();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const planner = me?.role === "planner";

  useEffect(() => {
    if (!planner || demo) return;
    fetch("/api/travellers")
      .then(async (r) => ((await r.json()) as { travellers?: Row[]; error?: string }))
      .then((j) => (j.travellers ? setRows(j.travellers) : setErr(j.error ?? "Falhou")))
      .catch(() => setErr("Sem conexão."));
  }, [planner, demo]);

  async function call(method: "POST" | "PATCH" | "DELETE", body?: object, id?: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/travellers${id ? `?id=${id}` : ""}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const j = (await res.json()) as { traveller?: Row; ok?: boolean; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Falhou");
      if (method === "POST" && j.traveller) setRows((r) => [...(r ?? []), j.traveller!]);
      if (method === "PATCH" && j.traveller) setRows((r) => (r ?? []).map((x) => (x.id === j.traveller!.id ? j.traveller! : x)));
      if (method === "DELETE") setRows((r) => (r ?? []).filter((x) => x.id !== id));
      router.refresh();
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!planner) return <p className="card p-5 text-ink-2">Só o Pedro vê esta página.</p>;
  if (demo) return <p className="card p-5 text-ink-2">No modo demonstração não há lista de pessoas. Ela funciona no app publicado, com o Supabase.</p>;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const invite =
    `Oi! O app da nossa viagem ao Japão está no ar: ${origin}\n\n` +
    `1. Abra o link no celular e toque no seu nome.\n` +
    `2. Chega um e-mail com um código de 6 números. Digite no app.\n` +
    `3. Vá em "Desejos": cinco perguntinhas e sete capítulos do Japão. Leva uns 8 minutos.\n\n` +
    `Ninguém vê as respostas de ninguém até todo mundo terminar. Dica: no iPhone, Compartilhar → "Adicionar à Tela de Início" para virar um app.`;

  return (
    <main className="grid gap-8">
      <PageHeader title="Família" hand={rows ? `${rows.length} de 6` : undefined}>
        Quem está nesta lista consegue entrar com o código por e-mail. O casal define como as contas se dividem e quem é quem para o montador de rotas.
      </PageHeader>

      <Section title="Na viagem" id="lista">
        {rows ? (
          <ul className="grid gap-2">
            {rows.map((t, i) => (
              <Person key={t.id} t={t} index={i} self={t.id === me?.travellerId} busy={busy} onSave={(patch) => call("PATCH", { ...t, ...patch })} onRemove={() => confirm(`Tirar ${firstName(t.name)} da viagem? Os desejos, votos e anotações dessa pessoa somem.`) && call("DELETE", undefined, t.id)} />
            ))}
          </ul>
        ) : (
          <p className="text-muted">{err ?? "Carregando…"}</p>
        )}
      </Section>

      {rows && rows.length < 6 ? (
        <Section title="Adicionar" id="adicionar" aside={`faltam ${6 - rows.length}`}>
          <form
            className="card grid gap-3 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await call("POST", draft)) setDraft({ ...blank, couple: draft.couple });
            }}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="input" placeholder="Nome (ex.: Ana Parra)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Nome" required />
              <input className="input" type="email" inputMode="email" autoCapitalize="none" placeholder="E-mail" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} aria-label="E-mail" required />
            </div>
            <CoupleChips value={draft.couple} onChange={(c) => setDraft({ ...draft, couple: c })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--vermilion)]" checked={draft.docs_access} onChange={(e) => setDraft({ ...draft, docs_access: e.target.checked })} />
              Pode ver Documentos (passaportes, seguro)
            </label>
            <button className="btn btn-primary justify-self-start" disabled={busy}>
              {busy ? "Salvando…" : "Adicionar à viagem"}
            </button>
          </form>
        </Section>
      ) : null}
      {err && rows ? <p className="text-sm text-danger">{err}</p> : null}

      <Section title="Convite" id="convite" aside="mande no grupo da família">
        <pre className="card whitespace-pre-wrap p-4 font-sans text-sm text-ink-2">{invite}</pre>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-primary no-underline" href={`https://wa.me/?text=${encodeURIComponent(invite)}`} target="_blank" rel="noreferrer">
            Mandar no WhatsApp
          </a>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              await navigator.clipboard.writeText(invite).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copiado" : "Copiar texto"}
          </button>
        </div>
      </Section>
    </main>
  );
}

function CoupleChips({ value, onChange }: { value: string | null; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Casal">
      {COUPLES.map((c) => (
        <button key={c.key} type="button" className="chip" aria-pressed={value === c.key} onClick={() => onChange(c.key)}>
          {c.label}
        </button>
      ))}
    </div>
  );
}

function Person({ t, index, self, busy, onSave, onRemove }: { t: Row; index: number; self: boolean; busy: boolean; onSave: (p: Partial<Row>) => Promise<boolean>; onRemove: () => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(t);
  if (!edit)
    return (
      <li className="card flex flex-wrap items-center gap-3 p-3">
        <Avatar name={t.name} index={index} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[1.3rem] leading-tight">{t.name}</span>
          <span className="block truncate text-xs text-muted">{t.email}</span>
        </span>
        <span className="flex flex-wrap gap-1">
          {t.role === "planner" ? <Pill tone="accent">organiza</Pill> : null}
          <Pill>{COUPLES.find((c) => c.key === t.couple)?.label ?? "sem casal"}</Pill>
          {t.docs_access ? <Pill tone="ok">documentos</Pill> : null}
        </span>
        <button type="button" className="text-sm underline" onClick={() => { setV(t); setEdit(true); }}>
          Editar
        </button>
      </li>
    );
  return (
    <li className="card grid gap-3 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label="Nome" />
        <input className="input" type="email" value={v.email} disabled={self} onChange={(e) => setV({ ...v, email: e.target.value })} aria-label="E-mail" />
      </div>
      <CoupleChips value={v.couple} onChange={(c) => setV({ ...v, couple: c })} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--vermilion)]" checked={v.docs_access} onChange={(e) => setV({ ...v, docs_access: e.target.checked })} />
        Pode ver Documentos
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={async () => (await onSave(v)) && setEdit(false)}>
          Salvar
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setEdit(false)}>
          Cancelar
        </button>
        {!self ? (
          <button type="button" className="ml-auto text-sm text-danger underline" onClick={onRemove}>
            Tirar da viagem
          </button>
        ) : null}
      </div>
    </li>
  );
}
