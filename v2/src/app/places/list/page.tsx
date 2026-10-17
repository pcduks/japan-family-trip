import { Suspense } from "react";
import { PlacesList } from "@/components/PlacesList";

export const metadata = { title: "Every place" };

export default function PlacesListPage() {
  return (
    <Suspense>
      <PlacesList />
    </Suspense>
  );
}
