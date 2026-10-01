import { Suspense } from "react";
import { BookingsView } from "@/components/BookingsView";

export const metadata = { title: "Reservas · Seis pelo Japão" };

export default function BookingsPage() {
  return (
    <Suspense>
      <BookingsView />
    </Suspense>
  );
}
