"use client";

import { useState } from "react";
import { PACKING_CATEGORIES, presetItems, type PackingPreset } from "@/lib/family";
import { deleteRow, insertRow, updateRow, useTable } from "@/lib/tables";
import { EkiStamp } from "./EkiStamp";
import { useStore } from "./providers";
import { Avatar, PageHeader, Section, firstName } from "./ui";

const PRESETS: { key: PackingPreset; label: string; hint: string }[] = [
  { key: "base", label: "O básico", hint: "Documentos, dinheiro, eletrônicos" },
  { key: "inverno", label: "Inverno", hint: "De 0 a 10 °C, com neve nos Alpes" },
  { key: "gravidez", label: "Gravidez", hint: "Atestado de voo, pré-natal, conforto" },
  { key: "pais", label: "Para os pais", hint: "Remédios, óculos, cópias" },
];

/** Packing list per person, with presets. 80% packed earns a passport stamp. */
export function MalaView() {
  const { trip, me } = useStore();
  const { rows } = useTable("packing_items");
  const mine = rows.filter((r) => r.traveller_id === me?.travellerId).sort((a, b) => a.sort - b.sort);
  const done = mine.filter((r) => r.checked).length;
  const pct = mine.length ? done / mine.length : 0;
  const [picked, setPicked] = useState<Set<PackingPreset>>(new Set(["base", "inverno"]));
  const [newItem, setNewItem] = useState("");

  async function create() {
    if (!me) return;
    let sort = mine.length;
    const seen = new Set(mine.map((m) => m.text));
    for (const p of PRESETS.filter((x) => picked.has(x.key))) {
      for (const it of presetItems(p.key)) {
        if (seen.has(it.text)) continue;
        seen.add(it.text);
        await insertRow("packing_items", { traveller_id: me.travellerId, text: it.text, category: it.category, checked: false, sort: sort++, created_at: new Date().toISOString() });
      }
    }
  }

  const groups = Object.keys(PACKING_CATEGORIES)
    .map((c) => [c, mine.filter((m) => m.category === c)] as const)
    .filter(([, items]) => items.length);

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      <PageHeader eyebrow={me ? `A mala de ${firstName(me.name)}` : "Mala"} title="Mala" hand={mine.length ? `${done} de ${mine.length}` : "vamos montar?"} />

      {mine.length ? (
        <>
          <div className="flex items-center gap-4">
            <div className="grid flex-1 gap-1">
              <div className="h-3 overflow-hidden rounded-full bg-paper-2" aria-hidden="true">
                <div className="h-full rounded-full bg-pine transition-[width]" style={{ width: `${pct * 100}%` }} />
              </div>
              <p className="text-sm text-muted">{pct >= 0.8 ? "Mala pronta: carimbo garantido!" : `Faltam ${Math.ceil(mine.length * 0.8) - done} para o carimbo`}</p>
            </div>
            <EkiStamp motif="suitcase" ink="var(--pine)" top="Mala pronta" bottom="80%" inked={pct >= 0.8} animate size={72} rotate={8} />
          </div>

          {groups.map(([cat, items]) => (
            <Section key={cat} title={PACKING_CATEGORIES[cat]} aside={`${items.filter((i) => i.checked).length}/${items.length}`}>
              <ul className="card divide-y divide-rule">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 px-4 py-3">
                    <input
                      id={`p-${it.id}`}
                      type="checkbox"
                      className="check"
                      checked={it.checked}
                      onChange={(e) => updateRow("packing_items", it.id, { checked: e.target.checked })}
                    />
                    <label htmlFor={`p-${it.id}`} className={`flex-1 text-[1.02rem] ${it.checked ? "text-muted line-through" : ""}`}>
                      {it.text}
                    </label>
                    <button type="button" aria-label={`Remover ${it.text}`} className="text-muted" onClick={() => deleteRow("packing_items", it.id)}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          ))}

          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!me || !newItem.trim()) return;
              await insertRow("packing_items", { traveller_id: me.travellerId, text: newItem.trim(), category: "geral", checked: false, sort: mine.length, created_at: new Date().toISOString() });
              setNewItem("");
            }}
          >
            <input className="input" placeholder="Mais alguma coisa…" value={newItem} onChange={(e) => setNewItem(e.target.value)} aria-label="Novo item" />
            <button className="btn shrink-0">Adicionar</button>
          </form>
        </>
      ) : (
        <section className="card grid gap-4 p-5">
          <p className="text-[1.05rem]">Escolha o que entra na sua lista. Depois dá para tirar e acrescentar à vontade.</p>
          <ul className="grid gap-2">
            {PRESETS.map((p) => (
              <li key={p.key}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-rule p-3">
                  <input
                    type="checkbox"
                    className="check"
                    checked={picked.has(p.key)}
                    onChange={(e) => {
                      const next = new Set(picked);
                      if (e.target.checked) next.add(p.key);
                      else next.delete(p.key);
                      setPicked(next);
                    }}
                  />
                  <span>
                    <span className="block font-bold">{p.label}</span>
                    <span className="text-sm text-muted">{p.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button className="btn btn-primary" disabled={!picked.size || !me} onClick={create}>
            Criar minha lista
          </button>
        </section>
      )}

      <Section title="A família" id="familia">
        {!rows.length ? (
          <p className="hand text-lg text-muted">Ninguém começou ainda. Seja o primeiro!</p>
        ) : (
        <ul className="grid gap-2">
          {trip.travellers.map((t, i) => {
            const items = rows.filter((r) => r.traveller_id === t.id);
            const d = items.filter((r) => r.checked).length;
            return (
              <li key={t.id} className="flex items-center gap-3">
                <Avatar name={t.name} index={i} size={30} />
                <span className="w-20 truncate text-sm">{firstName(t.name)}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2" aria-hidden="true">
                  <span className="block h-full rounded-full bg-pine" style={{ width: items.length ? `${(d / items.length) * 100}%` : 0 }} />
                </span>
                <span className="w-20 text-right text-xs text-muted tabular-nums">{items.length ? `${Math.round((d / items.length) * 100)}%` : "não começou"}</span>
              </li>
            );
          })}
        </ul>
        )}
      </Section>
    </main>
  );
}
