/**
 * Builds data/travellers.json from the earlier app's public.travellers table
 * (name, email, role, couple), mapping each row to a v2 traveller id from
 * trip-data.json. Prints the mapping so it can be checked. Rows that cannot
 * be mapped are listed and skipped; fix them with `--map=email=id` or by
 * editing data/travellers.json and re-running the seed.
 *
 *   npx tsx scripts/travellers-from-v1.ts [--map=someone@x.com=sister]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, need } from "./env";

loadEnv();
const url = process.env.SUPABASE_URL || need("NEXT_PUBLIC_SUPABASE_URL");
const sb = createClient(url, need("SUPABASE_SERVICE_ROLE_KEY"), { db: { schema: "public" }, auth: { persistSession: false } });

interface V1 {
  name: string;
  email: string;
  role: "planner" | "member";
  couple: string | null;
  created_at?: string;
}

const overrides = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--map=([^=]+)=(.+)$/);
  if (m) overrides.set(m[1].toLowerCase(), m[2]);
}

const NOTES: Record<string, string | null> = {
  pedro: null,
  wife: "29 weeks pregnant at departure, about 32 at return",
  brother: null,
  sister_in_law: null,
  father: null,
  mother: null,
  sister: "May join; room sharing undecided",
};

/** Couple keys the earlier seed suggested; anything else falls back to order. */
const COUPLE_IDS: Record<string, [string, string]> = { irmao: ["brother", "sister_in_law"], pais: ["father", "mother"] };

async function main() {
  const { data, error } = await sb.from("travellers").select("name,email,role,couple,created_at").order("created_at");
  if (error) throw new Error(`public.travellers: ${error.message}`);
  const rows = (data ?? []) as V1[];
  if (!rows.length) throw new Error("public.travellers is empty; nothing to map");

  const out: { id: string; name: string; email: string; role: string; notes: string | null }[] = [];
  const used = new Set<string>();
  const take = (id: string, r: V1) => {
    if (used.has(id)) return false;
    used.add(id);
    out.push({ id, name: r.name, email: r.email.trim().toLowerCase(), role: r.role, notes: NOTES[id] ?? null });
    return true;
  };

  // 1. explicit overrides
  const rest: V1[] = [];
  for (const r of rows) {
    const id = overrides.get(r.email.trim().toLowerCase());
    if (id) take(id, r);
    else rest.push(r);
  }
  // 2. the planner and their partner
  const planner = rest.find((r) => r.role === "planner");
  if (planner && take("pedro", planner)) {
    const partner = rest.find((r) => r !== planner && r.couple && r.couple === planner.couple);
    if (partner) take("wife", partner);
  }
  // 3. couples by key, then whatever is left in order
  const remaining = rest.filter((r) => !out.some((o) => o.email === r.email.trim().toLowerCase()));
  const byCouple = new Map<string, V1[]>();
  for (const r of remaining) byCouple.set(r.couple ?? "", [...(byCouple.get(r.couple ?? "") ?? []), r]);
  const leftovers: V1[] = [];
  for (const [key, members] of byCouple) {
    const ids = COUPLE_IDS[key];
    if (ids && members.length <= 2) members.forEach((r, i) => take(ids[i], r) || leftovers.push(r));
    else leftovers.push(...members);
  }
  const free = ["brother", "sister_in_law", "father", "mother", "sister"].filter((id) => !used.has(id));
  for (const r of leftovers) {
    const id = free.shift();
    if (!id || !take(id, r)) console.warn(`! could not map ${r.name} <${r.email}>; pass --map=${r.email}=<id>`);
  }
  // v2 planners: Pedro and his wife (PRD §3)
  for (const o of out) if (o.id === "wife") o.role = "planner";

  mkdirSync("data", { recursive: true });
  writeFileSync("data/travellers.json", JSON.stringify(out, null, 2) + "\n");
  console.log("data/travellers.json written:");
  for (const o of out) console.log(`  ${o.id.padEnd(14)} ${o.name} (${o.role})  ${o.email.replace(/^(.).*?@/, "$1…@")}`);
  console.log("If a mapping is wrong, re-run with --map=<email>=<id> (ids: pedro, wife, brother, sister_in_law, father, mother, sister).");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
