import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FoodHome, type CityCard } from "@/components/food/FoodHome";
import { slug } from "@/lib/food";
import { DEEP_CITIES, DEEP_FOR_TAB, DEEP_TOPICS, FOOD_REGION } from "@/lib/foodDeep";
import { DISH_PHOTOS } from "@/lib/foodView";

/** Each city as a postcard: its line and its must-try dishes with their photos. */
const CITIES: Record<string, CityCard> = Object.fromEntries(
  Object.values(DEEP_CITIES).map((c) => [
    c.slug,
    {
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      places: c.places?.length ?? 0,
      dishes: (c.meibutsu ?? []).filter((d) => d.must).map((d) => ({ name: d.name, name_ja: d.name_ja, slug: slug(d.name), photo: DISH_PHOTOS[`${c.slug}/${d.name}`] ?? null })),
    },
  ]),
);

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
      <FoodHome cities={CITIES} />
    </Suspense>
  );
}
