import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "../env";

/**
 * "Ver como": the planner can become any traveller to test the app without an
 * email code. While acting, an httpOnly cookie remembers who the planner is
 * (signed with the service-role key) so they can switch back.
 */
export const ACTING_COOKIE = "saj-acting-for";

function sign(id: string): string {
  return createHmac("sha256", serverEnv().serviceRoleKey).update(`saj-acting:${id}`).digest("base64url");
}

export function actingCookieValue(plannerId: string): string {
  return `${plannerId}.${sign(plannerId)}`;
}

/** The planner's traveller id from a valid cookie, or null. */
export function plannerFromCookie(value: string | undefined): string | null {
  if (!value || !serverEnv().serviceRoleKey) return null;
  const i = value.lastIndexOf(".");
  if (i < 1) return null;
  const id = value.slice(0, i);
  const a = Buffer.from(value.slice(i + 1));
  const b = Buffer.from(sign(id));
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}
