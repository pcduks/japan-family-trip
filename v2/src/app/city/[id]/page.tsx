import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CityView } from "@/components/city/CityView";
import { tripData } from "@/lib/data/file";

export function generateStaticParams() {
  return tripData().regions.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: PageProps<"/city/[id]">) {
  const { id } = await params;
  const name = tripData().regions.find((r) => r.id === id)?.name ?? id;
  return { title: `Our ${name} · Japan, winter 2026` };
}

/** ?pin=<id> opens a place's card, ?day=<date> a day, ?lens=areas|types a lens; all stay in the URL while browsing. */
export default async function CityPage({ params, searchParams }: PageProps<"/city/[id]">) {
  const { id } = await params;
  if (!tripData().regions.some((r) => r.id === id)) notFound();
  const sp = await searchParams;
  const pin = typeof sp.pin === "string" ? sp.pin : null;
  const day = typeof sp.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : null;
  const lens = sp.lens === "areas" || sp.lens === "types" || sp.lens === "days" ? sp.lens : null;
  return (
    <Suspense>
      <CityView region={id} initialPin={pin} initialDay={day} initialLens={lens} />
    </Suspense>
  );
}
