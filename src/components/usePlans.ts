"use client";

import { useMemo } from "react";
import { planToRoute, type Plan } from "@/lib/plan";
import { useTable } from "@/lib/tables";
import type { Route } from "@/lib/types";

export interface PlansState {
  plans: Plan[];
  chosen: Plan | null;
  loaded: boolean;
  /** Plans as routes, for the map, compare view and calendar. */
  routes: Route[];
  routeFor: (plan: Plan) => Route;
}

export function planCode(i: number) {
  return `P${i + 1}`;
}

export function usePlans(): PlansState {
  const { rows, loaded } = useTable("plans");
  return useMemo(() => {
    const plans = [...rows].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.name.localeCompare(b.name));
    const codeOf = new Map(plans.map((p, i) => [p.id, planCode(i)]));
    const routeFor = (p: Plan) => planToRoute(p, codeOf.get(p.id) ?? "★");
    return {
      plans,
      chosen: plans.find((p) => p.is_chosen) ?? null,
      loaded,
      routes: plans.map(routeFor),
      routeFor,
    };
  }, [rows, loaded]);
}

/** The plan a page should show: ?plan=id, else the chosen plan, else the newest. */
export function pickPlan(state: PlansState, requested: string | null): Plan | null {
  return (
    state.plans.find((p) => p.id === requested) ?? state.chosen ?? state.plans[state.plans.length - 1] ?? null
  );
}
