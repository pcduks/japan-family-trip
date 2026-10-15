import { NextResponse, type NextRequest } from "next/server";
import { FAMILY_COOKIE, familyCookieOk, ME_COOKIE } from "./lib/family";
import { demoAllowed, hasSupabase } from "./lib/env";

const PUBLIC_PATHS = ["/login", "/api/family", "/api/import", "/api/connector", "/api/health"];

/**
 * Beta access: anyone with the family code cookie and a picked name gets in.
 * Everyone else lands on /login. Demo mode (no Supabase) needs neither.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return NextResponse.next();
  if (!hasSupabase && demoAllowed()) return NextResponse.next();

  const familyOk = await familyCookieOk(request.cookies.get(FAMILY_COOKIE)?.value);
  const me = request.cookies.get(ME_COOKIE)?.value;
  if (familyOk && me) return NextResponse.next();

  if (path.startsWith("/api/")) return NextResponse.json({ error: familyOk ? "Pick who you are first" : "Enter the family code first" }, { status: 401 });
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = path === "/" ? "" : `?next=${encodeURIComponent(path)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|illustrations/).*)"],
};
