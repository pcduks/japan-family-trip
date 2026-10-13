import { Home } from "@/components/Home";

export default function HomePage() {
  const today = new Date().toISOString().slice(0, 10);
  return <Home today={today} />;
}
