import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { env, hasSupabase, serverEnv } from "../env";

/** Supabase client acting as the signed-in user (RLS applies). */
export async function serverSupabase(): Promise<SupabaseClient | null> {
  if (!hasSupabase) return null;
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
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
  });
}

/** Service-role client for trusted server work (bypasses RLS). */
export function adminSupabase(): SupabaseClient | null {
  const key = serverEnv().serviceRoleKey;
  if (!hasSupabase || !key) return null;
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false } });
}

export interface Viewer {
  travellerId: string;
  name: string;
  email: string;
  role: "planner" | "member";
}

/**
 * The signed-in traveller, or null. Without Supabase configured the app runs
 * in demo mode and everyone is treated as the planner.
 */
export async function getViewer(): Promise<Viewer | null | "demo"> {
  // Always evaluate per request, even when no auth cookies are read.
  await connection();
  const sb = await serverSupabase();
  // Demo mode is for local development only, so a deploy without Supabase
  // never exposes the Google and YouTube proxies to the public.
  if (!sb) return demoAllowed() ? "demo" : null;
  const { data } = await sb.auth.getUser();
  const email = data.user?.email;
  if (!email) return null;
  const { data: t } = await sb
    .from("travellers")
    .select("id,name,email,role")
    .ilike("email", email)
    .maybeSingle();
  if (!t) return null;
  return { travellerId: t.id, name: t.name, email: t.email, role: t.role };
}

export function demoAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1";
}

export async function isPlannerRequest(): Promise<boolean> {
  const v = await getViewer();
  return v === "demo" || (v !== null && v.role === "planner");
}
