"use client";

import Link from "next/link";
import { useState } from "react";
import { daysBetween, fmtDay, todayIso } from "@/lib/dates";
import { useStore } from "./providers";

function due(days: number): string {
  if (days < -1) return `${-days} days late`;
  if (days === -1) return "yesterday";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** The top of Trip: routes waiting for a decision, then the next dates to book or decide by. */
export function WhatsNext() {
  const { snapshot, me, isPlanner, setDeadlineDone } = useStore();
  const [all, setAll] = useState(false);
  const today = todayIso();
  const waiting = snapshot.suggestions.filter((s) => s.status === "open" && (isPlanner || s.author_id === me?.travellerId)).length;
  const sorted = snapshot.deadlines.slice().sort((a, b) => a.date.localeCompare(b.date));
  const open = sorted.filter((d) => !d.done);
  const shown = all ? sorted : open.slice(0, 3);
  if (!waiting && !shown.length) return null;

  return (
    <section className="card grid gap-2 p-4" aria-labelledby="whats-next">
      <h2 id="whats-next" className="eyebrow">
        What’s next
      </h2>
      {waiting ? (
        <Link href="/inbox" className="flex items-center justify-between gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm no-underline">
          <span>
            <b>{waiting}</b> {waiting === 1 ? "route" : "routes"} {isPlanner ? "sent to you to consider" : "you sent, waiting for an answer"}
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
      <ul className="grid gap-1.5">
        {shown.map((d) => {
          const days = daysBetween(today, d.date);
          return (
            <li key={d.id ?? d.date + d.item} className={`flex items-start gap-3 text-sm ${d.done ? "text-muted line-through" : ""}`}>
              {isPlanner && d.id ? (
                <input type="checkbox" className="mt-1 min-h-0 shrink-0" checked={!!d.done} onChange={(e) => setDeadlineDone(d.id!, e.target.checked)} aria-label={`Done: ${d.item}`} />
              ) : null}
              <span className="w-16 shrink-0">
                <b className="block">{fmtDay(d.date, false)}</b>
                {!d.done ? <span className={`text-xs ${days < 0 ? "text-danger" : days <= 7 ? "text-warn" : "text-muted"}`}>{due(days)}</span> : null}
              </span>
              <span className="min-w-0 flex-1">
                {d.item}
                {d.source ? (
                  <>
                    {" "}
                    <a href={d.source} target="_blank" rel="noreferrer" className="text-muted">
                      link
                    </a>
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      {sorted.length > 3 ? (
        <button className="justify-self-start text-sm font-semibold text-accent" onClick={() => setAll(!all)} aria-expanded={all}>
          {all ? "Only what’s next" : `All ${sorted.length} dates`}
        </button>
      ) : null}
    </section>
  );
}
