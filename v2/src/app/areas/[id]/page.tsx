import { AreaView } from "@/components/AreaView";

export default async function AreaPage({ params }: PageProps<"/areas/[id]">) {
  const { id } = await params;
  return <AreaView id={id} />;
}
