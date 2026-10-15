import { PlaceView } from "@/components/PlaceView";

export default async function PlacePage({ params }: PageProps<"/places/[id]">) {
  const { id } = await params;
  return <PlaceView id={id} />;
}
