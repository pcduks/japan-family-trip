"use client";

import Link from "next/link";
import { useState } from "react";
import { versionGuide } from "@/lib/guide";
import { STYLE_LABEL, styleOf } from "@/lib/styles";
import type { Version } from "@/lib/types";
import { statsOf } from "@/lib/versions";
import { useStore } from "./providers";

/** Every route there is, by style: the plan, the alternatives, and the ones the family built. */
export function RoutePicker({ current, onPick }: { current: string; onPick: (id: string | null) => void }) {
  const { snapshot } = useStore();
  const plan = snapshot.versions.find((v) => v.status === "plan");
  const alternatives = snapshot.versions.filter((v) => v.status === "alternative");
  const family = snapshot.versions.filter((v) => v.status === "personal" && v.shared !== false);
  const styles = Array.from(new Set(alternatives.map((v) => styleOf(v.id)))).sort((a, b) => Object.keys(STYLE_LABEL).indexOf(a) - Object.keys(STYLE_LABEL).indexOf(b));
  const cur = snapshot.versions.find((v) => v.id === current);
  const initial = !cur || cur.status === "plan" ? "all" : cur.status === "personal" ? "yours" : "all";
  const [filter, setFilter] = useState<string>(initial);
  const list: Version[] = filter === "yours" ? family : filter === "all" ? alternatives : alternatives.filter((v) => styleOf(v.id) === filter);
  const author = (id: string) => snapshot.travellers.find((t) => t.id === id)?.name.split(" ")[0];

  return (
    <div className="grid gap-1.5">
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 text-[0.78rem]">
        {[["all", "All styles"], ...styles.map((s) => [s, STYLE_LABEL[s] ?? s]), ...(family.length ? [["yours", `Yours · ${family.length}`]] : [])].map(([k, label]) => (
          <button key={k} className={`shrink-0 rounded-full px-2.5 py-1 font-semibold ${filter === k ? "bg-ink text-bg" : "text-muted"}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {plan ? (
          <button className={`chip shrink-0 ${current === plan.id ? "bg-accent text-accent-ink" : ""}`} onClick={() => onPick(null)}>
            The route
          </button>
        ) : null}
        {list.map((a) => (
          <button key={a.id} className={`chip shrink-0 ${current === a.id ? "bg-accent text-accent-ink" : ""}`} onClick={() => onPick(a.id)} title={`${statsOf(a, snapshot).bases} bases`}>
            {a.status === "personal" ? `${author(a.owner) ?? ""}: ${a.name}` : (versionGuide(a.id)?.theme ?? a.name)}
          </button>
        ))}
        <Link href={`/build${current && current !== plan?.id ? `?from=${current}` : ""}`} className="chip shrink-0 border-dashed font-semibold no-underline">
          + Build your own
        </Link>
      </div>
    </div>
  );
}
