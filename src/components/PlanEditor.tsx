"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { onRouteColor } from "@/lib/colors";
import { directionsUrl } from "@/lib/links";
import { routeLine, routeMarkers } from "@/lib/mapModel";
import { newId, planNights, planWarnings, type LegMode, type Plan, type PlanStay, type Warning } from "@/lib/plan";
import { choosePlan, updateRow, useTable } from "@/lib/tables";
import { TRIP_NIGHTS, addDays, formatDay, placeMap } from "@/lib/trip";
import type { Place } from "@/lib/types";
import { PlaceSheet } from "./PlaceSheet";
import { useStore } from "./providers";
import { RouteMap } from "./RouteMap";
import { usePlans } from "./usePlans";

const MODES: { v: LegMode; label: string }[] = [
  { v: "train", label: "Train" },
  { v: "bus", label: "Bus" },
  { v: "drive", label: "Drive" },
  { v: "ferry", label: "Ferry" },
  { v: "flight", label: "Flight" },
];

/** P2.1 route builder with the P2.2 warnings engine running on every edit (F8). */
export function PlanEditor({ id }: { id: string }) {
  const { trip, me, resolvedTheme } = useStore();
  const { plans, loaded, routeFor } = usePlans();
  const { rows: activities } = useTable("activities");
  const P = useMemo(() => placeMap(trip), [trip]);
  const [sheet, setSheet] = useState<string | null>(null);
  const plan = plans.find((p) => p.id === id);
  const planner = me?.role === "planner";

  if (!plan)
    return (
      <main className="py-10 text-center text-muted">
        {loaded ? (
          <>
            This plan doesn&apos;t exist any more. <Link href="/plan">Back to plans</Link>
          </>
        ) : (
          "Loading…"
        )}
      </main>
    );

  const route = routeFor(plan);
  const warnings = planWarnings(plan, P, activities.filter((a) => a.plan_id === plan.id));
  const nights = planNights(plan);
  const save = (patch: Partial<Plan>) => updateRow("plans", plan.id, patch);
  const setStays = (stays: PlanStay[]) => save({ stays });
  const patchStay = (i: number, patch: Partial<PlanStay>) => setStays(plan.stays.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= plan.stays.length) return;
    const next = [...plan.stays];
    [next[i], next[j]] = [next[j], next[i]];
    setStays(next);
  };
  const addStay = (slug: string, nightsFor = 2) =>
    setStays([...plan.stays, { id: newId(), place: slug, nights: nightsFor, legNote: null, legHours: null, legMode: "train", daytrips: [], via: [] }]);

  const tripPlaces = trip.places.filter((p) => p.kind !== "food").sort((a, b) => a.name.localeCompare(b.name));
  const bases = tripPlaces.filter((p) => p.kind !== "daytrip");
  const color = plan.color;
  const byStay = (sid: string) => warnings.filter((w) => w.stayId === sid);

  return (
    <main className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 gap-2">
          <Link href="/plan" className="text-sm">
            ← All plans
          </Link>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Plan colour"
              value={plan.color}
              disabled={!planner}
              onChange={(e) => save({ color: e.target.value })}
              className="size-10 shrink-0 cursor-pointer rounded border border-line bg-card"
            />
            <CommitInput
              ariaLabel="Plan name"
              value={plan.name}
              disabled={!planner}
              onCommit={(v) => v.trim() && save({ name: v.trim() })}
              className="input !text-xl font-extrabold"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`tag !text-sm ${nights === TRIP_NIGHTS ? "!text-ok" : "!text-danger"}`}>
            {nights} / {TRIP_NIGHTS} nights
          </span>
          {plan.is_chosen ? (
            <span className="tag !text-sm !text-ok">Chosen plan</span>
          ) : planner ? (
            <button className="btn btn-sm" disabled={warnings.some((w) => w.level === "error")} onClick={() => choosePlan(plan.id)}>
              Make this our plan
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="grid gap-4 lg:sticky lg:top-4">
          <RouteMap
            lines={[routeLine(route, P, color)]}
            markers={routeMarkers(route, P)}
            color={color}
            onColor={onRouteColor(resolvedTheme)}
            selected={sheet}
            onSelect={setSheet}
            theme={resolvedTheme}
            label={`Map of ${plan.name}`}
          />
          <Warnings warnings={warnings} />
        </div>

        <fieldset disabled={!planner} className="grid min-w-0 gap-3">
          <legend className="sr-only">Stays</legend>
          <ol className="grid gap-3">
            {plan.stays.map((s, i) => {
              const start = route.stays[i].startDate;
              const prev = i > 0 ? P.get(plan.stays[i - 1].place) : null;
              const here = P.get(s.place);
              const sw = byStay(s.id);
              const peak = sw.find((w) => w.code === "peak-move");
              return (
                <li key={s.id} className="card grid gap-3 p-3" style={{ borderLeft: `5px solid ${color}` }}>
                  {i > 0 ? (
                    <div className="grid gap-2 rounded-lg bg-soft p-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted">{formatDay(start)} · travel</span>
                        <select
                          aria-label="How you travel"
                          className="input !min-h-9 !w-auto !py-1"
                          value={s.legMode ?? ""}
                          onChange={(e) => patchStay(i, { legMode: (e.target.value || null) as LegMode | null })}
                        >
                          <option value="">Mode…</option>
                          {MODES.map((m) => (
                            <option key={m.v} value={m.v}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1">
                          <CommitInput
                            ariaLabel="Hours door to door"
                            type="number"
                            value={s.legHours?.toString() ?? ""}
                            placeholder="h"
                            className="input !min-h-9 !w-20 !py-1"
                            onCommit={(v) => patchStay(i, { legHours: v === "" ? null : Math.max(0, Number(v)) })}
                          />
                          <span className="text-muted">h</span>
                        </label>
                        {prev && here && (s.legMode === "drive" || s.legMode === "train") ? (
                          <AskGoogle from={prev.slug} to={here.slug} mode={s.legMode} date={start} onHours={(h) => patchStay(i, { legHours: h })} />
                        ) : null}
                        {prev && here ? (
                          <a
                            className="ml-auto text-xs underline"
                            href={directionsUrl(prev, here, s.legMode === "drive" ? "driving" : "transit")}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Google Maps directions
                          </a>
                        ) : null}
                      </div>
                      <CommitInput
                        ariaLabel="Travel notes"
                        value={s.legNote ?? ""}
                        placeholder="e.g. Hokuriku shinkansen + Thunderbird via Tsuruga, ~2 h 15"
                        className="input !min-h-9 !py-1"
                        onCommit={(v) => patchStay(i, { legNote: v.trim() || null })}
                      />
                      {peak && !s.overridePeak ? <p className="text-xs text-accent">▲ {peak.message}</p> : null}
                      {peak ? (
                        <label className="flex items-start gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 accent-[var(--accent)]"
                            checked={!!s.overridePeak}
                            onChange={(e) => patchStay(i, { overridePeak: e.target.checked })}
                          />
                          <span>Move on this peak day anyway (we&apos;ll book seats the moment they open)</span>
                        </label>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl font-extrabold tabular-nums">{i + 1}</span>
                    <select
                      aria-label="Place"
                      className="input !w-auto min-w-0 flex-1 font-bold"
                      value={s.place}
                      onChange={(e) => patchStay(i, { place: e.target.value })}
                    >
                      {bases.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                          {p.kind === "module" ? " (add-on)" : ""}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-sm" onClick={() => setSheet(s.place)}>
                      Info
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted">
                      {formatDay(start)} – {formatDay(addDays(start, s.nights))}
                    </span>
                    <div className="flex items-center gap-1" role="group" aria-label="Nights">
                      <button type="button" className="btn btn-sm !min-w-10" aria-label="One night fewer" disabled={s.nights <= 1} onClick={() => patchStay(i, { nights: s.nights - 1 })}>
                        −
                      </button>
                      <span className="w-20 text-center text-sm font-bold" aria-live="polite">
                        {s.nights} night{s.nights > 1 ? "s" : ""}
                      </span>
                      <button type="button" className="btn btn-sm !min-w-10" aria-label="One night more" onClick={() => patchStay(i, { nights: s.nights + 1 })}>
                        +
                      </button>
                    </div>
                  </div>

                  <PlaceChips
                    label="Day trips"
                    slugs={s.daytrips}
                    options={tripPlaces}
                    places={P}
                    onOpen={setSheet}
                    onChange={(daytrips) => patchStay(i, { daytrips })}
                  />
                  <PlaceChips
                    label="Stops on the way in"
                    slugs={s.via}
                    options={tripPlaces}
                    places={P}
                    onOpen={setSheet}
                    onChange={(via) => patchStay(i, { via })}
                  />

                  {sw.filter((w) => w.code !== "peak-move").length ? (
                    <ul className="grid gap-1 text-xs">
                      {sw
                        .filter((w) => w.code !== "peak-move")
                        .map((w, k) => (
                          <li key={k} className={w.level === "warn" ? "text-accent" : "text-muted"}>
                            {w.level === "warn" ? "▲ " : "ⓘ "}
                            {w.message}
                          </li>
                        ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap gap-1">
                    <button type="button" className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${here?.name} earlier`}>
                      ↑ Earlier
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === plan.stays.length - 1} aria-label={`Move ${here?.name} later`}>
                      ↓ Later
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm ml-auto"
                      onClick={() => setStays(plan.stays.filter((_, k) => k !== i))}
                      aria-label={`Remove ${here?.name}`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>

          <AddStay bases={bases} modules={trip.modules.map((m) => P.get(m)!).filter(Boolean)} onAdd={addStay} />
        </fieldset>
      </div>

      <PlaceSheet place={sheet ? P.get(sheet) ?? null : null} route={route} onClose={() => setSheet(null)} />
    </main>
  );
}

/** Fill the leg time from the Routes API (P2.3); falls back to curated time when Google has no route. */
function AskGoogle({ from, to, mode, date, onHours }: { from: string; to: string; mode: LegMode; date: string; onHours: (h: number) => void }) {
  const [state, setState] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-1 text-xs">
      <button
        type="button"
        className="underline"
        onClick={async () => {
          setState("…");
          const res = await fetch(`/api/legs?from=${from}&to=${to}&mode=${mode === "drive" ? "drive" : "transit"}&date=${date}`);
          const body = await res.json().catch(() => ({}));
          if (res.ok) {
            onHours(body.hours);
            setState(`${body.km} km`);
          } else setState(body.error ?? "No answer");
        }}
      >
        Ask Google
      </button>
      {state ? <span className="text-muted">{state}</span> : null}
    </span>
  );
}

function Warnings({ warnings }: { warnings: Warning[] }) {
  if (!warnings.length)
    return <p className="card p-3 text-sm text-ok">No warnings. Every move avoids the peak days and no travel day is over 4 hours.</p>;
  const counts = { error: 0, warn: 0, info: 0 };
  warnings.forEach((w) => counts[w.level]++);
  return (
    <section className="card grid gap-2 p-3" aria-labelledby="warn-h" aria-live="polite">
      <h2 id="warn-h" className="text-base font-extrabold">
        Checks{" "}
        <span className="text-sm font-normal text-muted">
          {counts.error ? `${counts.error} to fix · ` : ""}
          {counts.warn} warning{counts.warn === 1 ? "" : "s"} · {counts.info} note{counts.info === 1 ? "" : "s"}
        </span>
      </h2>
      <ul className="grid gap-1.5 text-sm">
        {warnings.map((w, i) => (
          <li key={i} className={`flex gap-2 ${w.level === "error" ? "font-bold text-danger" : w.level === "warn" ? "text-ink" : "text-muted"}`}>
            <span aria-hidden="true" className={w.level === "warn" ? "text-accent" : ""}>
              {w.level === "error" ? "✕" : w.level === "warn" ? "▲" : "ⓘ"}
            </span>
            <span>{w.message}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlaceChips({
  label,
  slugs,
  options,
  places,
  onChange,
  onOpen,
}: {
  label: string;
  slugs: string[];
  options: Place[];
  places: Map<string, Place>;
  onChange: (s: string[]) => void;
  onOpen: (slug: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <span className="text-xs text-muted">{label}:</span>
      {slugs.map((slug) => (
        <span key={slug} className="chip !min-h-8 !gap-1 !py-0 !pr-1 text-sm">
          <button type="button" onClick={() => onOpen(slug)} className="underline-offset-2 hover:underline">
            {places.get(slug)?.name ?? slug}
          </button>
          <button type="button" aria-label={`Remove ${places.get(slug)?.name}`} className="grid size-6 place-items-center rounded-full hover:bg-soft" onClick={() => onChange(slugs.filter((x) => x !== slug))}>
            ×
          </button>
        </span>
      ))}
      <select
        aria-label={`Add to ${label.toLowerCase()}`}
        className="input !min-h-8 !w-auto !py-0 text-sm"
        value=""
        onChange={(e) => e.target.value && onChange([...slugs, e.target.value])}
      >
        <option value="">+ Add</option>
        {options
          .filter((p) => !slugs.includes(p.slug))
          .map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
      </select>
    </div>
  );
}

function AddStay({ bases, modules, onAdd }: { bases: Place[]; modules: Place[]; onAdd: (slug: string, nights?: number) => void }) {
  const [slug, setSlug] = useState("");
  return (
    <div className="card grid gap-3 p-3">
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto min-w-0 flex-1" aria-label="Place to add" value={slug} onChange={(e) => setSlug(e.target.value)}>
          <option value="">Add a stay…</option>
          {bases.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          disabled={!slug}
          onClick={() => {
            onAdd(slug);
            setSlug("");
          }}
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted">Add-ons:</span>
        {modules.map((m) => (
          <button key={m.slug} type="button" className="chip !min-h-8 text-sm" onClick={() => onAdd(m.slug, 2)}>
            + {m.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Text input that saves on blur or Enter, so typing doesn't write on every key. */
export function CommitInput({
  value,
  onCommit,
  ariaLabel,
  className,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string;
  onCommit: (v: string) => void;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <input
      type={type}
      aria-label={ariaLabel}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      value={draft ?? value}
      step={type === "number" ? "0.25" : undefined}
      min={type === "number" ? 0 : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}
