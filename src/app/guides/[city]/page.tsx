import { notFound } from "next/navigation";
import { GuideView } from "@/components/GuideView";
import { guideFor } from "@/lib/guides";

export async function generateMetadata({ params }: PageProps<"/guides/[city]">) {
  const { city } = await params;
  const g = guideFor(city);
  return { title: g ? `Guia de ${g.mapSuffix} · Seis pelo Japão` : "Guia · Seis pelo Japão" };
}

export default async function GuidePage({ params }: PageProps<"/guides/[city]">) {
  const { city } = await params;
  if (!guideFor(city)) notFound();
  return <GuideView city={city as "tokyo" | "kyoto"} />;
}
