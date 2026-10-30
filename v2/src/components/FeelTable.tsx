"use client";

import { useMemo } from "react";
import { FEEL_ROWS, feelOf, type Feel } from "@/lib/feel";
import type { Version } from "@/lib/types";
import { useStore } from "./providers";

/** Lower is easier on every row but time outdoors, which is neither better nor worse. */
const NEUTRAL: (keyof Feel)[] = ["outdoor"];

/**
 * How it feels, side by side: our route in the first column, each other route
 * after it, with what is easier or harder than ours marked.
 */
export function FeelTable({ columns, caption }: { columns: { label: string; v: Version }[]; caption?: string }) {
  const { snapshot, rules } = useStore();
  const feels = useMemo(() => columns.map((c) => feelOf(c.v, snapshot, rules)), [columns, snapshot, rules]);
  const base = feels[0];
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[20rem] text-sm">
        {caption ? <caption className="pb-2 text-left text-sm text-muted">{caption}</caption> : null}
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1 pr-2 font-semibold" />
            {columns.map((c, i) => (
              <th key={c.label} className={`py-1 pl-2 text-right font-semibold ${i === 0 ? "text-ink" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEEL_ROWS.map((row) => (
            <tr key={row.key} className="border-t border-rule align-top">
              <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                <span className="block font-semibold">{row.label}</span>
                <span className="block text-xs text-muted">{row.note}</span>
              </th>
              {feels.map((f, i) => {
                const n = f[row.key];
                const was = base[row.key];
                const tone = i === 0 || n === null || was === null || n === was || NEUTRAL.includes(row.key) ? "" : n < was ? "text-ok" : "text-danger";
                return (
                  <td key={columns[i].label} className={`py-1.5 pl-2 text-right font-semibold whitespace-nowrap ${tone}`}>
                    {n === null ? "—" : row.fmt(n)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
