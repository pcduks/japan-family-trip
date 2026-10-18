import { Suspense } from "react";
import { DeepCityGuide, DeepTopicGuide } from "@/components/DeepGuide";
import { Food } from "@/components/Food";
import { DEEP_CITIES, DEEP_FOR_TAB, DEEP_ONLY_TABS, DEEP_TOPICS, FOOD_REGION } from "@/lib/foodDeep";

export default async function FoodPage({ searchParams }: PageProps<"/food">) {
  const sp = await searchParams;
  const wanted = typeof sp.region === "string" ? sp.region : "";
  const tab = FOOD_REGION[wanted] ?? wanted;
  const deepOnly = DEEP_ONLY_TABS.some((t) => t.id === tab);
  // Only the open tab's guide is rendered, so the page stays light.
  const deep = DEEP_TOPICS[tab] ? (
    <DeepTopicGuide topic={DEEP_TOPICS[tab]} />
  ) : DEEP_FOR_TAB[tab] ? (
    <>
      {DEEP_FOR_TAB[tab].map((slug, i) => (
        <DeepCityGuide key={slug} city={DEEP_CITIES[slug]} heading={deepOnly || i > 0} />
      ))}
    </>
  ) : null;
  return (
    <Suspense>
      <Food deep={deep} />
    </Suspense>
  );
}
