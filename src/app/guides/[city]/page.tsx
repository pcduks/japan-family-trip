import { notFound } from "next/navigation";
import { GuideView } from "@/components/GuideView";
import { guideFor } from "@/lib/guides";

export async function generateMetadata({ params }: PageProps<"/guides/[city]">) {
  const { city } = await params;
  const g = guideFor(city);
  return { title: g ? `${g.mapSuffix} for Six` : "Guide" };
}

export default async function GuidePage({ params }: PageProps<"/guides/[city]">) {
  const { city } = await params;
  if (!guideFor(city)) notFound();
  return <GuideView city={city as "tokyo" | "kyoto"} />;
}
