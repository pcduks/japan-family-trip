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
  STATUS_LABEL,
  type Booking,
  type PlanDay,
} from "@/lib/plan";
import { useTable } from "@/lib/tables";
import { placeStamp, stampLabel } from "@/lib/stamps";
import { TRIP_END, TRIP_START, daysBetween, formatDay, formatHours, formatLong, placeMap, stampDate, tripDates, weekday } from "@/lib/trip";
import type { Place } from "@/lib/types";
import { EkiStamp } from "./EkiStamp";
import { useStore } from "./providers";
import { PageHeader, Section } from "./ui";
import { usePlans } from "./usePlans";

/** Hoje: a personal page. Before the trip it's a countdown and your to-dos; during it, the day. */
export function TodayView() {
  const { trip, votes, me } = useStore();
  const state = usePlans();
  const plan = state.chosen ?? state.plans.at(-1) ?? null;
  const { rows: allBookings } = useTable("bookings");
  const { rows: allActivities } = useTable("activities");
  const { rows: packing } = useTable("packing_items");
  const { rows: marks } = useTable("food_marks");
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
  const daysToGo = daysBetween(today, TRIP_START);
  const isPlanner = me?.role === "planner";

  const reminders = plan && isPlanner ? upcoming([...railReminders(plan, bookings, P), ...deadlineReminders(bookings)], today, 14) : [];
  const iVoted = !!me && votes.some((v) => v.travellerId === me.travellerId);
  const myPacking = packing.filter((r) => r.traveller_id === me?.travellerId);
  const packed = myPacking.filter((r) => r.checked).length;
  const myWants = marks.filter((m) => m.traveller_id === me?.travellerId && m.status === "want").length;
  const needLodging = plan ? staysNeedingLodging(plan, bookings).length : 0;

  const todos: { href: string; label: string; detail: string; done: boolean }[] = [
    { href: "/votar", label: "Votar na rota", detail: iVoted ? "Voto dado. Dá para mudar até o prazo." : "Escolha sua favorita", done: iVoted },
    {
      href: "/mala",
      label: "Montar a mala",
      detail: myPacking.length ? `${packed} de ${myPacking.length} itens` : "Comece por uma lista pronta",
      done: myPacking.length > 0 && packed / myPacking.length >= 0.8,
    },
    { href: "/food", label: "Marcar 3 lugares para comer", detail: `${Math.min(myWants, 3)} de 3 marcados`, done: myWants >= 3 },
  ];
  if (isPlanner && plan)
    todos.push({ href: "/plan/bookings", label: "Segurar as hospedagens", detail: needLodging ? `Faltam ${needLodging}` : "Todas seguras", done: needLodging === 0 });

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      {today < TRIP_START ? (
        <>
          <PageHeader eyebrow={cap(formatLong(today))} title="Hoje" hand={`faltam ${daysToGo} dias para o Japão`} />
          <Section title="Para fazer" id="todo-h" aside={`${todos.filter((t) => t.done).length} de ${todos.length}`}>
            <ul className="card divide-y divide-rule">
              {todos.map((t) => (
                <li key={t.href}>
                  <Link href={t.href} className="flex items-center gap-3 px-4 py-3 no-underline">
                    <span
                      aria-hidden="true"
                      className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-sm ${t.done ? "border-pine bg-pine text-paper" : "border-dashed border-[color-mix(in_srgb,var(--ink)_35%,transparent)]"}`}
                    >
                      {t.done ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block ${t.done ? "text-muted line-through" : "font-bold"}`}>{t.label}</span>
                      <span className="text-sm text-muted">{t.detail}</span>
                    </span>
                    <span aria-hidden="true" className="text-muted">
                      →
                    </span>
                    <span className="sr-only">{t.done ? "(feito)" : "(a fazer)"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
          {reminders.length ? (
            <Section title="Próximas duas semanas" id="rem-h" aside={<Link href="/plan/bookings">Reservas →</Link>}>
              <ul className="card grid gap-2 p-4 text-sm">
                {reminders.map((r, i) => (
                  <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-2">
                    <span className={`font-mono ${r.date < today ? "font-bold text-danger" : "text-muted"}`}>{r.date < today ? "atrasado" : formatDay(r.date)}</span>
                    <span>{r.title}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      ) : today > TRIP_END ? (
        <PageHeader eyebrow="Okaeri" title="Bem-vindos de volta" hand="おかえり" />
      ) : (
        <PageHeader eyebrow={`Dia ${daysBetween(TRIP_START, today) + 1} de ${daysBetween(TRIP_START, TRIP_END) + 1}`} title="Hoje" hand={cap(formatLong(today))} />
      )}

      {plan ? (
        <Section
          title={during && date === today ? "O dia de hoje" : "Prévia de um dia"}
          id="day-h"
        >
          {state.chosen ? null : <p className="-mt-2 text-sm text-muted">Pelo rascunho “{plan.name}”, até a rota ser escolhida.</p>}
          <DayStrip dates={tripDates()} value={date} today={today} onPick={(d) => router.replace(`/today?d=${d}`, { scroll: false })} />
          {day ? (
            <DayCard
              day={day}
              places={P}
              bookings={bookings}
              activities={allActivities.filter((a) => a.plan_id === plan.id && a.date === date).sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"))}
              nextLeg={planLegs(plan).find((l) => l.date > date) ?? null}
              planId={plan.id}
              canEdit={isPlanner}
            />
          ) : null}
        </Section>
      ) : (
        <p className="card p-5 text-muted">Quando a rota for escolhida, aqui aparece cada dia: onde dormimos, como chegamos, o tempo e o que tem para fazer.</p>
      )}

      <Link href="/socorro" className="card flex items-center gap-4 p-4 no-underline" style={{ borderColor: "color-mix(in srgb, var(--danger) 35%, var(--rule))" }}>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-danger font-mono text-lg font-bold text-paper" aria-hidden="true">
          119
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[1.5rem] leading-tight">Socorro</span>
          <span className="text-sm text-muted">Emergência, hotline em inglês, maternidades perto de cada base</span>
        </span>
        <span aria-hidden="true" className="text-xl text-muted">
          →
        </span>
      </Link>
    </main>
  );
}

/** Scroll only the strip (not the page) so the picked day sits in the middle. */
function centerInStrip(el: HTMLButtonElement | null) {
  const box = el?.closest<HTMLElement>("[data-strip]");
  if (!el || !box) return;
  const a = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  box.scrollLeft += a.left - b.left - b.width / 2 + a.width / 2;
}

/** Horizontal strip of the 21 trip days. */
function DayStrip({ dates, value, today, onPick }: { dates: string[]; value: string; today: string; onPick: (d: string) => void }) {
  return (
    <div data-strip className="relative -mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      <ol className="flex w-max gap-1.5" aria-label="Escolha um dia">
        {dates.map((d, i) => {
          const on = d === value;
          const newMonth = i === 0 || d.slice(5, 7) !== dates[i - 1].slice(5, 7);
          return (
            <li key={d} className="relative pt-4">
              {newMonth ? <span className="absolute top-0 left-0.5 font-mono text-[0.65rem] tracking-widest text-vermilion">{d.slice(5, 7) === "12" ? "DEZ" : "JAN"}</span> : null}
              <button
                type="button"
                aria-pressed={on}
                aria-label={formatLong(d)}
                onClick={() => onPick(d)}
                ref={on ? centerInStrip : undefined}
                className={`grid w-12 justify-items-center rounded-xl border py-1.5 leading-tight ${on ? "border-ink bg-ink text-paper" : "border-rule bg-card"}`}
              >
                <span className={`text-[0.7rem] uppercase ${on ? "" : "text-muted"}`}>{weekday(d).slice(0, 3)}</span>
                <span className="font-display text-xl">{Number(d.slice(8))}</span>
                <span className={`size-1 rounded-full ${d === today ? "bg-vermilion" : "bg-transparent"}`} />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DayCard({
  day,
  places,
  bookings,
  activities,
  nextLeg,
  planId,
  canEdit,
}: {
  day: PlanDay;
  places: Map<string, Place>;
  bookings: Booking[];
  activities: { id: string; time: string | null; title: string; note: string | null; split_group: string | null }[];
  nextLeg: ReturnType<typeof planLegs>[number] | null;
  planId: string;
  canEdit: boolean;
}) {
  const place = day.stay ? places.get(day.stay.place) : null;
  const from = day.leaving ? places.get(day.leaving.place) : null;
  const lodging = day.stay ? bookings.find((b) => b.kind === "lodging" && b.stay_id === day.stay!.id && b.status !== "idea") ?? bookings.find((b) => b.kind === "lodging" && b.stay_id === day.stay!.id) : null;
  const ticket = day.arriving ? bookings.find((b) => b.kind === "transport" && b.stay_id === day.arriving!.id) : null;
  const stamp = place ? placeStamp(place.slug, place.kind) : null;

  return (
    <div className="grid gap-3">
      <p className="font-display text-[1.6rem] leading-tight">{cap(formatLong(day.date))}</p>
      {day.arriving && from && place ? (
        <section className="card grid gap-2 p-4" style={{ borderLeft: "5px solid var(--vermilion)" }}>
          <p className="eyebrow">Dia de mudar</p>
          <h3 className="text-[1.5rem] leading-tight">
            {from.name} → {place.name}
          </h3>
          {day.arriving.legNote ? <p className="text-sm text-ink-2">{day.arriving.legNote}</p> : null}
          {ticket ? (
            <p className="text-sm">
              <b>{ticket.name}</b> · {STATUS_LABEL[ticket.status]}
              {ticket.confirmation ? ` · código ${ticket.confirmation}` : ""}
            </p>
          ) : null}
          <a className="btn btn-sm justify-self-start" href={directionsUrl(from, place)} target="_blank" rel="noreferrer">
            Como chegar (Google Maps)
          </a>
        </section>
      ) : null}

      {day.departure ? (
        <section className="card flex items-center gap-4 p-4">
          <EkiStamp motif="suitcase" ink="var(--indigo)" top="Okaeri" bottom="9 · I · 2027" size={72} rotate={-6} label="" />
          <div className="grid gap-1">
            <h3 className="text-[1.5rem] leading-tight">Voltando para casa</h3>
            <p className="text-sm text-muted">9 de janeiro: Nozomi só com assento reservado. Saia cedo para o aeroporto.</p>
          </div>
        </section>
      ) : place ? (
        <section className="card grid gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Esta noite</p>
              <h3 className="text-[1.5rem] leading-tight">{lodging?.name ?? place.name}</h3>
              {lodging?.address ? <p className="text-sm text-ink-2">{lodging.address}</p> : null}
              {lodging?.address_ja ? (
                <p className="text-lg" lang="ja">
                  {lodging.address_ja}
                </p>
              ) : null}
              {!lodging ? (
                <p className="text-sm text-muted">
                  Hospedagem ainda não cadastrada.{canEdit ? <> <Link href={`/plan/bookings?plan=${planId}`} className="underline">Adicionar</Link> para ter o cartão do táxi.</> : null}
                </p>
              ) : null}
            </div>
            {stamp ? <EkiStamp motif={stamp.motif} ink={stamp.ink} top={stampLabel(place.name)} bottom={stampDate(day.date)} size={64} rotate={8} seed={place.slug.length} label="" /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {lodging ? <TaxiCard booking={lodging} /> : null}
            <a
              className="btn btn-sm"
              href={mapsSearchUrl({ query: lodging?.address ?? lodging?.name ?? place.query, googlePlaceId: lodging ? null : place.googlePlaceId })}
              target="_blank"
              rel="noreferrer"
            >
              Mapa
            </a>
            {lodging?.phone ? (
              <a className="btn btn-sm" href={`tel:${lodging.phone}`}>
                Ligar
              </a>
            ) : null}
          </div>
          {lodging?.confirmation ? <p className="text-sm text-muted">Código da reserva {lodging.confirmation}</p> : null}
          {place.bump ? (
            <p className="rounded-xl p-3 text-sm" style={{ background: "color-mix(in srgb, var(--plum) 11%, transparent)" }}>
              <b className="text-plum">Para ela:</b> {place.bump}
            </p>
          ) : null}
        </section>
      ) : null}

      {place ? <Weather place={place} date={day.date} today={todayInJapan()} /> : null}

      <section className="card grid gap-2 p-4" aria-labelledby="plan-h">
        <div className="flex items-baseline justify-between">
          <h3 id="plan-h" className="text-[1.4rem]">
            O programa
          </h3>
          {canEdit ? (
            <Link href={`/plan/days?plan=${planId}&d=${day.date}`} className="text-sm">
              Editar
            </Link>
          ) : null}
        </div>
        {activities.length ? (
          <ol className="grid gap-2">
            {activities.map((a) => (
              <li key={a.id} className="grid grid-cols-[3.25rem_1fr] gap-2">
                <span className="font-mono text-sm text-muted">{a.time ?? "—"}</span>
                <span>
                  <b>{a.title}</b>
                  {a.split_group ? <span className="ml-2 text-sm text-vermilion">{a.split_group}</span> : null}
                  {a.note ? <span className="block text-sm text-muted">{a.note}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="hand text-lg text-muted">Nada marcado. Dia livre!</p>
        )}
      </section>

      {nextLeg && !day.departure ? (
        <p className="card-flat flex items-center gap-3 p-3 text-sm">
          <EkiStamp motif="train" ink="var(--indigo)" size={36} rotate={-6} label="" />
          <span>
            <span className="eyebrow block">Próxima mudança · {formatDay(nextLeg.date)}</span>
            {places.get(nextLeg.from)?.name} → {places.get(nextLeg.to)?.name}
            {nextLeg.hours ? ` (~${formatHours(nextLeg.hours)})` : ""}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/** Big Japanese address to show a taxi driver. */
function TaxiCard({ booking }: { booking: Booking }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="btn btn-sm btn-primary">Cartão do táxi</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed inset-0 z-50 grid content-center gap-6 bg-[#fffdf7] p-6 text-[#111]" lang="ja">
          <Dialog.Title className="text-2xl font-bold">この住所までお願いします。</Dialog.Title>
          <Dialog.Description className="sr-only">Por favor, leve-nos a este endereço.</Dialog.Description>
          <p className="text-3xl leading-snug font-bold">{booking.address_ja ?? booking.address ?? booking.name}</p>
          <p className="text-2xl">{booking.name}</p>
          {booking.phone ? <p className="text-2xl">☎ {booking.phone}</p> : null}
          <p className="text-lg" lang="en">
            Please take us to this address. (6 people; 2 taxis)
          </p>
          <Dialog.Close className="btn btn-primary justify-self-start text-lg" lang="pt-BR">
            Fechar
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
  [[0], "☀️", "Céu limpo"],
  [[1, 2], "🌤️", "Poucas nuvens"],
  [[3], "☁️", "Nublado"],
  [[45, 48], "🌫️", "Neblina"],
  [[51, 53, 55, 56, 57], "🌦️", "Garoa"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "🌧️", "Chuva"],
  [[71, 73, 75, 77, 85, 86], "🌨️", "Neve"],
  [[95, 96, 99], "⛈️", "Tempestade"],
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
      <h3 id="wx-h" className="text-[1.4rem]">
        O tempo em {place.name}
      </h3>
      {f ? (
        <p className="text-lg">
          {wmo?.[1]} {wmo?.[2] ?? ""} · {Math.round(f.min)}° a {Math.round(f.max)}°C
          {f.rain != null ? <span className="text-sm text-muted"> · {f.rain}% de chance de chuva ou neve</span> : null}
          {f.snow ? <span className="text-sm text-muted"> · {f.snow} cm de neve</span> : null}
        </p>
      ) : (
        <p className="text-sm text-muted">{inRange ? "Carregando a previsão…" : `A previsão aparece duas semanas antes. Normalmente: ${place.winter || "confira mais perto da data."}`}</p>
      )}
    </section>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
