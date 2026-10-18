"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { DeepCity, DeepDish } from "@/lib/foodDeep";
import { PREG_MARK, type Photo } from "@/lib/foodView";

/** One dish, full screen: the story to read out at the table, what Fernanda can have, and where to try it. */
export function DishStory({ city, dish: d, index, total, photo, onClose, onNext }: { city: DeepCity; dish: DeepDish; index: number; total: number; photo: Photo | null; onClose: () => void; onNext: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onNext]);

  const preg = PREG_MARK[d.pregnancy ?? "unknown"];
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper" role="dialog" aria-modal="true" aria-labelledby="dish-title">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-4 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="min-h-10 text-sm font-semibold">
            ✕ Close
          </button>
          <span className="eyebrow text-ink-2">
            {city.name} · {index + 1} of {total}
          </span>
        </div>

        {photo ? (
          <figure className="grid gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={d.name} className="max-h-[38dvh] w-full rounded-2xl object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            <figcaption className="text-[0.68rem] text-muted">
              {[photo.author, photo.license].filter(Boolean).join(" · ")}
              {photo.source ? (
                <>
                  {" · "}
                  <a href={photo.source} target="_blank" rel="noreferrer">
                    Wikimedia Commons
                  </a>
                </>
              ) : null}
            </figcaption>
          </figure>
        ) : (
          <div className="grid h-40 place-items-center rounded-2xl bg-bg-2" aria-hidden="true">
            <span className="jp text-[4rem] leading-none font-bold text-ink-2/60">{d.name_ja?.slice(0, 3) ?? "食"}</span>
          </div>
        )}

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {d.name_ja ? <span className="jp text-[2.4rem] leading-tight font-bold">{d.name_ja}</span> : null}
          <span id="dish-title" className="text-sm font-semibold tracking-[0.14em] text-ink-2 uppercase">
            {d.romaji ?? d.name}
          </span>
        </div>
        {d.romaji && d.romaji.toLowerCase() !== d.name.toLowerCase() ? <p className="-mt-3 font-display text-lg">{d.name}</p> : null}

        <p className="font-display text-[1.2rem] leading-[1.5]">{d.story ?? d.what}</p>

        <div className="grid gap-1.5 text-sm">
          <span className={`font-bold ${preg.cls}`}>
            {preg.glyph} {preg.label === "Fine" ? "Fine for Fernanda" : preg.label === "Ask" ? "Fernanda: ask" : preg.label === "Skip" ? "Fernanda skips this" : "Not checked for Fernanda"}
            {d.pregnancy_note ? <span className="font-normal text-ink-2"> · {d.pregnancy_note}</span> : null}
          </span>
          {d.where ? (
            <span className="text-ink-2">
              <b className="text-ink">Where:</b> {d.where}
            </span>
          ) : null}
          {d.price ? <span className="text-muted">{d.price}</span> : null}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2.5 pt-2">
          <Link href="/food/staff" className="grid min-h-[52px] place-items-center rounded-xl bg-ink font-bold text-bg no-underline">
            Show staff
          </Link>
          <button onClick={onNext} className="min-h-[52px] rounded-xl border-[1.5px] border-ink font-semibold">
            Next dish ›
          </button>
        </div>
      </div>
    </div>
  );
}
