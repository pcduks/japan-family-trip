import { Suspense } from "react";
import { DaysView } from "@/components/DaysView";

export const metadata = { title: "Day planner · Six Across Japan" };

export default function DaysPage() {
  return (
    <Suspense>
      <DaysView />
    </Suspense>
  );
}
