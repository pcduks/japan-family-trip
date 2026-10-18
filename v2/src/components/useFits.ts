"use client";

import { useMemo } from "react";
import { areaIds, type Verdict } from "@/lib/areas";
import { planDays } from "@/lib/days";
import { dayOutsOf, fitOf, type AreaFit, type Fit } from "@/lib/fit";
import { useStore } from "./providers";

/** The four fit groups share the verdict marks and colours. */
export const FIT_STATE: Record<Fit, Verdict["state"]> = { route: "route", daytrip: "daytrip", change: "swap", elsewhere: "later" };

/** How every area fits the route we are taking right now: recomputed whenever the route changes. */
export function useFits(): Map<string, AreaFit & { state: Verdict["state"] }> {
  const { snapshot } = useStore();
  return useMemo(() => {
    const plan = snapshot.versions.find((v) => v.status === "plan");
    const out = new Map<string, AreaFit & { state: Verdict["state"] }>();
    if (!plan) return out;
    const outs = dayOutsOf(planDays(plan, snapshot), new Map(snapshot.places.map((p) => [p.id, p.region])));
    for (const id of areaIds()) {
      const f = fitOf(id, plan.stays, snapshot.regions, outs);
      out.set(id, { ...f, state: FIT_STATE[f.fit] });
    }
    return out;
  }, [snapshot]);
}
