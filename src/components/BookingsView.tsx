"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
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
import { pickPlan, usePlans } from "./usePlans";

/** Bookings added in this session open their details straight away. */
const fresh = new Set<string>();

const STATUS_STYLE: Record<BookingStatus, string> = {
  idea: "text-muted",
  held: "text-accent",
  booked: "text-ok",
  paid: "text-ok font-bold",
};

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

  if (!state.loaded) return <p className="text-muted">Loading…</p>;
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-extrabold">Bookings</h1>
        <PlanPicker plans={state.plans} current={plan} />
      </div>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Summary">
        <Stat label="Stays held or better" value={`${held} / ${plan.stays.length}`} good={held === plan.stays.length} />
        <Stat label="Due in the next 7 days" value={String(soon.length)} good={soon.length === 0} />
        <Stat
          label="Rail legs booked"
          value={`${reminders.filter((r) => r.kind === "rail" && r.done).length} / ${reminders.filter((r) => r.kind === "rail").length}`}
          good={reminders.filter((r) => r.kind === "rail").every((r) => r.done)}
        />
      </section>

      <section className="card grid gap-3 p-4" aria-labelledby="due-h">
        <h2 id="due-h" className="text-lg font-extrabold">
          Coming up
        </h2>
        {soon.length ? <ReminderList items={soon} today={today} /> : <p className="text-sm text-ok">Nothing due in the next 7 days.</p>}
        {later.length ? (
          <details>
            <summary className="cursor-pointer text-sm font-medium">Next 60 days ({later.length})</summary>
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
            <li key={s.id} className="grid gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-extrabold">
                  {i + 1}. {place?.name}
                </h2>
                <span className="font-mono text-xs text-muted">
                  {formatDay(s.startDate)} – {formatDay(addDays(s.startDate, s.nights))} · {s.nights} night{s.nights > 1 ? "s" : ""}
                  {needLodging.has(s.id) ? <span className="ml-2 text-accent">needs lodging</span> : null}
                </span>
              </div>
              {leg ? (
                <p className="text-sm text-muted">
                  Getting there {formatDay(leg.date)}: {leg.note ?? leg.mode ?? "details to add"}
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
                  <NewBooking planId={plan.id} stayId={s.id} kind="lodging" label="+ Lodging" defaultName={`${place?.name} stay`} />
                  {i > 0 ? (
                    <NewBooking
                      planId={plan.id}
                      stayId={s.id}
                      kind="transport"
                      label="+ Travel ticket"
                      defaultName={`${P.get(route.stays[i - 1].place)?.name} → ${place?.name}`}
                      defaultDate={s.startDate}
                    />
                  ) : null}
                  <NewBooking planId={plan.id} stayId={s.id} kind="activity" label="+ Activity" defaultName="" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {bookings.some((b) => !b.stay_id || !plan.stays.some((s) => s.id === b.stay_id)) ? (
        <section className="grid gap-2">
          <h2 className="text-lg font-extrabold">Other bookings</h2>
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
      {planner ? <NewBooking planId={plan.id} stayId={null} kind="other" label="+ Other booking (flights, insurance…)" defaultName="" /> : null}
    </main>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="card grid gap-0.5 p-3">
      <span className="text-xs text-muted">{label}</span>
      <span className={`font-display text-2xl font-extrabold ${good ? "text-ok" : ""}`}>{value}</span>
    </div>
  );
}

function ReminderList({ items, today }: { items: Reminder[]; today: string }) {
  return (
    <ul className="grid gap-2">
      {items.map((r, i) => {
        const overdue = r.date < today;
        return (
          <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-3 text-sm">
            <span className={`font-mono ${overdue ? "font-bold text-danger" : r.date === today ? "font-bold text-accent" : ""}`}>
              {overdue ? "overdue" : r.date === today ? "today" : formatDay(r.date)}
            </span>
            <span>
              <span className="font-bold">
                {r.kind === "rail" ? "🚄 " : "⏰ "}
                {r.title}
              </span>
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
          name: defaultName || (kind === "activity" ? "New activity" : "New booking"),
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

const KIND_LABEL: Record<BookingKind, string> = { lodging: "Lodging", transport: "Travel", activity: "Activity", other: "Other" };

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
            aria-label="Status"
            className={`input !min-h-9 !w-auto !py-1 text-sm ${STATUS_STYLE[b.status]}`}
            value={b.status}
            onChange={(e) => set({ status: e.target.value as BookingStatus })}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <span className={`text-sm ${STATUS_STYLE[b.status]}`}>{b.status}</span>
        )}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {b.price_jpy ? (
          <span>
            ¥{b.price_jpy.toLocaleString("en-US")} · ¥{Math.round(b.price_jpy / Math.max(1, b.people)).toLocaleString("en-US")} each
          </span>
        ) : null}
        {b.date ? <span>{formatDay(b.date)}</span> : null}
        {b.cancel_by ? <span>Free cancellation until {formatDay(b.cancel_by)}</span> : null}
        {b.confirmation ? <span>Ref {b.confirmation}</span> : null}
        {b.url ? (
          <a href={b.url} target="_blank" rel="noreferrer" className="underline">
            Link
          </a>
        ) : null}
      </p>
      {b.address_ja ? <p className="text-sm" lang="ja">{b.address_ja}</p> : null}
      {canEdit ? (
        <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer text-sm">Details</summary>
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
        {field("name", "Name")}
        <label className="grid gap-1 text-xs text-muted">
          Kind
          <select className="input" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as BookingKind })}>
            {(Object.keys(KIND_LABEL) as BookingKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        {field("price_jpy", "Total price (¥)", "number", { min: 0, step: 100, inputMode: "numeric" })}
        {field("people", "Split between (people)", "number", { min: 1, max: 12 })}
        {field("date", "Date", "date")}
        {field("cancel_by", "Free cancellation until", "date")}
        {field("confirmation", "Confirmation number")}
        {field("url", "Link", "url")}
        {b.kind === "lodging" || v.kind === "lodging" ? (
          <>
            {field("address", "Address (English)")}
            {field("address_ja", "Address in Japanese (for taxis)", "text", { lang: "ja" })}
            {field("phone", "Phone", "tel")}
          </>
        ) : null}
      </div>
      <label className="grid gap-1 text-xs text-muted">
        Notes
        <textarea className="input min-h-16" value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value || null })} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary btn-sm">Save</button>
        <button
          type="button"
          className="btn btn-sm ml-auto"
          onClick={() => confirm(`Delete “${b.name}”?`) && deleteRow("bookings", b.id)}
        >
          Delete
        </button>
      </div>
    </form>
  );
}
