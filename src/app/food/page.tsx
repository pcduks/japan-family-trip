import { FoodView } from "@/components/FoodView";

export const metadata = { title: "Comida · Seis pelo Japão" };

export default async function FoodPage({ searchParams }: PageProps<"/food">) {
  const sp = await searchParams;
  return <FoodView initialPlace={typeof sp.p === "string" ? sp.p : null} />;
}
