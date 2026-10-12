import { Suspense } from "react";
import { PlacesList } from "@/components/PlacesList";

export default function PlacesPage() {
  return (
    <Suspense>
      <PlacesList />
    </Suspense>
  );
}
