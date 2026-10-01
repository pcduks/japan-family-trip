"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { generatePlans } from "@/lib/builder/generate";
import type { Narrative } from "@/lib/builder/narrative";
import { loadCatalog } from "@/lib/catalog";
import { nyNightsUnheld, planFromRoute, planNights, planWarnings, todayInJapan, type Plan } from "@/lib/plan";
import { ROUTE_INK, ROUTE_MOTIF } from "@/lib/stamps";
import { choosePlan, deleteRow, insertRow, updateRow, useSetting, useTable } from "@/lib/tables";
import { TRIP_NIGHTS, formatDay, placeMap } from "@/lib/trip";
import { voteTally } from "@/lib/vote";
import { EkiStamp, type Motif } from "./EkiStamp";
import { useStore } from "./providers";
import { DEFAULT_RULES, type ComfortRules } from "./RegrasView";
import { useWishesRevealed } from "./RetratoView";
import { Avatar, PageHeader, Pill, Section, firstName } from "./ui";
import { usePlans } from "./usePlans";

/** Stamp ink and motif per builder axis (manual plans keep the route's). */
const AXIS_INK: Record<string, string> = { neve: "#2f5d8a", sul: "#c8452b", lenta: "#5b7a4e", cultura: "#7a4e7a" };
const AXIS_MOTIF: Record<string, Motif> = { neve: "snow", sul: "torii", lenta: "onsen", cultura: "pagoda" };

