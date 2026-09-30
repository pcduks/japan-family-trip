import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";

/** Magic-link landing: supports both PKCE (?code=) and token-hash links. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const sb = await serverSupabase();
  if (!sb) return NextResponse.redirect(new URL(next, req.url));

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const { error } = code
    ? await sb.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await sb.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Missing code") };

  if (error) {
    const login = new URL("/login", req.url);
    login.searchParams.set("error", "That sign-in link has expired or was already used. Ask for a new one.");
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(new URL(next, req.url));
}

function safeNext(n: string | null): string {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}
