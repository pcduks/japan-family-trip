import { EkiStamp } from "@/components/EkiStamp";
import { LoginForm, type Persona } from "@/components/LoginForm";
import { adminSupabase } from "@/lib/supabase/server";

export const metadata = { title: "Entrar · Seis pelo Japão", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const error = typeof sp.error === "string" ? sp.error : null;
  const people = await personas();
  return (
    <main className="mx-auto flex min-h-[85dvh] max-w-sm flex-col justify-center gap-7 px-5 py-10">
      <div className="grid gap-2">
        <EkiStamp motif="fuji" ink="var(--vermilion)" top="Seis pelo Japão" bottom="20 · XII · 2026" size={104} rotate={-8} label="" />
        <p className="eyebrow mt-3">20 dez 2026 – 9 jan 2027</p>
        <h1 className="text-[2.6rem] leading-[1.02]">{people.length ? "Quem é você?" : "Entrar"}</h1>
        <p className="text-ink-2">{people.length ? "Toque no seu nome. Chega um e-mail com um código de 6 números." : "Digite seu e-mail. Chega um link para entrar."}</p>
      </div>
      <LoginForm personas={people} next={next} initialError={error} />
    </main>
  );
}

/** First names only: this page is public, so no emails or surnames. */
async function personas(): Promise<Persona[]> {
  const admin = adminSupabase();
  if (!admin) return [];
  const { data } = await admin.from("travellers").select("id,name").order("created_at");
  return (data ?? []).map((t) => ({ id: t.id as string, name: String(t.name).trim().split(/\s+/)[0] }));
}
