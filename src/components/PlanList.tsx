"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { routeColor } from "@/lib/colors";
import { planFromRoute, planNights, planWarnings } from "@/lib/plan";
import { choosePlan, deleteRow, insertRow, useTable } from "@/lib/tables";
import { formatDay, placeMap } from "@/lib/trip";
import { useStore } from "./providers";
import { usePlans } from "./usePlans";

/** P2.1 entry: every plan, plus "duplicate a route" to start one. */
export function PlanList() {
  const { trip, me, votes, resolvedTheme } = useStore();
  const { plans, routeFor } = usePlans();
  const { rows: activities } = useTable("activities");
  const router = useRouter();
  const P = useMemo(() => placeMap(trip), [trip]);
  const planner = me?.role === "planner";
  const candidates = trip.routes.filter((r) => r.isCandidate);
  const n = candidates.length;
  const points = (id: string) => votes.filter((v) => v.routeId === id).reduce((a, v) => a + (n + 1 - v.rank), 0);
  const leader = [...candidates].sort((a, b) => points(b.id) - points(a.id))[0];

  async function duplicate(code: string) {
    const r = candidates.find((x) => x.code === code)!;
    const row = await insertRow("plans", { ...planFromRoute(r), created_at: new Date().toISOString() });
    router.push(`/plan/${row.id}`);
  }

  return (
    <main className="grid gap-5">
      <div>
        <h1 className="text-2xl font-extrabold">Plans</h1>
        <p className="text-sm text-muted">
          Copy a route, then change stays, nights and day trips. Mark one plan as chosen: it drives the day planner, bookings, budget
          and the Today screen.
        </p>
      </div>

      {plans.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {plans.map((p) => {
            const route = routeFor(p);
            const w = planWarnings(p, P, activities.filter((a) => a.plan_id === p.id));
            const errors = w.filter((x) => x.level === "error").length;
            const warns = w.filter((x) => x.level === "warn").length;
            return (
              <li key={p.id} className="card grid gap-3 p-4" style={{ borderTop: `6px solid ${p.color}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">
                      {route.code}
                      {p.based_on ? ` · from route ${p.based_on}` : ""}
                    </p>
                    <h2 className="truncate text-lg font-extrabold">{p.name}</h2>
                  </div>
                  {p.is_chosen ? <span className="tag !text-ok">Chosen</span> : null}
                </div>
                <p className="text-sm">
                  {route.stays.map((s) => `${P.get(s.place)?.name ?? s.place} ${s.nights}`).join(" · ")}
                </p>
                <p className="text-sm">
                  <span className={planNights(p) === 20 ? "text-ok" : "font-bold text-danger"}>{planNights(p)} of 20 nights</span>
                  {errors ? <span className="text-danger"> · {errors} problem{errors > 1 ? "s" : ""}</span> : null}
                  {warns ? <span className="text-accent"> · {warns} warning{warns > 1 ? "s" : ""}</span> : null}
                  {route.stays.length ? <span className="text-muted"> · ends {formatDay(route.stays.at(-1)!.startDate)}+</span> : null}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/plan/${p.id}`} className="btn btn-sm btn-primary">
                    {planner ? "Edit" : "View"}
                  </Link>
                  <Link href={`/?r=${route.code}`} className="btn btn-sm">
                    Map
                  </Link>
                  {planner && !p.is_chosen ? (
                    <button className="btn btn-sm" onClick={() => choosePlan(p.id)} disabled={errors > 0} title={errors ? "Fix the problems first" : undefined}>
                      Make this our plan
                    </button>
                  ) : null}
                  {planner ? (
                    <button
                      className="btn btn-sm"
                      onClick={() => confirm(`Delete “${p.name}”? Its day plans and bookings go with it.`) && deleteRow("plans", p.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card p-4 text-sm text-muted">No plans yet.{planner ? " Start from one of the routes below." : " The planner will start one after the vote."}</p>
      )}

      {planner ? (
        <section className="grid gap-3" aria-labelledby="dup-h">
          <h2 id="dup-h" className="text-lg font-extrabold">
            Start from a route
          </h2>
          {leader && points(leader.id) > 0 ? (
            <p className="text-sm text-muted">
              The family vote is leading with route {leader.code} · {leader.name} ({points(leader.id)} points).
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {candidates.map((r) => (
              <button key={r.id} className="card grid gap-1 p-3 text-left hover:border-ink" onClick={() => duplicate(r.code)}>
                <span className="flex items-center gap-2 font-bold">
                  <span className="inline-block size-3 rounded-full" style={{ background: routeColor(r.code, r.color, resolvedTheme) }} />
                  Copy {r.code} · {r.name}
                </span>
                <span className="text-xs text-muted">{r.title}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
