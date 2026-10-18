"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { guideFor } from "@/lib/autoGuide";
import { budgetOf, fmtSgd } from "@/lib/budget";
import { addDays, fmtDay } from "@/lib/dates";
import { checkVersion } from "@/lib/rules";
import { STYLE_LABEL, styleOf } from "@/lib/styles";
import type { Snapshot, Stay, Version } from "@/lib/types";
import { combineRoutes, newId, relayout, statsOf, swapInRegion } from "@/lib/versions";
import { JourneyMap } from "./JourneyMap";
import { PictureScroll } from "./PictureScroll";
import { Planner } from "./Planner";
import { useStore } from "./providers";
import { TimelineLane } from "./Timeline";
import { Back, FindingList, Page, Section } from "./ui";

interface Base {
  key: string;
  stays: Stay[];
  parent: string | null;
  pace: Version["pace"];
  label: string;
  /** What changed to bring a place in, when the builder opened from "What would it take?". */
  how?: string;
}

/**
 * Build a route: start from any route (or a blank page), or join two routes
 * at a date, then change nights, add, drop and reorder stops. The map, the
 * days, the warnings and the cost follow every change; saving gives the
 * route its own page.
 */
export function BuildView() {
  // The builder starts from fresh ids and the time; render it in the browser only.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  return mounted ? <Builder /> : <Page wide>{null}</Page>;
}

