"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { routeColor } from "@/lib/colors";
import { planBudget } from "@/lib/plan";
import { useTable } from "@/lib/tables";
import { ROUTE_INK, ROUTE_MOTIF } from "@/lib/stamps";
import { compareRows, yen, type CompareRow } from "@/lib/trip";
import type { Route } from "@/lib/types";
import { EkiStamp } from "./EkiStamp";
import { useStore } from "./providers";
import { PageHeader } from "./ui";
import { usePlans } from "./usePlans";

/** P1.3: side-by-side table of the candidate routes. */
export function CompareView() {
  const { trip, resolvedTheme, votes } = useStore();
  const { plans, routeFor } = usePlans();
  const { rows: bookings } = useTable("bookings");
  const [withPlans, setWithPlans] = useState(true);
  const routes = useMemo(
    () => [...trip.routes.filter((r) => r.isCandidate), ...(withPlans ? plans.map(routeFor) : [])],
    [trip.routes, plans, routeFor, withPlans],
  );
  const rows = useMemo(() => {
    const out = compareRows(trip, routes);
    // Plans: cost from their own budget (bookings + estimates); exit airport isn't tracked.
    const cost = out.find((r) => r.key === "cost")!;
    for (const p of withPlans ? plans : []) {
      const total = planBudget(p, bookings).reduce((a, l) => a + l.projected, 0);
      cost.cells[p.id] = { value: total, text: yen(total), detail: "Pelo orçamento deste plano" };
    }
    return out;
  }, [trip, routes, plans, bookings, withPlans]);
  const [sortKey, setSortKey] = useState<string>("");
  const [onlyDiff, setOnlyDiff] = useState(false);

  const score = (id: string) => votes.filter((v) => v.routeId === id).reduce((a, v) => a + (routes.length + 1 - v.rank), 0);

  const sortRow = rows.find((r) => r.key === sortKey);
  const ordered = useMemo(() => {
    if (sortKey === "votes") return [...routes].sort((a, b) => score(b.id) - score(a.id));
    if (!sortRow) return routes;
    const dir = sortRow.better === "high" ? -1 : 1;
    return [...routes].sort((a, b) => {
      const va = sortRow.cells[a.id].value;
      const vb = sortRow.cells[b.id].value;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortRow, routes, votes]);

  const differs = (row: CompareRow) => new Set(routes.map((r) => row.cells[r.id].text)).size > 1;
  const best = (row: CompareRow): Set<string> => {
    if (!row.better) return new Set();
    const vals = routes.map((r) => row.cells[r.id].value).filter((v): v is number => v != null);
    if (!vals.length) return new Set();
    const target = row.better === "low" ? Math.min(...vals) : Math.max(...vals);
    if (vals.every((v) => v === target)) return new Set();
    return new Set(routes.filter((r) => row.cells[r.id].value === target).map((r) => r.id));
  };

  const shown = onlyDiff ? rows.filter(differs) : rows;

  const inkOf = (r: Route) => (r.isCandidate ? ROUTE_INK[r.code] : undefined) ?? routeColor(r.code, r.color, resolvedTheme);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-5 pb-12">
      <PageHeader eyebrow="As quatro rotas" title="Lado a lado">
        O melhor valor de cada linha leva um <span className="font-bold text-pine">✓</span>. Neve e conforto são estimativas nossas; os
        custos são por pessoa, para 20 noites, sem passagens aéreas.
      </PageHeader>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <label className="grid gap-1 text-sm font-medium">
          <span className="eyebrow">Ordenar por</span>
          <select className="input !w-auto max-w-full" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="">Letra da rota</option>
            <option value="votes">Votos da família</option>
            {rows
              .filter((r) => r.better)
              .map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5 accent-[var(--ink)]" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
          Só as linhas que mudam
        </label>
        {plans.length ? (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="size-5 accent-[var(--ink)]" checked={withPlans} onChange={(e) => setWithPlans(e.target.checked)} />
            Incluir nossos planos
          </label>
        ) : null}
      </div>

      {/* Cards on phones */}
      <div className="grid gap-4 md:hidden">
        {ordered.map((r) => {
          const ink = inkOf(r);
          return (
            <section key={r.id} className="card overflow-hidden" aria-labelledby={`cmp-${r.id}`} style={{ borderTop: `4px solid ${ink}` }}>
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                {r.isCandidate ? (
                  <EkiStamp motif={ROUTE_MOTIF[r.code] ?? "torii"} ink={ink} size={48} rotate={-6} seed={r.code.charCodeAt(0)} label="" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="eyebrow" style={{ color: ink }}>
                    {r.isCandidate ? `Rota ${r.code}` : "Nosso plano"}
                  </p>
                  <h2 id={`cmp-${r.id}`} className="text-[1.75rem] leading-none">
                    {r.name}
                  </h2>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted">{score(r.id)} pts</span>
              </div>
              <dl className="grid divide-y divide-rule border-t border-rule">
                {shown.map((row) => {
                  const c = row.cells[r.id];
                  const isBest = best(row).has(r.id);
                  return (
                    <div key={row.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-4 py-2 text-sm">
                      <dt className="text-muted">{row.label}</dt>
                      <dd>
                        <span className={isBest ? "font-bold text-pine" : ""}>
                          {c.text}
                          {isBest ? " ✓" : ""}
                        </span>
                        {c.detail ? <span className="block text-xs text-muted">{c.detail}</span> : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <div className="px-4 py-3">
                <Link href={`/rotas/${r.code}`} className="btn btn-sm w-full">
                  {r.isCandidate ? `Ver a rota ${r.code} no mapa` : "Ver no mapa"}
                </Link>
              </div>
            </section>
          );
        })}
      </div>

      {/* Table on wider screens */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="w-40 p-3 text-left align-bottom">
                <span className="eyebrow">Rota</span>
              </th>
              {ordered.map((r) => (
                <th key={r.id} scope="col" className="p-3 text-left align-bottom font-normal" style={{ borderTop: `4px solid ${inkOf(r)}` }}>
                  <span className="eyebrow block" style={{ color: inkOf(r) }}>
                    {r.isCandidate ? `Rota ${r.code}` : "Nosso plano"}
                  </span>
                  <Link href={`/rotas/${r.code}`} className="font-display text-[1.5rem] leading-tight no-underline hover:underline">
                    {r.name}
                  </Link>
                  <span className="block text-xs text-muted">{score(r.id)} pontos na votação</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const b = best(row);
              const diff = differs(row);
              return (
                <tr key={row.key} className="border-t border-rule" style={!diff ? { opacity: 0.7 } : undefined}>
                  <th scope="row" className="p-3 text-left align-top font-medium text-muted">
                    {row.label}
                  </th>
                  {ordered.map((r) => {
                    const c = row.cells[r.id];
                    const isBest = b.has(r.id);
                    return (
                      <td
                        key={r.id}
                        className="p-3 align-top"
                        style={row.key === sortKey ? { background: "var(--paper-2)" } : undefined}
                      >
                        <span className={isBest ? "font-bold text-pine" : ""}>
                          {c.text}
                          {isBest ? " ✓" : ""}
                        </span>
                        {c.detail ? <span className="block text-xs text-muted">{c.detail}</span> : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
