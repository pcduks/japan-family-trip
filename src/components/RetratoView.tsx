"use client";

import Link from "next/link";
import { useMemo } from "react";
import { deckCards, loadCatalog } from "@/lib/catalog";
import type { Wish } from "@/lib/family";
import { useSetting, useTable } from "@/lib/tables";
import { EkiStamp } from "./EkiStamp";
import { useStore } from "./providers";
import { Avatar, PageHeader, Section, firstName } from "./ui";

/** True once everyone finished, or the planner forced it. Mirrors wishes_revealed() in SQL. */
export function useWishesRevealed() {
  const { trip } = useStore();
  const { rows: profiles } = useTable("wish_profiles");
  const [forced] = useSetting<boolean>("wishes_reveal", false);
  const done = trip.travellers.filter((t) => profiles.find((p) => p.id === t.id)?.finished_at);
  return { revealed: forced || (done.length >= trip.travellers.length && trip.travellers.length > 0), done, missing: trip.travellers.filter((t) => !done.includes(t)) };
}

/** Retrato da família: three stacks, sentences and faces, no bars. */
export function RetratoView() {
  const { trip, me } = useStore();
  const { revealed, missing } = useWishesRevealed();
  const { rows: wishes } = useTable("wishes");
  const { rows: profiles } = useTable("wish_profiles");
  const [, setForced] = useSetting<boolean>("wishes_reveal", false);
  const catalog = useMemo(() => loadCatalog(), []);
  const deck = useMemo(() => deckCards(catalog), [catalog]);
  const idx = new Map(trip.travellers.map((t, i) => [t.id, i]));
  const name = (id: string) => firstName(trip.travellers.find((t) => t.id === id)?.name ?? "?");
  const planner = me?.role === "planner";

  if (!revealed)
    return (
      <main className="mx-auto grid max-w-md gap-6 px-5 pb-12">
        <PageHeader eyebrow="Retrato da família" title="Ainda não" hand={`faltam ${missing.length}`}>
          O retrato aparece quando todos entregarem os desejos. Até lá, ninguém vê a resposta de ninguém.
        </PageHeader>
        <ul className="flex flex-wrap gap-3">
          {trip.travellers.map((t, i) => {
            const done = !missing.includes(t);
            return (
              <li key={t.id} className="grid justify-items-center gap-1 text-xs">
                <Avatar name={t.name} index={i} size={40} dim={!done} />
                <span className={done ? "font-bold" : "text-muted"}>{firstName(t.name)}</span>
              </li>
            );
          })}
        </ul>
        <Link href="/desejos" className="btn btn-primary no-underline">
          {missing.some((t) => t.id === me?.travellerId) ? "Entregar meus desejos" : "Rever meus desejos"}
        </Link>
        {planner ? (
          <button type="button" className="justify-self-start text-sm text-muted underline" onClick={() => confirm("Revelar agora, mesmo faltando gente? Quem não respondeu entra sem desejos.") && setForced(true)}>
            Revelar agora (só o Pedro)
          </button>
        ) : null}
      </main>
    );

  // Per card: who answered what.
  const byCard = new Map<string, Wish[]>();
  for (const w of wishes) byCard.set(w.card_id, [...(byCard.get(w.card_id) ?? []), w]);
  const n = trip.travellers.length;
  const rows = deck.map((c) => {
    const ws = byCard.get(c.id) ?? [];
    const must = ws.filter((w) => w.answer === "must").map((w) => w.traveller_id);
    const like = ws.filter((w) => w.answer === "like").map((w) => w.traveller_id);
    const no = ws.filter((w) => w.answer === "no").map((w) => w.traveller_id);
    return { card: c, must, like, no, yes: [...must, ...like] };
  });
  const everyone = rows.filter((r) => r.yes.length >= Math.max(n - 1, 1) && r.no.length === 0).sort((a, b) => b.must.length - a.must.length);
  const split = rows.filter((r) => r.yes.length >= 2 && r.no.length >= 2).sort((a, b) => b.must.length - a.must.length);
  const nyVotes = new Map<string, string[]>();
  for (const p of profiles) if (p.facts.ny_choice) nyVotes.set(p.facts.ny_choice, [...(nyVotes.get(p.facts.ny_choice) ?? []), p.id]);
  const nyList = [...nyVotes.entries()].sort((a, b) => b[1].length - a[1].length);
  const Faces = ({ ids }: { ids: string[] }) => (
    <span className="flex -space-x-1.5">
      {ids.map((id) => (
        <Avatar key={id} name={name(id)} index={idx.get(id) ?? 0} size={26} />
      ))}
    </span>
  );
  const list = (ids: string[]) => {
    const names = ids.map(name);
    return names.length > 1 ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}` : (names[0] ?? "ninguém");
  };

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      <PageHeader eyebrow="Retrato da família" title="O que a família quer" hand="o calendário já decidiu metade; vocês decidem o resto" />

      <Section title="Todo mundo quer" id="todos">
        {everyone.length ? (
          <ul className="grid gap-2">
            {everyone.slice(0, 8).map((r) => (
              <li key={r.card.id} className="card flex items-center gap-3 p-3">
                <EkiStamp motif="torii" ink="var(--pine)" size={44} rotate={-6} seed={r.card.id.length} label="" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[1.3rem] leading-tight">{r.card.name_pt}</span>
                  <span className="text-sm text-muted">{r.must.length === n ? "Seis de seis não abrem mão. Isso vai entrar." : `${r.yes.length} de ${n} querem${r.must.length ? `; ${list(r.must)} não ${r.must.length === 1 ? "abre" : "abrem"} mão` : ""}.`}</span>
                </span>
                <Faces ids={r.yes} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nenhuma carta ganhou todo mundo. As rotas vão equilibrar.</p>
        )}
      </Section>

      <Section title="Vai ter que dividir" id="dividir">
        {split.length ? (
          <ul className="grid gap-2">
            {split.slice(0, 8).map((r) => (
              <li key={r.card.id} className="card grid gap-2 p-3">
                <span className="font-display text-[1.3rem] leading-tight">{r.card.name_pt}</span>
                <p className="text-sm text-ink-2">
                  {list(r.yes)} {r.yes.length === 1 ? "quer" : "querem"}; {list(r.no)} {r.no.length === 1 ? "passa" : "passam"}.{r.card.split_group ? " Dá pra fazer em dois grupos num dia." : ""}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    quer <Faces ids={r.yes} />
                  </span>
                  <span className="flex items-center gap-1">
                    passa <Faces ids={r.no} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nada divide a família. Raro, e bom.</p>
        )}
      </Section>

      <Section title="Uma escolha pra fazer" id="escolha">
        <div className="card grid gap-3 p-4">
          <p className="font-display text-[1.3rem] leading-tight">Réveillon: onde?</p>
          {nyList.length ? (
            <ul className="grid gap-1">
              {nyList.map(([base, ids]) => (
                <li key={base} className="flex items-center justify-between gap-3">
                  <span className="capitalize">{base}</span>
                  <Faces ids={ids} />
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm text-ink-2">{nyList.length > 1 ? "A família se dividiu. As rotas vão mostrar as opções e a família vota." : "Todo mundo pediu o mesmo lugar."}</p>
        </div>
      </Section>

      {planner ? (
        <Link href="/plan" className="btn btn-primary justify-self-start no-underline">
          Montar as rotas (Mesa do Pedro)
        </Link>
      ) : (
        <p className="text-sm text-muted">O Pedro monta as rotas a partir daqui. Depois, a família vota.</p>
      )}
    </main>
  );
}
