"use client";

import { useSearchParams } from "next/navigation";
import { planBudget, planNights } from "@/lib/plan";
import { useSetting, useTable } from "@/lib/tables";
import { NoPlanYet, PlanPicker } from "./PlanTabs";
import { CommitInput } from "./PlanEditor";
import { useStore } from "./providers";
import { pickPlan, usePlans } from "./usePlans";

const yen = (n: number) => "¥" + (Math.round(n / 100) * 100).toLocaleString("en-US");

/** P2.6: per-person budget by category, updated from bookings, in yen and SGD. */
export function BudgetView() {
  const { me } = useStore();
  const state = usePlans();
  const sp = useSearchParams();
  const plan = pickPlan(state, sp.get("plan"));
  const { rows: bookings } = useTable("bookings");
  const [fx, setFx] = useSetting<number>("fx_jpy_per_sgd", 115);
  const [foodPerDay, setFoodPerDay] = useSetting<number>("food_per_day", 9500);
  const [people, setPeople] = useSetting<number>("travellers", 6);
  const planner = me?.role === "planner";

  if (!state.loaded) return <p className="text-muted">Loading…</p>;
  if (!plan) return <NoPlanYet />;

  const lines = planBudget(plan, bookings, { foodPerDay });
  const total = lines.reduce((a, l) => a + l.projected, 0);
  const booked = lines.reduce((a, l) => a + l.booked, 0);
  const days = planNights(plan) + 1;
  const sgd = (n: number) => "S$" + (Math.round(n / fx / 10) * 10).toLocaleString("en-US");
  const max = Math.max(...lines.map((l) => l.projected), 1);

  return (
    <main className="grid gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-extrabold">Budget</h1>
        <PlanPicker plans={state.plans} current={plan} />
      </div>
      <p className="text-sm text-muted">
        Per person, flights excluded. Bookings replace estimates as they come in; anything still at &ldquo;idea&rdquo; is left out.
      </p>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Totals">
        <Big label="Per person, whole trip" value={yen(total)} sub={`about ${sgd(total)}`} />
        <Big label="Per person per day" value={yen(total / days)} sub={`about ${sgd(total / days)}`} />
        <Big label={`Group of ${people}`} value={yen(total * people)} sub={`${yen(booked)} each already booked`} />
      </section>

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left font-mono text-xs tracking-wider text-muted uppercase">
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 text-right font-medium">Estimate</th>
              <th className="p-3 text-right font-medium">Booked</th>
              <th className="p-3 text-right font-medium">Expected</th>
              <th className="hidden p-3 font-medium sm:table-cell" style={{ width: "22%" }}>
                <span className="sr-only">Share</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.category} className="border-t border-line">
                <td className="p-3">
                  <span className="font-bold">{l.label}</span>
                  <span className="block text-xs text-muted">{l.note}</span>
                </td>
                <td className="p-3 text-right tabular-nums">{yen(l.estimate)}</td>
                <td className="p-3 text-right tabular-nums">{l.booked ? yen(l.booked) : "—"}</td>
                <td className="p-3 text-right tabular-nums">
                  <span className="font-bold">{yen(l.projected)}</span>
                  <span className="block text-xs text-muted">{sgd(l.projected)}</span>
                </td>
                <td className="hidden p-3 sm:table-cell">
                  <span className="block h-2 rounded-full bg-accent/80" style={{ width: `${(l.projected / max) * 100}%` }} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line font-bold">
              <td className="p-3">Total per person</td>
              <td className="p-3 text-right tabular-nums">{yen(lines.reduce((a, l) => a + l.estimate, 0))}</td>
              <td className="p-3 text-right tabular-nums">{yen(booked)}</td>
              <td className="p-3 text-right tabular-nums">
                {yen(total)}
                <span className="block text-xs font-normal text-muted">{sgd(total)}</span>
              </td>
              <td className="hidden sm:table-cell" />
            </tr>
          </tfoot>
        </table>
      </div>

      <section className="card grid gap-3 p-4 sm:grid-cols-3" aria-label="Budget settings">
        <label className="grid gap-1 text-sm">
          Yen per SGD (enter today&apos;s rate)
          <CommitInput
            ariaLabel="Yen per SGD"
            type="number"
            value={String(fx)}
            disabled={!planner}
            className="input"
            onCommit={(v) => Number(v) >= 50 && Number(v) <= 250 && setFx(Number(v))}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Food per person per day (¥)
          <CommitInput
            ariaLabel="Food per day"
            type="number"
            value={String(foodPerDay)}
            disabled={!planner}
            className="input"
            onCommit={(v) => Number(v) > 0 && setFoodPerDay(Number(v))}
          />
        </label>
        <label className="grid gap-1 text-sm">
          People sharing costs
          <CommitInput
            ariaLabel="People"
            type="number"
            value={String(people)}
            disabled={!planner}
            className="input"
            onCommit={(v) => Number(v) >= 1 && setPeople(Math.round(Number(v)))}
          />
        </label>
      </section>
    </main>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card grid gap-0.5 p-4">
      <span className="font-mono text-xs tracking-wider text-muted uppercase">{label}</span>
      <span className="font-display text-3xl font-extrabold">{value}</span>
      <span className="text-sm text-muted">{sub}</span>
    </div>
  );
}
