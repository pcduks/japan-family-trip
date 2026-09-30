import { CurateIndex, PlannerOnly } from "@/components/Curate";
import { isPlannerRequest } from "@/lib/supabase/server";

export const metadata = { title: "Curate media · Six Across Japan" };

export default async function CuratePage() {
  if (!(await isPlannerRequest())) return <PlannerOnly />;
  return <CurateIndex />;
}
