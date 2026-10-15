import { NextResponse, type NextRequest } from "next/server";
import { codeMatches, cookieOptions, FAMILY_COOKIE, familyCookieOk, familyToken, ME_COOKIE } from "@/lib/family";
import { adminSupabase } from "@/lib/supabase/server";

const IDS = ["pedro", "wife", "brother", "sister_in_law", "father", "mother", "sister"];

/**
 * The beta gate. POST { code } checks the family code and sets the family
 * cookie. POST { me, name? } (with the family cookie) picks who you are,
 * optionally renaming that slot, and sets the me cookie. GET lists the
 * family once the code is in. DELETE forgets who you are (or everything).
 */
export async function GET(req: NextRequest) {
  if (!(await familyCookieOk(req.cookies.get(FAMILY_COOKIE)?.value))) return NextResponse.json({ error: "Enter the family code first" }, { status: 401 });
  const sb = adminSupabase();
  if (!sb) return NextResponse.json({ travellers: [] });
  const { data, error } = await sb.from("travellers").select("id,name,role,notes").neq("id", "claude");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as { id: string; name: string; role: string; notes: string | null }[];
  rows.sort((a, b) => IDS.indexOf(a.id) - IDS.indexOf(b.id));
  return NextResponse.json({ travellers: rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { code?: string; me?: string; name?: string } | null;
  if (typeof body?.code === "string") {
    if (!codeMatches(body.code)) return NextResponse.json({ error: "That is not the family code. Ask Pedro for it." }, { status: 403 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(FAMILY_COOKIE, await familyToken(), cookieOptions);
    return res;
  }
  if (!(await familyCookieOk(req.cookies.get(FAMILY_COOKIE)?.value))) return NextResponse.json({ error: "Enter the family code first" }, { status: 401 });
  const me = String(body?.me ?? "").trim();
  if (!IDS.includes(me)) return NextResponse.json({ error: "Pick a name from the list" }, { status: 400 });
  const sb = adminSupabase();
  if (sb) {
    const name = String(body?.name ?? "").trim().slice(0, 40);
    if (name) {
      const { error } = await sb.from("travellers").update({ name }).eq("id", me);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data } = await sb.from("travellers").select("id").eq("id", me).maybeSingle();
    if (!data) return NextResponse.json({ error: "That person is not in the family list yet" }, { status: 404 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ME_COOKIE, me, cookieOptions);
  return res;
}

export async function DELETE(req: NextRequest) {
  const { scope } = (await req.json().catch(() => ({}))) as { scope?: "me" | "all" };
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ME_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  if (scope === "all") res.cookies.set(FAMILY_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
