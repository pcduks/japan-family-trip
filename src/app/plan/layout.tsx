import { Suspense } from "react";
import { PlanTabs } from "@/components/PlanTabs";

export default function PlanLayout({ children }: LayoutProps<"/plan">) {
  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-5 pb-12">
      <div className="grid gap-1 pt-2">
        <p className="eyebrow">
          Mesa do Pedro <span className="hand ml-1 text-base tracking-normal normal-case">onde o plano toma forma</span>
        </p>
        <Suspense>
          <PlanTabs />
        </Suspense>
      </div>
      {children}
    </div>
  );
}
