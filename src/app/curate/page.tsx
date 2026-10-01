import { CurateIndex, PlannerOnly } from "@/components/Curate";
import { isPlannerRequest } from "@/lib/supabase/server";

export const metadata = { title: "Curadoria · Seis pelo Japão" };

export default async function CuratePage() {
  if (!(await isPlannerRequest())) return <PlannerOnly />;
  return <CurateIndex />;
}
