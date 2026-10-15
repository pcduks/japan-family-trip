import { Suspense } from "react";
import { Food } from "@/components/Food";

export default function FoodPage() {
  return (
    <Suspense>
      <Food />
    </Suspense>
  );
}
