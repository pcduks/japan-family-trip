"use client";

import Link from "next/link";
import { useState } from "react";
import { useMemo } from "react";
import { todayInJapan, type GeneratedPlan } from "@/lib/plan";
import { ROUTE_INK, ROUTE_MOTIF } from "@/lib/stamps";
import { daysBetween, formatDay } from "@/lib/trip";
import { EkiStamp, type Motif } from "./EkiStamp";
import { usePlans } from "./usePlans";
import { VOTE_DEADLINE } from "./HomeView";
import { voteTally } from "@/lib/vote";
import { useStore } from "./providers";
import { Avatar, PageHeader, firstName } from "./ui";

/**
 * Majority vote: everyone picks a favourite (rank 1) and, optionally, a
 * second choice (rank 2) that breaks ties. The tally stays hidden until the
 * deadline so late voters are not herded; the planner votes last.
 */
interface Option {
  id: string;
  code: string;
  name: string;
  title: string;
  ink: string;
  motif: Motif;
  href: string;
  gen: GeneratedPlan | null;
}

const AXIS: Record<string, { ink: string; motif: Motif; name: string }> = {
  neve: { ink: "var(--indigo)", motif: "snow", name: "Rota Neve" },
  sul: { ink: "var(--vermilion)", motif: "onsen", name: "Rota Sul" },
  lenta: { ink: "var(--pine)", motif: "leaf", name: "Rota Lenta" },
  cultura: { ink: "var(--plum)", motif: "torii", name: "Rota Cultura" },
};

