"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { routeColor } from "@/lib/colors";
import { compareRows, type CompareRow } from "@/lib/trip";
import { useStore } from "./providers";

/** P1.3: side-by-side table of the candidate routes. */
export function CompareView() {
  const { trip, resolvedTheme, votes } = useStore();
  const routes = trip.routes.filter((r) => r.isCandidate);
  const rows = useMemo(() => compareRows(trip, routes), [trip, routes]);
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

  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-4">
      <div>
        <h1 className="text-2xl font-extrabold">Compare the routes</h1>
        <p className="text-sm text-muted">
          Best value in each row is marked <span className="font-bold text-ok">✓</span>. Snow and comfort are our own estimates; costs are
          per person for 20 nights, excluding flights.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-medium">
          Sort routes by
          <select className="input !w-auto" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="">Route letter</option>
            <option value="votes">Family votes</option>
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
          <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
          Only rows that differ
        </label>
      </div>

      {/* Cards on phones */}
      <div className="grid gap-3 md:hidden">
        {ordered.map((r) => (
          <section key={r.id} className="card overflow-hidden" aria-labelledby={`cmp-${r.id}`}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: `6px solid ${routeColor(r.code, r.color, resolvedTheme)}` }}>
              <h2 id={`cmp-${r.id}`} className="text-lg font-extrabold">
                {r.code} · {r.name}
              </h2>
              <span className="ml-auto text-sm text-muted">{score(r.id)} pts</span>
            </div>
            <dl className="grid divide-y divide-line border-t border-line">
              {shown.map((row) => {
                const c = row.cells[r.id];
                const isBest = best(row).has(r.id);
                return (
                  <div key={row.key} className="grid grid-cols-[8.5rem_1fr] gap-3 px-4 py-2 text-sm">
                    <dt className="text-muted">{row.label}</dt>
                    <dd>
                      <span className={isBest ? "font-bold text-ok" : ""}>
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
              <Link href={`/?r=${r.code}`} className="btn btn-sm w-full">
                See route {r.code} on the map
              </Link>
            </div>
          </section>
        ))}
      </div>

      {/* Table on wider screens */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="w-40 p-3 text-left align-bottom font-mono text-xs font-medium tracking-wider text-muted uppercase">
                Route
              </th>
              {ordered.map((r) => (
                <th key={r.id} scope="col" className="p-3 text-left align-bottom" style={{ borderTop: `6px solid ${routeColor(r.code, r.color, resolvedTheme)}` }}>
                  <Link href={`/?r=${r.code}`} className="text-base font-extrabold no-underline hover:underline">
                    {r.code} · {r.name}
                  </Link>
                  <span className="block text-xs font-normal text-muted">{score(r.id)} vote points</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const b = best(row);
              const diff = differs(row);
              return (
                <tr key={row.key} className="border-t border-line" style={!diff ? { opacity: 0.7 } : undefined}>
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
                        style={row.key === sortKey ? { background: "var(--soft)" } : undefined}
                      >
                        <span className={isBest ? "font-bold text-ok" : ""}>
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
