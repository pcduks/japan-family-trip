import { ExploreView } from "@/components/ExploreView";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  return <ExploreView initialRoute={typeof sp.r === "string" ? sp.r : null} initialPlace={typeof sp.p === "string" ? sp.p : null} />;
}
