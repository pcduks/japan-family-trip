import { NextResponse, type NextRequest } from "next/server";
import { adminSupabase, getViewer } from "@/lib/supabase/server";

const IDS = ["pedro", "wife", "brother", "sister_in_law", "father", "mother", "sister"];

/**
 * Planners manage the family here (PRD §3). POST upserts a traveller and
 * pre-creates their sign-in user so the email code works with sign-ups off.
 * DELETE removes a traveller (their votes and versions go with them).
 */
export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer === "demo" || viewer.role !== "planner") return NextResponse.json({ error: "Planners only (and not in demo mode)" }, { status: 403 });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { id?: string; name?: string; email?: string; role?: string; notes?: string | null } | null;
  const id = String(body?.id ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const role = body?.role === "planner" ? "planner" : "member";
  if (!IDS.includes(id)) return NextResponse.json({ error: `id must be one of ${IDS.join(", ")}` }, { status: 400 });
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "A name and a valid email are required" }, { status: 400 });

  const { error } = await admin.from("travellers").upsert({ id, name, email, role, notes: body?.notes ?? null }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  const authNote = created.error && !/already|registered|exists/i.test(created.error.message) ? created.error.message : null;
  return NextResponse.json({ ok: true, authNote });
}

export async function DELETE(req: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer === "demo" || viewer.role !== "planner") return NextResponse.json({ error: "Planners only" }, { status: 403 });
  const admin = adminSupabase();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id || id === viewer.travellerId) return NextResponse.json({ error: "Pick someone else" }, { status: 400 });
  const { error } = await admin.from("travellers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
