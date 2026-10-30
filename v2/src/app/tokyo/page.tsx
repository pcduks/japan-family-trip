import { Suspense } from "react";
import { TokyoView } from "@/components/tokyo/TokyoView";

export const metadata = { title: "Tokyo on foot · Japan, winter 2026" };

/** ?walk=3 opens a walk, ?spot=<id> opens a place's sheet; both stay in the URL while browsing. */
export default async function TokyoPage({ searchParams }: PageProps<"/tokyo">) {
  const sp = await searchParams;
  const walk = typeof sp.walk === "string" && /^\d+$/.test(sp.walk) ? Number(sp.walk) : null;
  const spot = typeof sp.spot === "string" ? sp.spot : null;
  return (
    <Suspense>
      <TokyoView initialWalk={walk} initialSpot={spot} />
    </Suspense>
  );
}
