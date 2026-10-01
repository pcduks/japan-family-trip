"use client";

import Image from "next/image";
import { useState } from "react";
import type { Chapter, ChapterAnswer } from "@/lib/catalog/chapters";

const ANSWERS: { key: ChapterAnswer; label: string; hint: string }[] = [
  { key: "no", label: "Não é pra mim", hint: "Pode deixar fora" },
  { key: "meh", label: "Tanto faz", hint: "Vou no embalo" },
  { key: "yes", label: "Me chama", hint: "Quero isso na viagem" },
];

const LEVEL = ["", "pouco", "médio", "muito"];

/** Real photos for a chapter's three examples, via Google Places; hidden when they fail. */
function PhotoStrip({ chapter }: { chapter: Chapter }) {
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const n = chapter.photo_queries?.length ?? 0;
  if (!n) return null;
  return (
    <ul className="-mx-5 flex gap-1 overflow-x-auto px-5 no-scrollbar" aria-label="Fotos">
      {chapter.examples_pt.slice(0, n).map((ex, i) =>
        failed.has(i) ? null : (
          <li key={i} className="relative aspect-[4/3] w-[62%] shrink-0 overflow-hidden rounded-xl bg-paper-2 first:w-[70%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/card-photo/chapter:${chapter.id}:${i}?w=800`} alt={ex} loading={i === 0 ? "eager" : "lazy"} className="size-full object-cover" onError={() => setFailed(new Set([...failed, i]))} />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-xs text-white">{ex}</span>
          </li>
        ),
      )}
    </ul>
  );
}

/** One chapter, full screen: the illustration, the promise, the two nights, the honest trade-offs, then one tap. */
export function ChapterCard({ chapter, value, onAnswer }: { chapter: Chapter; value?: ChapterAnswer; onAnswer: (a: ChapterAnswer) => Promise<void> }) {
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = chapter.tradeoffs;
  return (
    <article className="grid gap-4">
      <div className="card grid gap-3 overflow-hidden p-5 pt-0">
        <Image src={`/illustrations/chapter-${chapter.id}.webp`} alt="" width={1600} height={900} sizes="(max-width: 28rem) 100vw, 28rem" className="-mx-5 aspect-[16/9] w-[calc(100%+2.5rem)] max-w-none object-cover" priority />
        <h2 className="text-[2.2rem] leading-[1.05]">{chapter.name_pt}</h2>
        <p className="text-[1.1rem] leading-relaxed">{chapter.promise_pt}</p>
        <PhotoStrip chapter={chapter} />
        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-paper-2 p-2">
            <dt className="text-xs text-muted">Frio</dt>
            <dd className="font-bold">{LEVEL[t.cold]}</dd>
          </div>
          <div className="rounded-xl bg-paper-2 p-2">
            <dt className="text-xs text-muted">Trem</dt>
            <dd className="font-bold">{LEVEL[t.train]}</dd>
          </div>
          <div className="rounded-xl bg-paper-2 p-2">
            <dt className="text-xs text-muted">Pra ela</dt>
            <dd className="font-bold">{t.her === 1 ? "tranquilo" : t.her === 2 ? "com cuidado" : "puxado"}</dd>
          </div>
        </dl>
        <p className="text-sm text-ink-2">{t.note_pt}</p>
      </div>

      <section className="card grid gap-3 p-4">
        <Night title="Noite de 24 de dezembro" n={chapter.xmas_eve} />
        <hr className="border-dashed border-rule" />
        <Night title="Noite de 31 de dezembro" n={chapter.nye} />
      </section>

      <button type="button" className="justify-self-start text-sm underline" onClick={() => setMore(!more)}>
        {more ? "Menos" : "Um dia típico e o que tem"}
      </button>
      {more ? (
        <section className="card grid gap-2 p-4 text-[1.02rem]">
          <p className="eyebrow">Um dia típico</p>
          <ol className="grid gap-1">
            {chapter.typical_day_pt.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-display text-xl text-vermilion">{["manhã", "tarde", "noite"][i] ?? ""}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p className="eyebrow mt-1">Por exemplo</p>
          <ul className="grid gap-1">
            {chapter.examples_pt.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
          <p className="text-sm text-muted">{chapter.cost_pt}</p>
        </section>
      ) : null}

      <div className="grid gap-2">
        {ANSWERS.map((a) => (
          <button
            key={a.key}
            type="button"
            disabled={busy}
            aria-pressed={value === a.key}
            onClick={async () => {
              setBusy(true);
              await onAnswer(a.key);
              setBusy(false);
            }}
            className={`grid min-h-14 rounded-2xl border px-4 py-2 text-left transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper ${a.key === "yes" ? "border-ink-2 bg-card" : "border-rule bg-card"}`}
          >
            <span className={`font-bold ${a.key === "yes" ? "text-[1.15rem]" : "text-[1.05rem]"}`}>{a.label}</span>
            <span className="text-xs opacity-80">{a.hint}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

function Night({ title, n }: { title: string; n: Chapter["xmas_eve"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-1">
      <p className="eyebrow">{title}</p>
      <p className="text-[1.02rem]">{n.where_pt}</p>
      <p className="font-hand text-lg leading-snug text-ink-2">{n.evening_pt}</p>
      <button type="button" className="justify-self-start text-xs text-muted underline" onClick={() => setOpen(!open)}>
        {open ? "Menos" : "O que abre e o que fecha"}
      </button>
      {open ? <p className="text-sm text-ink-2">{n.open_pt}</p> : null}
    </div>
  );
}

/** Put the chapters that called you in order: tap to add, tap again to remove. */
export function ChapterRank({ chapters, rank, onChange, onDone }: { chapters: Chapter[]; rank: string[]; onChange: (r: string[]) => Promise<void>; onDone: () => void }) {
  return (
    <div className="grid gap-4">
      <ol className="grid gap-2">
        {chapters.map((c) => {
          const pos = rank.indexOf(c.id);
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-pressed={pos >= 0}
                className="card flex w-full items-center gap-3 p-3 text-left aria-pressed:border-ink"
                onClick={() => onChange(pos >= 0 ? rank.filter((id) => id !== c.id) : rank.length < 3 ? [...rank, c.id] : rank)}
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-xl ${pos >= 0 ? "bg-vermilion text-paper" : "bg-paper-2 text-muted"}`}>{pos >= 0 ? pos + 1 : "·"}</span>
                <span className="grid min-w-0">
                  <span className="font-display text-[1.3rem] leading-tight">{c.name_pt}</span>
                  <span className="truncate text-xs text-muted">{c.promise_pt}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <button className="btn btn-primary text-base" disabled={!rank.length} onClick={onDone}>
        {rank.length ? `Esses ${rank.length === 1 ? "é o meu" : "são os meus"}` : "Escolha pelo menos um"}
      </button>
    </div>
  );
}
