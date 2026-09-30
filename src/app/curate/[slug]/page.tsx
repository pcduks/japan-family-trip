import { CuratePlace, PlannerOnly } from "@/components/Curate";
import { isPlannerRequest } from "@/lib/supabase/server";

export default async function CuratePlacePage({ params }: PageProps<"/curate/[slug]">) {
  if (!(await isPlannerRequest())) return <PlannerOnly />;
  const { slug } = await params;
  return <CuratePlace slug={slug} />;
}
