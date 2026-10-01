"use client";

import Link from "next/link";
import { useState } from "react";
import { todayInJapan } from "@/lib/plan";
import { ROUTE_INK, ROUTE_MOTIF } from "@/lib/stamps";
import { daysBetween } from "@/lib/trip";
import { EkiStamp } from "./EkiStamp";
import { VOTE_DEADLINE } from "./HomeView";
import { voteTally } from "@/lib/vote";
import { useStore } from "./providers";
import { Avatar, PageHeader, firstName } from "./ui";

/**
 * Majority vote: everyone picks a favourite (rank 1) and, optionally, a
 * second choice (rank 2) that breaks ties. The tally stays hidden until the
 * deadline so late voters are not herded; the planner votes last.
 */
export function VoteView() {
  const { trip, me, votes, submitRanking } = useStore();
  const routes = trip.routes.filter((r) => r.isCandidate);
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
    await submitRanking(second && second !== first ? [first, second] : [first]);
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
          const ink = ROUTE_INK[r.code];
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
                <EkiStamp motif={ROUTE_MOTIF[r.code]} ink={ink} top={isFirst ? "Minha escolha" : r.name} bottom={`Rota ${r.code}`} size={80} rotate={isFirst ? -8 : 4} inked={isFirst || !first} animate={isFirst} seed={r.code.charCodeAt(0)} label="" />
                <span className="grid min-w-0 gap-0.5">
                  <span className="eyebrow" style={{ color: ink }}>
                    Rota {r.code}
                  </span>
                  <span className="font-display text-[1.9rem] leading-none">{r.name}</span>
                  <span className="text-sm text-muted">{r.title}</span>
                </span>
              </button>
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
                <Link href={`/rotas/${r.code}`} className={`text-sm ${closed && who.length ? "" : "ml-auto"}`}>
                  Ver a rota →
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
