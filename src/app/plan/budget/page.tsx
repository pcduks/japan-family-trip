import { Suspense } from "react";
import { BudgetView } from "@/components/BudgetView";

export const metadata = { title: "Budget · Six Across Japan" };

export default function BudgetPage() {
  return (
    <Suspense>
      <BudgetView />
    </Suspense>
  );
}
