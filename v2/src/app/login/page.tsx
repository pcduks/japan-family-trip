import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { hasSupabase } from "@/lib/env";
import { adminSupabase, getViewer } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const viewer = await getViewer();
  if (viewer) redirect("/");
  const sp = await searchParams;
  const admin = adminSupabase();
  const { data } = admin ? await admin.from("travellers").select("id,name").neq("id", "claude") : { data: [] };
  const order = ["pedro", "wife", "brother", "sister_in_law", "father", "mother", "sister"];
  const names = ((data ?? []) as { id: string; name: string }[]).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 pt-14 pb-10">
      <div className="grid gap-2">
        <p className="eyebrow">Japan, 20 Dec 2026 – 9 Jan 2027</p>
        <h1 className="text-3xl">Who are you?</h1>
        <p className="text-ink-2">Tap your name and we’ll email you a 6-digit code. No password.</p>
      </div>
      {!hasSupabase ? <p className="text-danger">Supabase is not configured and demo mode is off.</p> : null}
      <LoginForm travellers={names} next={typeof sp.next === "string" ? sp.next : "/"} error={typeof sp.error === "string" ? sp.error : null} />
    </main>
  );
}
