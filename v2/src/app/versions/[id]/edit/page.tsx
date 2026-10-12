import { VersionEditor } from "@/components/VersionEditor";

export default async function EditVersionPage({ params }: PageProps<"/versions/[id]/edit">) {
  const { id } = await params;
  return <VersionEditor id={id} />;
}
