"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasSupabase } from "@/lib/env";

/** Nothing renders for a signed-out visitor except the login screen, whatever the proxy did. */
export function Gate({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const path = usePathname();
  if (signedIn || path.startsWith("/login")) return <>{children}</>;
  return (
    <main className="mx-auto grid max-w-md gap-4 px-4 pt-20 text-center">
      <h1 className="text-2xl">This trip app is private.</h1>
      {hasSupabase ? (
        <p className="text-ink-2">
          <Link href="/login" className="btn btn-primary">
            Come in
          </Link>
        </p>
      ) : (
        <p className="text-ink-2">The database is not configured for this deployment (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).</p>
      )}
    </main>
  );
}
