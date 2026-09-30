"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Plan } from "@/lib/plan";

const TABS = [
  { href: "/plan", label: "Routes" },
  { href: "/plan/days", label: "Days" },
  { href: "/plan/bookings", label: "Bookings" },
  { href: "/plan/budget", label: "Budget" },
];

export function PlanTabs() {
  const path = usePathname();
  const sp = useSearchParams();
  const q = sp.get("plan") ? `?plan=${sp.get("plan")}` : "";
  return (
    <nav aria-label="Plan sections" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4">
      {TABS.map((t) => {
        const active = t.href === "/plan" ? path === "/plan" || /^\/plan\/[0-9a-f-]{8,}/i.test(path) : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href + q}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm whitespace-nowrap no-underline ${active ? "border-ink font-bold" : "border-transparent text-muted"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Pick which plan a Days/Bookings/Budget page shows. */
export function PlanPicker({ plans, current }: { plans: Plan[]; current: Plan | null }) {
  const router = useRouter();
  const path = usePathname();
  if (plans.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Plan</span>
      <select
        className="input !min-h-9 !w-auto !py-1"
        value={current?.id ?? ""}
        onChange={(e) => router.replace(`${path}?plan=${e.target.value}`)}
      >
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.is_chosen ? " (chosen)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NoPlanYet() {
  return (
    <div className="card grid gap-2 p-4">
      <p className="font-bold">No plan yet</p>
      <p className="text-sm text-muted">Duplicate one of the four routes on the Routes tab to start planning days, bookings and the budget.</p>
      <Link href="/plan" className="btn btn-sm justify-self-start">
        Start a plan
      </Link>
    </div>
  );
}