/** Stable per-viewer shuffle so nobody's route is "first" for everyone. */
function shuffled<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function VoteView() {
  const { trip, me, votes, submitRanking, submitPlanRanking } = useStore();
  const { plans } = usePlans();
  const candidates = plans.filter((p) => p.is_candidate);
  const onPlans = candidates.length > 0;
  const routes = useMemo<Option[]>(() => {
    if (onPlans) {
      const opts = candidates.map((p) => {
        const ax = AXIS[p.generated?.axis ?? ""] ?? { ink: "var(--ink)", motif: "train" as Motif, name: p.name };
        return { id: p.id, code: p.generated?.axis ?? "x", name: ax.name, title: p.generated?.pitch_pt.split(". ")[0] ?? "", ink: ax.ink, motif: ax.motif, href: `/plan/${p.id}`, gen: p.generated ?? null };
      });
      return shuffled(opts, me?.travellerId ?? "");
    }
    return trip.routes.filter((r) => r.isCandidate).map((r) => ({ id: r.id, code: r.code, name: r.name, title: r.title, ink: ROUTE_INK[r.code], motif: ROUTE_MOTIF[r.code], href: `/rotas/${r.code}`, gen: null }));
  }, [onPlans, candidates, trip.routes, me?.travellerId]);
  const mine = votes.filter((v) => v.travellerId === me?.travellerId).sort((a, b) => a.rank - b.rank);
  const savedFirst = mine.find((v) => v.rank === 1)?.routeId ?? null;
  const savedSecond = mine.find((v) => v.rank === 2)?.routeId ?? null;

  const [draft, setDraft] = useState<{ first: string | null; second: string | null } | null>(null);
  const first = draft ? draft.first : savedFirst;
  const second = draft ? draft.second : savedSecond;
  const dirty = draft !== null && (draft.first !== savedFirst || draft.second !== savedSecond);
  const [saving, setSaving] = useState(false);
  const [justVoted, setJustVoted] = useState(false);

  const firsts = (routeId: string) => votes.filter((v) => v.routeId === routeId && v.rank === 1).map((v) => v.travellerId);
  const voters = new Set(votes.filter((v) => v.rank === 1).map((v) => v.travellerId));
  const { ranking, leader, majority, seconds } = voteTally(routes, votes, trip.travellers.length);
  const idx = new Map(trip.travellers.map((t, i) => [t.id, i]));
  const names = new Map(trip.travellers.map((t) => [t.id, t.name]));
  const daysLeft = daysBetween(todayInJapan(), VOTE_DEADLINE);
  const closed = daysLeft <= 0;
  // The planner votes last: everyone else first, so his pick can't anchor the family.
  const othersPending = trip.travellers.filter((t) => t.id !== me?.travellerId && !voters.has(t.id)).length;
  const plannerWaits = me?.role === "planner" && othersPending > 0 && !closed;

  async function save() {
    if (!first) return;
    setSaving(true);
    const ids = second && second !== first ? [first, second] : [first];
    await (onPlans ? submitPlanRanking(ids) : submitRanking(ids));
    setSaving(false);
    setDraft(null);
    setJustVoted(true);
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      <PageHeader
        eyebrow="Votação da família"
        title="Qual é a sua favorita?"
        hand={daysLeft > 0 ? `fecha em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}` : "votação encerrada"}
      >
        Escolha a rota que você mais quer. Se quiser, marque também uma segunda opção: ela só conta para desempatar. A maioria decide.
      </PageHeader>

      <fieldset className="grid gap-3">
        <legend className="sr-only">Sua favorita</legend>
        {!first ? <p className="text-sm text-muted">Comece pela favorita; a 2ª opção vem depois.</p> : null}
        {routes.map((r) => {
          const ink = r.ink;
          const isFirst = first === r.id;
          const isSecond = second === r.id;
          const who = firsts(r.id);
          return (
            <div key={r.id} className="card grid gap-3 p-4" style={isFirst ? { borderColor: ink, boxShadow: `0 0 0 2px ${ink}`, borderTop: `6px solid ${ink}` } : isSecond ? { borderTop: `4px dashed ${ink}` } : undefined}>
              <button
                type="button"
                role="radio"
                aria-checked={isFirst}
                onClick={() => setDraft({ first: r.id, second: second === r.id ? null : second })}
                className="flex items-center gap-4 text-left"
              >
                <EkiStamp motif={r.motif} ink={ink} top={isFirst ? "Minha escolha" : r.name} bottom={onPlans ? "2026" : `Rota ${r.code}`} size={80} rotate={isFirst ? -8 : 4} inked={isFirst || !first} animate={isFirst} seed={r.code.charCodeAt(0)} label="" />
                <span className="grid min-w-0 gap-0.5">
                  <span className="eyebrow" style={{ color: ink }}>
                    {onPlans ? "Montada dos desejos" : `Rota ${r.code}`}
                  </span>
                  <span className="font-display text-[1.9rem] leading-none">{r.name}</span>
                  <span className="text-sm text-muted">{r.title}</span>
                </span>
              </button>
              {r.gen ? <PlanFacts gen={r.gen} meId={me?.travellerId ?? null} /> : null}
              <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-rule pt-3">
                <button
                  type="button"
                  aria-pressed={isFirst}
                  className="btn btn-sm"
                  style={isFirst ? { background: ink, borderColor: ink, color: "var(--paper)" } : undefined}
                  onClick={() => setDraft({ first: r.id, second: second === r.id ? null : second })}
                >
                  {isFirst ? "★ Minha favorita" : "☆ Favorita"}
                </button>
                {!isFirst ? (
                  <button
                    type="button"
                    aria-pressed={isSecond}
                    disabled={!first}
                    title={first ? undefined : "Escolha a favorita primeiro"}
                    className="btn btn-sm disabled:!opacity-50"
                    style={isSecond ? { borderColor: ink, color: ink, borderStyle: "dashed" } : undefined}
                    onClick={() => first && setDraft({ first, second: isSecond ? null : r.id })}
                  >
                    {isSecond ? "✓ 2ª opção" : "2ª opção"}
                  </button>
                ) : null}
                {closed && who.length ? (
                  <ul className="ml-auto flex -space-x-1.5" aria-label={`Escolheram ${r.name}: ${who.map((id) => names.get(id)).join(", ")}`}>
                    {who.map((id) => (
                      <li key={id}>
                        <Avatar name={names.get(id) ?? "?"} index={idx.get(id) ?? 0} size={30} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link href={r.href} className={`text-sm ${closed && who.length ? "" : "ml-auto"}`}>
                  {onPlans ? "Ver detalhes →" : "Ver a rota →"}
                </Link>
              </div>
            </div>
          );
        })}
      </fieldset>

      {plannerWaits ? (
        <p className="card p-4 text-sm text-ink-2">Pedro vota por último: o botão abre quando os outros {othersPending} tiverem votado.</p>
      ) : null}
      {first && (dirty || !savedFirst) && !plannerWaits ? (
        <div className="sticky bottom-24 z-10 grid">
          <button className="btn btn-accent text-base shadow-lg" disabled={saving} onClick={save}>
            {saving ? "Carimbando…" : savedFirst ? "Atualizar meu voto" : "Votar"}
          </button>
        </div>
      ) : null}
      <span className="sr-only" role="status">
        {justVoted ? "Voto registrado" : ""}
      </span>

      <section className="card grid gap-4 p-5" aria-labelledby="res-h">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{closed ? "Resultado" : "Até o fechamento"}</p>
            <h2 id="res-h" className="text-[1.9rem] leading-tight">
              {!closed ? `${voters.size} de ${trip.travellers.length} votaram` : leader ? (majority ? `${leader.name} tem a maioria` : `${leader.name} está na frente`) : "Ninguém votou"}
            </h2>
          </div>
          {justVoted || savedFirst ? <EkiStamp motif="ballot" ink="var(--vermilion)" top="Votei" bottom="2026" size={76} rotate={10} animate={justVoted} label="Você votou" /> : null}
        </div>
        <ol className="grid gap-2">
          {ranking.map((r) => {
            const n = firsts(r.id).length;
            return (
              <li key={r.id} className="grid gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-bold">{r.name}</span>
                  <span className="tabular-nums text-muted">
                    {n} voto{n === 1 ? "" : "s"}
                    {seconds(r.id) ? ` · ${seconds(r.id)} como 2ª` : ""}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-paper-2" aria-hidden="true">
                  <div className="h-full rounded-full" style={{ width: `${(n / trip.travellers.length) * 100}%`, background: ROUTE_INK[r.code] }} />
                </div>
              </li>
            );
          })}
        </ol>
        <p className="text-sm text-muted">
          {voters.size === trip.travellers.length
            ? "Todo mundo votou."
            : missingLine(trip.travellers.filter((t) => !voters.has(t.id)).map((t) => ({ id: t.id, name: firstName(t.name) })), me?.travellerId ?? null)}
        </p>
      </section>
    </main>
  );
}

/** "Falta você e mais 5." / "Faltam Mãe e Pai." */
function missingLine(missing: { id: string; name: string }[], meId: string | null): string {
  const others = missing.filter((m) => m.id !== meId);
  const meToo = others.length < missing.length;
  if (meToo) return others.length ? `Falta você e mais ${others.length}.` : "Só falta você.";
  const names = others.map((m) => m.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}` : names[0];
  return `${names.length > 1 ? "Faltam" : "Falta"} ${list}.`;
}

/** The six numbers, then what this viewer gains and gives up. Everything else sits behind "Ver detalhes". */
function PlanFacts({ gen, meId }: { gen: GeneratedPlan; meId: string | null }) {
  const n = gen.numbers;
  const yen = (v: number) => "¥" + Math.round(v / 1000).toLocaleString("pt-BR") + " mil";
  const mine = meId ? gen.per_person[meId] : null;
  const nights = n.nights_per_base.map((b) => `${b.name} ${b.nights}`).join(" · ");
  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-2">{gen.pitch_pt}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-3">
          <dt className="text-xs text-muted">Noites por base</dt>
          <dd className="font-bold">{nights}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Dias de descanso</dt>
          <dd className="font-bold">{n.rest_days}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Maior dia de trem</dt>
          <dd className="font-bold">{Math.floor(n.longest_leg_hours)}h{String(Math.round((n.longest_leg_hours % 1) * 60)).padStart(2, "0")}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Km a pé, dia mais pesado</dt>
          <dd className="font-bold">{n.heaviest_walk_km} km</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Por casal</dt>
          <dd className="font-bold">{yen(n.cost_per_couple_jpy)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted">Réveillon</dt>
          <dd className="font-bold">
            {n.ny_base_name} · hospital a {n.ny_hospital_minutes} min
          </dd>
        </div>
      </dl>
      {mine ? (
        <div className="rounded-xl bg-paper-2 p-3 text-sm">
          <p>
            <b>Você ganha:</b> {mine.ganha.length ? mine.ganha.join(", ") : "—"}
          </p>
          <p>
            <b>Você abre mão de:</b> {mine.abre_mao.length ? mine.abre_mao.join(", ") : "nada que você pediu"}
          </p>
        </div>
      ) : null}
      {gen.deadlines.length ? (
        <p className="text-xs text-muted">
          Prazos: {gen.deadlines.slice(0, 3).map((d) => `${d.what} ${formatDay(d.date)}`).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
