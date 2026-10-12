import { NextResponse, type NextRequest } from "next/server";
import { adminSupabase, getViewer } from "@/lib/supabase/server";

/**
 * Planner-only list of who is on the trip. Adding a person also pre-creates
 * their sign-in user, because sign-ups are closed (shouldCreateUser: false).
 * Emails never leave this route except to the planner.
 */
const COUPLES = ["pedro", "irmao", "pais"] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function guard() {
  const viewer = await getViewer();
  if (!viewer || viewer === "demo") return { error: NextResponse.json({ error: "Isto precisa do Supabase e de entrar como o Pedro." }, { status: 400 }) };
  if (viewer.role !== "planner") return { error: NextResponse.json({ error: "Só o Pedro mexe na lista." }, { status: 403 }) };
  const admin = adminSupabase();
  if (!admin) return { error: NextResponse.json({ error: "Falta a chave de serviço do Supabase no servidor." }, { status: 500 }) };
  return { viewer, admin };
}

interface Body {
  id?: string;
  name?: string;
  email?: string;
  couple?: string;
  docs_access?: boolean;
}

function clean(b: Body) {
  const name = (b.name ?? "").trim().slice(0, 80);
  const email = (b.email ?? "").trim().toLowerCase().slice(0, 200);
  const couple = COUPLES.includes(b.couple as (typeof COUPLES)[number]) ? b.couple! : null;
  return { name, email, couple, docs_access: !!b.docs_access };
}

async function ensureAuthUser(admin: NonNullable<ReturnType<typeof adminSupabase>>, email: string) {
  const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error && !/already|registered|exists/i.test(error.message)) throw new Error(error.message);
}

export async function GET() {
  const g = await guard();
  if ("error" in g) return g.error;
  const { data, error } = await g.admin.from("travellers").select("id,name,email,role,couple,docs_access,created_at").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ travellers: data });
}

export async function POST(req: NextRequest) {
  const g = await guard();
  if ("error" in g) return g.error;
  const t = clean((await req.json().catch(() => ({}))) as Body);
  if (!t.name) return NextResponse.json({ error: "Falta o nome." }, { status: 400 });
  if (!EMAIL.test(t.email)) return NextResponse.json({ error: "Esse e-mail não parece certo." }, { status: 400 });
  if (!t.couple) return NextResponse.json({ error: "Escolha o casal." }, { status: 400 });
  const { count } = await g.admin.from("travellers").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 6) return NextResponse.json({ error: "A viagem já tem seis pessoas." }, { status: 400 });
  try {
    await ensureAuthUser(g.admin, t.email);
  } catch (e) {
    return NextResponse.json({ error: `Supabase: ${(e as Error).message}` }, { status: 500 });
  }
  const { data, error } = await g.admin.from("travellers").insert({ ...t, role: "member" }).select("id,name,email,role,couple,docs_access,created_at").single();
  if (error) return NextResponse.json({ error: /duplicate|unique/i.test(error.message) ? "Esse e-mail já está na lista." : error.message }, { status: 400 });
  return NextResponse.json({ traveller: data });
}

export async function PATCH(req: NextRequest) {
  const g = await guard();
  if ("error" in g) return g.error;
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.id) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const t = clean(body);
  if (!t.name || !EMAIL.test(t.email)) return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  try {
    await ensureAuthUser(g.admin, t.email);
  } catch (e) {
    return NextResponse.json({ error: `Supabase: ${(e as Error).message}` }, { status: 500 });
  }
  const patch = body.id === g.viewer.travellerId ? { name: t.name, couple: t.couple, docs_access: t.docs_access } : t;
  const { data, error } = await g.admin.from("travellers").update(patch).eq("id", body.id).select("id,name,email,role,couple,docs_access,created_at").single();
  if (error) return NextResponse.json({ error: /duplicate|unique/i.test(error.message) ? "Esse e-mail já está na lista." : error.message }, { status: 400 });
  return NextResponse.json({ traveller: data });
}

export async function DELETE(req: NextRequest) {
  const g = await guard();
  if ("error" in g) return g.error;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  if (id === g.viewer.travellerId) return NextResponse.json({ error: "Você não pode se tirar da viagem." }, { status: 400 });
  const { error } = await g.admin.from("travellers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
