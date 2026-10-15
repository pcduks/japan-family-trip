import { VersionView } from "@/components/VersionView";

export default async function VersionPage({ params }: PageProps<"/versions/[id]">) {
  const { id } = await params;
  return <VersionView id={id} />;
}
