import { Suspense } from "react";
import { BuildView } from "@/components/BuildView";

export const metadata = { title: "Build a route" };

export default function BuildPage() {
  return (
    <Suspense>
      <BuildView />
    </Suspense>
  );
}
