import { notFound } from "next/navigation";
import { FoodCityView, FoodTopicView } from "@/components/FoodGuideView";
import { CITY_LOADERS, FOOD_CITIES, FOOD_TOPICS, TOPIC_LOADERS } from "@/lib/foodGuide/generated";

export function generateStaticParams() {
  return [...FOOD_CITIES, ...FOOD_TOPICS].map((x) => ({ slug: x.slug }));
}

export async function generateMetadata({ params }: PageProps<"/comida/[slug]">) {
  const { slug } = await params;
  const name = FOOD_CITIES.find((c) => c.slug === slug)?.name ?? FOOD_TOPICS.find((t) => t.slug === slug)?.title_pt;
  return { title: name ? `${name} · Guia de comida` : "Guia de comida" };
}

export default async function ComidaSlugPage({ params }: PageProps<"/comida/[slug]">) {
  const { slug } = await params;
  if (CITY_LOADERS[slug]) return <FoodCityView city={await CITY_LOADERS[slug]()} />;
  if (TOPIC_LOADERS[slug]) return <FoodTopicView topic={await TOPIC_LOADERS[slug]()} />;
  notFound();
}
