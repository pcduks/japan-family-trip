"use client";

import { useState } from "react";
import { useSetting } from "@/lib/tables";
import { CommitInput } from "./PlanEditor";
import { useStore } from "./providers";
import { PageHeader, Section } from "./ui";

/** Trip-wide comfort rules the builder enforces. Entered once by the planner, labelled as family rules. */
export interface ComfortRules {
  max_transit_hours: number;
  max_rail_legs_over_2h: number;
  rest_day_after_hours: number;
  max_walk_km: number;
  hospital_minutes: number;
  ny_perinatal_city: boolean;
  budget_per_couple_sgd: number;
}

export const DEFAULT_RULES: ComfortRules = {
  max_transit_hours: 4,
  max_rail_legs_over_2h: 1,
  rest_day_after_hours: 3,
  max_walk_km: 9,
  hospital_minutes: 30,
  ny_perinatal_city: true,
  budget_per_couple_sgd: 15000,
};

export interface NyOption {
  base: string;
  title: string;
  line: string;
  /** Where the refundable hold is and until when, e.g. "Mimaru Namba, cancela grátis até 20 nov". */
  held?: string;
}

/** Mesa do Pedro → Regras: comfort rules and the held Réveillon options the family chooses from. */
export function RegrasView() {
  const { me } = useStore();
  const planner = me?.role === "planner";
  const [rules, setRules] = useSetting<ComfortRules>("comfort_rules", DEFAULT_RULES);
  const [ny, setNy] = useSetting<NyOption[]>("ny_options", []);
  const r = { ...DEFAULT_RULES, ...rules };
  const [draft, setDraft] = useState<NyOption>({ base: "", title: "", line: "", held: "" });

  const num = (key: keyof ComfortRules, label: string, hint: string, min: number, max: number) => (
    <label className="grid gap-1 text-sm">
      <span>
        {label} <span className="text-muted">· {hint}</span>
      </span>
      <CommitInput ariaLabel={label} type="number" value={String(r[key])} disabled={!planner} className="input" onCommit={(v) => Number(v) >= min && Number(v) <= max && setRules({ ...r, [key]: Number(v) })} />
    </label>
  );

  return (
    <main className="grid gap-8">
      <PageHeader title="Regras de conforto" hand="valem para a família toda">
        O montador de rotas obedece a estas regras antes de olhar os desejos. Elas são da viagem, não de uma pessoa.
      </PageHeader>

      <Section title="Deslocamento e ritmo" id="ritmo">
        <div className="card grid gap-3 p-4 sm:grid-cols-2">
          {num("max_transit_hours", "Máximo de horas de deslocamento por dia", "porta a porta", 2, 8)}
          {num("max_rail_legs_over_2h", "Trechos de trem acima de 2 h por dia", "no máximo", 0, 3)}
          {num("rest_day_after_hours", "Dia leve depois de um deslocamento de", "horas ou mais", 2, 6)}
          {num("max_walk_km", "Caminhada máxima por dia", "km, no dia mais pesado", 4, 15)}
          {num("hospital_minutes", "Hospital com obstetrícia a até", "minutos de cada base", 10, 90)}
          {num("budget_per_couple_sgd", "Orçamento por casal", "S$, sem as passagens", 5000, 50000)}
          <label className="flex items-center justify-between gap-3 text-sm sm:col-span-2">
            <span>
              Réveillon (29 dez – 3 jan) numa cidade com centro perinatal <span className="text-muted">· clínicas fecham nesses dias</span>
            </span>
            <input type="checkbox" role="switch" className="size-5 accent-[var(--vermilion)]" checked={r.ny_perinatal_city} disabled={!planner} onChange={(e) => setRules({ ...r, ny_perinatal_city: e.target.checked })} />
          </label>
        </div>
      </Section>

      <Section title="Opções de Réveillon" id="ny" aside="só as que têm reserva segurada">
        <p className="-mt-1 text-sm text-muted">A família escolhe entre estas em Desejos. Segure a hospedagem (cancelamento grátis) antes de pôr aqui.</p>
        {ny.length ? (
          <ul className="grid gap-2">
            {ny.map((o, i) => (
              <li key={o.base} className="card flex flex-wrap items-center gap-3 p-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[1.3rem] leading-tight">
                    {o.title} <span className="font-sans text-xs text-muted">({o.base})</span>
                  </span>
                  <span className="block text-sm text-ink-2">{o.line}</span>
                  {o.held ? <span className="block text-xs text-pine">Segurado: {o.held}</span> : <span className="block text-xs text-danger">Sem reserva segurada</span>}
                </span>
                {planner ? (
                  <button type="button" className="text-sm text-danger underline" onClick={() => setNy(ny.filter((_, j) => j !== i))}>
                    Tirar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-4 text-sm text-ink-2">Nenhuma opção ainda. Até você cadastrar, Desejos mostra Kanazawa, Kyoto e Fukuoka como exemplo.</p>
        )}
        {planner ? (
          <form
            className="card grid gap-2 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.base || !draft.title) return;
              setNy([...ny.filter((o) => o.base !== draft.base), { ...draft, base: draft.base.trim().toLowerCase() }]);
              setDraft({ base: "", title: "", line: "", held: "" });
            }}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="input" placeholder="base (ex.: kanazawa)" value={draft.base} onChange={(e) => setDraft({ ...draft, base: e.target.value })} aria-label="Base" />
              <input className="input" placeholder="Título (ex.: Kanazawa)" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Título" />
            </div>
            <input className="input" placeholder="Uma linha para a família: o que tem, hospital a X min" value={draft.line} onChange={(e) => setDraft({ ...draft, line: e.target.value })} aria-label="Descrição" />
            <input className="input" placeholder="Reserva segurada: hotel, cancela grátis até…" value={draft.held ?? ""} onChange={(e) => setDraft({ ...draft, held: e.target.value })} aria-label="Reserva" />
            <button className="btn btn-sm btn-primary justify-self-start">Adicionar opção</button>
          </form>
        ) : null}
      </Section>
    </main>
  );
}
