"use client";

import { useMemo, useState } from "react";
import { coupleBalances, settleUp } from "@/lib/family";
import { todayInJapan } from "@/lib/plan";
import { deleteRow, insertRow, useSetting, useTable } from "@/lib/tables";
import { formatDay } from "@/lib/trip";
import { EkiStamp } from "./EkiStamp";
import { useStore } from "./providers";
import { Avatar, PageHeader, Section, firstName } from "./ui";

const yen = (n: number) => "¥" + Math.round(n).toLocaleString("pt-BR");

/** Shared expenses in yen, split per couple, with who-pays-whom. */
export function ContasView() {
  const { trip, me } = useStore();
  const { rows } = useTable("expenses");
  const [brl] = useSetting<number>("fx_jpy_per_brl", 27);
  const coupleOf = useMemo(() => new Map(trip.travellers.map((t) => [t.id, t.couple ?? t.id])), [trip.travellers]);
  const couples = useMemo(() => [...new Set(trip.travellers.map((t) => t.couple ?? t.id))], [trip.travellers]);
  const coupleName = (c: string) =>
    trip.travellers
      .filter((t) => (t.couple ?? t.id) === c)
      .map((t) => firstName(t.name))
      .join(" & ");
  const idx = new Map(trip.travellers.map((t, i) => [t.id, i]));
  const names = new Map(trip.travellers.map((t) => [t.id, t.name]));
  const balances = coupleBalances(rows, coupleOf, couples);
  const transfers = settleUp(balances);
  const total = rows.reduce((a, e) => a + e.amount_jpy, 0);

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [payer, setPayer] = useState<string>("");
  // null = everyone; a list = only those couples.
  const [picked, setPicked] = useState<string[] | null>(null);
  const split = picked ?? couples;
  const paidBy = payer || me?.travellerId || "";
  const brlOf = (n: number) => `R$ ${(n / brl).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = Math.round(Number(amount.replace(/\D/g, "")));
    if (!me || !v || !desc.trim()) return;
    await insertRow("expenses", {
      paid_by: paidBy,
      amount_jpy: v,
      description: desc.trim(),
      date: todayInJapan(),
      split_couples: split.length === couples.length ? [] : split,
      created_by: me.travellerId,
      created_at: new Date().toISOString(),
    });
    setAmount("");
    setDesc("");
    setPicked(null);
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      <PageHeader eyebrow="Dividido por casal" title="Contas" hand={total ? yen(total) : "tudo zerado"}>
        Anote quem pagou o quê. O app divide entre os casais e mostra quem acerta com quem no fim.
      </PageHeader>

      <section className="card grid gap-4 p-5" aria-labelledby="bal-h">
        <h2 id="bal-h" className="text-[1.6rem]">
          Quem acerta com quem
        </h2>
        {transfers.length ? (
          <ul className="grid gap-2">
            {transfers.map((t, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 text-[1.05rem]">
                <span>
                  <b>{coupleName(t.from)}</b> → <b>{coupleName(t.to)}</b>
                </span>
                <span className="tabular-nums">
                  {yen(t.amount)} <span className="text-sm text-muted">· {brlOf(t.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3">
            <EkiStamp motif="coin" ink="var(--amber)" top="Tudo acertado" bottom="Contas" size={70} rotate={-6} inked={rows.length > 0} />
            <p className="text-muted">{rows.length ? "Ninguém deve nada a ninguém." : "Nenhum gasto ainda."}</p>
          </div>
        )}
        {rows.length ? <ul className="grid gap-1 border-t border-dashed border-rule pt-3 text-sm">
          {balances.map((b) => (
            <li key={b.couple} className="flex justify-between">
              <span>{coupleName(b.couple)}</span>
              <span className="tabular-nums text-muted">
                pagou {yen(b.paid)} · parte {yen(b.share)}
              </span>
            </li>
          ))}
        </ul> : null}
      </section>

      <form onSubmit={add} className="card grid gap-3 p-5">
        <h2 className="text-[1.6rem]">Novo gasto</h2>
        <div className="grid grid-cols-[8rem_1fr] gap-2">
          <label className="grid gap-1 text-xs text-muted">
            Valor (¥) · ≈ {brlOf(Number(amount.replace(/\D/g, "")) || 0)}
            <input className="input tabular-nums" inputMode="numeric" placeholder="3.000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs text-muted">
            O quê
            <input className="input" placeholder="Ramen em Shinjuku" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-xs text-muted">Quem pagou</legend>
          <div className="flex flex-wrap gap-2">
            {trip.travellers.map((t, i) => (
              <button key={t.id} type="button" className="chip !pl-1 text-sm" aria-pressed={paidBy === t.id} onClick={() => setPayer(t.id)}>
                <Avatar name={t.name} index={i} size={26} />
                {firstName(t.name)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-xs text-muted">Dividir entre</legend>
          <div className="flex flex-wrap gap-2">
            {couples.map((c) => (
              <button
                key={c}
                type="button"
                className="chip text-sm"
                aria-pressed={split.includes(c)}
                onClick={() => setPicked(split.includes(c) ? split.filter((x) => x !== c) : [...split, c])}
              >
                {coupleName(c)}
              </button>
            ))}
          </div>
        </fieldset>
        <button className="btn btn-primary" disabled={!amount || !desc.trim() || !split.length}>
          Anotar gasto
        </button>
      </form>

      {rows.length ? (
        <Section title="Gastos" aside={`${rows.length}`}>
          <ul className="card divide-y divide-rule">
            {[...rows]
              .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
              .map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={names.get(e.paid_by) ?? "?"} index={idx.get(e.paid_by) ?? 0} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{e.description}</span>
                    <span className="text-xs text-muted">
                      {firstName(names.get(e.paid_by) ?? "")} pagou{e.date ? ` · ${formatDay(e.date)}` : ""}
                      {e.split_couples.length ? ` · só ${e.split_couples.map(coupleName).join(", ")}` : ""}
                    </span>
                  </span>
                  <span className="text-right tabular-nums">
                    {yen(e.amount_jpy)}
                    <span className="block text-xs text-muted">{brlOf(e.amount_jpy)}</span>
                  </span>
                  {me && (me.travellerId === e.created_by || me.role === "planner") ? (
                    <button type="button" aria-label={`Apagar ${e.description}`} className="text-muted" onClick={() => confirm("Apagar este gasto?") && deleteRow("expenses", e.id)}>
                      ×
                    </button>
                  ) : null}
                </li>
              ))}
          </ul>
        </Section>
      ) : null}
    </main>
  );
}
