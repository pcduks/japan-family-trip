import { notFound } from "next/navigation";
import { EXTRA_GUIDES, ExtraGuide, TopicGuide } from "@/components/food/GuideView";
import { DEEP_TOPICS } from "@/lib/foodDeep";

export function generateStaticParams() {
  return [...Object.keys(DEEP_TOPICS), ...Object.keys(EXTRA_GUIDES)].map((topic) => ({ topic }));
}

export default async function FoodGuidePage({ params }: PageProps<"/food/guide/[topic]">) {
  const { topic } = await params;
  if (DEEP_TOPICS[topic]) return <TopicGuide topic={DEEP_TOPICS[topic]} skipFirst={topic === "calendar"} />;
  if (EXTRA_GUIDES[topic]) return <ExtraGuide id={topic} />;
  notFound();
}
