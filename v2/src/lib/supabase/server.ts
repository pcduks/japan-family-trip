import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { DB } from "./types";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { DB_SCHEMA, demoAllowed, env, hasSupabase, serverEnv } from "../env";
import { FAMILY_COOKIE, familyCookieOk, ME_COOKIE } from "../family";
import type { Role } from "../types";

/**
 * The one database client the app uses on the server (service role, bypasses
 * RLS). Access is gated by the family code and the picked name, checked in
 * the proxy and again in getViewer(); the browser never talks to Supabase.
 */
export function adminSupabase(): DB | null {
  const key = serverEnv().serviceRoleKey;
  if (!hasSupabase || !key) return null;
  return createClient(env.supabaseUrl, key, { db: { schema: DB_SCHEMA }, auth: { persistSession: false } }) as DB;
}

/** Kept for callers that used to ask for a per-user client. */
export async function serverSupabase(): Promise<DB | null> {
  return adminSupabase();
}

export interface Viewer {
  travellerId: string;
  name: string;
  role: Role;
}

/** The person using the app (from the cookies), null when not through the gate, or "demo" without Supabase. */
export async function getViewer(): Promise<Viewer | null | "demo"> {
  await connection();
  const sb = adminSupabase();
  if (!sb) return demoAllowed() ? "demo" : null;
  const jar = await cookies();
  if (!(await familyCookieOk(jar.get(FAMILY_COOKIE)?.value))) return null;
  const id = jar.get(ME_COOKIE)?.value;
  if (!id) return null;
  const { data: t } = await sb.from("travellers").select("id,name,role").eq("id", id).maybeSingle();
  if (!t) return null;
  return { travellerId: t.id, name: t.name, role: t.role };
}

export async function isPlannerRequest(): Promise<boolean> {
  const v = await getViewer();
  return v === "demo" || (v !== null && v.role === "planner");
}
