"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { directionsUrl, mapsSearchUrl } from "@/lib/links";
import {
  deadlineReminders,
  planDays,
  planLegs,
  railReminders,
  staysNeedingLodging,
  todayInJapan,
  upcoming,
  type Booking,
  type PlanDay,
} from "@/lib/plan";
import { useTable } from "@/lib/tables";
import { TRIP_END, TRIP_START, formatDay, formatHours, placeMap, weekday } from "@/lib/trip";
import type { Place } from "@/lib/types";
import { useStore } from "./providers";
import { usePlans } from "./usePlans";

/** P3.1: today's plan, next leg, the hotel address in Japanese, and weather. */
export function TodayView() {
  const { trip, votes } = useStore();
  const state = usePlans();
  const plan = state.chosen ?? state.plans.at(-1) ?? null;
  const { rows: allBookings } = useTable("bookings");
  const { rows: allActivities } = useTable("activities");
  const sp = useSearchParams();
  const router = useRouter();
  const P = useMemo(() => placeMap(trip), [trip]);
  const today = todayInJapan();
  const during = today >= TRIP_START && today <= TRIP_END;
  const preview = sp.get("d");
  const date = preview && preview >= TRIP_START && preview <= TRIP_END ? preview : during ? today : TRIP_START;

  const bookings = plan ? allBookings.filter((b) => b.plan_id === plan.id) : [];
  const days = plan ? planDays(plan) : [];
  const day = days.find((d) => d.date === date) ?? null;
  const daysToGo = Math.round((Date.parse(TRIP_START) - Date.parse(today)) / 86_400_000);

  const reminders = plan ? upcoming([...railReminders(plan, bookings, P), ...deadlineReminders(bookings)], today, 14) : [];
  const voted = new Set(votes.map((v) => v.travellerId));
  const notVoted = trip.travellers.filter((t) => !voted.has(t.id));
  const needLodging = plan ? staysNeedingLodging(plan, bookings).length : 0;

  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4">
      {today < TRIP_START ? (
        <section className="grid gap-3">
          <div>
            <p className="eyebrow">{formatDay(today)} in Japan</p>
            <h1 className="text-3xl font-extrabold">
              {daysToGo} day{daysToGo === 1 ? "" : "s"} to go
            </h1>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/vote" className="card grid gap-0.5 p-3 no-underline hover:border-ink">
              <span className="text-xs text-muted">Votes</span>
              <span className="font-bold">{notVoted.length ? `${notVoted.length} still to vote` : "Everyone has voted"}</span>
            </Link>
            <Link href="/plan" className="card grid gap-0.5 p-3 no-underline hover:border-ink">
              <span className="text-xs text-muted">Plan</span>
              <span className="font-bold">{plan ? (state.chosen ? state.chosen.name : `Draft: ${plan.name}`) : "Not started"}</span>
            </Link>
            <Link href="/plan/bookings" className="card grid gap-0.5 p-3 no-underline hover:border-ink">
              <span className="text-xs text-muted">Lodging</span>
              <span className="font-bold">{plan ? (needLodging ? `${needLodging} stays to hold` : "All stays held") : "—"}</span>
            </Link>
          </div>
          {reminders.length ? (
            <div className="card grid gap-2 p-3">
              <h2 className="text-base font-extrabold">Next two weeks</h2>
              <ul className="grid gap-1.5 text-sm">
                {reminders.map((r, i) => (
                  <li key={i} className="grid grid-cols-[4rem_1fr] gap-2">
                    <span className={`font-mono ${r.date < today ? "font-bold text-danger" : ""}`}>{r.date < today ? "overdue" : formatDay(r.date)}</span>
                    <span>{r.title}</span>
                  </li>
                ))}
              </ul>
              <Link href="/plan/bookings" className="text-sm">
                All bookings →
              </Link>
            </div>
          ) : null}
        </section>
      ) : today > TRIP_END ? (
        <h1 className="text-3xl font-extrabold">Welcome home</h1>
      ) : null}

      {plan ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">{during && date === today ? "Today" : "Preview"}</p>
              <h2 className="text-2xl font-extrabold">
                {weekday(date)} {formatDay(date)}
              </h2>
            </div>
            <label className="grid gap-1 text-xs text-muted">
              {during ? "Look at another day" : "Preview a day"}
              <input
                type="date"
                className="input !min-h-9 !py-1"
                min={TRIP_START}
                max={TRIP_END}
                value={date}
                onChange={(e) => router.replace(`/today?d=${e.target.value}`, { scroll: false })}
              />
            </label>
          </div>
          {day ? (
            <DayCard
              day={day}
              places={P}
              bookings={bookings}
              activities={allActivities.filter((a) => a.plan_id === plan.id && a.date === date).sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"))}
              nextLeg={planLegs(plan).find((l) => l.date > date) ?? null}
              planId={plan.id}
            />
          ) : null}
        </>
      ) : (
        <p className="card p-4 text-sm text-muted">Once a plan exists, this screen shows each day: where you sleep, how you get there, the weather and what&apos;s on.</p>
      )}

      <section className="card grid gap-1 p-4 text-sm" aria-labelledby="sos-h">
        <h2 id="sos-h" className="text-base font-extrabold">
          If something goes wrong
        </h2>
        <p>
          Ambulance or fire <a href="tel:119" className="font-bold">119</a> · Police <a href="tel:110" className="font-bold">110</a>
        </p>
        <p>
          Japan Visitor Hotline (English, 24 h) <a href="tel:+815038162787" className="font-bold">050-3816-2787</a>
        </p>
        <p className="text-muted">Say “ninpu desu” (妊婦です, “she&apos;s pregnant”) to paramedics.</p>
      </section>
    </main>
  );
}

