import { Suspense } from "react";
import { TodayView } from "@/components/TodayView";

export const metadata = { title: "Hoje · Seis pelo Japão" };

export default function TodayPage() {
  return (
    <Suspense>
      <TodayView />
    </Suspense>
  );
}
