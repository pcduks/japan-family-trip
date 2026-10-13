import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import Image from "next/image";
import { art } from "@/lib/art";
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
    <main className="mx-auto grid max-w-md gap-6 px-4 pt-8 pb-10">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl shadow-[var(--glow)]">
        <Image src={art("chapter-fuji")} alt="Mount Fuji over a lake at dawn" fill priority sizes="(max-width: 640px) 100vw, 448px" className="object-cover" />
      </div>
      <div className="grid gap-2">
        <p className="eyebrow">Japan, 20 Dec 2026 – 9 Jan 2027</p>
        <h1 className="display text-[2.4rem] leading-none">Who are you?</h1>
        <p className="text-ink-2">Tap your name and we’ll email you a 6-digit code. No password.</p>
      </div>
      {!hasSupabase ? <p className="text-danger">Supabase is not configured and demo mode is off.</p> : null}
      <LoginForm travellers={names} next={typeof sp.next === "string" ? sp.next : "/"} error={typeof sp.error === "string" ? sp.error : null} />
    </main>
  );
}
