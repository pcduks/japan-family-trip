"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  KIND_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  deadlineReminders,
  newId,
  planLegs,
  railReminders,
  staysNeedingLodging,
  todayInJapan,
  upcoming,
  type Booking,
  type BookingKind,
  type BookingStatus,
  type Reminder,
} from "@/lib/plan";
import { deleteRow, insertRow, updateRow, useTable } from "@/lib/tables";
import { addDays, formatDay, placeMap } from "@/lib/trip";
import { NoPlanYet, PlanPicker } from "./PlanTabs";
import { useStore } from "./providers";
import { PageHeader, Pill } from "./ui";
import { pickPlan, usePlans } from "./usePlans";

/** Bookings added in this session open their details straight away. */
const fresh = new Set<string>();

const STATUS_TONE: Record<BookingStatus, "muted" | "warn" | "ok"> = { idea: "muted", held: "warn", booked: "ok", paid: "ok" };

/** P2.5: bookings per stay, deadline dashboard (F9) and shinkansen reminders. */
export function BookingsView() {
  const { trip, me } = useStore();
  const state = usePlans();
  const sp = useSearchParams();
  const plan = pickPlan(state, sp.get("plan"));
  const { rows: allBookings } = useTable("bookings");
  const P = useMemo(() => placeMap(trip), [trip]);
  const planner = me?.role === "planner";
  const today = todayInJapan();

  if (!state.loaded) return <p className="text-muted">Carregando…</p>;
  if (!plan) return <NoPlanYet />;

  const route = state.routeFor(plan);
  const bookings = allBookings.filter((b) => b.plan_id === plan.id);
  const reminders = [...railReminders(plan, bookings, P), ...deadlineReminders(bookings)];
  const soon = upcoming(reminders, today, 7);
  const later = upcoming(reminders, today, 60).filter((r) => !soon.includes(r));
  const needLodging = new Set(staysNeedingLodging(plan, bookings));
  const legs = new Map(planLegs(plan).map((l) => [l.stayId, l]));
  const held = plan.stays.length - needLodging.size;

  return (
    <main className="grid gap-5">
      <PageHeader title="Reservas">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Cada base, cada trem e cada prazo.</span>
          <PlanPicker plans={state.plans} current={plan} />
        </div>
      </PageHeader>

      <section className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Resumo">
        <Stat label="Bases garantidas" value={`${held}/${plan.stays.length}`} good={held === plan.stays.length} />
        <Stat label="Vencem em 7 dias" value={String(soon.length)} good={soon.length === 0} />
        <Stat
          label="Trens reservados"
          value={`${reminders.filter((r) => r.kind === "rail" && r.done).length}/${reminders.filter((r) => r.kind === "rail").length}`}
          good={reminders.filter((r) => r.kind === "rail").every((r) => r.done)}
        />
      </section>

      <section className="card grid gap-3 p-4" aria-labelledby="due-h">
        <h2 id="due-h" className="text-[1.75rem] leading-tight">
          Próximos prazos
        </h2>
        {soon.length ? <ReminderList items={soon} today={today} /> : <p className="text-sm text-pine">Nada vence nos próximos 7 dias.</p>}
        {later.length ? (
          <details>
            <summary className="cursor-pointer text-sm font-medium">Próximos 60 dias ({later.length})</summary>
            <div className="mt-2">
              <ReminderList items={later} today={today} />
            </div>
          </details>
        ) : null}
      </section>

      <ol className="grid gap-4">
        {route.stays.map((s, i) => {
          const place = P.get(s.place);
          const mine = bookings.filter((b) => b.stay_id === s.id);
          const leg = legs.get(s.id);
          return (
            <li key={s.id} className="grid gap-2 border-t border-dashed border-rule pt-4">
              <div className="flex items-start gap-3">
                <span className="font-display text-[1.75rem] leading-none text-muted tabular-nums">{i + 1}</span>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <h2 className="text-[1.75rem] leading-none">{place?.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="eyebrow">
                      {formatDay(s.startDate)} – {formatDay(addDays(s.startDate, s.nights))} · {s.nights} noite{s.nights > 1 ? "s" : ""}
                    </p>
                    {needLodging.has(s.id) ? <Pill tone="accent">sem hospedagem</Pill> : <Pill tone="ok">hospedagem ok</Pill>}
                  </div>
                </div>
              </div>
              {leg ? (
                <p className="text-sm text-muted">
                  Chegada em {formatDay(leg.date)}: {leg.note ?? (leg.mode ? MODE_PT[leg.mode] : "detalhes a acrescentar")}
                </p>
              ) : null}
              <ul className="grid gap-2">
                {mine.map((b) => (
                  <li key={b.id}>
                    <BookingCard booking={b} canEdit={planner} />
                  </li>
                ))}
              </ul>
              {planner ? (
                <div className="flex flex-wrap gap-2">
                  <NewBooking planId={plan.id} stayId={s.id} kind="lodging" label="+ Hospedagem" defaultName={`Hospedagem em ${place?.name}`} />
                  {i > 0 ? (
                    <NewBooking
                      planId={plan.id}
                      stayId={s.id}
                      kind="transport"
                      label="+ Passagem"
                      defaultName={`${P.get(route.stays[i - 1].place)?.name} → ${place?.name}`}
                      defaultDate={s.startDate}
                    />
                  ) : null}
                  <NewBooking planId={plan.id} stayId={s.id} kind="activity" label="+ Passeio" defaultName="" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {bookings.some((b) => !b.stay_id || !plan.stays.some((s) => s.id === b.stay_id)) ? (
        <section className="grid gap-2">
          <h2 className="text-[1.75rem]">Outras reservas</h2>
          <ul className="grid gap-2">
            {bookings
              .filter((b) => !b.stay_id || !plan.stays.some((s) => s.id === b.stay_id))
              .map((b) => (
                <li key={b.id}>
                  <BookingCard booking={b} canEdit={planner} />
                </li>
              ))}
          </ul>
        </section>
      ) : null}
      {planner ? <NewBooking planId={plan.id} stayId={null} kind="other" label="+ Outra reserva (voos, seguro…)" defaultName="" /> : null}
    </main>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="card grid content-start gap-0.5 p-3">
      <span className={`font-display text-[1.9rem] leading-none tabular-nums ${good ? "text-pine" : "text-ink"}`}>{value}</span>
      <span className="text-xs leading-tight text-muted">{label}</span>
    </div>
  );
}

function ReminderList({ items, today }: { items: Reminder[]; today: string }) {
  return (
    <ul className="grid gap-2">
      {items.map((r, i) => {
        const overdue = r.date < today;
        return (
          <li key={i} className="grid grid-cols-[4.2rem_1fr] gap-3 text-sm">
            <span className={`font-mono ${overdue ? "font-bold text-danger" : r.date === today ? "font-bold text-vermilion" : ""}`}>
              {overdue ? "atrasado" : r.date === today ? "hoje" : formatDay(r.date)}
            </span>
            <span className="min-w-0">
              <span className="font-bold">{r.title}</span>
              <span className="block text-muted">{r.detail}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function NewBooking({
  planId,
  stayId,
  kind,
  label,
  defaultName,
  defaultDate,
}: {
  planId: string;
  stayId: string | null;
  kind: BookingKind;
  label: string;
  defaultName: string;
  defaultDate?: string;
}) {
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={() => {
        const id = newId();
        fresh.add(id);
        void insertRow("bookings", {
          id,
          plan_id: planId,
          stay_id: stayId,
          kind,
          name: defaultName || (kind === "activity" ? "Novo passeio" : "Nova reserva"),
          url: null,
          price_jpy: null,
          people: 6,
          date: defaultDate ?? null,
          cancel_by: null,
          status: "idea",
          confirmation: null,
          address: null,
          address_ja: null,
          phone: null,
          notes: null,
          created_at: new Date().toISOString(),
        });
      }}
    >
      {label}
    </button>
  );
}

const MODE_PT: Record<string, string> = { train: "trem", bus: "ônibus", drive: "carro", ferry: "balsa", flight: "avião" };

function BookingCard({ booking: b, canEdit }: { booking: Booking; canEdit: boolean }) {
  const [open, setOpen] = useState(fresh.has(b.id) && canEdit);
  const set = (patch: Partial<Booking>) => updateRow("bookings", b.id, patch);
  return (
    <div className="card grid gap-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tag">{KIND_LABEL[b.kind]}</span>
        <span className="min-w-0 flex-1 truncate font-bold">{b.name}</span>
        {canEdit ? (
          <select
            aria-label="Situação"
            className="input !min-h-9 !w-auto !py-1 text-sm"
            style={{ color: { idea: "var(--muted)", held: "var(--amber)", booked: "var(--pine)", paid: "var(--pine)" }[b.status] }}
            value={b.status}
            onChange={(e) => set({ status: e.target.value as BookingStatus })}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        ) : (
          <Pill tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Pill>
        )}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {b.price_jpy ? (
          <span>
            ¥{b.price_jpy.toLocaleString("pt-BR")} · ¥{Math.round(b.price_jpy / Math.max(1, b.people)).toLocaleString("pt-BR")} por pessoa
          </span>
        ) : null}
        {b.date ? <span>{formatDay(b.date)}</span> : null}
        {b.cancel_by ? <span>Cancelamento grátis até {formatDay(b.cancel_by)}</span> : null}
        {b.confirmation ? <span>Código {b.confirmation}</span> : null}
        {b.url ? (
          <a href={b.url} target="_blank" rel="noreferrer" className="underline">
            Link
          </a>
        ) : null}
      </p>
      {b.address_ja ? <p className="text-sm" lang="ja">{b.address_ja}</p> : null}
      {canEdit ? (
        <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer text-sm">Detalhes</summary>
          <BookingForm booking={b} onSave={set} />
        </details>
      ) : b.notes ? (
        <p className="text-sm">{b.notes}</p>
      ) : null}
    </div>
  );
}

function BookingForm({ booking: b, onSave }: { booking: Booking; onSave: (p: Partial<Booking>) => void }) {
  const [v, setV] = useState(b);
  const field = (k: keyof Booking, label: string, type = "text", extra: Record<string, unknown> = {}) => (
    <label className="grid gap-1 text-xs text-muted">
      {label}
      <input
        type={type}
        className="input"
        value={(v[k] as string | number | null) ?? ""}
        onChange={(e) =>
          setV({ ...v, [k]: type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value || null })
        }
        {...extra}
      />
    </label>
  );
  return (
    <form
      className="mt-3 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...v, name: v.name?.trim() || b.name });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", "Nome")}
        <label className="grid gap-1 text-xs text-muted">
          Tipo
          <select className="input" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as BookingKind })}>
            {(Object.keys(KIND_LABEL) as BookingKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        {field("price_jpy", "Preço total (¥)", "number", { min: 0, step: 100, inputMode: "numeric" })}
        {field("people", "Dividido entre (pessoas)", "number", { min: 1, max: 12 })}
        {field("date", "Data", "date")}
        {field("cancel_by", "Cancelamento grátis até", "date")}
        {field("confirmation", "Código de confirmação")}
        {field("url", "Link", "url")}
        {b.kind === "lodging" || v.kind === "lodging" ? (
          <>
            {field("address", "Endereço (em inglês)")}
            {field("address_ja", "Endereço em japonês (para o táxi)", "text", { lang: "ja" })}
            {field("phone", "Telefone", "tel")}
          </>
        ) : null}
      </div>
      <label className="grid gap-1 text-xs text-muted">
        Notas
        <textarea className="input min-h-16" value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value || null })} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm">Salvar</button>
        <button
          type="button"
          className="btn btn-sm ml-auto"
          onClick={() => confirm(`Apagar “${b.name}”?`) && deleteRow("bookings", b.id)}
        >
          Apagar
        </button>
      </div>
    </form>
  );
}
