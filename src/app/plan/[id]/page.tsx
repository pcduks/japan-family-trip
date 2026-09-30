import { PlanEditor } from "@/components/PlanEditor";

export const metadata = { title: "Edit plan · Six Across Japan" };

export default async function PlanEditorPage({ params }: PageProps<"/plan/[id]">) {
  const { id } = await params;
  return <PlanEditor id={id} />;
}
