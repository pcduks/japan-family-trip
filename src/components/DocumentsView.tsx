"use client";

import { useCallback, useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";
import { EkiStamp } from "./EkiStamp";
import { PageHeader } from "./ui";

interface Doc {
  name: string;
  size: number;
  updated: string;
}

const BUCKET = "documents";
const MAX_MB = 20;

/**
 * P3.3: private documents in a Supabase Storage bucket. Row-level security
 * limits the bucket to travellers with docs_access (the owner and partner).
 * Files open through short-lived signed URLs and are never cached offline.
 */
export function DocumentsView({ mode }: { mode: "ok" | "denied" | "demo" }) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sb = mode === "ok" ? browserSupabase() : null;

  const load = useCallback(async () => {
    if (!sb) return;
    const { data, error } = await sb.storage.from(BUCKET).list("", { sortBy: { column: "name", order: "asc" } });
    if (error) return setError(error.message);
    setDocs(
      (data ?? [])
        .filter((f) => f.id)
        .map((f) => ({ name: f.name, size: (f.metadata as { size?: number } | null)?.size ?? 0, updated: f.updated_at ?? "" })),
    );
  }, [sb]);

  useEffect(() => {
    // Initial fetch; setState happens after the await inside load().
    void Promise.resolve().then(load);
  }, [load]);

  if (mode !== "ok")
    return (
      <main className="mx-auto grid max-w-md gap-6 px-5 pb-12">
        <PageHeader eyebrow="Pasta particular" title="Documentos">
          {mode === "demo"
            ? "Os documentos precisam do Supabase Storage, então ficam desligados no modo demonstração."
            : "Só quem recebeu acesso do Pedro aos documentos (ela e o companheiro) pode ver esta página."}
        </PageHeader>
        <EkiStamp motif="suitcase" ink="var(--plum)" size={96} rotate={-6} inked={false} label="" className="justify-self-center" />
      </main>
    );

  async function upload(files: FileList | null) {
    if (!files?.length || !sb) return;
    setBusy(true);
    setError(null);
    for (const f of Array.from(files)) {
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`${f.name} passa de ${MAX_MB} MB.`);
        continue;
      }
      const safe = f.name.replace(/[^\w.\- ]+/g, "_");
      const { error } = await sb.storage.from(BUCKET).upload(safe, f, { upsert: true, contentType: f.type || undefined });
      if (error) setError(error.message);
    }
    setBusy(false);
    load();
  }

  async function open(name: string) {
    const { data, error } = await sb!.storage.from(BUCKET).createSignedUrl(name, 120);
    if (error || !data) return setError(error?.message ?? "Não foi possível abrir o arquivo");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(name: string) {
    if (!confirm(`Apagar ${name}?`)) return;
    const { error } = await sb!.storage.from(BUCKET).remove([name]);
    if (error) setError(error.message);
    load();
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-5 pb-12">
      <PageHeader eyebrow="Pasta particular" title="Documentos">
        Só para vocês dois. Atestado para voar (com data entre 10 e 19 dez), seguro, passaportes e o pré-natal.
      </PageHeader>
      <label className="card-flat grid cursor-pointer gap-1 border-dashed p-5 text-center">
        <span className="font-bold">{busy ? "Enviando…" : "Enviar PDFs ou fotos"}</span>
        <span className="text-xs text-muted">Até {MAX_MB} MB cada. Um arquivo com o mesmo nome é substituído.</span>
        <input type="file" multiple accept="application/pdf,image/*" className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {docs === null ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : docs.length ? (
        <ul className="grid gap-2">
          {docs.map((d) => (
            <li key={d.name} className="card flex flex-wrap items-center gap-3 p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{d.name}</span>
                <span className="text-xs text-muted">
                  {(d.size / 1024 / 1024).toFixed(1)} MB{d.updated ? ` · ${d.updated.slice(0, 10)}` : ""}
                </span>
              </span>
              <button className="btn btn-sm" onClick={() => open(d.name)}>
                Abrir
              </button>
              <button className="btn btn-sm" onClick={() => remove(d.name)}>
                Apagar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nenhum documento ainda.</p>
      )}
    </main>
  );
}
