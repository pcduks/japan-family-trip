import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { FamilyLogin } from "@/components/FamilyLogin";
import { art } from "@/lib/art";
import { demoAllowed, hasSupabase } from "@/lib/env";
import { FAMILY_COOKIE, familyCookieOk } from "@/lib/family";
import { adminSupabase, getViewer } from "@/lib/supabase/server";

export const metadata = { title: "Come in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const viewer = await getViewer();
  if (viewer) redirect("/");
  if (!hasSupabase && !demoAllowed()) {
    return (
      <main className="mx-auto grid max-w-md gap-4 px-4 pt-20 text-center">
        <h1 className="text-2xl">Not configured.</h1>
        <p className="text-ink-2">Supabase keys are missing on this deployment.</p>
      </main>
    );
  }
  const sp = await searchParams;
  const jar = await cookies();
  const familyOk = await familyCookieOk(jar.get(FAMILY_COOKIE)?.value);
  const sb = adminSupabase();
  const { data } = familyOk && sb ? await sb.from("travellers").select("id,name,role,notes").neq("id", "claude") : { data: [] };
  const order = ["pedro", "wife", "brother", "sister_in_law", "father", "mother", "sister"];
  const people = ((data ?? []) as { id: string; name: string; role: string; notes: string | null }[]).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return (
    <main className="mx-auto grid max-w-md gap-6 px-4 pt-6 pb-10">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl shadow-[var(--glow)]">
        <Image src={art("chapter-fuji")} alt="Mount Fuji over a lake at dawn" fill priority sizes="(max-width: 640px) 100vw, 448px" className="object-cover" />
      </div>
      <FamilyLogin step={familyOk ? "who" : "code"} people={people} next={typeof sp.next === "string" ? sp.next : "/"} />
    </main>
  );
}