function Builder() {
  const { snapshot, me, rules, saveVersion, isPlanner } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const nights = snapshot.trip.nights;
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const routes = useMemo(() => {
    const alternatives = snapshot.versions.filter((v) => v.status === "alternative");
    const family = snapshot.versions.filter((v) => v.status === "personal" && (v.shared !== false || v.owner === me?.travellerId));
    return [...(plan ? [plan] : []), ...alternatives, ...family];
  }, [snapshot.versions, plan, me?.travellerId]);
  const title = (v: Version) => (v.status === "plan" ? "The route" : v.status === "personal" ? v.name : guideFor(v, snapshot).theme);

  const startFrom = (v: Version): Base => ({ key: `${v.id}-${Date.now()}`, stays: v.stays.map((s) => ({ ...s, id: newId() })), parent: v.id, pace: v.pace, label: title(v) });
  const fromParam = params.get("from");
  const editing = routes.find((v) => v.id === fromParam && v.status === "personal" && v.owner === me?.travellerId) ?? null;
  const [base, setBase] = useState<Base>(() => {
    // "What would it take?" on the Japan page: our route with that place brought in.
    const add = plan ? snapshot.regions.find((r) => r.id === params.get("add")) : undefined;
    if (add && plan) {
      const { version, how } = swapInRegion(plan, add, snapshot.versions, me?.travellerId ?? "", snapshot.trip.start, snapshot.regions);
      return { ...startFrom(version), parent: plan.id, label: `our route, with ${add.name.split(",")[0]}`, how };
    }
    const v = routes.find((x) => x.id === fromParam) ?? plan;
    return v ? startFrom(v) : blank();
  });
  // From "What would it take?", go straight to the changed route.
  const adding = !!base.how;
  useEffect(() => {
    if (adding) document.getElementById("shape")?.scrollIntoView({ block: "start" });
  }, [adding]);
  const first = me?.name.split(" ")[0] ?? "My";
  const [name, setName] = useState(editing?.name ?? `${first}’s route`);
  const [draft, setDraft] = useState<Version>(() => toVersion(base));
  const [tab, setTab] = useState<"one" | "two">("one");
  const [saving, setSaving] = useState(false);

  // Join two
  const [aId, setAId] = useState(plan?.id ?? routes[0]?.id ?? "");
  const [bId, setBId] = useState(routes.find((v) => v.status === "alternative")?.id ?? routes[0]?.id ?? "");
  const [switchDate, setSwitchDate] = useState("2027-01-01");
  const A = routes.find((v) => v.id === aId);
  const B = routes.find((v) => v.id === bId);
  const joined = useMemo(() => (A && B ? combineRoutes(A, B, switchDate, snapshot.trip.start, nights) : []), [A, B, switchDate, snapshot.trip.start, nights]);
  const switchDates = Array.from({ length: nights - 1 }, (_, i) => addDays(snapshot.trip.start, i + 1));

  function blank(): Base {
    return { key: `blank-${Date.now()}`, stays: relayout([{ id: newId(), region: "tokyo", from: "", to: "", nights: nights - 2, lodging: "hotel", note: null }, { id: newId(), region: "tokyo", from: "", to: "", nights: 2, lodging: "hotel", note: "Before the flight" }], snapshot.trip.start), parent: null, pace: "balanced", label: "a blank page" };
  }
  function toVersion(b: Base): Version {
    return {
      id: editing?.id ?? newId(),
      name,
      pace: b.pace,
      status: "personal",
      owner: me?.travellerId ?? "planners",
      stays: relayout(b.stays, snapshot.trip.start),
      gains: null,
      gives_up: null,
      parent_version_id: b.parent,
      shared: true,
      created_at: editing?.created_at ?? new Date().toISOString(),
    };
  }
  const choose = (b: Base) => {
    setBase(b);
    setDraft(toVersion(b));
    requestAnimationFrame(() => document.getElementById("shape")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const baseVersion = useMemo(() => toVersion(base), [base]);
  const live: Version = { ...draft, name };
  const stats = statsOf(live, snapshot);
  const budget = budgetOf(live, snapshot.regions).perCoupleSgd;
  const planBudget = plan ? budgetOf(plan, snapshot.regions).perCoupleSgd : budget;
  const findings = checkVersion(live, rules);
  const total = live.stays.reduce((a, s) => a + s.nights, 0);
  const shown = routes;

  const save = async (asNew: boolean) => {
    if (!me) return;
    setSaving(true);
    const v: Version = { ...live, id: asNew || !editing ? newId() : editing.id, name: name.trim() || `${first}’s route`, owner: me.travellerId, status: "personal" };
    try {
      await saveVersion(v);
      router.push(`/routes/${v.id}`);
    } finally {
      setSaving(false);
    }
  };

  // A planner who started from the route can change the route itself; everyone else saves a route of their own.
  const updatesPlan = isPlanner && !!plan && base.parent === plan.id;
  const updatePlan = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      // The route as it was when the builder opened: a newer change is never overwritten without a word.
      let why = await saveVersion({ ...plan, stays: live.stays }, "Changed in the builder", { base: base.stays });
      if (why?.startsWith("changed:") && window.confirm(`The route changed while you were building: ${why.slice(8)}. Put your changes on top?`)) why = await saveVersion({ ...plan, stays: live.stays }, "Changed in the builder", { base: base.stays, onTop: true });
      if (!why) router.push("/");
      else if (!why.startsWith("changed:")) window.alert(why);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page wide>
      <Back href="/routes">What if</Back>
      <header className="grid gap-2">
        <p className="eyebrow">What if</p>
        <h1 className="display text-[2.3rem] leading-[1.02] sm:text-5xl">Change the stops</h1>
        <p className="max-w-prose text-ink-2">It starts from our route. Change the nights, add, drop and reorder stops; the map, the days, the checks and the cost follow every change, and the trip keeps its {nights} nights. Save it and it gets its own page on What if.</p>
      </header>

      <Section title="1 · Starting point" aside="our route, unless you pick another">
        <div className="seg justify-self-start" role="group" aria-label="How to start">
          <button aria-pressed={tab === "one"} onClick={() => setTab("one")}>
            From one route
          </button>
          <button aria-pressed={tab === "two"} onClick={() => setTab("two")}>
            Join two
          </button>
        </div>

        {tab === "one" ? (
          <div className="grid gap-2">
            <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
              {shown.map((v) => {
                const st = statsOf(v, snapshot);
                const on = base.parent === v.id;
                return (
                  <li key={v.id} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-[30%]">
                    <button className={`card grid h-full w-full gap-2 p-3 text-left transition-shadow ${on ? "ring-2 ring-accent" : ""}`} onClick={() => choose(startFrom(v))} aria-pressed={on}>
                      <span className="text-[0.68rem] font-bold tracking-wide text-muted uppercase">{v.status === "plan" ? "The route" : v.status === "personal" ? "Family" : (STYLE_LABEL[styleOf(v.id)] ?? "")}</span>
                      <span className="display text-[1.15rem] leading-tight">{title(v)}</span>
                      <TimelineLane stays={v.stays} trip={snapshot.trip} calendar={snapshot.calendar} regions={snapshot.regions} height={20} />
                      <span className="text-xs text-muted">
                        {st.bases} bases · {st.moves} check-ins · {fmtSgd(budgetOf(v, snapshot.regions).perCoupleSgd)} per couple
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className="w-[60%] shrink-0 snap-start sm:w-[30%] lg:w-[22%]">
                <button className={`card grid h-full w-full content-center gap-1 border-dashed p-3 text-left ${base.parent === null ? "ring-2 ring-accent" : ""}`} onClick={() => choose(blank())}>
                  <span className="display text-[1.15rem]">A blank page</span>
                  <span className="text-sm text-ink-2">Tokyo at each end; add the stops in between.</span>
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="card grid gap-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">
                Start like
                <select value={aId} onChange={(e) => setAId(e.target.value)}>
                  {routes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {title(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Finish like
                <select value={bId} onChange={(e) => setBId(e.target.value)}>
                  {routes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {title(v)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-1.5">
              <p className="text-sm font-semibold">
                Switch on the night of <span className="text-accent">{fmtDay(switchDate)}</span>
              </p>
              <input type="range" min={0} max={switchDates.length - 1} value={switchDates.indexOf(switchDate)} onChange={(e) => setSwitchDate(switchDates[Number(e.target.value)])} aria-label="Switch date" className="w-full accent-[var(--accent)]" style={{ minHeight: 0, padding: 0, border: 0 }} />
              <div className="grid gap-1 text-xs text-muted">
                {A ? <Lane label={`Start like: ${title(A)}`} stays={A.stays} until={switchDate} snapshot={snapshot} /> : null}
                {B ? <Lane label={`Finish like: ${title(B)}`} stays={B.stays} from={switchDate} snapshot={snapshot} /> : null}
                <Lane label="Together" stays={joined} strong snapshot={snapshot} />
              </div>
            </div>
            <button className="btn btn-primary justify-self-start" onClick={() => A && B && choose({ key: `join-${Date.now()}`, stays: joined, parent: A.id, pace: A.pace, label: `${title(A)} + ${title(B)}` })}>
              Use this
            </button>
          </div>
        )}
      </Section>

      <div className="grid gap-6">
      <section id="shape" className="grid scroll-mt-4 gap-3">
        <div className="grid gap-0.5">
          <h2 className="text-[1.35rem]">2 · Shape it</h2>
          <span className="text-sm text-muted">Starting from {base.label}</span>
          {base.how ? (
            <p className="mt-1 rounded-xl bg-bg-2 p-3 text-sm">
              <b>What it would take:</b> {base.how} The map, the checks and the cost below show the rest. Change anything; nothing is sent or saved until you choose to.
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
          <div className="grid gap-2 lg:sticky lg:top-4">
            <JourneyMap key={base.key} regions={snapshot.regions} stays={live.stays} ghost={plan?.stays ?? null} aspect={1.25} drawIn={false} />
            <p className="text-sm text-muted">
              <b className="text-ink">
                {stats.bases} bases · {stats.moves} check-ins
              </b>{" "}
              · about {stats.travelHours} h between bases · New Year’s Eve in {snapshot.regions.find((r) => r.id === stats.newYearsEve?.region)?.name ?? "?"} · {fmtSgd(budget)} per couple ({budget - planBudget >= 0 ? "+" : "−"}
              {fmtSgd(Math.abs(budget - planBudget))} vs the route)
            </p>
            <FindingList findings={findings.filter((f) => f.severity !== "info").slice(0, 4)} compact />
          </div>
          <Planner key={base.key} version={baseVersion} onDraft={setDraft} keepTotal={nights} />
        </div>
      </section>

      <Section title="3 · See the days" aside="the 21 days, as they would be">
        <PictureScroll version={live} />
      </Section>

      <div className="sticky bottom-[4.5rem] z-20 -mx-4 border-t border-rule bg-bg/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Name of your route" className="min-w-0 flex-1" maxLength={80} />
          <AnimatePresence initial={false}>
            {total !== nights ? (
              <motion.span key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-semibold text-danger">
                {total}/{nights} nights
              </motion.span>
            ) : null}
          </AnimatePresence>
          {editing ? (
            <button className="btn" disabled={saving} onClick={() => save(true)}>
              Save as new
            </button>
          ) : null}
          {updatesPlan ? (
            <button className="btn" disabled={saving || total !== nights} onClick={updatePlan}>
              Update the route
            </button>
          ) : null}
          <button className="btn btn-primary" disabled={saving || !me} onClick={() => save(false)}>
            {saving ? "Saving…" : editing ? "Save changes" : "Save and open"}
          </button>
        </div>
      </div>
      </div>
    </Page>
  );
}

function Lane({ label, stays, from, until, strong = false, snapshot }: { label: string; stays: Stay[]; from?: string; until?: string; strong?: boolean; snapshot: Snapshot }) {
  const nights = snapshot.trip.nights;
  const daysOf = (iso: string) => Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(snapshot.trip.start + "T00:00:00Z")) / 86400000);
  return (
    <div className="grid gap-0.5">
      <span className={strong ? "font-semibold text-ink" : ""}>{label}</span>
      <div className="relative">
        <TimelineLane stays={stays} trip={snapshot.trip} calendar={snapshot.calendar} regions={snapshot.regions} height={strong ? 26 : 18} />
        {until || from ? (
          <div className="pointer-events-none absolute inset-y-0 bg-bg/70" style={until ? { left: `${(daysOf(until) / nights) * 100}%`, right: 0 } : { left: 0, width: `${(daysOf(from!) / nights) * 100}%` }} />
        ) : null}
      </div>
    </div>
  );
}
