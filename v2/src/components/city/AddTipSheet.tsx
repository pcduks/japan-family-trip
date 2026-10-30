"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { isCat, parseSavedCsv, LAYER_INK, type TipExtracted, type TipSource } from "@/lib/city";
import type { PlannedDay } from "@/lib/days";
import { fmtDay } from "@/lib/dates";
import type { SpotHit } from "@/lib/google/places";
import { CAT_LABEL, type SpotCat } from "@/lib/tokyo";
import { useStore } from "../providers";
import { CatIcon } from "../tokyo/CatIcon";
import { Chip, Segmented } from "./bits";
import { photoSrc } from "./usePins";

/*
 * Dropping a tip: paste a link or some words, add a screenshot, or import a
 * saved list. Everything becomes real places with a photo before it is
 * saved; the person confirms, fixes the type, adds a line, maybe a day.
 */

interface Guess {
  name: string;
  cat: SpotCat;
  note: string | null;
  source: TipSource;
  source_url: string | null;
  source_handle: string | null;
}
interface Found {
  guess: Guess;
  candidates: SpotHit[];
}
interface Row extends Found {
  pick: number;
  skip: boolean;
  cat: SpotCat;
  note: string;
}

type Mode = "paste" | "shot" | "list";
type Step = "find" | "confirm" | "done";
const CAT_CHOICES: SpotCat[] = ["cafe", "bakery", "food", "sweets", "bar", "shop", "book", "culture", "park", "market", "view", "spa"];

