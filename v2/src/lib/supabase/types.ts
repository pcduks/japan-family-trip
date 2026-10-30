import type { SupabaseClient } from "@supabase/supabase-js";

/** Untyped client bound to the `trip` schema (the generated Database type is not used). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DB = SupabaseClient<any, any, any, any, any>;
