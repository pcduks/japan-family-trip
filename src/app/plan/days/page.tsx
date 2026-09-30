import { Suspense } from "react";
import { DaysView } from "@/components/DaysView";

export const metadata = { title: "Dia a dia · Seis pelo Japão" };

export default function DaysPage() {
  return (
    <Suspense>
      <DaysView />
    </Suspense>
  );
}
