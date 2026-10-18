import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FoodHome } from "@/components/food/FoodHome";
import { DEEP_CITIES, DEEP_FOR_TAB, DEEP_TOPICS, FOOD_REGION } from "@/lib/foodDeep";
import { DISH_PHOTOS, dishLite, placeLite } from "@/lib/foodView";

const PLACES = Object.values(DEEP_CITIES).flatMap((c) => (c.places ?? []).map((p) => placeLite(c.slug, p)));
const DISHES = Object.values(DEEP_CITIES).flatMap((c) => (c.meibutsu ?? []).map((d) => dishLite(c.slug, d, DISH_PHOTOS[`${c.slug}/${d.name}`] ?? null)));

export default async function FoodPage({ searchParams }: PageProps<"/food">) {
  const sp = await searchParams;
  // Old links: /food?region=kyoto went to a tab; each city has its own page now.
  const region = typeof sp.region === "string" ? sp.region : "";
  if (region) {
    if (DEEP_TOPICS[region]) redirect(region === "calendar" ? "/food/book" : `/food/guide/${region}`);
    if (region === "her") redirect("/food/guide/fernanda");
    if (region === "ryokan" || region === "ours") redirect(`/food/guide/${region}`);
    const city = DEEP_FOR_TAB[FOOD_REGION[region] ?? region]?.[0];
    if (city) redirect(`/food/${city}`);
  }
  return (
    <Suspense>
      <FoodHome places={PLACES} dishes={DISHES} />
    </Suspense>
  );
}
