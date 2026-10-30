"use client";

import { useMemo, useState } from "react";
import { todayInJapan } from "@/lib/plan";
import { deleteRow, insertRow, useOutboxCount, useTable } from "@/lib/tables";
import { TRIP_END, TRIP_START, formatLong, placeMap } from "@/lib/trip";
import { EkiStamp } from "./EkiStamp";
import { useStore } from "./providers";
import { Avatar, PageHeader, firstName } from "./ui";
import { usePlans } from "./usePlans";

/** "+ Anotar": the family notebook. Works offline; notes sync when the signal returns. */
export function AnotarView() {
  const { trip, me } = useStore();
  const { chosen, routeFor } = usePlans();
  const { rows } = useTable("notes");
  const pending = useOutboxCount();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const P = useMemo(() => placeMap(trip), [trip]);
  const today = todayInJapan();
  const during = today >= TRIP_START && today <= TRIP_END;
  const base = chosen && during ? routeFor(chosen).stays.find((s) => today >= s.startDate && today < addDaysLocal(s.startDate, s.nights)) : null;
  const idx = new Map(trip.travellers.map((t, i) => [t.id, i]));
  const names = new Map(trip.travellers.map((t) => [t.id, t.name]));

  const byDay = useMemo(() => {
    const sorted = [...rows].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    const groups = new Map<string, typeof rows>();
    for (const n of sorted) {
      const key = n.date ?? (n.created_at ?? "").slice(0, 10) ?? "";
      groups.set(key, [...(groups.get(key) ?? []), n]);
    }
    return [...groups.entries()];
  }, [rows]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !text.trim()) return;
    await insertRow("notes", {
      traveller_id: me.travellerId,
      date: during ? today : null,
      place_slug: base?.place ?? null,
      text: text.trim(),
      created_at: new Date().toISOString(),
    });
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      <PageHeader eyebrow={base ? `Hoje em ${P.get(base.place)?.name}` : "O caderno da família"} title="Caderno" hand="o que não pode ser esquecido" />

      <form onSubmit={save} className="card grid gap-3 p-4">
        <label htmlFor="note" className="sr-only">
          Sua anotação
        </label>
        <textarea
          id="note"
          className="input min-h-36 resize-none !rounded-xl font-hand text-lg leading-relaxed"
          placeholder="Um lugar, um sabor, uma ideia, uma frase da Mãe…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted" role="status">
            {saved ? "Anotado ✓" : pending ? `${pending} anotaç${pending === 1 ? "ão" : "ões"} esperando internet` : "Todos veem as anotações."}
          </span>
          <button className="btn btn-primary" disabled={!text.trim() || !me}>
            Anotar
          </button>
        </div>
      </form>

      {byDay.length ? (
        <ol className="grid gap-8">
          {byDay.map(([day, notes]) => (
            <li key={day} className="grid gap-3">
              <h2 className="text-[1.6rem]">{day ? cap(formatLong(day)) : "Sem data"}</h2>
              <ul className="grid gap-3">
                {notes.map((n) => (
                  <li key={n.id} className="card grid gap-2 p-4">
                    <p className="font-hand text-lg leading-relaxed whitespace-pre-line">{n.text}</p>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Avatar name={names.get(n.traveller_id) ?? "?"} index={idx.get(n.traveller_id) ?? 0} size={22} />
                      <span>
                        {firstName(names.get(n.traveller_id) ?? "")}
                        {n.place_slug ? ` · ${P.get(n.place_slug)?.name ?? n.place_slug}` : ""}
                        {n.created_at ? ` · ${n.created_at.slice(11, 16)}` : ""}
                      </span>
                      {me && (me.travellerId === n.traveller_id || me.role === "planner") ? (
                        <button type="button" className="ml-auto underline" onClick={() => confirm("Apagar esta anotação?") && deleteRow("notes", n.id)}>
                          Apagar
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid justify-items-center gap-3 py-8 text-center text-muted">
          <EkiStamp motif="brush" ink="var(--plum)" top="Caderno" bottom="em branco" inked={false} size={110} />
          <p>O caderno está em branco. A primeira anotação ganha um carimbo no passaporte.</p>
        </div>
      )}
    </main>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function addDaysLocal(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
