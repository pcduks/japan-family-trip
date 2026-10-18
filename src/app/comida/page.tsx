import { FoodGuideHub } from "@/components/FoodGuideHub";
import { FOOD_CITIES, FOOD_TOPICS } from "@/lib/foodGuide/generated";

export const metadata = { title: "Guia de comida · Seis pelo Japão" };

export default function ComidaPage() {
  return <FoodGuideHub cities={FOOD_CITIES} topics={FOOD_TOPICS} />;
}
