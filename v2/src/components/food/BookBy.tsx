"use client";

import Link from "next/link";
import { daysBetween, fmtDay, todayIso } from "@/lib/dates";
import type { Deadline } from "@/lib/types";
import { useStore } from "../providers";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function sheetHref(id: string): string {
  const [city, s] = id.split("/");
  return `/food/${city}?place=${s}`;
}

/** When each table opens or must be booked, in order. The booking itself happens on each restaurant's own channel. */
export function BookBy() {
  const { snapshot, isPlanner, setDeadlineDone } = useStore();
  const today = todayIso();
  const food = snapshot.deadlines.filter((d) => d.id?.startsWith("food-")).sort((a, b) => a.date.localeCompare(b.date));
  const now = food.filter((d) => !d.done && d.date <= today);
  const later = food.filter((d) => !d.done && d.date > today);
  const done = food.filter((d) => d.done);
  const months = later.reduce<Map<string, Deadline[]>>((m, d) => m.set(d.date.slice(0, 7), [...(m.get(d.date.slice(0, 7)) ?? []), d]), new Map());

  const row = (d: Deadline) => <DeadlineRow key={d.id} d={d} today={today} canTick={isPlanner} onTick={(v) => d.id && setDeadlineDone(d.id, v)} />;

  return (
    <main className="mx-auto grid max-w-2xl gap-5 px-4 pt-3 pb-8">
      <header className="grid gap-1">
        <Link href="/food" className="text-sm text-muted no-underline">
          ← Food
        </Link>
        <h1 className="display text-[2.2rem] leading-[1.05]">When to book</h1>
        <p className="text-[0.95rem] text-ink-2">The few places worth planning around, in the order their tables open. When booking, say we are seven and mention the pregnancy then, not on the night.</p>
      </header>

      {now.length ? <Group title="Now">{now.map(row)}</Group> : null}
      {[...months.entries()].map(([ym, list]) => (
        <Group key={ym} title={MONTHS[Number(ym.slice(5)) - 1]}>
          {list.map(row)}
        </Group>
      ))}

      {done.length ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-muted">Done ({done.length})</summary>
          <ul className="card mt-2 divide-y divide-rule">{done.map(row)}</ul>
        </details>
      ) : null}
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-[1.3rem]">{title}</h2>
      <ul className="card divide-y divide-rule">{children}</ul>
    </section>
  );
}

function DeadlineRow({ d, today, canTick, onTick }: { d: Deadline; today: string; canTick: boolean; onTick: (done: boolean) => void }) {
  const days = daysBetween(today, d.date);
  const when = d.done ? "done" : days < 0 ? `${-days} days ago` : days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  return (
    <li className={`grid grid-cols-[3.2rem_1fr] gap-3 px-3 py-3 ${d.done ? "opacity-60" : ""}`}>
      <span className={`grid h-fit place-items-center rounded-xl py-1.5 ${d.done ? "bg-bg-2 text-muted" : days <= 0 ? "bg-accent text-accent-ink" : "bg-bg-2 text-ink"}`}>
        <span className="text-[0.6rem] font-bold tracking-wide uppercase">{fmtDay(d.date, false).split(" ")[1]}</span>
        <span className="font-display text-[1.4rem] leading-none">{Number(d.date.slice(8))}</span>
      </span>
      <span className="grid min-w-0 gap-1">
        <span className={`text-sm ${d.done ? "line-through" : "font-semibold"}`}>{d.item}</span>
        <span className="text-xs text-muted">
          {d.how ? `${d.how} · ` : ""}
          <span className={!d.done && days <= 7 ? "font-bold text-warn" : ""}>{when}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {d.place ? (
            <Link href={sheetHref(d.place)} className="btn btn-sm">
              Open
            </Link>
          ) : d.source ? (
            <a href={d.source} target="_blank" rel="noreferrer" className="btn btn-sm">
              Open
            </a>
          ) : null}
          {canTick ? (
            <label className="flex min-h-9 items-center gap-1.5 text-sm">
              <input type="checkbox" className="min-h-0" checked={!!d.done} onChange={(e) => onTick(e.target.checked)} />
              Done
            </label>
          ) : null}
        </span>
      </span>
    </li>
  );
}
