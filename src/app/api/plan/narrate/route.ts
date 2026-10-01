import { NextResponse, type NextRequest } from "next/server";
import { narrate, type NarrativeInput } from "@/lib/builder/narrative";
import { isPlannerRequest } from "@/lib/supabase/server";

export const maxDuration = 60;

/** POST NarrativeInput → Claude's Portuguese pitch for a generated route. Planner only; 503 without a key. */
export async function POST(req: NextRequest) {
  if (!(await isPlannerRequest())) return NextResponse.json({ error: "Só o planejador" }, { status: 403 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Sem ANTHROPIC_API_KEY: o texto fica com a explicação automática." }, { status: 503 });
  const input = (await req.json().catch(() => null)) as NarrativeInput | null;
  if (!input || !Array.isArray(input.people) || !Array.isArray(input.placed)) return NextResponse.json({ error: "Entrada inválida" }, { status: 400 });
  try {
    const out = await narrate(input, key);
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falhou" }, { status: 502 });
  }
}
