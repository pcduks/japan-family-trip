"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import docs from "@/data/plan-doc.json";
import { Markdown } from "./Markdown";
import { Back, Page } from "./ui";

const TABS: { id: string; file: string; label: string; region?: string }[] = [
  { id: "plan", file: "01-the-plan.md", label: "The plan" },
  { id: "nights", file: "02-why-each-stay-is-this-long.md", label: "Why each stay is this long" },
  { id: "missing", file: "03-what-were-missing.md", label: "What we’re missing" },
  { id: "tokyo", file: "10-tokyo.md", label: "Tokyo", region: "tokyo" },
  { id: "kanazawa", file: "11-kanazawa-and-shirakawa-go.md", label: "Kanazawa & Shirakawa-go", region: "kanazawa" },
  { id: "takayama", file: "12-takayama-and-hida.md", label: "Takayama & Hida", region: "takayama" },
  { id: "kyoto", file: "13-kyoto-and-nara.md", label: "Kyoto & Nara", region: "kyoto" },
  { id: "hakone", file: "14-hakone-and-fuji.md", label: "Hakone & Fuji", region: "hakone" },
];

/** The tab for a region id, so stays and place lists can link straight to its guide. */
export function reportTabForRegion(regionId: string): string | null {
  const map: Record<string, string> = { tokyo: "tokyo", kanazawa: "kanazawa", shirakawago: "kanazawa", takayama: "takayama", gero: "takayama", okuhida: "takayama", kyoto: "kyoto", nara: "kyoto", hakone: "hakone", kawaguchiko: "hakone" };
  return map[regionId] ?? null;
}

export function PlanReport() {
  const params = useSearchParams();
  const wanted = params.get("tab");
  const [picked, setPicked] = useState<{ forParam: string | null; id: string } | null>(null);
  const active = picked && picked.forParam === wanted ? picked.id : (TABS.find((t) => t.id === wanted)?.id ?? "plan");
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];
  const source = (docs as Record<string, string>)[tab.file] ?? "";
  return (
    <Page>
      <Back href="/">Explore</Back>
      <header className="grid gap-1.5">
        <p className="eyebrow">The research, in full</p>
        <h1 className="display text-[2.1rem] leading-[1.05]">The plan and the reasoning</h1>
        <p className="text-ink-2">
          The whole plan doc, tab by tab: the itinerary and why, how the nights were decided, what was left out, and a guide to each place with hours, prices and food. Exported 13 Oct 2026; the{" "}
          <a href="https://claude.ai/code/artifact/8af68e4b-aa1e-42c9-ad88-2a4dbdc396f7" target="_blank" rel="noreferrer">
            live doc
          </a>{" "}
          is newer if they ever disagree.
        </p>
      </header>
      <div className="no-scrollbar sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-bg px-4 py-2">
        {TABS.map((t) => (
          <button key={t.id} className={`chip shrink-0 ${active === t.id ? "bg-accent text-accent-ink" : ""}`} aria-pressed={active === t.id} onClick={() => setPicked({ forParam: wanted, id: t.id })}>
            {t.label}
          </button>
        ))}
      </div>
      <article className="card p-5">
        <Markdown source={source} />
        {tab.region ? (
          <p className="mt-6 flex flex-wrap gap-2 border-t border-rule pt-4">
            <Link href={`/places?region=${tab.region}`} className="btn btn-sm">
              Places in {tab.label.split(" &")[0]}
            </Link>
            <Link href={`/food?region=${tab.region}`} className="btn btn-sm">
              Where to eat
            </Link>
          </p>
        ) : null}
      </article>
    </Page>
  );
}
