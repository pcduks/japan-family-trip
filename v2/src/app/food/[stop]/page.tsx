import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StopView } from "@/components/food/StopView";
import { DEEP_CITIES } from "@/lib/foodDeep";
import { DISH_PHOTOS } from "@/lib/foodView";

export function generateStaticParams() {
  return Object.keys(DEEP_CITIES).map((stop) => ({ stop }));
}

export default async function FoodStopPage({ params }: PageProps<"/food/[stop]">) {
  const { stop } = await params;
  const city = DEEP_CITIES[stop];
  if (!city) notFound();
  // Only this city's photos go to the browser.
  const photos = Object.fromEntries(Object.entries(DISH_PHOTOS).filter(([k]) => k.startsWith(`${stop}/`)));
  return (
    <Suspense>
      <StopView city={city} photos={photos} />
    </Suspense>
  );
}
