import { FoodView } from "@/components/FoodView";

export const metadata = { title: "Tokyo food · Six Across Japan" };

export default async function FoodPage({ searchParams }: PageProps<"/food">) {
  const sp = await searchParams;
  return <FoodView initialPlace={typeof sp.p === "string" ? sp.p : null} />;
}
