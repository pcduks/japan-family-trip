"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "../env";

let client: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
