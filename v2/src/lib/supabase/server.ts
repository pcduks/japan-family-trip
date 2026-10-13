import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { DB } from "./types";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { DB_SCHEMA, demoAllowed, env, hasSupabase, serverEnv } from "../env";
import type { Role } from "../types";

/** Supabase client acting as the signed-in user (RLS applies). */
export async function serverSupabase(): Promise<DB | null> {
  if (!hasSupabase) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    db: { schema: DB_SCHEMA },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes the session instead.
        }
      },
    },
  }) as DB;
}

/** Service-role client for trusted server work (bypasses RLS). */
export function adminSupabase(): DB | null {
  const key = serverEnv().serviceRoleKey;
  if (!hasSupabase || !key) return null;
  return createClient(env.supabaseUrl, key, { db: { schema: DB_SCHEMA }, auth: { persistSession: false } }) as DB;
}

export interface Viewer {
  travellerId: string;
  name: string;
  email: string;
  role: Role;
}

/** The signed-in traveller, null when signed out, or "demo" without Supabase. */
export async function getViewer(): Promise<Viewer | null | "demo"> {
  await connection();
  const sb = await serverSupabase();
  if (!sb) return demoAllowed() ? "demo" : null;
  const { data } = await sb.auth.getUser();
  const email = data.user?.email;
  if (!email) return null;
  const { data: t } = await sb.from("travellers").select("id,name,email,role").ilike("email", email).maybeSingle();
  if (!t) return null;
  return { travellerId: t.id, name: t.name, email: t.email, role: t.role };
}

export async function isPlannerRequest(): Promise<boolean> {
  const v = await getViewer();
  return v === "demo" || (v !== null && v.role === "planner");
}
