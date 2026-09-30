import { Suspense } from "react";
import { PlanTabs } from "@/components/PlanTabs";

export default function PlanLayout({ children }: LayoutProps<"/plan">) {
  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4">
      <Suspense>
        <PlanTabs />
      </Suspense>
      {children}
    </div>
  );
}
