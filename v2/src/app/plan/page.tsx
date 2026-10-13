import { Suspense } from "react";
import { PlanReport } from "@/components/PlanReport";

export default function PlanPage() {
  return (
    <Suspense>
      <PlanReport />
    </Suspense>
  );
}
