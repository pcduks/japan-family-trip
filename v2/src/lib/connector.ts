import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { serverEnv } from "./env";
import { getViewer } from "./supabase/server";

/** Who is calling an import/connector route: a planner session, the Claude token, or nobody. */
export async function connectorActor(req: NextRequest): Promise<{ actor: string; kind: "planner" | "claude" } | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const expected = serverEnv().connectorToken;
  if (token && expected && token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return { actor: "claude", kind: "claude" };
  const viewer = await getViewer();
  if (viewer && viewer !== "demo" && viewer.role === "planner") return { actor: viewer.travellerId, kind: "planner" };
  return null;
}
