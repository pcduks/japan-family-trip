import { Suspense } from "react";
import { TokyoView } from "@/components/tokyo/TokyoView";

export const metadata = { title: "Tokyo a pé · Seis pelo Japão" };

/** ?r=3 opens a route, ?s=<spot id> opens a spot's sheet; both are kept in the URL while browsing. */
export default async function TokyoPage({ searchParams }: PageProps<"/tokyo">) {
  const sp = await searchParams;
  const r = typeof sp.r === "string" && /^\d+$/.test(sp.r) ? Number(sp.r) : null;
  const s = typeof sp.s === "string" ? sp.s : null;
  return (
    <Suspense>
      <TokyoView initialRoute={r} initialSpot={s} />
    </Suspense>
  );
}