export function AddTipSheet({ open, onClose, city, cityName, days, bias, start }: { open: boolean; onClose: () => void; city: string; cityName: string; days: PlannedDay[]; bias?: { lat: number; lng: number } | null; start?: string | null }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content className="sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-t-[24px] bg-card shadow-2xl outline-none" aria-describedby={undefined}>
          {open ? <Body city={city} cityName={cityName} days={days} bias={bias ?? null} onClose={onClose} start={start ?? null} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body({ city, cityName, days, bias, onClose, start }: { city: string; cityName: string; days: PlannedDay[]; bias: { lat: number; lng: number } | null; onClose: () => void; start: string | null }) {
  const { addTips, me } = useStore();
  const [mode, setMode] = useState<Mode>("paste");
  const [step, setStep] = useState<Step>("find");
  const [text, setText] = useState(start ?? "");
  const [images, setImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [csv, setCsv] = useState<{ name: string; rows: ReturnType<typeof parseSavedCsv> } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (mode === "paste" && step === "find") area.current?.focus();
  }, [mode, step]);

  async function lookUp(body: Record<string, unknown>, label: string): Promise<Found[]> {
    setBusy(label);
    setErr(null);
    try {
      const res = await fetch("/api/tips/find", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ city, bias: bias ?? undefined, ...body }) });
      const j = (await res.json().catch(() => ({}))) as { items?: Found[]; hint?: string | null; error?: string };
      if (!res.ok) throw new Error(j.error ?? `Couldn't look that up (${res.status})`);
      setHint(j.hint ?? null);
      return j.items ?? [];
    } finally {
      setBusy(null);
    }
  }

  function show(found: Found[]) {
    if (!found.length) {
      setErr((e) => e ?? "No places found in that. Try the name on its own, or a Google Maps link.");
      return;
    }
    setRows(found.map((f) => ({ ...f, pick: 0, skip: f.candidates.length === 0, cat: f.candidates[0] ? f.guess.cat : f.guess.cat, note: f.guess.note ?? "" })));
    setStep("confirm");
  }

  async function find() {
    try {
      if (mode === "paste") {
        if (!text.trim()) return;
        show(await lookUp({ text }, "Looking on Google…"));
      } else if (mode === "shot") {
        if (!images.length) return;
        const payload = images.map((i) => ({ mediaType: i.dataUrl.slice(5, i.dataUrl.indexOf(";")), base64: i.dataUrl.slice(i.dataUrl.indexOf(",") + 1) }));
        show(await lookUp({ images: payload, text: text.trim() || undefined }, "Reading the screenshot…"));
      } else if (csv) {
        const out: Found[] = [];
        for (let i = 0; i < csv.rows.length; i += 60) out.push(...(await lookUp({ lines: csv.rows.slice(i, i + 60) }, `Looking up ${Math.min(i + 60, csv.rows.length)} of ${csv.rows.length}…`)));
        show(out);
      }
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function save() {
    const tips: TipExtracted[] = rows
      .filter((r) => !r.skip)
      .map((r) => {
        const c = r.candidates[r.pick];
        return {
          city,
          name: c?.name ?? r.guess.name,
          cat: r.cat,
          note: r.note.trim() || null,
          lat: c?.lat ?? null,
          lng: c?.lng ?? null,
          google_place_id: c?.placeId ?? null,
          photo: c?.photo ?? null,
          maps_uri: c?.googleMapsUri ?? null,
          type: c?.type ?? null,
          address: c?.address ?? null,
          source: r.guess.source,
          source_url: r.guess.source_url,
          source_handle: r.guess.source_handle,
          planned_for: day,
        };
      });
    if (!tips.length) return setErr("Nothing left to add.");
    setBusy("Adding…");
    const r = await addTips(tips, { text: mode === "paste" ? text : undefined, caption: mode === "list" ? `Imported ${csv?.name ?? "a saved list"}` : undefined, url: tips[0]?.source_url ?? undefined });
    setBusy(null);
    if (r) return setErr(r);
    setAdded(tips.map((t) => t.name));
    setStep("done");
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const out: { name: string; dataUrl: string }[] = [];
    for (const f of Array.from(files).slice(0, 4 - images.length)) out.push({ name: f.name, dataUrl: await shrink(f) });
    setImages((cur) => [...cur, ...out]);
  }

  async function onCsv(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const rows = parseSavedCsv(await f.text());
    setCsv({ name: f.name.replace(/\.csv$/i, ""), rows });
    setErr(rows.length ? null : "That file has no Title column. Export the list from Google Takeout (Maps → Saved).");
  }

  const kept = rows.filter((r) => !r.skip).length;

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-2">
        <span className="w-14" />
        <span className="h-[5px] w-10 rounded-full bg-rule" />
        <Dialog.Close className="min-h-10 w-14 text-right text-sm font-semibold text-muted">Close</Dialog.Close>
      </div>
      <div className="grid gap-4 overflow-y-auto px-5 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="grid gap-0.5">
          <p className="eyebrow" style={{ color: LAYER_INK.ours }}>
            Family · {cityName}
          </p>
          <Dialog.Title className="font-display text-[1.7rem] leading-[1.1] font-semibold">{step === "find" ? "Drop a tip" : step === "confirm" ? (rows.length === 1 ? "Is this the one?" : `${rows.length} places found`) : "Added"}</Dialog.Title>
        </div>

        {step === "find" ? (
          <>
            <Segmented value={mode} onChange={setMode} label="How" options={[{ id: "paste", label: "Paste" }, { id: "shot", label: "Screenshot" }, { id: "list", label: "Saved list" }]} />
            {mode === "paste" ? (
              <div className="grid gap-2">
                <textarea ref={area} value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full" aria-label="What you want to add" placeholder={`A Google Maps link, an Instagram link, a name, or a whole paragraph of recommendations.\nAnything with place names in it works.`} />
                <p className="text-xs text-muted">Links from Maps give the exact place. Instagram posts often hide their captions; if nothing comes back, paste the caption too.</p>
              </div>
            ) : null}
            {mode === "shot" ? (
              <div className="grid gap-2">
                <label className="grid min-h-28 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-rule bg-bg-2 p-4 text-center text-sm text-ink-2">
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
                  <span>
                    <b className="block text-ink">Choose screenshots</b>
                    An Instagram post, a story, a list in Notes, a friend’s message. Up to four.
                  </span>
                </label>
                {images.length ? (
                  <ul className="flex gap-2 overflow-x-auto">
                    {images.map((i, k) => (
                      <li key={k} className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a local preview */}
                        <img src={i.dataUrl} alt={i.name} className="h-24 w-16 rounded-lg object-cover" />
                        <button type="button" aria-label={`Remove ${i.name}`} className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-ink text-xs text-bg" onClick={() => setImages((cur) => cur.filter((_, j) => j !== k))}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Anything to add? (who sent it, what it is)" aria-label="A note about the screenshot" className="w-full" />
              </div>
            ) : null}
            {mode === "list" ? (
              <div className="grid gap-2">
                <ol className="grid gap-1 text-sm text-ink-2">
                  <li>
                    <b className="text-ink">1.</b> Go to{" "}
                    <a href="https://takeout.google.com/" target="_blank" rel="noreferrer" className="text-accent">
                      takeout.google.com
                    </a>
                    , deselect all, tick <b>Saved</b> (under Maps), export.
                  </li>
                  <li>
                    <b className="text-ink">2.</b> You get one CSV per list (Title, Note, URL, Comment).
                  </li>
                  <li>
                    <b className="text-ink">3.</b> Drop the list for {cityName} here. We look each place up and you confirm.
                  </li>
                </ol>
                <label className="grid min-h-20 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-rule bg-bg-2 p-4 text-center text-sm">
                  <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onCsv(e.target.files)} />
                  {csv ? (
                    <span>
                      <b className="block text-ink">{csv.name}</b>
                      {csv.rows.length} places
                    </span>
                  ) : (
                    <b className="text-ink">Choose the CSV</b>
                  )}
                </label>
              </div>
            ) : null}
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            <button type="button" className="btn btn-primary" disabled={!!busy || !me || (mode === "paste" ? !text.trim() : mode === "shot" ? !images.length : !csv?.rows.length)} onClick={find}>
              {busy ?? (mode === "paste" ? "Find the places" : mode === "shot" ? "Read it" : "Look them up")}
            </button>
            {!me ? <p className="text-center text-xs text-muted">Pick your name first to add tips.</p> : null}
          </>
        ) : null}

        {step === "confirm" ? (
          <>
            {hint ? <p className="rounded-xl bg-bg-2 p-3 text-sm text-ink-2">{hint}</p> : null}
            <ul className="grid gap-3">
              {rows.map((r, i) => (
                <li key={i} className={`grid gap-2 rounded-2xl border p-3 ${r.skip ? "border-dashed border-rule opacity-60" : "border-rule"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{titleCase(r.candidates[r.pick]?.name ?? r.guess.name)}</p>
                      {!r.candidates.length ? <p className="text-xs text-muted">Not found on Google. Skipped unless you keep it.</p> : r.candidates[r.pick]?.name.toLowerCase() !== r.guess.name.toLowerCase() ? <p className="truncate text-xs text-muted">You wrote “{r.guess.name}”</p> : null}
                    </div>
                    <Chip pressed={!r.skip} onClick={() => setRows((cur) => cur.map((x, j) => (j === i ? { ...x, skip: !x.skip } : x)))}>
                      {r.skip ? "Skip" : "Keep"}
                    </Chip>
                  </div>
                  {r.candidates.length > 1 ? (
                    <ul className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3" aria-label="Which one">
                      {r.candidates.map((c, k) => (
                        <li key={c.placeId} className="shrink-0">
                          <button type="button" aria-pressed={r.pick === k} onClick={() => setRows((cur) => cur.map((x, j) => (j === i ? { ...x, pick: k } : x)))} className={`flex w-[13rem] items-center gap-2 rounded-xl border p-1.5 text-left ${r.pick === k ? "border-ink bg-bg-2" : "border-rule"}`}>
                            <Thumb photo={c.photo} cat={r.cat} />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold">{c.name}</span>
                              <span className="block truncate text-[0.7rem] text-muted">{[c.type, c.address?.split(",").slice(-3, -1).join(",")].filter(Boolean).join(" · ")}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : r.candidates[0] ? (
                    <div className="flex items-center gap-2">
                      <Thumb photo={r.candidates[0].photo} cat={r.cat} />
                      <span className="text-xs text-muted">{[r.candidates[0].type, r.candidates[0].address].filter(Boolean).join(" · ")}</span>
                    </div>
                  ) : null}
                  {!r.skip ? (
                    <>
                      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3" role="radiogroup" aria-label="Type">
                        {CAT_CHOICES.map((c) => (
                          <Chip key={c} pressed={r.cat === c} onClick={() => setRows((cur) => cur.map((x, j) => (j === i ? { ...x, cat: c } : x)))}>
                            <CatIcon cat={c} size={13} /> {CAT_LABEL[c]}
                          </Chip>
                        ))}
                      </div>
                      <input value={r.note} onChange={(e) => setRows((cur) => cur.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} maxLength={500} placeholder="A line: what to order, who said so, why" aria-label="Your line" className="w-full" />
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
            {days.length ? (
              <div className="grid gap-1.5">
                <p className="eyebrow">Put {kept === 1 ? "it" : "them"} on a day? Optional</p>
                <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
                  {days.map((d) => (
                    <Chip key={d.date} pressed={day === d.date} onClick={() => setDay(day === d.date ? null : d.date)} tone={LAYER_INK.ours}>
                      {fmtDay(d.date)}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
            {err ? <p className="text-sm text-danger">{err}</p> : null}
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => setStep("find")}>
                Back
              </button>
              <button type="button" className="btn btn-primary flex-1" disabled={!!busy || !kept} onClick={save}>
                {busy ?? (kept === 1 ? "Add it" : `Add ${kept}`)}
              </button>
            </div>
          </>
        ) : null}

        {step === "done" ? (
          <>
            <p className="text-ink-2">
              {added.length === 1 ? <b>{titleCase(added[0])}</b> : <b>{added.length} places</b>} {added.length === 1 ? "is" : "are"} on the {cityName} map now, in red, with where {added.length === 1 ? "it fits" : "they fit"} and when {added.length === 1 ? "it goes" : "they go"}. Tap one to change its line, type or day.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setText("");
                  setImages([]);
                  setCsv(null);
                  setRows([]);
                  setDay(null);
                  setStep("find");
                }}
              >
                Add another
              </button>
              <button type="button" className="btn btn-primary flex-1" onClick={onClose}>
                See {added.length === 1 ? "it" : "them"} on the map
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

/** Google sometimes shouts: "FUGLEN ASAKUSA" → "Fuglen Asakusa". Mixed case stays as it is. */
export function titleCase(s: string): string {
  if (s !== s.toUpperCase() || !/[A-Z]/.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s\-(/])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function Thumb({ photo, cat }: { photo: string | undefined; cat: SpotCat }) {
  return photo ? (
    // eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host
    <img src={photoSrc(photo, 200)} alt="" className="size-12 shrink-0 rounded-lg bg-bg-2 object-cover" />
  ) : (
    <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-bg-2 text-muted">
      <CatIcon cat={isCat(cat) ? cat : "food"} size={18} />
    </span>
  );
}

/** A screenshot as a JPEG data URL no wider than 1400px, so four of them still post comfortably. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1400 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image we can read."));
    };
    img.src = url;
  });
}
