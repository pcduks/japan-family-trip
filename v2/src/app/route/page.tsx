import { Suspense } from "react";
import { RouteView } from "@/components/RouteView";

export const metadata = { title: "The route, and why" };

export default function RoutePage() {
  return (
    <Suspense>
      <RouteView />
    </Suspense>
  );
}
