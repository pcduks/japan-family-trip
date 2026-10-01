"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Plan } from "@/lib/plan";

const TABS = [
  { href: "/plan", label: "Rotas" },
  { href: "/plan/days", label: "Dias" },
  { href: "/plan/bookings", label: "Reservas" },
  { href: "/plan/budget", label: "Orçamento" },
];

export function PlanTabs() {
  const path = usePathname();
  const sp = useSearchParams();
  const q = sp.get("plan") ? `?plan=${sp.get("plan")}` : "";
  return (
    <nav aria-label="Seções da Mesa do Pedro" className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto border-b border-rule px-5">
      {TABS.map((t) => {
        const active = t.href === "/plan" ? path === "/plan" || /^\/plan\/[0-9a-f-]{8,}/i.test(path) : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href + q}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2.5 font-mono text-[0.78rem] tracking-[0.08em] whitespace-nowrap uppercase no-underline ${active ? "border-vermilion text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Pick which plan a Dias/Reservas/Orçamento page shows. */
export function PlanPicker({ plans, current }: { plans: Plan[]; current: Plan | null }) {
  const router = useRouter();
  const path = usePathname();
  if (plans.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="eyebrow">Plano</span>
      <select
        className="input !min-h-9 !w-auto !py-1"
        value={current?.id ?? ""}
        onChange={(e) => router.replace(`${path}?plan=${e.target.value}`)}
      >
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.is_chosen ? " (escolhido)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NoPlanYet() {
  return (
    <div className="card grid gap-2 p-5">
      <p className="font-display text-[1.6rem] leading-tight">Ainda não há plano</p>
      <p className="text-sm text-ink-2">Copie uma das quatro rotas na aba Rotas para começar a planejar os dias, as reservas e o orçamento.</p>
      <Link href="/plan" className="btn btn-sm btn-primary mt-1 justify-self-start">
        Começar um plano
      </Link>
    </div>
  );
}
