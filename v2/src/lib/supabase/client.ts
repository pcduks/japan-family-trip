"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { DB } from "./types";
import { DB_SCHEMA, env, hasSupabase } from "../env";

let client: DB | null = null;

export function browserSupabase(): DB | null {
  if (!hasSupabase) return null;
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, { db: { schema: DB_SCHEMA } }) as DB;
  return client;
}
