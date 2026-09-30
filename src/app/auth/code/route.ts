import { NextResponse, type NextRequest } from "next/server";
import { adminSupabase, serverSupabase } from "@/lib/supabase/server";

/**
 * "Quem é você?" sign-in. The browser sends a traveller id, never an email:
 * the server looks the address up with the service role, then asks Supabase
 * for a one-time code (the same email also carries the magic link).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { action?: string; id?: string; code?: string; next?: string } | null;
  const sb = await serverSupabase();
  const admin = adminSupabase();
  if (!sb || !admin || !body?.id || typeof body.id !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const { data: t } = await admin.from("travellers").select("email").eq("id", body.id).maybeSingle();
  if (!t?.email) return NextResponse.json({ error: "Essa pessoa não está na lista da viagem." }, { status: 404 });

  if (body.action === "send") {
    const redirect = new URL("/auth/confirm", req.nextUrl.origin);
    redirect.searchParams.set("next", safeNext(body.next));
    const { error } = await sb.auth.signInWithOtp({
      email: t.email,
      options: { shouldCreateUser: false, emailRedirectTo: redirect.toString() },
    });
    if (error) return NextResponse.json({ error: friendly(error.message) }, { status: 429 });
    return NextResponse.json({ ok: true, hint: mask(t.email) });
  }

  if (body.action === "verify") {
    const code = String(body.code ?? "").replace(/\D/g, "");
    if (code.length < 6) return NextResponse.json({ error: "O código tem 6 números." }, { status: 400 });
    const { error } = await sb.auth.verifyOtp({ email: t.email, token: code, type: "email" });
    if (error) return NextResponse.json({ error: "Código errado ou vencido. Confira o e-mail mais recente." }, { status: 401 });
    return NextResponse.json({ ok: true, next: safeNext(body.next) });
  }

  return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
}

function friendly(message: string): string {
  if (/rate|seconds|too many/i.test(message)) return "Muitos pedidos seguidos. Espere um minuto e tente de novo, ou use o último e-mail que chegou.";
  return message;
}

/** "p•••@gmail.com", so people know which inbox to check. */
function mask(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.charAt(0)}•••@${domain}`;
}

function safeNext(n: string | null | undefined): string {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}