function DayCard({
  day,
  places,
  bookings,
  activities,
  nextLeg,
  planId,
}: {
  day: PlanDay;
  places: Map<string, Place>;
  bookings: Booking[];
  activities: { id: string; time: string | null; title: string; note: string | null; split_group: string | null }[];
  nextLeg: ReturnType<typeof planLegs>[number] | null;
  planId: string;
}) {
  const place = day.stay ? places.get(day.stay.place) : null;
  const from = day.leaving ? places.get(day.leaving.place) : null;
  const lodging = day.stay ? bookings.find((b) => b.kind === "lodging" && b.stay_id === day.stay!.id && b.status !== "idea") ?? bookings.find((b) => b.kind === "lodging" && b.stay_id === day.stay!.id) : null;
  const ticket = day.arriving ? bookings.find((b) => b.kind === "transport" && b.stay_id === day.arriving!.id) : null;

  return (
    <div className="grid gap-3">
      {day.arriving && from && place ? (
        <section className="card grid gap-2 p-4" style={{ borderLeft: "5px solid var(--accent)" }}>
          <p className="eyebrow">Moving day</p>
          <h3 className="text-xl font-extrabold">
            {from.name} → {place.name}
          </h3>
          {day.arriving.legNote ? <p className="text-sm">{day.arriving.legNote}</p> : null}
          {ticket ? (
            <p className="text-sm">
              <b>{ticket.name}</b> · {ticket.status}
              {ticket.confirmation ? ` · ref ${ticket.confirmation}` : ""}
            </p>
          ) : null}
          <a className="btn btn-sm justify-self-start" href={directionsUrl(from, place)} target="_blank" rel="noreferrer">
            Directions in Google Maps
          </a>
        </section>
      ) : null}

      {day.departure ? (
        <section className="card grid gap-1 p-4">
          <h3 className="text-xl font-extrabold">Flying home</h3>
          <p className="text-sm text-muted">9 Jan is an all-reserved Nozomi day. Leave early for the airport.</p>
        </section>
      ) : place ? (
        <section className="card grid gap-3 p-4">
          <div>
            <p className="eyebrow">Tonight</p>
            <h3 className="text-xl font-extrabold">{lodging?.name ?? place.name}</h3>
            {lodging?.address ? <p className="text-sm">{lodging.address}</p> : null}
            {lodging?.address_ja ? (
              <p className="text-lg" lang="ja">
                {lodging.address_ja}
              </p>
            ) : null}
            {!lodging ? (
              <p className="text-sm text-muted">
                No lodging added yet. <Link href={`/plan/bookings?plan=${planId}`}>Add it</Link> to get the taxi card.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {lodging ? <TaxiCard booking={lodging} /> : null}
            <a
              className="btn btn-sm"
              href={mapsSearchUrl({ query: lodging?.address ?? lodging?.name ?? place.query, googlePlaceId: lodging ? null : place.googlePlaceId })}
              target="_blank"
              rel="noreferrer"
            >
              Map
            </a>
            {lodging?.phone ? (
              <a className="btn btn-sm" href={`tel:${lodging.phone}`}>
                Call
              </a>
            ) : null}
          </div>
          {lodging?.confirmation ? <p className="text-sm text-muted">Booking ref {lodging.confirmation}</p> : null}
        </section>
      ) : null}

      {place ? <Weather place={place} date={day.date} today={todayInJapan()} /> : null}

      <section className="card grid gap-2 p-4" aria-labelledby="plan-h">
        <div className="flex items-baseline justify-between">
          <h3 id="plan-h" className="text-lg font-extrabold">
            The plan
          </h3>
          <Link href={`/plan/days?plan=${planId}&d=${day.date}`} className="text-sm">
            Edit
          </Link>
        </div>
        {activities.length ? (
          <ol className="grid gap-2">
            {activities.map((a) => (
              <li key={a.id} className="grid grid-cols-[3.25rem_1fr] gap-2 text-sm">
                <span className="font-mono">{a.time ?? "—"}</span>
                <span>
                  <b>{a.title}</b>
                  {a.split_group ? <span className="ml-2 text-accent">{a.split_group}</span> : null}
                  {a.note ? <span className="block text-muted">{a.note}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">Nothing planned. A free day!</p>
        )}
      </section>

      {nextLeg && !day.departure ? (
        <p className="text-sm text-muted">
          Next move: {formatDay(nextLeg.date)}, {places.get(nextLeg.from)?.name} → {places.get(nextLeg.to)?.name}
          {nextLeg.hours ? ` (~${formatHours(nextLeg.hours)})` : ""}.
        </p>
      ) : null}
    </div>
  );
}

/** Big Japanese address to show a taxi driver. */
function TaxiCard({ booking }: { booking: Booking }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="btn btn-sm btn-primary">Show taxi card</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed inset-0 z-50 grid content-center gap-6 bg-white p-6 text-black" lang="ja">
          <Dialog.Title className="text-2xl font-bold">この住所までお願いします。</Dialog.Title>
          <Dialog.Description className="sr-only">Please take us to this address.</Dialog.Description>
          <p className="text-3xl leading-snug font-bold">{booking.address_ja ?? booking.address ?? booking.name}</p>
          <p className="text-2xl">{booking.name}</p>
          {booking.phone ? <p className="text-2xl">☎ {booking.phone}</p> : null}
          <p className="text-lg" lang="en">
            Please take us to this address. (6 people; 2 taxis)
          </p>
          <Dialog.Close className="btn btn-primary justify-self-start text-lg" lang="en">
            Close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface Forecast {
  max: number;
  min: number;
  code: number;
  rain: number | null;
  snow: number | null;
}

const WMO: [number[], string, string][] = [
  [[0], "☀️", "Clear"],
  [[1, 2], "🌤️", "Partly cloudy"],
  [[3], "☁️", "Cloudy"],
  [[45, 48], "🌫️", "Fog"],
  [[51, 53, 55, 56, 57], "🌦️", "Drizzle"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "🌧️", "Rain"],
  [[71, 73, 75, 77, 85, 86], "🌨️", "Snow"],
  [[95, 96, 99], "⛈️", "Thunderstorm"],
];

function Weather({ place, date, today }: { place: Place; date: string; today: string }) {
  const [result, setResult] = useState<{ key: string; f: Forecast | null } | null>(null);
  const key = `${place.slug}:${date}`;
  const daysAhead = (Date.parse(date) - Date.parse(today)) / 86_400_000;
  const inRange = daysAhead > -1 && daysAhead < 15 && place.lat != null;

  useEffect(() => {
    if (!inRange) return;
    let live = true;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum&timezone=Asia%2FTokyo&start_date=${date}&end_date=${date}`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        const d = j.daily;
        const f = d?.time?.length
          ? { max: d.temperature_2m_max[0], min: d.temperature_2m_min[0], code: d.weather_code[0], rain: d.precipitation_probability_max?.[0] ?? null, snow: d.snowfall_sum?.[0] ?? null }
          : null;
        if (live) setResult({ key, f });
      })
      .catch(() => live && setResult({ key, f: null }));
    return () => {
      live = false;
    };
  }, [key, inRange, place.lat, place.lng, date]);

  const f = result?.key === key ? result.f : null;
  const wmo = f ? WMO.find(([codes]) => codes.includes(f.code)) : null;
  return (
    <section className="card grid gap-1 p-4" aria-labelledby="wx-h">
      <h3 id="wx-h" className="text-base font-extrabold">
        Weather in {place.name}
      </h3>
      {f ? (
        <p className="text-lg">
          {wmo?.[1]} {wmo?.[2] ?? ""} · {Math.round(f.min)}° to {Math.round(f.max)}°C
          {f.rain != null ? <span className="text-sm text-muted"> · {f.rain}% chance of rain or snow</span> : null}
          {f.snow ? <span className="text-sm text-muted"> · {f.snow} cm snow</span> : null}
        </p>
      ) : (
        <p className="text-sm text-muted">{inRange ? "Loading forecast…" : `Forecast appears two weeks ahead. Usually: ${place.winter || "check closer to the date."}`}</p>
      )}
      {place.bump ? <p className="text-sm text-muted">For her: {place.bump}</p> : null}
    </section>
  );
}
