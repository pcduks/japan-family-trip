import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { ACTING_COOKIE, actingCookieValue, plannerFromCookie } from "@/lib/supabase/acting";
import { adminSupabase, getViewer, serverSupabase } from "@/lib/supabase/server";

/** Planner-only: sign in as another traveller (or back as yourself) without an email. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const viewer = await getViewer();
  const sb = await serverSupabase();
  const admin = adminSupabase();
  if (!sb || !admin || !viewer || viewer === "demo" || typeof body?.id !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const jar = await cookies();
  const planner = plannerFromCookie(jar.get(ACTING_COOKIE)?.value) ?? (viewer.role === "planner" ? viewer.travellerId : null);
  if (!planner) return NextResponse.json({ error: "Só quem organiza pode trocar de pessoa." }, { status: 403 });

  const { data: t } = await admin.from("travellers").select("id,email").eq("id", body.id).maybeSingle();
  if (!t?.email) return NextResponse.json({ error: "Essa pessoa não está na lista da viagem." }, { status: 404 });

  // Mint a one-time token server-side (no email is sent) and redeem it here,
  // which replaces the session cookies with the target traveller's.
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: t.email });
  if (error || !link.properties?.hashed_token) return NextResponse.json({ error: error?.message ?? "Não deu para trocar." }, { status: 500 });
  const { error: vErr } = await sb.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

  if (t.id === planner) jar.delete(ACTING_COOKIE);
  else jar.set(ACTING_COOKIE, actingCookieValue(planner), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.json({ ok: true });
}
