import { ExploreView } from "@/components/ExploreView";

export default async function RoutePage({ params, searchParams }: PageProps<"/rotas/[code]">) {
  const { code } = await params;
  const sp = await searchParams;
  return <ExploreView initialRoute={code} initialPlace={typeof sp.p === "string" ? sp.p : null} />;
}
