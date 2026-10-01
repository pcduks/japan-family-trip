"use client";

import { useSearchParams } from "next/navigation";
import { rateLine } from "@/lib/money";
import { planBudget, planNights } from "@/lib/plan";
import { useSetting, useTable } from "@/lib/tables";
import { formatDay } from "@/lib/trip";
import { NoPlanYet, PlanPicker } from "./PlanTabs";
import { CommitInput } from "./PlanEditor";
import { useStore } from "./providers";
import { PageHeader, Section } from "./ui";
import { useMoney } from "./useMoney";
import { pickPlan, usePlans } from "./usePlans";

const yen = (n: number) => "¥" + (Math.round(n / 100) * 100).toLocaleString("pt-BR");

/** P2.6: per-person budget by category, updated from bookings, in yen and the viewer's home currency. */
export function BudgetView() {
  const { me } = useStore();
  const state = usePlans();
  const sp = useSearchParams();
  const plan = pickPlan(state, sp.get("plan"));
  const { rows: bookings } = useTable("bookings");
  const [foodPerDay, setFoodPerDay] = useSetting<number>("food_per_day", 9500);
  const [people, setPeople] = useSetting<number>("travellers", 6);
  const planner = me?.role === "planner";
  const { home, fx, currency } = useMoney();

  if (!state.loaded) return <p className="text-muted">Carregando…</p>;
  if (!plan) return <NoPlanYet />;

  const lines = planBudget(plan, bookings, { foodPerDay });
  const total = lines.reduce((a, l) => a + l.projected, 0);
  const booked = lines.reduce((a, l) => a + l.booked, 0);
  const days = planNights(plan) + 1;
  const max = Math.max(...lines.map((l) => l.projected), 1);

  return (
    <main className="grid gap-6">
      <PageHeader title="Orçamento">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Por pessoa, sem passagens aéreas. As reservas substituem as estimativas conforme chegam; o que ainda é &ldquo;ideia&rdquo; fica de fora.</span>
          <PlanPicker plans={state.plans} current={plan} />
        </div>
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Totais">
        <Big label="Por pessoa, a viagem toda" value={yen(total)} sub={`cerca de ${home(total)}`} strong />
        <div className="grid grid-cols-2 gap-3 sm:contents">
          <Big label="Por pessoa, por dia" value={yen(total / days)} sub={`cerca de ${home(total / days)}`} />
          <Big label={`Grupo de ${people}`} value={yen(total * people)} sub={`${yen(booked)} por pessoa já reservado`} />
        </div>
      </section>

      <Section title="Por categoria" aside="por pessoa" id="cat-h">
        <ul className="card grid divide-y divide-rule">
          {lines.map((l) => (
            <li key={l.category} className="grid gap-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{l.label}</p>
                  <p className="text-xs text-muted">{l.note}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-[1.5rem] leading-none tabular-nums">{yen(l.projected)}</p>
                  <p className="text-xs text-muted tabular-nums">{home(l.projected)}</p>
                </div>
              </div>
              <span className="block h-1.5 rounded-full bg-paper-2" aria-hidden="true">
                <span className="block h-full rounded-full bg-vermilion/80" style={{ width: `${(l.projected / max) * 100}%` }} />
              </span>
              <p className="font-mono text-[0.72rem] text-muted tabular-nums">
                estimativa {yen(l.estimate)} · reservado {l.booked ? yen(l.booked) : "—"}
              </p>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-3 p-4">
            <span className="font-bold">Total por pessoa</span>
            <span className="text-right">
              <span className="block font-display text-[1.75rem] leading-none tabular-nums">{yen(total)}</span>
              <span className="font-mono text-[0.72rem] text-muted tabular-nums">
                estimativa {yen(lines.reduce((a, l) => a + l.estimate, 0))} · reservado {yen(booked)}
              </span>
            </span>
          </li>
        </ul>
      </Section>

      <section className="card grid gap-3 p-4 sm:grid-cols-3" aria-labelledby="set-h">
        <h2 id="set-h" className="text-[1.5rem] leading-tight sm:col-span-3">
          Ajustes
        </h2>
        <div className="grid gap-1 text-sm">
          Câmbio {fx.date ? `de ${formatDay(fx.date)} (Banco Central Europeu)` : "aproximado (sem internet)"}
          <span className="input flex items-center tabular-nums">{rateLine(currency, fx)}</span>
          <span className="text-xs text-muted">Troque a moeda em Ajustes.</span>
        </div>
        <label className="grid gap-1 text-sm">
          Comida por pessoa por dia (¥)
          <CommitInput
            ariaLabel="Comida por dia"
            type="number"
            value={String(foodPerDay)}
            disabled={!planner}
            className="input"
            onCommit={(v) => Number(v) > 0 && setFoodPerDay(Number(v))}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Pessoas dividindo os custos
          <CommitInput
            ariaLabel="Pessoas"
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

function Big({ label, value, sub, strong = false }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className="card grid content-start gap-1 p-4">
      <span className="eyebrow">{label}</span>
      <span className={`font-display leading-none tabular-nums ${strong ? "text-[2.6rem]" : "text-[1.75rem]"}`}>{value}</span>
      <span className="text-sm text-muted">{sub}</span>
    </div>
  );
}
