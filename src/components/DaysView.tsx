"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { boardStopForPlace, guideFor, type GuideSlot } from "@/lib/guides";
import { directionsUrl, mapsSearchUrl } from "@/lib/links";
import { planDays, planWarnings, todayInJapan, type Activity, type PlanDay } from "@/lib/plan";
import { deleteRow, insertRow, updateRow, useTable } from "@/lib/tables";
import { placeStamp, stampLabel } from "@/lib/stamps";
import { formatDay, formatHours, formatLong, inClosureZone, isPeak, parseLegHours, placeMap, stampDate, weekday } from "@/lib/trip";
import type { Place, Traveller } from "@/lib/types";
import { EkiStamp } from "./EkiStamp";
import { PlaceSheet } from "./PlaceSheet";
import { NoPlanYet, PlanPicker } from "./PlanTabs";
import { useStore } from "./providers";
import { PageHeader, Pill } from "./ui";
import { pickPlan, usePlans } from "./usePlans";

/** Split-group labels for guide slots (stored as text on the activity). */
const WHO_PT: Record<GuideSlot["who"], string> = { all: "Todos", early: "Turma da madrugada", bump: "Opção tranquila" };

/** P2.4: each day as a list of timed activities with a "who's going" split. */
export function DaysView() {
  const { trip, me } = useStore();
  const state = usePlans();
  const sp = useSearchParams();
  const router = useRouter();
  const plan = pickPlan(state, sp.get("plan"));
  const { rows: allActivities } = useTable("activities");
  const P = useMemo(() => placeMap(trip), [trip]);
  const [sheet, setSheet] = useState<string | null>(null);

  const days = useMemo(() => (plan ? planDays(plan) : []), [plan]);
  const today = todayInJapan();
  const requested = sp.get("d");
  const date = days.some((d) => d.date === requested) ? requested! : days.some((d) => d.date === today) ? today : days[0]?.date;

  if (!state.loaded) return <p className="text-muted">Carregando…</p>;
  if (!plan) return <NoPlanYet />;

  const activities = allActivities.filter((a) => a.plan_id === plan.id);
  const warnings = planWarnings(plan, P, activities);
  const day = days.find((d) => d.date === date)!;
  const setDate = (d: string) => router.replace(`/plan/days?plan=${plan.id}&d=${d}`, { scroll: false });

  return (
    <main className="grid gap-5">
      <PageHeader title="Dia a dia">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Vinte e um dias, um de cada vez.</span>
          <PlanPicker plans={state.plans} current={plan} />
        </div>
      </PageHeader>

      <ol className="no-scrollbar -mx-5 flex snap-x scroll-px-5 gap-1.5 overflow-x-auto px-5 pb-1" aria-label="Escolha um dia">
        {days.map((d) => {
          const n = activities.filter((a) => a.date === d.date).length;
          const place = d.stay ? P.get(d.stay.place) : null;
          const sel = d.date === date;
          return (
            <li key={d.date} className="snap-start">
              <button
                type="button"
                aria-current={sel ? "date" : undefined}
                onClick={() => setDate(d.date)}
                className={`grid w-[4.6rem] gap-0.5 rounded-xl border p-1.5 text-left ${sel ? "border-ink bg-ink text-paper" : "border-rule"}`}
                style={sel ? undefined : { background: inClosureZone(d.date) ? "var(--closure)" : "var(--card)" }}
              >
                <span className={`flex justify-between text-[0.7rem] uppercase ${sel ? "" : "text-muted"}`}>
                  {weekday(d.date).slice(0, 3)}
                  {d.date === today ? <span className="text-vermilion">hoje</span> : isPeak(d.date) ? <span className="text-vermilion" title="Dia de pico">▲</span> : null}
                </span>
                <span className="font-display text-[1.15rem] leading-tight">{formatDay(d.date)}</span>
                <span className={`truncate text-[0.7rem] ${sel ? "opacity-80" : "text-muted"}`}>
                  {d.arriving ? "→ " : ""}
                  {place ? stampLabel(place.name) : "✈ Casa"}
                </span>
                <span className="text-[0.7rem] font-medium">{n ? `${n} no plano` : " "}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {day ? (
        <DayPanel
          key={day.date}
          day={day}
          planId={plan.id}
          places={P}
          activities={activities.filter((a) => a.date === day.date)}
          closureIds={new Set(warnings.filter((w) => w.code === "closure").map((w) => w.activityId!))}
          travellers={trip.travellers}
          canEdit={!!me}
          onOpen={setSheet}
        />
      ) : null}

      <PlaceSheet place={sheet ? P.get(sheet) ?? null : null} route={state.routeFor(plan)} onClose={() => setSheet(null)} />
    </main>
  );
}

function DayPanel({
  day,
  planId,
  places,
  activities,
  closureIds,
  travellers,
  canEdit,
  onOpen,
}: {
  day: PlanDay;
  planId: string;
  places: Map<string, Place>;
  activities: Activity[];
  closureIds: Set<string>;
  travellers: Traveller[];
  canEdit: boolean;
  onOpen: (slug: string) => void;
}) {
  const place = day.stay ? places.get(day.stay.place) : null;
  const from = day.leaving ? places.get(day.leaving.place) : null;
  const guide = guideFor(day.stay?.place);
  const board = place ? boardStopForPlace(place.slug, place.name) : null;
  const sorted = [...activities].sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99") || a.sort - b.sort);
  const names = new Map(travellers.map((t) => [t.id, t.name]));
  const [editing, setEditing] = useState<string | null>(null);

  async function importGuide(i: number) {
    const g = guide!.days[i];
    if (activities.length && !confirm(`Adicionar ${g.slots.length} atividades de “${g.title}” a este dia?`)) return;
    let sort = activities.length;
    for (const s of g.slots)
      await insertRow("activities", {
        plan_id: planId,
        date: day.date,
        time: /^\d{1,2}:\d{2}$/.test(s.time) ? s.time.padStart(5, "0") : null,
        title: s.title,
        place_slug: null,
        query: s.query ? `${s.query}, ${guide!.mapSuffix}` : null,
        note: [s.text, s.alt].filter(Boolean).join(" ") || null,
        split_group: s.who === "all" ? null : WHO_PT[s.who],
        who: [],
        sort: sort++,
      });
  }

  return (
    <section className="grid gap-4" aria-labelledby="day-h">
      <div className="card grid gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="grid min-w-0 flex-1 gap-1">
            <p className="eyebrow">{formatLong(day.date)}</p>
            <h2 id="day-h" className="text-[1.9rem] leading-tight">
              {day.departure ? "Voo para casa" : day.arriving ? `${from?.name} → ${place?.name}` : place?.name}
            </h2>
            {day.arriving || inClosureZone(day.date) || isPeak(day.date) ? (
              <div className="flex flex-wrap gap-1.5">
                {day.arriving ? <Pill>dia de viagem</Pill> : null}
                {isPeak(day.date) ? <Pill tone="accent">dia de pico</Pill> : null}
                {inClosureZone(day.date) ? <Pill tone="warn">fechamentos de Ano-Novo</Pill> : null}
              </div>
            ) : null}
          </div>
          {place && !day.departure ? <DayStamp slug={place.slug} kind={place.kind} name={place.name} date={day.date} /> : null}
        </div>
        {day.arriving ? (
          <p className="text-sm">
            {day.arriving.legNote ?? "Acrescente os detalhes da viagem no editor do plano."}
            {parseLegHours(day.arriving.legNote) ? <span className="text-muted"> · cerca de {formatHours(parseLegHours(day.arriving.legNote)!)}</span> : null}{" "}
            {from && place ? (
              <a href={directionsUrl(from, place)} target="_blank" rel="noreferrer" className="underline">
                Como chegar
              </a>
            ) : null}
          </p>
        ) : null}
        {day.stay?.daytrips.length ? (
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <span className="text-xs text-muted">Bate-voltas daqui:</span>
            {day.stay.daytrips.map((d) => (
              <button key={d} type="button" className="chip !min-h-8 text-sm" onClick={() => onOpen(d)}>
                {places.get(d)?.name}
              </button>
            ))}
          </div>
        ) : null}
        {board ? (
          <details className="text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">Ideias para {place?.name} <span aria-hidden="true" className="text-muted">⌄</span></summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {board.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            {board.eat ? <p className="mt-2"><b>Comer:</b> {board.eat}</p> : null}
            {board.bump ? <p className="mt-1"><b>Para ela:</b> {board.bump}</p> : null}
          </details>
        ) : null}
      </div>

      <ol className="grid gap-2" aria-label="Atividades">
        {sorted.map((a) =>
          editing === a.id ? (
            <li key={a.id}>
              <ActivityForm
                initial={a}
                places={places}
                travellers={travellers}
                onCancel={() => setEditing(null)}
                onSave={async (v) => {
                  await updateRow("activities", a.id, v);
                  setEditing(null);
                }}
              />
            </li>
          ) : (
            <li key={a.id} className="card grid grid-cols-[3.5rem_1fr] gap-3 p-3">
              <span className="pt-0.5 font-mono text-sm tabular-nums">{a.time ?? "—"}</span>
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-bold">{a.title}</span>
                  {a.split_group ? <Pill tone="accent">{a.split_group}</Pill> : null}
                </div>
                {a.who.length ? <p className="text-xs text-muted">Quem vai: {a.who.map((id) => names.get(id) ?? "?").join(", ")}</p> : null}
                {a.note ? <p className="text-sm">{a.note}</p> : null}
                {closureIds.has(a.id) ? <p className="text-xs text-vermilion">▲ Costuma fechar de 1 a 3 de janeiro. Confira os dias de funcionamento.</p> : null}
                <div className="flex flex-wrap gap-3 text-xs">
                  {a.place_slug && places.get(a.place_slug) ? (
                    <button type="button" className="underline" onClick={() => onOpen(a.place_slug!)}>
                      {places.get(a.place_slug)!.name}
                    </button>
                  ) : null}
                  {a.query ? (
                    <a className="underline" href={mapsSearchUrl({ query: a.query.replace(/, Japan$/, ""), googlePlaceId: null })} target="_blank" rel="noreferrer">
                      Mapa
                    </a>
                  ) : null}
                  {canEdit ? (
                    <>
                      <button type="button" className="underline" onClick={() => setEditing(a.id)}>
                        Editar
                      </button>
                      <button type="button" className="underline" onClick={() => deleteRow("activities", a.id)}>
                        Apagar
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ),
        )}
        {!sorted.length && !(canEdit && guide && !day.departure) ? <li className="hand text-lg text-muted">Nada planejado ainda.</li> : null}
      </ol>

      {canEdit && !day.departure ? (
        <div className="grid gap-3">
          {guide ? (
            <div className="card grid gap-2 p-3">
              <h3 className="text-[1.35rem]">{sorted.length ? "Mais ideias" : "Nada planejado"}: usar um dia do guia de {guide.mapSuffix}</h3>
              <div className="flex flex-wrap gap-2">
                {guide.days.map((g, i) => (
                  <button key={g.title} type="button" className="card-flat grid w-full p-3 text-left text-sm hover:border-ink-2" onClick={() => importGuide(i)}>
                    <span>
                      <span className="block font-mono text-[0.65rem] text-muted uppercase">{g.label}</span>
                      {g.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <details className="card p-3">
            <summary className="cursor-pointer list-none font-medium [&::-webkit-details-marker]:hidden">+ Adicionar uma atividade</summary>
            <div className="mt-3">
              <ActivityForm
                places={places}
                travellers={travellers}
                onSave={(v) =>
                  insertRow("activities", { plan_id: planId, date: day.date, sort: activities.length, query: null, ...v } as Omit<Activity, "id">)
                }
              />
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}

/** The base's station stamp, dated. */
function DayStamp({ slug, kind, name, date }: { slug: string; kind: string; name: string; date: string }) {
  const st = placeStamp(slug, kind);
  return <EkiStamp motif={st.motif} ink={st.ink} top={stampLabel(name)} bottom={stampDate(date)} size={76} rotate={-6} seed={date.charCodeAt(9)} label="" />;
}

type ActivityDraft = Pick<Activity, "time" | "title" | "place_slug" | "note" | "split_group" | "who">;

function ActivityForm({
  initial,
  places,
  travellers,
  onSave,
  onCancel,
}: {
  initial?: Activity;
  places: Map<string, Place>;
  travellers: Traveller[];
  onSave: (v: ActivityDraft) => unknown;
  onCancel?: () => void;
}) {
  const blank: ActivityDraft = { time: null, title: "", place_slug: null, note: null, split_group: null, who: [] };
  const [v, setV] = useState<ActivityDraft>(initial ? { ...blank, ...initial } : blank);
  const all = [...places.values()].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <form
      className="card grid gap-3 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!v.title.trim()) return;
        await onSave({ ...v, title: v.title.trim() });
        if (!initial) setV(blank);
      }}
    >
      <div className="grid grid-cols-[6.5rem_1fr] gap-2">
        <label className="grid gap-1 text-xs text-muted">
          Hora
          <input type="time" className="input" value={v.time ?? ""} onChange={(e) => setV({ ...v, time: e.target.value || null })} />
        </label>
        <label className="grid gap-1 text-xs text-muted">
          O quê
          <input className="input" required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Almoço kaiseki" />
        </label>
      </div>
      <label className="grid gap-1 text-xs text-muted">
        Lugar (opcional)
        <select className="input" value={v.place_slug ?? ""} onChange={(e) => setV({ ...v, place_slug: e.target.value || null })}>
          <option value="">—</option>
          {all.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
              {p.kind === "food" ? " (comida)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-muted">
        Notas
        <textarea className="input min-h-16" value={v.note ?? ""} onChange={(e) => setV({ ...v, note: e.target.value || null })} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-xs text-muted">Quem vai (deixe vazio para todos)</legend>
        <div className="flex flex-wrap gap-1.5">
          {travellers.map((t) => {
            const on = v.who.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className="chip !min-h-8 text-sm"
                aria-pressed={on}
                onClick={() => setV({ ...v, who: on ? v.who.filter((x) => x !== t.id) : [...v.who, t.id] })}
              >
                {t.name}
              </button>
            );
          })}
        </div>
        <input
          className="input"
          placeholder="Nome do grupo, ex.: Turma da madrugada"
          value={v.split_group ?? ""}
          onChange={(e) => setV({ ...v, split_group: e.target.value || null })}
          aria-label="Nome do grupo"
        />
      </fieldset>
      <div className="flex gap-2">
        <button className="btn btn-primary">{initial ? "Salvar" : "Adicionar"}</button>
        {onCancel ? (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
