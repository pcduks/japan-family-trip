import { Suspense } from "react";
import { BookingsView } from "@/components/BookingsView";

export const metadata = { title: "Bookings · Six Across Japan" };

export default function BookingsPage() {
  return (
    <Suspense>
      <BookingsView />
    </Suspense>
  );
}
