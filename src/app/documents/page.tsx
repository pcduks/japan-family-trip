import { DocumentsView } from "@/components/DocumentsView";
import { getViewer, serverSupabase } from "@/lib/supabase/server";

export const metadata = { title: "Documents · Six Across Japan" };

export default async function DocumentsPage() {
  const viewer = await getViewer();
  let access = false;
  if (viewer && viewer !== "demo") {
    const sb = await serverSupabase();
    const { data } = await sb!.from("travellers").select("docs_access").eq("id", viewer.travellerId).maybeSingle();
    access = !!data?.docs_access;
  }
  return <DocumentsView mode={viewer === "demo" ? "demo" : access ? "ok" : "denied"} />;
}
