import { PlanEditor } from "@/components/PlanEditor";

export const metadata = { title: "Editar plano · Seis pelo Japão" };

export default async function PlanEditorPage({ params }: PageProps<"/plan/[id]">) {
  const { id } = await params;
  return <PlanEditor id={id} />;
}
