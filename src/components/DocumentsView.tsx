"use client";

import { useCallback, useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase/client";

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
      <main className="mx-auto grid max-w-md gap-3 px-4 py-10">
        <h1 className="text-2xl font-extrabold">Documents</h1>
        <p className="text-muted">
          {mode === "demo"
            ? "Documents need Supabase Storage, so they're off in demo mode."
            : "Only the travellers the planner has given document access (the owner and partner) can see this page."}
        </p>
      </main>
    );

  async function upload(files: FileList | null) {
    if (!files?.length || !sb) return;
    setBusy(true);
    setError(null);
    for (const f of Array.from(files)) {
      if (f.size > MAX_MB * 1024 * 1024) {
        setError(`${f.name} is over ${MAX_MB} MB.`);
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
    if (error || !data) return setError(error?.message ?? "Couldn't open the file");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const { error } = await sb!.storage.from(BUCKET).remove([name]);
    if (error) setError(error.message);
    load();
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4">
      <div>
        <h1 className="text-2xl font-extrabold">Documents</h1>
        <p className="text-sm text-muted">Private to you two. Fit-to-fly letter (dated 10–19 Dec), insurance, passports, antenatal records.</p>
      </div>
      <label className="card grid cursor-pointer gap-1 border-dashed p-4 text-center">
        <span className="font-bold">{busy ? "Uploading…" : "Upload PDFs or photos"}</span>
        <span className="text-xs text-muted">Up to {MAX_MB} MB each. A file with the same name is replaced.</span>
        <input type="file" multiple accept="application/pdf,image/*" className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {docs === null ? (
        <p className="text-sm text-muted">Loading…</p>
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
                Open
              </button>
              <button className="btn btn-sm" onClick={() => remove(d.name)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No documents yet.</p>
      )}
    </main>
  );
}
