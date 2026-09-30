import { Suspense } from "react";
import { TodayView } from "@/components/TodayView";

export const metadata = { title: "Today · Six Across Japan" };

export default function TodayPage() {
  return (
    <Suspense>
      <TodayView />
    </Suspense>
  );
}
