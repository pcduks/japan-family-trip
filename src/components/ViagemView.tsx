"use client";

import { useMemo } from "react";
import { coupleBalances } from "@/lib/family";
import { useTable } from "@/lib/tables";
import { useStore } from "./providers";
import { PageHeader, StampCard } from "./ui";
import { usePlans } from "./usePlans";

/** The hub: one card per part of the trip, each saying where things stand. */
export function ViagemView() {
  const { trip, me } = useStore();
  const { chosen } = usePlans();
  const { rows: packing } = useTable("packing_items");
  const { rows: notes } = useTable("notes");
  const { rows: expenses } = useTable("expenses");
  const { rows: marks } = useTable("food_marks");

  const food = trip.places.filter((p) => p.kind === "food");
  const myPacking = packing.filter((p) => p.traveller_id === me?.travellerId);
  const packed = myPacking.filter((p) => p.checked).length;
  const wantCount = marks.filter((m) => m.traveller_id === me?.travellerId && m.status === "want").length;

  const contas = useMemo(() => {
    if (!expenses.length) return "Nenhum gasto ainda";
    const coupleOf = new Map(trip.travellers.map((t) => [t.id, t.couple ?? t.id]));
    const couples = [...new Set(trip.travellers.map((t) => t.couple ?? t.id))];
    const mine = me ? coupleOf.get(me.travellerId) : null;
    const b = coupleBalances(expenses, coupleOf, couples).find((x) => x.couple === mine);
    const total = expenses.reduce((a, e) => a + e.amount_jpy, 0);
    if (!b || Math.abs(b.balance) < 1) return `¥${total.toLocaleString("pt-BR")} no total · tudo acertado`;
    return b.balance > 0 ? `Vocês têm ¥${Math.round(b.balance).toLocaleString("pt-BR")} a receber` : `Vocês devem ¥${Math.round(-b.balance).toLocaleString("pt-BR")}`;
  }, [expenses, trip.travellers, me]);

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-5 pb-12">
      <PageHeader eyebrow="Tudo o que a viagem precisa" title="A viagem" hand="um lugar para cada coisa" />
      <Group title="Antes de ir">
        <StampCard wide href="/food" motif="bowl" ink="var(--amber)" title="Comida" status={`${food.length} lugares de Tokyo${wantCount ? ` · você quer ir a ${wantCount}` : ""}`} />
        <StampCard href="/mala" motif="suitcase" ink="var(--pine)" title="Mala" status={myPacking.length ? `${packed} de ${myPacking.length} na mala` : "Monte sua lista"} />
        <StampCard href="/compare" motif="train" ink="var(--indigo)" title="Rotas" status="As quatro, lado a lado" />
      </Group>
      <Group title="Lá no Japão">
        <StampCard href="/guides/tokyo" motif="tower" ink="var(--vermilion)" title="Tokyo" status="Dias, bairros e noites" />
        <StampCard href="/guides/kyoto" motif="torii" ink="var(--plum)" title="Kyoto" status="Templos, Gion e jantares" />
        <StampCard href="/plan/bookings" motif="gassho" ink="var(--pine)" title="Onde ficamos" status={chosen ? `${chosen.stays.length} bases` : "Depois da votação"} />
        <StampCard href="/contas" motif="coin" ink="var(--amber)" title="Contas" status={contas} />
        <StampCard wide href="/anotar" motif="brush" ink="var(--plum)" title="Caderno" status={notes.length ? `${notes.length} anotaç${notes.length === 1 ? "ão" : "ões"} da família` : "Em branco: toque no + para anotar"} />
        <StampCard wide href="/socorro" motif="cross" ink="var(--danger)" title="Socorro" status="Emergências, maternidades, frases úteis" />
      </Group>
      <Group title="Privado">
        <StampCard wide href="/documents" motif="passport" ink="var(--indigo)" title="Documentos" status="Passaportes, seguro, atestado" />
        {me?.role === "planner" ? (
          <StampCard wide href="/plan" motif="map" ink="var(--ink)" title="Mesa do Pedro" status="Planos, reservas, orçamento" />
        ) : null}
      </Group>
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="eyebrow">{title}</h2>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}