/** P2.1 entry: every plan, plus "duplicate a route" to start one. */
export function PlanList() {
  const { trip, me, votes } = useStore();
  const { plans, routeFor } = usePlans();
  const { rows: activities } = useTable("activities");
  const { rows: bookings } = useTable("bookings");
  const router = useRouter();
  const P = useMemo(() => placeMap(trip), [trip]);
  const catalog = useMemo(() => loadCatalog(), []);
  const placeName = (slug: string) => P.get(slug)?.name ?? catalog.bases.find((b) => b.slug === slug)?.name ?? slug;
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
            const gen = p.generated ?? null;
            const ink = gen ? (AXIS_INK[gen.axis] ?? p.color) : (ROUTE_INK[code] ?? p.color);
            const unheld = gen ? nyNightsUnheld(p, bookings) : [];
            return (
              <li key={p.id} className="card grid gap-3 p-4" style={{ borderTop: `4px solid ${ink}` }}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow" style={{ color: ink }}>
                      {gen ? "montado a partir dos desejos" : p.based_on ? `a partir da rota ${p.based_on}` : "plano próprio"}
                    </p>
                    <h2 className="text-[1.75rem] leading-tight [overflow-wrap:anywhere]">{p.name}</h2>
                    {p.is_chosen || p.is_candidate ? (
                      <div className="mt-1 flex gap-1.5">
                        {p.is_chosen ? <Pill tone="ok">Nosso plano</Pill> : null}
                        {p.is_candidate ? <Pill tone="accent">Na votação</Pill> : null}
                      </div>
                    ) : null}
                  </div>
                  <EkiStamp
                    motif={gen ? AXIS_MOTIF[gen.axis] ?? "train" : ROUTE_MOTIF[code] ?? "train"}
                    ink={ink}
                    top={gen ? "Rota" : p.based_on ? `Rota ${p.based_on}` : "Plano"}
                    bottom={`${route.stays.length} bases`}
                    size={64}
                    rotate={-7}
                    seed={code.charCodeAt(0) || 4}
                    label=""
                  />
                </div>
                <p className="text-sm text-ink-2">{route.stays.map((s) => `${placeName(s.place)} ${s.nights}`).join(" · ")}</p>
                {gen ? <GeneratedFacts plan={p} unheld={unheld} travellers={trip.travellers} /> : null}
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
                  {planner && gen ? (
                    p.is_candidate ? (
                      <button className="btn btn-sm" onClick={() => updateRow("plans", p.id, { is_candidate: false })}>
                        Tirar da votação
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={unheld.length > 0}
                        title={unheld.length ? `Segure a hospedagem de ${unheld.length} noite${unheld.length > 1 ? "s" : ""} do Réveillon em Reservas primeiro` : undefined}
                        onClick={() => updateRow("plans", p.id, { is_candidate: true })}
                      >
                        Pôr na votação
                      </button>
                    )
                  ) : null}
                  {planner && !p.is_chosen ? (
                    <button className="btn btn-sm" onClick={() => choosePlan(p.id)} disabled={errors > 0} title={errors ? "Resolva os problemas primeiro" : undefined}>
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

      {planner ? <Montar /> : null}

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

/** The six numbers and the pitch a generated plan carries, plus what still blocks the ballot. */
function GeneratedFacts({ plan, unheld, travellers }: { plan: Plan; unheld: string[]; travellers: { id: string; name: string }[] }) {
  const g = plan.generated!;
  const n = g.numbers;
  const [open, setOpen] = useState(false);
  const facts: [string, string][] = [
    ["Réveillon", `${n.ny_base_name}, hospital a ${n.ny_hospital_minutes} min`],
    ["Trecho mais longo", `${n.longest_leg_hours} h porta a porta`],
    ["Dias de descanso", String(n.rest_days)],
    ["Dia mais pesado", `~${n.heaviest_walk_km} km a pé`],
    ["Por casal", `~¥${Math.round(n.cost_per_couple_jpy / 1000)} mil`],
    ["Primeiro prazo", g.deadlines[0] ? `${formatDay(g.deadlines[0].date)} · ${g.deadlines[0].what}` : "nenhum"],
  ];
  return (
    <div className="grid gap-2 text-sm">
      <p className="whitespace-pre-line text-ink-2">{open ? g.pitch_pt : g.pitch_pt.split("\n")[0]}</p>
      {g.pitch_pt.includes("\n") ? (
        <button type="button" className="justify-self-start text-xs text-muted underline" onClick={() => setOpen(!open)}>
          {open ? "Menos" : "Ler tudo"}
        </button>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-wrap gap-2">
        {travellers.map((t, i) => {
          const c = g.coverage[t.id];
          const hit = c?.must.filter((m) => m.hit).length ?? 0;
          return (
            <li key={t.id} className="flex items-center gap-1 text-xs" title={c?.must.map((m) => `${m.hit ? "✓" : "✗"} ${m.name_pt}`).join("\n")}>
              <Avatar name={t.name} index={i} size={22} /> {firstName(t.name)} {c ? `${hit}/${c.must.length}` : ""}
            </li>
          );
        })}
      </ul>
      {g.violations.length ? <p className="text-xs text-danger">{g.violations.map((v) => v.message_pt).join(" ")}</p> : null}
      {unheld.length && !plan.is_candidate ? <p className="text-xs text-muted">Falta segurar hospedagem em {unheld.length} noite{unheld.length > 1 ? "s" : ""} do Réveillon (29 dez – 3 jan) antes de pôr na votação.</p> : null}
      {g.model ? <p className="text-[0.65rem] text-muted">texto: {g.model}</p> : null}
    </div>
  );
}

/** Planner-only: build up to three routes from the family's wishes. */
function Montar() {
  const { trip } = useStore();
  const { revealed, done, missing } = useWishesRevealed();
  const { rows: wishes } = useTable("wishes");
  const { rows: profiles } = useTable("wish_profiles");
  const { plans } = usePlans();
  const [rules] = useSetting<ComfortRules>("comfort_rules", DEFAULT_RULES);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const generated = plans.filter((p) => p.source === "generated");

  async function build() {
    setBusy("Montando as rotas…");
    setErr(null);
    try {
      const bundles = generatePlans({ catalog: loadCatalog(), travellers: trip.travellers, wishes, profiles, rules, today: todayInJapan() });
      if (!bundles.length) {
        setErr("Nenhuma rota fechou com as regras atuais. Afrouxe uma regra em Regras e tente de novo.");
        return;
      }
      for (const b of bundles) {
        await insertRow("plans", b.plan);
        for (const a of b.activities) await insertRow("activities", a);
        for (const k of b.bookings) await insertRow("bookings", k);
      }
      setBusy("Escrevendo o texto de cada rota…");
      await Promise.all(
        bundles.map(async (b) => {
          const res = await fetch("/api/plan/narrate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b.narrative) }).catch(() => null);
          if (!res?.ok) return;
          const n = (await res.json()) as Narrative;
          await updateRow("plans", b.plan.id, { generated: { ...b.plan.generated!, pitch_pt: n.pitch_pt, per_person: { ...b.plan.generated!.per_person, ...n.per_person }, model: n.model } });
        }),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falhou");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section title="Montar a partir dos desejos" id="montar" aside={revealed ? `${done.length} de ${trip.travellers.length} responderam` : `faltam ${missing.length}`}>
      <p className="-mt-1 text-sm text-muted">
        O montador lê os desejos de todos, obedece às regras de conforto e devolve até três rotas diferentes. Cada uma vira um plano aqui; você revisa, segura a hospedagem do Réveillon e só então põe na votação.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={busy !== null || (!revealed && done.length === 0)} onClick={build}>
          {busy ?? (generated.length ? "Montar de novo" : "Montar rotas")}
        </button>
        {!revealed ? <span className="text-sm text-muted">{missing.length ? `Ainda sem ${missing.map((t) => firstName(t.name)).join(", ")}. Dá pra montar mesmo assim; quem não respondeu entra sem desejos.` : null}</span> : null}
      </div>
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {generated.length ? <p className="text-xs text-muted">Montar de novo cria rotas novas e mantém as antigas; apague as que não servem.</p> : null}
    </Section>
  );
}
