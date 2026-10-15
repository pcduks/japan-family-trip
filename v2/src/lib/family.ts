/**
 * Beta access: one family code shared by chat, then "who are you?".
 *
 * The code lives in FAMILY_CODE (falls back to a default so the beta works
 * without any dashboard work). Entering it sets a cookie holding a hash of
 * the code, so changing the code signs everyone out. A second cookie holds
 * the traveller id the person picked. There is no password and no email.
 */
export const FAMILY_COOKIE = "jp-family";
export const ME_COOKIE = "jp-me";
export const DEFAULT_FAMILY_CODE = "fuji2026";

export function familyCode(): string {
  return (process.env.FAMILY_CODE ?? "").trim() || DEFAULT_FAMILY_CODE;
}

/** Codes are compared without case, spaces or dashes, so "FUJI 2026" works. */
export function normaliseCode(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, "");
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** The cookie value that proves the family code was entered. */
export async function familyToken(): Promise<string> {
  return sha256(`family:${normaliseCode(familyCode())}`);
}

export async function familyCookieOk(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  return value === (await familyToken());
}

export function codeMatches(input: string): boolean {
  return normaliseCode(input) === normaliseCode(familyCode());
}

/** A year in seconds: the cookies outlast the trip. */
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const cookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: COOKIE_MAX_AGE, secure: process.env.NODE_ENV === "production" };
