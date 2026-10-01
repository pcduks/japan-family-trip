"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { planFromRoute, planNights, planWarnings } from "@/lib/plan";
import { ROUTE_INK, ROUTE_MOTIF } from "@/lib/stamps";
import { choosePlan, deleteRow, insertRow, useTable } from "@/lib/tables";
import { TRIP_NIGHTS, formatDay, placeMap } from "@/lib/trip";
import { voteTally } from "@/lib/vote";
import { EkiStamp } from "./EkiStamp";
import { useStore } from "./providers";
import { PageHeader, Pill, Section } from "./ui";
import { usePlans } from "./usePlans";

/** P2.1 entry: every plan, plus "duplicate a route" to start one. */
export function PlanList() {
  const { trip, me, votes } = useStore();
  const { plans, routeFor } = usePlans();
  const { rows: activities } = useTable("activities");
  const router = useRouter();
  const P = useMemo(() => placeMap(trip), [trip]);
  const planner = me?.role === "planner";
  const candidates = trip.routes.filter((r) => r.isCandidate);
  const { leader, firsts, majority } = voteTally(candidates, votes, trip.travellers.length);

  async function duplicate(code: string) {
    const r = candidates.find((x) => x.code === code)!;
    const row = await insertRow("plans", { ...planFromRoute(r), created_at: new Date().toISOString() });
    router.push(`/plan/${row.id}`);
  }

  return (
    <main className="grid gap-8">
      <PageHeader title="Os planos">
        Copie uma rota e ajuste bases, noites e bate-voltas. O plano escolhido alimenta o dia a dia, as reservas, o orçamento e a tela
        Hoje.
      </PageHeader>

      {plans.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => {
            const route = routeFor(p);
            const w = planWarnings(p, P, activities.filter((a) => a.plan_id === p.id));
            const errors = w.filter((x) => x.level === "error").length;
            const warns = w.filter((x) => x.level === "warn").length;
            const nights = planNights(p);
            const code = p.based_on ?? "";
            const ink = ROUTE_INK[code] ?? p.color;
            return (
              <li key={p.id} className="card grid gap-3 p-4" style={{ borderTop: `4px solid ${ink}` }}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow" style={{ color: ink }}>
                      {p.based_on ? `a partir da rota ${p.based_on}` : "plano próprio"}
                    </p>
                    <h2 className="text-[1.75rem] leading-tight [overflow-wrap:anywhere]">{p.name}</h2>
                    {p.is_chosen ? (
                      <div className="mt-1">
                        <Pill tone="ok">Nosso plano</Pill>
                      </div>
                    ) : null}
                  </div>
                  <EkiStamp
                    motif={ROUTE_MOTIF[code] ?? "train"}
                    ink={ink}
                    top={p.based_on ? `Rota ${p.based_on}` : "Plano"}
                    bottom={`${route.stays.length} bases`}
                    size={64}
                    rotate={-7}
                    seed={code.charCodeAt(0) || 4}
                    label=""
                  />
                </div>
                <p className="text-sm text-ink-2">{route.stays.map((s) => `${P.get(s.place)?.name ?? s.place} ${s.nights}`).join(" · ")}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={nights === TRIP_NIGHTS ? "ok" : "accent"}>
                    {nights} de {TRIP_NIGHTS} noites
                  </Pill>
                  {errors ? (
                    <Pill tone="accent">
                      {errors} problema{errors > 1 ? "s" : ""}
                    </Pill>
                  ) : null}
                  {warns ? (
                    <Pill tone="warn">
                      {warns} alerta{warns > 1 ? "s" : ""}
                    </Pill>
                  ) : null}
                  {route.stays.length ? <Pill>última base {formatDay(route.stays.at(-1)!.startDate)}</Pill> : null}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-dashed border-rule pt-3">
                  <Link href={`/plan/${p.id}`} className="btn btn-sm">
                    {planner ? "Editar" : "Ver"}
                  </Link>
                  <Link href={`/rotas/${route.code}`} className="btn btn-sm">
                    Mapa
                  </Link>
                  {planner && !p.is_chosen ? (
                    <button className="btn btn-sm btn-primary" onClick={() => choosePlan(p.id)} disabled={errors > 0} title={errors ? "Resolva os problemas primeiro" : undefined}>
                      Escolher como nosso plano
                    </button>
                  ) : null}
                  {planner ? (
                    <button
                      className="ml-auto self-center text-sm text-danger underline"
                      onClick={() => confirm(`Apagar “${p.name}”? Os dias e as reservas dele vão junto.`) && deleteRow("plans", p.id)}
                    >
                      Apagar
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card p-5 text-ink-2">
          Ainda não há planos.{planner ? " Comece por uma das rotas abaixo." : " O Pedro começa um depois da votação."}
        </p>
      )}

      {planner ? (
        <Section title="Começar de uma rota" id="dup-h">
          {leader ? (
            <p className="-mt-1 text-sm text-muted">
              Na votação da família, a rota {leader.code} · {leader.name} {majority ? "tem a maioria" : "está na frente"} ({firsts(leader.id)} voto{firsts(leader.id) === 1 ? "" : "s"}).
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {candidates.map((r) => {
              const ink = ROUTE_INK[r.code] ?? "var(--ink)";
              return (
                <button key={r.id} className="card flex items-center gap-3 p-3 text-left transition-transform hover:-translate-y-0.5" onClick={() => duplicate(r.code)}>
                  <EkiStamp motif={ROUTE_MOTIF[r.code] ?? "torii"} ink={ink} size={48} rotate={-6} seed={r.code.charCodeAt(0)} label="" />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="eyebrow" style={{ color: ink }}>
                      Copiar rota {r.code}
                    </span>
                    <span className="font-display text-[1.35rem] leading-tight">{r.name}</span>
                    <span className="text-xs text-muted">{r.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      ) : null}
    </main>
  );
}
