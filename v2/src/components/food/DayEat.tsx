"use client";

import Link from "next/link";
import { useStore } from "../providers";
import { BookingStatus } from "./PlaceSheet";

/** The Trip day's meals: what's booked or picked for that date, and the way to the Food tab's night. */
export function DayEat({ date, ryokan }: { date: string; ryokan: boolean }) {
  const { snapshot } = useStore();
  const bs = snapshot.food_bookings.filter((b) => b.date === date);
  const dinner = bs.some((b) => b.meal === "dinner" || !b.meal);
  return (
    <div className="grid gap-1.5 rounded-xl border border-rule p-3 text-sm">
      <div className="flex items-baseline justify-between">
        <b>Eat</b>
        <Link href={`/food?night=${date}`} className="text-xs font-semibold text-accent no-underline">
          {dinner || ryokan ? "That night ›" : "Choose dinner ›"}
        </Link>
      </div>
      {bs.map((b) => (
        <span key={b.id} className="flex flex-wrap items-center gap-x-2">
          <span className="text-muted capitalize">{b.meal ?? "dinner"}</span>
          <b>{b.name.replace(/ \([^)]*\)$/, "")}</b>
          <BookingStatus b={b} />
        </span>
      ))}
      {!dinner ? <span className="text-ink-2">{ryokan ? "Dinner and breakfast at the ryokan." : "Dinner not booked yet."}</span> : null}
    </div>
  );
}
