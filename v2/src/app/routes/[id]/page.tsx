import { RouteView } from "@/components/RouteView";

export default async function RoutePage({ params }: PageProps<"/routes/[id]">) {
  const { id } = await params;
  return <RouteView id={id} />;
}
