"use client";

import { useMemo } from "react";
import { staysNeedingLodging, todayInJapan } from "@/lib/plan";
import { placeStamp, stampLabel } from "@/lib/stamps";
import { useTable } from "@/lib/tables";
import { placeMap, stampDate } from "@/lib/trip";
import { EkiStamp, type Motif } from "./EkiStamp";
import { useStore } from "./providers";
import { PageHeader, Section, firstName } from "./ui";
import { usePlans } from "./usePlans";

interface Slot {
  key: string;
  motif: Motif;
  ink: string;
  top: string;
  bottom: string;
  done: boolean;
  hint: string;
  shape?: "circle" | "square";
}

/** Collected stamps: milestones before the trip, then every base as it's lived. */
export function PassaporteView() {
  const { trip, me, votes } = useStore();
  const { chosen, routeFor } = usePlans();
  const { rows: packing } = useTable("packing_items");
  const { rows: notes } = useTable("notes");
  const { rows: marks } = useTable("food_marks");
  const { rows: bookings } = useTable("bookings");
  const P = useMemo(() => placeMap(trip), [trip]);
  const today = todayInJapan();
  const id = me?.travellerId;

  const mine = packing.filter((p) => p.traveller_id === id);
  const packedPct = mine.length ? mine.filter((p) => p.checked).length / mine.length : 0;
  const ate = marks.filter((m) => m.traveller_id === id && m.status === "been").length;

  const milestones: Slot[] = [
    { key: "vote", motif: "ballot", ink: "var(--vermilion)", top: "Votei", bottom: "Rota", done: votes.some((v) => v.travellerId === id), hint: "Vote na rota favorita" },
    { key: "route", motif: "train", ink: "var(--indigo)", top: "Rota escolhida", bottom: "2026", done: !!chosen, hint: "Quando a família escolher" },
    {
      key: "stays",
      motif: "gassho",
      ink: "var(--pine)",
      top: "Camas garantidas",
      bottom: "Reservas",
      done: !!chosen && staysNeedingLodging(chosen, bookings.filter((b) => b.plan_id === chosen.id)).length === 0,
      hint: "Quando todas as camas estiverem reservadas",
      shape: "square",
    },
    { key: "pack", motif: "suitcase", ink: "var(--pine)", top: "Mala pronta", bottom: "80%", done: packedPct >= 0.8, hint: "Marque 80% da sua mala" },
    { key: "note", motif: "brush", ink: "var(--plum)", top: "Primeira nota", bottom: "Caderno", done: notes.some((n) => n.traveller_id === id), hint: "Escreva sua primeira anotação" },
    { key: "food", motif: "bowl", ink: "var(--amber)", top: "Bom de garfo", bottom: `${Math.min(ate, 5)} de 5`, done: ate >= 5, hint: "Marque 5 lugares onde comeu", shape: "square" },
    { key: "nye", motif: "bell", ink: "var(--vermilion)", top: "Joya no kane", bottom: "31 · XII", done: today >= "2027-01-01", hint: "O sino do Ano-Novo, na virada" },
    { key: "home", motif: "fuji", ink: "var(--indigo)", top: "Okaeri", bottom: "9 · I · 2027", done: today >= "2027-01-09", hint: "“Bem-vindos de volta”, em casa" },
  ];

  const nextKey = milestones.find((m) => !m.done)?.key;
  const route = chosen ? routeFor(chosen) : null;
  const places: Slot[] = route
    ? route.stays.map((s, i) => {
        const p = P.get(s.place);
        const st = placeStamp(s.place, p?.kind);
        return {
          key: s.id,
          motif: st.motif,
          ink: st.ink,
          top: stampLabel(p?.name ?? s.place),
          bottom: stampDate(s.startDate),
          done: today >= s.startDate,
          hint: `${p?.name ?? s.place}, ${stampDate(s.startDate).replace(/ · /g, "/")}`,
          shape: i % 3 === 2 ? "square" : "circle",
        };
      })
    : [];
  const got = [...milestones, ...places].filter((s) => s.done).length;
  const total = milestones.length + places.length;

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      <PageHeader eyebrow={`Passaporte de ${me ? firstName(me.name) : "viagem"}`} title="Carimbos" hand={`${got} de ${total}`}>
        No Japão, estações e templos têm carimbos para os viajantes colecionarem. Aqui também: cada passo da viagem deixa a sua marca.
      </PageHeader>

      <Section title="Antes e durante" id="marcos">
        <StampGrid slots={milestones} next={nextKey} />
      </Section>

      <Section title="Pelo caminho" id="lugares" aside={route ? `${route.stays.length} bases` : undefined}>
        {places.length ? (
          <StampGrid slots={places} />
        ) : (
          <>
            <p className="text-muted">Quando a rota for escolhida, cada base ganha um carimbo aqui, no dia em que vocês chegarem.</p>
            <StampGrid slots={PLACEHOLDERS} />
          </>
        )}
      </Section>
    </main>
  );
}

const PLACEHOLDERS: Slot[] = (["torii", "onsen", "castle", "snow"] as const).map((motif, i) => ({
  key: `ph-${i}`,
  motif,
  ink: "var(--ink)",
  top: `Base ${i + 1}`,
  bottom: "em breve",
  done: false,
  hint: "",
}));

function StampGrid({ slots, next }: { slots: Slot[]; next?: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 rounded-2xl border border-rule bg-card p-4 sm:grid-cols-3">
      {slots.map((s, i) => (
        <li key={s.key} className="relative grid content-start justify-items-center gap-1 text-center">
          {s.key === next ? (
            <span className="absolute top-0 left-1/2 -z-0 size-[120px] -translate-x-1/2 -translate-y-1 animate-pulse rounded-full border-2 border-dashed border-vermilion" aria-hidden="true" />
          ) : null}
          <EkiStamp
            motif={s.motif}
            ink={s.ink}
            top={s.top}
            bottom={s.bottom}
            inked={s.done}
            rotate={s.done ? ((i * 37) % 17) - 8 : 0}
            seed={i + 2}
            size={112}
            shape={s.shape}
            label={s.done ? s.top : `${s.top}: ainda não`}
          />
          <span className="grid gap-0.5 text-center leading-tight">
            <span className={`text-sm ${s.done ? "font-bold" : "text-ink-2"}`}>{s.top}</span>
            {s.key === next ? <span className="text-xs font-bold text-vermilion">Próximo: {s.hint.charAt(0).toLowerCase() + s.hint.slice(1)}</span> : s.done || !s.hint ? null : <span className="text-xs text-muted">{s.hint}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
